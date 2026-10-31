import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { ViteDevServer } from 'vite';

// Pastas que o professor pode ler: o COFRE do Obsidian (onde o app também grava) e
// PASTAS EXTRAS de fontes (anotações, resumos, PDFs convertidos... qualquer pasta com .md/.txt).
// A pessoa escolhe clicando num botão: o servidor abre a janela de escolher pasta do próprio
// sistema (o navegador não consegue devolver o caminho da pasta). Fica em fontes.local.json
// (só neste PC, fora do git). Só roda em localhost.

interface Extra {
  id: string;
  nome: string;
  caminho: string;
}
interface Config {
  cofre?: string;
  extras: Extra[];
}

const EXT_LIDAS = ['.md', '.txt'];
const IGNORAR = new Set(['node_modules', '.git', '.obsidian', '.trash', '.venv', 'dist']);
const MAX_ARQUIVOS = 2000;
const MAX_LEITURA = 60_000; // bytes lidos de cada arquivo ao buscar

function responder(res: ServerResponse, status: number, dados: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(dados));
}

function lerCorpo(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let corpo = '';
    req.on('data', (c: Buffer) => {
      corpo += c.toString('utf8');
      if (corpo.length > 100_000) reject(new Error('Pedido grande demais'));
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
}

/** Abre a janela "escolher pasta" do sistema e devolve o caminho (ou null se a pessoa cancelou). */
export function escolherPastaNoSistema(titulo: string): Promise<string | null> {
  return new Promise((resolve, reject) => {
    let cmd: string;
    let args: string[];
    if (process.platform === 'win32') {
      // A janela precisa de um "dono" sempre por cima, senão abre escondida atrás do navegador.
      const ps = [
        '[Console]::OutputEncoding=[Text.Encoding]::UTF8',
        'Add-Type -AssemblyName System.Windows.Forms',
        '$f=New-Object System.Windows.Forms.Form; $f.TopMost=$true; $f.ShowInTaskbar=$false; $f.StartPosition="CenterScreen"; $f.Opacity=0; $f.Show()',
        '$d=New-Object System.Windows.Forms.FolderBrowserDialog',
        `$d.Description='${titulo.replace(/'/g, "''")}'`,
        '$d.ShowNewFolderButton=$true',
        'if($d.ShowDialog($f) -eq "OK"){ Write-Output $d.SelectedPath }',
        '$f.Close()',
      ].join('; ');
      cmd = 'powershell.exe';
      args = ['-NoProfile', '-STA', '-NonInteractive', '-Command', ps];
    } else if (process.platform === 'darwin') {
      cmd = 'osascript';
      args = ['-e', `POSIX path of (choose folder with prompt "${titulo.replace(/"/g, '')}")`];
    } else {
      cmd = 'zenity';
      args = ['--file-selection', '--directory', `--title=${titulo}`];
    }
    execFile(cmd, args, { timeout: 5 * 60_000, windowsHide: false, encoding: 'utf8' }, (erro, stdout) => {
      const caminho = stdout?.trim().replace(/\/$/, '') || null;
      if (erro && !caminho) {
        // zenity/osascript devolvem erro quando a pessoa cancela; só é erro de verdade se o comando não existe.
        if ((erro as NodeJS.ErrnoException).code === 'ENOENT') return reject(new Error('Este computador não tem uma janela de escolher pasta disponível. Cole o caminho da pasta no campo abaixo.'));
        return resolve(null);
      }
      resolve(caminho);
    });
  });
}

/** Quantas notas (.md/.txt) a pasta tem, e se é um cofre do Obsidian. */
async function inspecionar(caminho: string): Promise<{ existe: boolean; ehObsidian: boolean; notas: number }> {
  try {
    const st = await fs.stat(caminho);
    if (!st.isDirectory()) return { existe: false, ehObsidian: false, notas: 0 };
  } catch {
    return { existe: false, ehObsidian: false, notas: 0 };
  }
  const ehObsidian = await fs
    .stat(path.join(caminho, '.obsidian'))
    .then((s) => s.isDirectory())
    .catch(() => false);
  let notas = 0;
  const fila = [caminho];
  while (fila.length && notas < MAX_ARQUIVOS) {
    const dir = fila.pop()!;
    for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
      if (e.isDirectory()) {
        if (!IGNORAR.has(e.name) && !e.name.startsWith('.')) fila.push(path.join(dir, e.name));
      } else if (EXT_LIDAS.includes(path.extname(e.name).toLowerCase())) notas++;
    }
  }
  return { existe: true, ehObsidian, notas };
}

const semAcento = (s: string) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

export function criarPastas(raiz: string, envCofre?: string) {
  const arquivo = path.join(raiz, 'fontes.local.json');

  const ler = async (): Promise<Config> => {
    try {
      const c = JSON.parse(await fs.readFile(arquivo, 'utf8')) as Partial<Config>;
      return { cofre: typeof c.cofre === 'string' ? c.cofre : undefined, extras: Array.isArray(c.extras) ? c.extras.filter((e) => e && typeof e.caminho === 'string') : [] };
    } catch {
      return { extras: [] };
    }
  };
  const gravar = (c: Config) => fs.writeFile(arquivo, JSON.stringify(c, null, 2), 'utf8');

  /** O cofre em uso: o escolhido no app; se não, o que estava no .env.local (jeito antigo). */
  const cofre = async () => (await ler()).cofre || envCofre || undefined;

  const estado = async () => {
    const c = await ler();
    const caminhoCofre = c.cofre || envCofre;
    return {
      cofre: caminhoCofre ? { caminho: caminhoCofre, origem: c.cofre ? 'app' : 'env', ...(await inspecionar(caminhoCofre)) } : null,
      extras: await Promise.all(c.extras.map(async (e) => ({ ...e, ...(await inspecionar(e.caminho)) }))),
      plataforma: process.platform,
    };
  };

  /** Procura nos .md/.txt do cofre e das pastas extras e devolve trechos que citam os termos. */
  const buscar = async (termos: string[], max = 4) => {
    const c = await ler();
    const bases = [...(c.cofre || envCofre ? [{ nome: 'Cofre', caminho: (c.cofre || envCofre)! }] : []), ...c.extras.map((e) => ({ nome: e.nome, caminho: e.caminho }))];
    const alvo = termos.map(semAcento).filter((t) => t.length >= 3);
    if (!alvo.length || !bases.length) return [];
    const achados: { fonte: string; arquivo: string; trecho: string; pontos: number }[] = [];
    let vistos = 0;
    for (const base of bases) {
      const fila = [base.caminho];
      while (fila.length && vistos < MAX_ARQUIVOS) {
        const dir = fila.pop()!;
        for (const e of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
          const cheio = path.join(dir, e.name);
          if (e.isDirectory()) {
            // O diário do aluno NÃO é fonte de conhecimento (ver LEIA-ME dessa pasta).
            if (!IGNORAR.has(e.name) && !e.name.startsWith('.') && !e.name.startsWith('_Diario-do-Aluno')) fila.push(cheio);
            continue;
          }
          if (!EXT_LIDAS.includes(path.extname(e.name).toLowerCase())) continue;
          vistos++;
          if (vistos > MAX_ARQUIVOS) break;
          const texto = (await fs.readFile(cheio, { encoding: 'utf8' }).catch(() => '')).slice(0, MAX_LEITURA);
          const limpo = semAcento(texto);
          const nome = semAcento(e.name);
          let pontos = 0;
          for (const t of alvo) {
            if (nome.includes(t)) pontos += 6;
            pontos += Math.min(limpo.split(t).length - 1, 8);
          }
          if (pontos < 3) continue;
          // O trecho: a janela de 900 letras ao redor da primeira aparição do termo mais forte.
          const primeiro = alvo.map((t) => limpo.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0;
          achados.push({ fonte: base.nome, arquivo: path.relative(base.caminho, cheio), trecho: texto.slice(Math.max(0, primeiro - 150), primeiro + 750).trim(), pontos });
        }
      }
    }
    return achados.sort((a, b) => b.pontos - a.pontos).slice(0, max).map(({ pontos: _p, ...r }) => r);
  };

  return { cofre, estado, buscar, ler, gravar };
}

export type Pastas = ReturnType<typeof criarPastas>;

export function registrarPastas(server: ViteDevServer, pastas: Pastas) {
  server.middlewares.use('/api/pastas', async (req, res) => {
    try {
      const rota = (req.url ?? '/').split('?')[0];
      if (req.method === 'GET' && rota === '/') return responder(res, 200, await pastas.estado());
      if (req.method === 'GET' && rota === '/buscar') {
        const q = new URL(req.url ?? '/', 'http://x').searchParams.get('q') ?? '';
        return responder(res, 200, { trechos: await pastas.buscar(q.split(/[,;|]/).map((s) => s.trim()).filter(Boolean)) });
      }
      if (req.method !== 'POST') return responder(res, 405, { erro: 'Use POST' });
      const corpo = await lerCorpo(req);
      const cfg = await pastas.ler();

      // Botão "Escolher pasta": abre a janela do sistema. `caminho` (colado à mão) serve de plano B.
      if (rota === '/escolher') {
        const papel = corpo.papel === 'cofre' ? 'cofre' : 'extra';
        const colado = typeof corpo.caminho === 'string' ? corpo.caminho.trim() : '';
        const caminho = colado || (await escolherPastaNoSistema(papel === 'cofre' ? 'Escolha a pasta do seu cofre do Obsidian' : 'Escolha uma pasta com anotações ou materiais de estudo'));
        if (!caminho) return responder(res, 200, { cancelado: true });
        const info = await inspecionar(path.resolve(caminho));
        if (!info.existe) return responder(res, 400, { erro: 'Essa pasta não existe. Confira o caminho.' });
        const abs = path.resolve(caminho);
        if (papel === 'cofre') cfg.cofre = abs;
        else if (!cfg.extras.some((e) => e.caminho === abs)) cfg.extras.push({ id: Date.now().toString(36), nome: path.basename(abs) || abs, caminho: abs });
        await pastas.gravar(cfg);
        return responder(res, 200, { ok: true, caminho: abs, ...info });
      }

      if (rota === '/remover') {
        if (corpo.id === 'cofre') delete cfg.cofre;
        else cfg.extras = cfg.extras.filter((e) => e.id !== corpo.id);
        await pastas.gravar(cfg);
        return responder(res, 200, { ok: true });
      }
      return responder(res, 404, { erro: 'Rota não encontrada.' });
    } catch (e) {
      return responder(res, 500, { erro: e instanceof Error ? e.message : String(e) });
    }
  });
}
