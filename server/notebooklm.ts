import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Ponte com o NotebookLM pela CLI `notebooklm` (notebooklm-py, não oficial).
// Cada caderno = uma matéria; cada fonte = uma aula (PDF dos slides).
// O texto das aulas fica em cache no PC (não muda), as listas por 10 min.
// Se o Google mudar o site: atualizar a lib (`pip install -U notebooklm-py`)
// no venv dela e, se pedir, `notebooklm login`.

export interface Caderno {
  id: string;
  titulo: string;
}
export interface Fonte {
  id: string;
  titulo: string;
  tipo: string;
  criadaEm: string;
}

const LISTA_MS = 10 * 60 * 1000;

export function criarNotebookLM(raiz: string, env: () => Promise<Record<string, string>>) {
  const cachePath = path.join(raiz, 'notebooklm.cache.local.json');
  type Cache = { listas: Record<string, { quando: number; dados: unknown }>; textos: Record<string, string> };
  let cache: Cache | null = null;

  const lerCache = async (): Promise<Cache> => {
    if (cache) return cache;
    try {
      cache = JSON.parse(await fs.readFile(cachePath, 'utf8')) as Cache;
    } catch {
      cache = { listas: {}, textos: {} };
    }
    return cache;
  };
  const gravarCache = async () => cache && fs.writeFile(cachePath, JSON.stringify(cache), 'utf8');

  /** Onde estão a CLI, o python dela e os navegadores (dá pra trocar no .env.local). */
  const caminhos = async () => {
    const e = await env();
    const pasta = e.NOTEBOOKLM_VENV || path.resolve(raiz, '..', '..', '..', '.notebooklm-venv');
    const navegadores = e.PLAYWRIGHT_BROWSERS_PATH || path.resolve(raiz, '..', '..', '..', '.playwright-browsers');
    return {
      bin: path.join(pasta, 'Scripts', 'notebooklm.exe'),
      python: path.join(pasta, 'Scripts', 'python.exe'),
      perfil: path.join(os.homedir(), '.notebooklm', 'profiles', 'default', 'browser_profile'),
      // HEADLESS_REAUTH: quando o acesso vence, a lib tenta renovar sozinha usando a
      // sessão do Google guardada no perfil dela (sem abrir janela).
      ambiente: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: navegadores, PYTHONIOENCODING: 'utf-8', NOTEBOOKLM_HEADLESS_REAUTH: '1' },
    };
  };

  /** Roda a CLI com --json e devolve o objeto (ou lança com a mensagem dela). */
  const rodar = async (args: string[]): Promise<Record<string, unknown>> => {
    const { bin, ambiente } = await caminhos();
    const saida = await new Promise<string>((ok, falha) =>
      execFile(bin, [...args, '--json'], { timeout: 120_000, windowsHide: true, maxBuffer: 20_000_000, env: ambiente }, (erro, stdout) => {
        if (stdout?.trim()) return ok(stdout);
        falha(new Error(erro?.code === 'ENOENT' ? 'NotebookLM não instalado neste PC (CLI notebooklm).' : `NotebookLM não respondeu: ${erro?.message ?? 'sem saída'}`));
      }),
    );
    const dados = JSON.parse(saida) as Record<string, unknown>;
    if (dados.error) throw new Error(`NotebookLM: ${String(dados.message ?? dados.code)}`);
    return dados;
  };

  const lista = async <T>(chave: string, buscar: () => Promise<T>, forcar = false): Promise<T> => {
    const c = await lerCache();
    const guardado = c.listas[chave];
    if (!forcar && guardado && Date.now() - guardado.quando < LISTA_MS) return guardado.dados as T;
    const dados = await buscar();
    c.listas[chave] = { quando: Date.now(), dados };
    await gravarCache();
    return dados;
  };

  // Login pelo botão do app: abre a janela do Google; quem digita é a pessoa.
  let login: { fase: 'parado' | 'janela' | 'capturando' | 'pronto' | 'erro'; erro?: string } = { fase: 'parado' };

  const capturar = async () => {
    const { bin, ambiente } = await caminhos();
    await new Promise<void>((ok, falha) =>
      execFile(bin, ['login', '--browser-timeout', '120'], { timeout: 180_000, windowsHide: true, env: ambiente }, (erro) => (erro ? falha(erro) : ok())),
    );
  };

  const entrar = async () => {
    if (login.fase === 'janela' || login.fase === 'capturando') return;
    const { python, perfil, ambiente } = await caminhos();
    login = { fase: 'janela' };
    const janela = spawn(python, ['-I', path.join(import.meta.dirname, 'notebooklm_entrar.py'), perfil], { env: ambiente });
    let saida = '';
    janela.stdout.on('data', (d: Buffer) => (saida += d.toString('utf8')));
    janela.on('error', () => (login = { fase: 'erro', erro: 'Não consegui abrir a janela: o NotebookLM não está instalado neste PC.' }));
    janela.on('close', () => {
      if (login.fase !== 'janela') return;
      if (!saida.includes('LOGIN_OK')) {
        login = { fase: 'erro', erro: 'A janela fechou antes do login terminar. Tente de novo.' };
        return;
      }
      login = { fase: 'capturando' };
      capturar()
        .then(async () => {
          const c = await lerCache();
          delete c.listas.cadernos; // a lista antiga pode ter sido a do erro
          login = { fase: 'pronto' };
        })
        .catch((e: unknown) => (login = { fase: 'erro', erro: `Entrou no Google, mas não consegui guardar o acesso: ${e instanceof Error ? e.message : e}` }));
    });
  };

  /** Cutucão: a sessão do Google esfria parada; a lib pede um a cada 15-20 min. */
  const cutucar = async () => {
    const { bin, ambiente } = await caminhos();
    await new Promise<void>((ok) => execFile(bin, ['auth', 'refresh'], { timeout: 90_000, windowsHide: true, env: ambiente }, () => ok()));
  };

  return {
    entrar,
    cutucar,
    statusLogin: () => login,
    cadernos: (forcar = false) =>
      lista('cadernos', async () => ((await rodar(['list'])).notebooks as { id: string; title: string }[]).map((n) => ({ id: n.id, titulo: n.title })), forcar) as Promise<Caderno[]>,

    fontes: (caderno: string, forcar = false) =>
      lista(
        `fontes:${caderno}`,
        async () =>
          ((await rodar(['source', 'list', '-n', caderno])).sources as { id: string; title: string; type: string; created_at: string }[]).map((s) => ({
            id: s.id,
            titulo: s.title,
            tipo: s.type,
            criadaEm: s.created_at,
          })),
        forcar,
      ) as Promise<Fonte[]>,

    /** Texto inteiro de uma aula (slides). Não muda: fica em cache pra sempre. */
    texto: async (caderno: string, fonte: string): Promise<string> => {
      const c = await lerCache();
      if (c.textos[fonte]) return c.textos[fonte];
      const t = String((await rodar(['source', 'fulltext', fonte, '-n', caderno])).content ?? '');
      c.textos[fonte] = t;
      await gravarCache();
      return t;
    },

    /** Pergunta ao caderno (responde com base nas fontes dele). */
    perguntar: async (caderno: string, pergunta: string): Promise<string> => {
      const r = await rodar(['ask', pergunta, '-n', caderno]);
      return String(r.answer ?? r.response ?? r.text ?? '');
    },
  };
}

export type NotebookLM = ReturnType<typeof criarNotebookLM>;
