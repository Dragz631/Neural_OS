import { execFile, spawn, type ChildProcess } from 'node:child_process';
import crypto from 'node:crypto';
import { createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import type { Plugin } from 'vite';

// Acesso pelo celular, de qualquer rede (inclusive 5G): o PC abre um túnel (cloudflared, sem
// conta) e gera um PIN ALEATÓRIO a cada vez. O servidor guarda as chaves de IA e escreve no
// cofre, então ninguém de fora entra sem o PIN:
//   - tudo que chega pelo túnel exige o PIN (uma vez por aparelho; depois vale um cookie);
//   - o PIN tem 6 dígitos, vale 10 min, serve UMA vez e some depois de 5 erros;
//   - fechar o acesso derruba o túnel e todos os aparelhos;
//   - as rotas de controle (/__acesso/*) só respondem no próprio PC.
// "Veio de fora" = tem cabeçalho do túnel/proxy ou o Host não é localhost. Um navegador local
// nunca manda esses cabeçalhos.

const PIN_VALE_MS = 10 * 60 * 1000;
const SESSAO_VALE_MS = 12 * 60 * 60 * 1000;
const MAX_ERROS = 5;
const COOKIE = 'neural_acesso';

interface Estado {
  proc?: ChildProcess;
  url?: string;
  subindo: boolean;
  erro?: string;
  pin?: { codigo: string; ate: number; erros: number };
  sessoes: Map<string, number>;
}

interface Instalacao {
  fase: 'parado' | 'baixando' | 'pronto' | 'erro';
  baixado?: number;
  total?: number;
  erro?: string;
}

const responder = (res: ServerResponse, status: number, dados: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(dados));
};

