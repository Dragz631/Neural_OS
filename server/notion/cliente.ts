import type { Armazem } from '../conexoes/armazem.ts';

// Cliente mínimo da API do Notion. A chave (NOTION_TOKEN) mora no .env.local
// e é relida a cada pedido. O Prof. A.Ilson LÊ as páginas do Hugo e só
// ESCREVE nas que ele mesmo criou (a trava fica em escrita.ts).

const BASE = 'https://api.notion.com/v1';
const VERSAO = '2022-06-28';

export class ErroNotion extends Error {
  status: number;
  constructor(msg: string, status: number) {
    super(msg);
    this.status = status;
  }
}

export async function chamarNotion<T = unknown>(armazem: Armazem, metodo: 'GET' | 'POST' | 'PATCH', rota: string, corpo?: unknown): Promise<T> {
  const token = (await armazem.lerEnv()).NOTION_TOKEN;
  if (!token) throw new ErroNotion('Notion não conectado: cole a chave da integração em Conexões.', 401);
  const res = await fetch(`${BASE}${rota}`, {
    method: metodo,
    headers: { Authorization: `Bearer ${token}`, 'Notion-Version': VERSAO, 'Content-Type': 'application/json' },
    body: corpo ? JSON.stringify(corpo) : undefined,
    signal: AbortSignal.timeout(30_000),
  });
  const dados = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) throw new ErroNotion(`Notion respondeu ${res.status}: ${dados.message ?? ''}`.trim(), res.status);
  return dados as T;
}

/** Título de uma página ou banco, venha de onde vier. */
export function tituloDe(obj: { properties?: Record<string, { type?: string; title?: { plain_text: string }[] }>; title?: { plain_text: string }[] }): string {
  if (obj.title?.length) return obj.title.map((t) => t.plain_text).join('');
  const prop = Object.values(obj.properties ?? {}).find((p) => p.type === 'title');
  return prop?.title?.map((t) => t.plain_text).join('') ?? '(sem título)';
}
