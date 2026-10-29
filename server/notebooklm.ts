import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
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

  /** Roda a CLI com --json e devolve o objeto (ou lança com a mensagem dela). */
  const rodar = async (args: string[]): Promise<Record<string, unknown>> => {
    const e = await env();
    const bin = e.NOTEBOOKLM_BIN || path.resolve(raiz, '..', '..', '..', '.notebooklm-venv', 'Scripts', 'notebooklm.exe');
    const navegadores = e.PLAYWRIGHT_BROWSERS_PATH || path.resolve(raiz, '..', '..', '..', '.playwright-browsers');
    const saida = await new Promise<string>((ok, falha) =>
      execFile(bin, [...args, '--json'], { timeout: 120_000, windowsHide: true, maxBuffer: 20_000_000, // HEADLESS_REAUTH: quando o acesso vence, a lib renova sozinha usando a
        // sessão do Google guardada no perfil dela (sem abrir janela).
        env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: navegadores, PYTHONIOENCODING: 'utf-8', NOTEBOOKLM_HEADLESS_REAUTH: '1' } }, (erro, stdout) => {
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

  return {
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
