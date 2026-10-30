import fs from 'node:fs/promises';
import path from 'node:path';
import type { Armazem } from '../conexoes/armazem.ts';
import { chamarNotion, tituloDe } from './cliente.ts';

// Lê a página "Faculdade…" do Notion e devolve tudo num objeto só. Não usa ids
// fixos: acha os bancos andando pela página (serve pra outra pessoa também).
// Só olha as páginas de faculdade e de estudo; o resto que a conexão enxergar
// o professor não toca.

interface Bloco {
  id: string;
  type: string;
  has_children: boolean;
  [k: string]: unknown;
}
type Prop = { type: string; [k: string]: unknown };
interface Linha {
  id: string;
  properties: Record<string, Prop>;
}

export interface LinhaFaculdade {
  notionId: string;
  titulo: string;
  data?: string;
  status?: string;
  tags: string[];
}

export interface Faculdade {
  lidaEm: string;
  pagina: string;
  gradeLinhas: string[][];
  disciplinas: (LinhaFaculdade & { online: boolean })[];
  estudos: LinhaFaculdade[];
  trabalhos: LinhaFaculdade[];
  provas: LinhaFaculdade[];
  exercicios: LinhaFaculdade[];
  calendario: LinhaFaculdade[];
  tarefas: { texto: string; feita: boolean }[];
  lembretes: string[];
}

const textoDe = (r: unknown) => ((r as { plain_text: string }[] | undefined) ?? []).map((t) => t.plain_text).join('');
const CACHE_MS = 30 * 60 * 1000;

async function filhos(a: Armazem, id: string): Promise<Bloco[]> {
  const todos: Bloco[] = [];
  let cursor: string | undefined;
  do {
    const r = await chamarNotion<{ results: Bloco[]; next_cursor: string | null }>(a, 'GET', `/blocks/${id}/children?page_size=100${cursor ? `&start_cursor=${cursor}` : ''}`);
    todos.push(...r.results);
    cursor = r.next_cursor ?? undefined;
  } while (cursor);
  return todos;
}

async function linhasDoBanco(a: Armazem, id: string): Promise<LinhaFaculdade[]> {
  const todas: Linha[] = [];
  let cursor: string | undefined;
  do {
    const r = await chamarNotion<{ results: Linha[]; next_cursor: string | null }>(a, 'POST', `/databases/${id}/query`, { page_size: 100, start_cursor: cursor });
    todas.push(...r.results);
    cursor = r.next_cursor ?? undefined;
  } while (cursor);
  return todas
    .map((l) => {
      const props = Object.values(l.properties);
      const data = props.find((p) => p.type === 'date') as { date?: { start?: string } } | undefined;
      const status = props.find((p) => p.type === 'status' || p.type === 'select') as { status?: { name: string }; select?: { name: string } } | undefined;
      const tags = props.filter((p) => p.type === 'multi_select').flatMap((p) => (p.multi_select as { name: string }[]).map((t) => t.name));
      return { notionId: l.id, titulo: tituloDe(l as never).trim(), data: data?.date?.start?.slice(0, 10), status: status?.status?.name ?? status?.select?.name, tags };
    })
    .filter((l) => l.titulo);
}

/** Anda pela página juntando bancos (com o rótulo da aba onde estão), tabela, tarefas e lembretes. */
async function varrer(a: Armazem, id: string, rotulo: string, achado: { bancos: { id: string; nome: string }[]; tabela?: string; tarefas: Faculdade['tarefas']; lembretes: string[] }, emLembrete = false) {
  for (const b of await filhos(a, id)) {
    const dados = b[b.type] as { rich_text?: unknown; title?: string; checked?: boolean } | undefined;
    const texto = textoDe(dados?.rich_text).trim();
    if (b.type === 'child_database') achado.bancos.push({ id: b.id, nome: `${rotulo} ${dados?.title ?? ''}`.trim() }); // a aba dá o nome: banco novo vem como "New database"
    else if (b.type === 'table' && !achado.tabela) achado.tabela = b.id;
    else if (b.type === 'to_do' && texto) achado.tarefas.push({ texto, feita: !!dados?.checked });
    else if (emLembrete && b.type === 'paragraph' && texto) achado.lembretes.push(texto);
    if ((b.has_children || b.type === 'tab') && b.type !== 'child_page' && b.type !== 'child_database') {
      await varrer(a, b.id, b.type === 'paragraph' && texto ? texto : rotulo, achado, emLembrete || (b.type === 'callout' && /lembrete/i.test(texto)));
    }
  }
}

async function acharPagina(a: Armazem, padrao: RegExp): Promise<{ id: string; titulo: string } | undefined> {
  const r = await chamarNotion<{ results: { id: string; parent?: { type?: string } }[] }>(a, 'POST', '/search', { query: 'Faculdade', filter: { property: 'object', value: 'page' }, page_size: 50 });
  const raiz = r.results.filter((p) => p.parent?.type === 'workspace').map((p) => ({ id: p.id, titulo: tituloDe(p as never) }));
  return raiz.find((p) => padrao.test(p.titulo));
}

export async function lerFaculdade(a: Armazem, raiz: string, forcar = false): Promise<Faculdade> {
  const cachePath = path.join(raiz, 'notion.cache.local.json');
  if (!forcar) {
    const guardada = await fs.readFile(cachePath, 'utf8').then((t) => JSON.parse(t) as Faculdade).catch(() => null);
    if (guardada && Date.now() - new Date(guardada.lidaEm).getTime() < CACHE_MS) return guardada;
  }
  const pagina = await acharPagina(a, /faculdade/i);
  if (!pagina) throw new Error('Não achei a página "Faculdade…" no Notion. Ela foi compartilhada com a conexão?');

  const achado: Parameters<typeof varrer>[3] = { bancos: [], tarefas: [], lembretes: [] };
  await varrer(a, pagina.id, '', achado);

  const banco = async (padrao: RegExp, nao?: RegExp) => {
    const b = achado.bancos.find((x) => padrao.test(x.nome) && !nao?.test(x.nome));
    return b ? linhasDoBanco(a, b.id) : [];
  };
  const linhasTabela = achado.tabela ? await filhos(a, achado.tabela) : [];
  const fac: Faculdade = {
    lidaEm: new Date().toISOString(),
    pagina: pagina.titulo,
    gradeLinhas: linhasTabela.map((l) => (l.table_row as { cells: unknown[] }).cells.map(textoDe)),
    disciplinas: [...(await banco(/^disciplinas/i, /online/i)).map((d) => ({ ...d, online: false })), ...(await banco(/disciplinas online/i)).map((d) => ({ ...d, online: true }))],
    estudos: await banco(/^estudos/i),
    trabalhos: await banco(/trabalho/i),
    provas: await banco(/prova/i),
    exercicios: await banco(/exerc/i),
    calendario: await banco(/cal[eé]ndario/i),
    tarefas: achado.tarefas,
    lembretes: achado.lembretes,
  };
  await fs.writeFile(cachePath, JSON.stringify(fac), 'utf8');
  return fac;
}
