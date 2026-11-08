import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { ViteDevServer } from 'vite';

// ─── Mesmo progresso no PC e no celular, ao vivo (08/11/2026) ────────────────
// O PC é a fonte da verdade: cada "store" do app (estudo, aprendiz, lousas...) é
// guardado aqui em `dados.local.json` (fora do git). Cada aparelho grava o store
// inteiro com a versão que conhecia; quando um grava, os outros recebem o aviso
// por SSE (/api/dados/eventos) e recarregam só aquele store.
// O portão do PIN (server/acesso.ts) vem antes: de fora, nada passa sem o PIN.

interface Item {
  valor: string;
  versao: number;
  em: number;
  por: string;
}

interface Arquivo {
  chaves: Record<string, Item>;
}

const NOME = /^neural-os\.[a-z0-9.-]{1,40}$/i;
const MAX_CORPO = 25_000_000; // lousa com imagem pesa
const GUARDAR_COPIAS = 7;

function lerCorpo(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let tamanho = 0;
    const partes: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      tamanho += c.length;
      if (tamanho > MAX_CORPO) reject(new Error('Dados grandes demais'));
      else partes.push(c);
    });
    req.on('end', () => {
      try {
        resolve(partes.length ? JSON.parse(Buffer.concat(partes).toString('utf8')) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

const responder = (res: ServerResponse, status: number, dados: unknown) => {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(dados));
};

export function registrarDados(server: ViteDevServer, raiz: string, nomeArquivo: string) {
  // Só um nome simples terminando em .local.json (fica fora do git e dentro da pasta do app).
  const nome = /^[\w.-]+\.local\.json$/.test(nomeArquivo) ? nomeArquivo : 'dados.local.json';
  const arquivo = path.join(raiz, nome);
  const prefixoCopia = nome.replace(/\.local\.json$/, '');
  let dados: Arquivo | undefined;
  let gravando: Promise<void> = Promise.resolve();
  let pendente: ReturnType<typeof setTimeout> | undefined;
  let copiaDoDia = '';
  const ouvintes = new Set<ServerResponse>();

  const carregar = async (): Promise<Arquivo> => {
    if (dados) return dados;
    try {
      const lido = JSON.parse(await fs.readFile(arquivo, 'utf8')) as Arquivo;
      dados = { chaves: lido.chaves ?? {} };
    } catch {
      dados = { chaves: {} };
    }
    return dados;
  };

  /** Uma cópia por dia (as 7 mais novas ficam), antes da 1ª gravação do dia. */
  const copiaDiaria = async () => {
    const hoje = new Date().toISOString().slice(0, 10);
    if (copiaDoDia === hoje) return;
    copiaDoDia = hoje;
    try {
      await fs.copyFile(arquivo, path.join(raiz, `${prefixoCopia}.copia-${hoje}.local.json`));
      const copias = (await fs.readdir(raiz)).filter((n) => n.startsWith(`${prefixoCopia}.copia-`) && /\.copia-\d{4}-\d{2}-\d{2}\.local\.json$/.test(n)).sort();
      for (const velha of copias.slice(0, Math.max(0, copias.length - GUARDAR_COPIAS))) await fs.rm(path.join(raiz, velha)).catch(() => undefined);
    } catch {
      // ainda não existe arquivo pra copiar
    }
  };

  // Grava no disco com um pequeno atraso (várias mudanças seguidas = uma gravação), sempre em fila.
  const gravarLogo = () => {
    clearTimeout(pendente);
    pendente = setTimeout(() => {
      gravando = gravando.then(async () => {
        await copiaDiaria();
        const tmp = `${arquivo}.tmp`;
        await fs.writeFile(tmp, JSON.stringify(dados), 'utf8');
        await fs.rename(tmp, arquivo);
      }).catch(() => undefined);
    }, 400);
  };

  const avisar = (evento: { nome: string; versao: number; por: string }) => {
    const linha = `data: ${JSON.stringify(evento)}\n\n`;
    for (const r of ouvintes) r.write(linha);
  };

  server.middlewares.use('/api/dados', async (req, res) => {
    try {
      const url = (req.url ?? '/').split('?')[0];

      // Aviso ao vivo: "o store X mudou (versão N)".
      if (url === '/eventos') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' });
        res.write(': ok\n\n');
        ouvintes.add(res);
        const pulso = setInterval(() => res.write(': pulso\n\n'), 20_000);
        req.on('close', () => {
          clearInterval(pulso);
          ouvintes.delete(res);
        });
        return;
      }

      const d = await carregar();

      // Tudo de uma vez (ao abrir o app), ou só as versões (?versoes=1, pra conferir depois de acordar).
      if (url === '/' && req.method === 'GET') {
        const soVersoes = (req.url ?? '').includes('versoes=1');
        const saida: Record<string, Partial<Item>> = {};
        for (const [nome, it] of Object.entries(d.chaves)) saida[nome] = soVersoes ? { versao: it.versao } : { valor: it.valor, versao: it.versao };
        return responder(res, 200, { chaves: saida });
      }

      // Um store só.
      const nome = decodeURIComponent(url.replace(/^\/+/, ''));
      if (!NOME.test(nome)) return responder(res, 404, { erro: 'Nome inválido.' });
      if (req.method === 'GET') {
        const it = d.chaves[nome];
        return it ? responder(res, 200, { valor: it.valor, versao: it.versao }) : responder(res, 404, { erro: 'Ainda não existe.' });
      }
      if (req.method !== 'PUT') return responder(res, 405, { erro: 'Use GET ou PUT.' });

      const corpo = await lerCorpo(req);
      if (typeof corpo.valor !== 'string') return responder(res, 400, { erro: 'Falta o valor.' });
      const base = typeof corpo.base === 'number' ? corpo.base : -1;
      const por = typeof corpo.aparelho === 'string' ? corpo.aparelho.slice(0, 40) : '?';
      const atual = d.chaves[nome];
      // Outro aparelho gravou depois da versão que este conhecia: não atropela. Devolve o atual
      // e o aparelho se atualiza (o mais comum: celular que acordou com dados velhos).
      if (atual && base !== atual.versao && !corpo.forcar) return responder(res, 409, { valor: atual.valor, versao: atual.versao });
      const versao = (atual?.versao ?? 0) + 1;
      d.chaves[nome] = { valor: corpo.valor, versao, em: Date.now(), por };
      gravarLogo();
      avisar({ nome, versao, por });
      return responder(res, 200, { versao });
    } catch (e) {
      return responder(res, 500, { erro: e instanceof Error ? e.message : String(e) });
    }
  });
}
