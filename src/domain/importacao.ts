import type { Entrega, StatusEntrega, TipoEntrega } from './entregas';
import type { LocalDate, Subject } from './types';

// Importação sob demanda do Notion e do NotebookLM. O app não fala com eles:
// quando o Hugo pede, o Claude lê e grava em Estudos-vault/Neural-OS/import/
//   notion.json      { geradoEm, disciplinas: [...], entregas: [...] }
//   notebooklm.json  { geradoEm, cadernos: [...] }
// e o app mostra só o que é novo (nada duplica ao importar de novo).

export interface DisciplinaNotion {
  notionId: string;
  nome: string;
  /** Anotações dele sobre a disciplina (markdown). Vira contexto do mapa. */
  anotacoes?: string;
}

export interface EntregaNotion {
  notionId: string;
  titulo: string;
  tipo: TipoEntrega;
  prazo?: LocalDate;
  disciplina?: string;
  descricao?: string;
  status?: StatusEntrega;
}

export interface CadernoNotebookLM {
  id: string;
  titulo: string;
  /** Nome da disciplina/matéria a que o caderno pertence, se der pra saber. */
  disciplina?: string;
  resumo: string;
  fontes: string[];
}

export interface Importacao {
  disciplinas: DisciplinaNotion[];
  entregas: EntregaNotion[];
  cadernos: CadernoNotebookLM[];
}

const texto = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const lista = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : []);
const TIPOS: TipoEntrega[] = ['trabalho', 'prova', 'exercicio', 'outro'];
const STATUS: StatusEntrega[] = ['pendente', 'em_curso', 'entregue'];

/** Lê os dois arquivos ignorando o que vier quebrado (melhor importar 9 de 10 do que nada). */
export function lerImportacao(notion: unknown, notebooklm: unknown): Importacao {
  const n = (notion ?? {}) as Record<string, unknown>;
  const nb = (notebooklm ?? {}) as Record<string, unknown>;
  return {
    disciplinas: lista(n.disciplinas).flatMap((d) => {
      const notionId = texto(d.notionId);
      const nome = texto(d.nome);
      return notionId && nome ? [{ notionId, nome, anotacoes: texto(d.anotacoes) }] : [];
    }),
    entregas: lista(n.entregas).flatMap((e) => {
      const notionId = texto(e.notionId);
      const titulo = texto(e.titulo);
      if (!notionId || !titulo) return [];
      const prazo = texto(e.prazo);
      return [
        {
          notionId,
          titulo,
          tipo: TIPOS.includes(e.tipo as TipoEntrega) ? (e.tipo as TipoEntrega) : 'outro',
          prazo: prazo && /^\d{4}-\d{2}-\d{2}$/.test(prazo) ? prazo : undefined,
          disciplina: texto(e.disciplina),
          descricao: texto(e.descricao),
          status: STATUS.includes(e.status as StatusEntrega) ? (e.status as StatusEntrega) : undefined,
        },
      ];
    }),
    cadernos: lista(nb.cadernos).flatMap((c) => {
      const id = texto(c.id);
      const titulo = texto(c.titulo);
      const resumo = texto(c.resumo);
      return id && titulo && resumo
        ? [{ id, titulo, resumo, disciplina: texto(c.disciplina), fontes: Array.isArray(c.fontes) ? c.fontes.filter((f): f is string => typeof f === 'string') : [] }]
        : [];
    }),
  };
}

export const normalizar = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

const PALAVRAS_VAZIAS = new Set(['para', 'como', 'sobre', 'entre', 'com', 'dos', 'das', 'uma', 'introducao', 'aula', 'parte', 'conceitos', 'basico', 'basicos']);

/** Palavras que identificam um assunto (4+ letras, sem acento, sem "introdução", "aula"...). */
export function palavrasChave(texto: string): string[] {
  return [...new Set(normalizar(texto).replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter((p) => p.length >= 4 && !PALAVRAS_VAZIAS.has(p)))];
}

/**
 * Os slides do NotebookLM que combinam com o tópico (pelo título do tópico e dos pais),
 * do mais parecido ao menos, cortados em `max` caracteres no total. Vazio = nenhum combina.
 */
