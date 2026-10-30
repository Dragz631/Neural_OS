import { normalizar } from './importacao';

// Liga matéria ↔ caderno do NotebookLM. O título do caderno nem sempre ajuda
// ("Statistical Measures…" é o de Estatística), então também olha os nomes das
// aulas lá dentro. Se errar, a pessoa troca na tela.

export interface CadernoComFontes {
  id: string;
  titulo: string;
  fontes: { id: string; titulo: string; criadaEm: string }[];
}

const VAZIAS = new Set(['para', 'computacao', 'programacao', 'linguagens', 'linguagem', 'uma', 'variavel']);
const palavras = (s: string) => normalizar(s).split(/[^a-z0-9#]+/).filter((p) => p.length >= 4 && !VAZIAS.has(p));

export function sugerirCaderno(materia: string, cadernos: CadernoComFontes[]): string | undefined {
  const alvo = palavras(materia);
  let melhor: { id: string; pontos: number } | undefined;
  for (const c of cadernos) {
    const titulo = palavras(c.titulo);
    const fontes = palavras(c.fontes.map((f) => f.titulo).join(' '));
    const pontos = alvo.reduce((n, a) => n + (titulo.some((t) => t.startsWith(a.slice(0, 6))) ? 3 : 0) + (fontes.some((t) => t.startsWith(a.slice(0, 6))) ? 2 : 0), 0);
    if (pontos > 0 && (!melhor || pontos > melhor.pontos)) melhor = { id: c.id, pontos };
  }
  return melhor?.id;
}

/** Datas no passado e o que já foi concluído não viram entrega. */
export const pendente = (l: { data?: string; status?: string }, hoje: string) => !/conclu|entregue|feito/i.test(l.status ?? '') && (!l.data || l.data >= hoje);