const lerCorpo = (req: IncomingMessage): Promise<Record<string, unknown>> =>
  new Promise((resolve, reject) => {
    let corpo = '';
    req.on('data', (c: Buffer) => {
      corpo += c.toString('utf8');
      if (corpo.length > 2000) reject(new Error('Pedido grande demais'));
    });
    req.on('end', () => {
      try {
        resolve(corpo ? JSON.parse(corpo) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });

const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i;
const CABECALHOS_DE_FORA = ['cf-connecting-ip', 'cf-ray', 'cf-visitor', 'x-forwarded-for', 'x-forwarded-host', 'x-forwarded-proto', 'forwarded', 'x-real-ip'];

/** Veio de fora do PC (túnel ou outra máquina)? */
export function veioDeFora(req: IncomingMessage): boolean {
  if (!LOCAL.test(String(req.headers.host ?? ''))) return true;
  return CABECALHOS_DE_FORA.some((h) => req.headers[h] !== undefined);
}

function lerCookie(req: IncomingMessage, nome: string): string | undefined {
  for (const parte of String(req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nome) return v.join('=');
  }
  return undefined;
}

const igual = (a: string, b: string): boolean => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

const PAGINA_PIN = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Neural-OS</title>
<style>
:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#070b08;color:#cfe8cf;font:16px/1.5 ui-monospace,Consolas,monospace;padding:16px}
main{width:100%;max-width:360px;border:1px solid #1f3a1f;border-radius:6px;padding:24px;background:#0b110c}
h1{font-size:13px;letter-spacing:.25em;text-transform:uppercase;color:#7ee05a;margin:0 0 12px}p{margin:0 0 16px;color:#8fae8f;font-size:14px}
input{width:100%;font:inherit;font-size:28px;letter-spacing:.4em;text-align:center;padding:12px;border-radius:4px;border:1px solid #2c4d2c;background:#070b08;color:#e6f5e6}
button{width:100%;margin-top:12px;padding:12px;font:inherit;font-weight:700;border:0;border-radius:4px;background:#6cc04a;color:#07110a}button:disabled{opacity:.5}
#e{min-height:1.5em;margin-top:12px;color:#f0b050;font-size:14px}
</style></head><body><main><h1>Neural-OS</h1><p>Digite o PIN de 6 dígitos que está aparecendo no seu computador (botão Celular, lá em cima).</p>
<form id="f"><input id="p" inputmode="numeric" autocomplete="one-time-code" maxlength="6" pattern="[0-9]{6}" placeholder="000000" autofocus><button id="b">Entrar</button></form><div id="e"></div></main>
<script>
const f=document.getElementById('f'),p=document.getElementById('p'),e=document.getElementById('e'),b=document.getElementById('b');
f.addEventListener('submit',async(ev)=>{ev.preventDefault();b.disabled=true;e.textContent='';
try{const r=await fetch('/__acesso/entrar',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({pin:p.value.trim()})});
const d=await r.json().catch(()=>({}));if(r.ok){location.reload();return}e.textContent=d.erro||'Não deu certo.';}catch{e.textContent='Sem conexão. Tente de novo.'}
b.disabled=false;p.value='';p.focus();});
</script></body></html>`;

/** Onde está o cloudflared: variável, pasta .ferramentas do projeto, ou o PATH. */
async function acharCloudflared(raiz: string, env: Record<string, string>): Promise<string | null> {
  const exe = process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';
  const candidatos = [env.CLOUDFLARED_PATH, path.join(raiz, '.ferramentas', exe)].filter(Boolean) as string[];
  for (const c of candidatos) {
    try {
      await fs.access(c);
      return c;
    } catch {
      /* próximo */
    }
  }
  return new Promise((ok) => {
    execFile(process.platform === 'win32' ? 'where' : 'which', ['cloudflared'], { windowsHide: true }, (err, out) => {
      const linha = err ? '' : String(out).split(/\r?\n/)[0].trim();
      ok(linha || null);
    });
  });
}

function urlDeDownload(): string | null {
  const base = 'https://github.com/cloudflare/cloudflared/releases/latest/download';
  if (process.platform === 'win32') return `${base}/cloudflared-windows-amd64.exe`;
  if (process.platform === 'linux') return `${base}/cloudflared-linux-${process.arch === 'arm64' ? 'arm64' : 'amd64'}`;
  return null; // macOS vem em .tgz: brew install cloudflared
}

export function acessoRemoto(env: Record<string, string>, raiz: string): Plugin {
  const estado: Estado = { subindo: false, sessoes: new Map() };
  let instalacao: Instalacao = { fase: 'parado' };

  const novoPin = () => {
    estado.pin = { codigo: String(crypto.randomInt(0, 1_000_000)).padStart(6, '0'), ate: Date.now() + PIN_VALE_MS, erros: 0 };
    return estado.pin;
  };

  const fechar = () => {
    estado.proc?.kill();
    estado.proc = undefined;
    estado.url = undefined;
    estado.erro = undefined;
    estado.subindo = false;
    estado.pin = undefined;
    estado.sessoes.clear();
  };

  return {
    name: 'neural-os-acesso-remoto',
    // O portão tem que vir ANTES de qualquer outra rota (as de IA, cofre e pastas).
    enforce: 'pre',
    config: () => ({ server: { allowedHosts: ['.trycloudflare.com'] } }),
    configureServer(server) {
      process.once('exit', () => estado.proc?.kill());
      const porta = () => {
        const a = server.httpServer?.address();
        return typeof a === 'object' && a ? a.port : (server.config.server.port ?? 5173);
      };

      const abrir = async () => {
        if (estado.proc || estado.subindo) return;
        const bin = await acharCloudflared(raiz, env);
        if (!bin) throw new Error('O túnel (cloudflared) ainda não está instalado.');
        estado.subindo = true;
        estado.erro = undefined;
        novoPin();
        const proc = spawn(bin, ['tunnel', '--url', `http://localhost:${porta()}`, '--no-autoupdate'], { windowsHide: true });
        estado.proc = proc;
        const ler = (b: Buffer) => {
          const m = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i.exec(b.toString('utf8'));
          if (m && !estado.url) {
            estado.url = m[0];
            estado.subindo = false;
          }
        };
        proc.stdout.on('data', ler);
        proc.stderr.on('data', ler);
        proc.on('exit', (code) => {
          if (estado.proc === proc) {
            const faltou = !estado.url;
            fechar();
            if (faltou) estado.erro = `O túnel fechou antes de abrir (código ${code}). Confira a internet e tente de novo.`;
          }
        });
        proc.on('error', (e) => {
          fechar();
          estado.erro = `Não consegui iniciar o túnel: ${e.message}`;
        });
        // Se em 60 s não veio o endereço, desiste.
        setTimeout(() => {
          if (estado.proc === proc && !estado.url) {
            fechar();
            estado.erro = 'O túnel demorou demais pra abrir. Confira a internet e tente de novo.';
          }
        }, 60_000);
      };

      const instalar = () => {
        if (instalacao.fase === 'baixando') return;
        const url = urlDeDownload();
        if (!url) {
          instalacao = { fase: 'erro', erro: 'No Mac, instale com: brew install cloudflared' };
          return;
        }
        instalacao = { fase: 'baixando', baixado: 0 };
        void (async () => {
          try {
            const pasta = path.join(raiz, '.ferramentas');
            await fs.mkdir(pasta, { recursive: true });
            const destino = path.join(pasta, process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared');
            const tmp = `${destino}.baixando`;
            const r = await fetch(url, { redirect: 'follow' });
            if (!r.ok || !r.body) throw new Error(`O download respondeu ${r.status}.`);
            instalacao.total = Number(r.headers.get('content-length')) || undefined;
            const corpo = Readable.fromWeb(r.body as never);
            corpo.on('data', (c: Buffer) => {
              instalacao.baixado = (instalacao.baixado ?? 0) + c.length;
            });
            await pipeline(corpo, createWriteStream(tmp));
            await fs.rename(tmp, destino);
            if (process.platform !== 'win32') await fs.chmod(destino, 0o755);
            instalacao = { fase: 'pronto' };
          } catch (e) {
            instalacao = { fase: 'erro', erro: e instanceof Error ? e.message : String(e) };
          }
        })();
      };

      const sessaoValida = (req: IncomingMessage): boolean => {
        const token = lerCookie(req, COOKIE);
        const ate = token ? estado.sessoes.get(token) : undefined;
        return !!ate && ate > Date.now();
      };

      // WebSocket (atualização ao vivo) não passa pelos middlewares: mesma regra aqui.
      server.httpServer?.prependListener('upgrade', (req, socket) => {
        if (veioDeFora(req) && (!estado.url || !sessaoValida(req))) socket.destroy();
      });

      // ── O portão ────────────────────────────────────────────────────────────
      server.middlewares.use(async (req, res, next) => {
        const url = (req.url ?? '/').split('?')[0];
        const fora = veioDeFora(req);

        // Rotas de controle: só do próprio PC.
        if (url.startsWith('/__acesso/') && url !== '/__acesso/entrar') {
          if (fora) return responder(res, 403, { erro: 'Só no computador.' });
          try {
            if (url === '/__acesso/estado') {
              const p = estado.pin && estado.pin.ate > Date.now() && estado.pin.erros < MAX_ERROS ? estado.pin : undefined;
              return responder(res, 200, {
                cloudflared: (await acharCloudflared(raiz, env)) ? 'ok' : 'faltando',
                instalacao,
                subindo: estado.subindo,
                ativo: !!estado.url,
                url: estado.url,
                pin: p?.codigo,
                pinExpiraEm: p?.ate,
                aparelhos: estado.sessoes.size,
                erro: estado.erro,
                podeInstalar: urlDeDownload() !== null,
              });
            }
            if (req.method !== 'POST') return responder(res, 405, { erro: 'Use POST.' });
            if (url === '/__acesso/abrir') {
              await abrir();
              return responder(res, 200, { ok: true });
            }
            if (url === '/__acesso/novo-pin') {
              if (!estado.url) return responder(res, 409, { erro: 'Abra o acesso primeiro.' });
              novoPin();
              return responder(res, 200, { ok: true });
            }
            if (url === '/__acesso/fechar') {
              fechar();
              return responder(res, 200, { ok: true });
            }
            if (url === '/__acesso/instalar') {
              instalar();
              return responder(res, 200, { ok: true });
            }
            return responder(res, 404, { erro: 'Rota desconhecida.' });
          } catch (e) {
            return responder(res, 500, { erro: e instanceof Error ? e.message : String(e) });
          }
        }

        if (!fora) return next();

        // Daqui pra baixo: veio de fora. Sem túnel aberto por nós, nada passa.
        if (!estado.url) {
          res.statusCode = 503;
          return res.end('Acesso fechado.');
        }

        if (url === '/__acesso/entrar' && req.method === 'POST') {
          try {
            const { pin } = await lerCorpo(req);
            const p = estado.pin;
            await new Promise((r) => setTimeout(r, 700)); // freia tentativa em massa
            if (!p || p.ate < Date.now() || p.erros >= MAX_ERROS) return responder(res, 403, { erro: 'Esse PIN não vale mais. Gere outro no computador.' });
            if (typeof pin !== 'string' || !/^\d{6}$/.test(pin) || !igual(pin, p.codigo)) {
              p.erros += 1;
              const resta = MAX_ERROS - p.erros;
              return responder(res, 401, { erro: resta > 0 ? `PIN errado. Restam ${resta} tentativas.` : 'PIN errado demais. Gere outro no computador.' });
            }
            estado.pin = undefined; // serve uma vez só
            const token = crypto.randomBytes(32).toString('hex');
            estado.sessoes.set(token, Date.now() + SESSAO_VALE_MS);
            res.setHeader('Set-Cookie', `${COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSAO_VALE_MS / 1000}`);
            return responder(res, 200, { ok: true });
          } catch {
            return responder(res, 400, { erro: 'Pedido inválido.' });
          }
        }

        if (sessaoValida(req)) return next();

        if (req.method === 'GET' && String(req.headers.accept ?? '').includes('text/html')) {
          res.statusCode = 401;
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          res.setHeader('Cache-Control', 'no-store');
          return res.end(PAGINA_PIN);
        }
        return responder(res, 401, { erro: 'Precisa do PIN.' });
      });
    },
  };
}