export function fontesDoTopico(fontes: Record<string, { titulo: string; texto: string }> | undefined, tituloTopico: string, pais: string[] = [], max = 6000): { titulo: string; trecho: string }[] {
  if (!fontes) return [];
  const chave = palavrasChave([tituloTopico, ...pais].join(' '));
  if (!chave.length) return [];
  const pontuadas = Object.values(fontes)
    .map((f) => {
      const titulo = normalizar(f.titulo);
      const corpo = normalizar(f.texto.slice(0, 8000));
      const pontos = chave.reduce((s, p) => s + (titulo.includes(p) ? 5 : 0) + Math.min(5, corpo.split(p).length - 1), 0);
      return { f, pontos };
    })
    .filter((x) => x.pontos >= 3)
    .sort((a, b) => b.pontos - a.pontos);
  const out: { titulo: string; trecho: string }[] = [];
  let resto = max;
  for (const { f } of pontuadas.slice(0, 3)) {
    if (resto < 400) break;
    const trecho = f.texto.slice(0, resto);
    out.push({ titulo: f.titulo, trecho });
    resto -= trecho.length;
  }
  return out;
}

/** Mesmo nome, ignorando acento/maiúscula, ou um contém o outro ("C#" ~ "C# / POO"). */
export function mesmoNome(a: string, b: string): boolean {
  const x = normalizar(a);
  const y = normalizar(b);
  return x === y || (x.length >= 3 && y.includes(x)) || (y.length >= 3 && x.includes(y));
}

/** Cadernos do NotebookLM que falam dessa disciplina. */
export function cadernosDe(nome: string, cadernos: CadernoNotebookLM[]): CadernoNotebookLM[] {
  return cadernos.filter((c) => mesmoNome(c.disciplina ?? c.titulo, nome));
}

/** Contexto pro Prof.: anotações do Notion + resumo dos cadernos do NotebookLM. */
export function contextoDe(nome: string, anotacoes: string | undefined, cadernos: CadernoNotebookLM[]): string {
  const partes = [anotacoes ? `Anotações do Notion:\n${anotacoes}` : ''];
  for (const c of cadernosDe(nome, cadernos)) {
    partes.push(`Caderno do NotebookLM "${c.titulo}":\n${c.resumo}${c.fontes.length ? `\nFontes: ${c.fontes.join('; ')}` : ''}`);
  }
  return partes.filter(Boolean).join('\n\n');
}

export interface Novidades {
  disciplinas: DisciplinaNotion[];
  entregas: EntregaNotion[];
  /** Cadernos de matérias que já existem no app (viram contexto delas). */
  cadernos: { caderno: CadernoNotebookLM; subject: Subject }[];
}

/** O que ainda não está no app nem foi dispensado por ele. */
export function novidades(imp: Importacao, subjects: Subject[], entregas: Entrega[], vistos: Set<string>): Novidades {
  const notionIds = new Set(entregas.map((e) => e.notionId).filter(Boolean));
  return {
    disciplinas: imp.disciplinas.filter((d) => !vistos.has(d.notionId) && !subjects.some((s) => mesmoNome(s.name, d.nome))),
    entregas: imp.entregas.filter((e) => !vistos.has(e.notionId) && !notionIds.has(e.notionId)),
    cadernos: imp.cadernos.flatMap((caderno) => {
      if (vistos.has(caderno.id)) return [];
      const subject = subjects.find((s) => mesmoNome(caderno.disciplina ?? caderno.titulo, s.name));
      return subject ? [{ caderno, subject }] : [];
    }),
  };
}

/** Categoria da entrega pelo nome da disciplina (melhor palpite; ele pode trocar). */
export function categoriaPorDisciplina(nome?: string): Entrega['categoria'] {
  const n = normalizar(nome ?? '');
  if (/web|front|back|html|css|javascript/.test(n)) return 'web';
  if (/poo|objeto|c#|paradigma|programacao/.test(n)) return 'paradigmas';
  if (/calculo|matematica|lfa|automato|logica|estatistica/.test(n)) return 'calculos';
  return n ? 'estudos' : 'outro';
}
