// Grade semanal: lê a tabela do Notion (hora × dia) e vira blocos do dia.
// Formato da tabela:
//   Hora  | Segunda | Terça | ...
//   Materia | CÁLCULO… Sala: X | ...
//   8:00  | Faculdade | ...
// Dia = getDay() (0 = domingo). Nada aqui conhece o Notion, só as células.

export type TipoBloco = 'aula' | 'rotina';

export interface BlocoGrade {
  dia: number;
  /** Minutos desde 00:00. */
  inicio: number;
  fim: number;
  tipo: TipoBloco;
  rotulo: string;
  materia?: string;
  sala?: string;
}

const DIAS: Record<string, number> = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
const semAcento = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();

const paraMinutos = (h: string) => {
  const m = h.trim().match(/^(\d{1,2}):(\d{2})$/);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

export const paraHora = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** "CÁLCULO DE UMA VARIÁVEL / Sala: TJA216" → nome bonito + sala. */
export function lerMateria(celula: string): { materia: string; sala?: string } | null {
  const limpo = celula.replace(/\s+/g, ' ').trim();
  if (!limpo) return null;
  const [nome, sala] = limpo.split(/sala:/i);
  const pequenas = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'para', 'a', 'o']);
  const materia = nome
    .trim()
    .toLowerCase()
    .split(' ')
    .map((p, i) => (i > 0 && pequenas.has(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(' ');
  return { materia, sala: sala?.trim() || undefined };
}

export function lerGrade(linhas: string[][]): BlocoGrade[] {
  const cabecalho = linhas[0] ?? [];
  const colunas = cabecalho.map((c) => DIAS[semAcento(c).replace(/-feira/, '').split(' ')[0]]);
  const linhaMateria = linhas.find((l) => semAcento(l[0] ?? '').startsWith('materia'));
  const horas = linhas.filter((l) => paraMinutos(l[0] ?? '') !== null);
  const blocos: BlocoGrade[] = [];

  colunas.forEach((dia, col) => {
    if (dia === undefined) return;
    const info = lerMateria(linhaMateria?.[col] ?? '');
    let atual: BlocoGrade | undefined;
    horas.forEach((linha, i) => {
      const rotulo = (linha[col] ?? '').trim();
      const inicio = paraMinutos(linha[0])!;
      const fim = paraMinutos(horas[i + 1]?.[0] ?? '') ?? inicio + 60;
      if (atual && atual.rotulo === rotulo) {
        atual.fim = fim;
        return;
      }
      atual = undefined;
      if (!rotulo) return;
      const aula = /faculdade|aula/i.test(rotulo);
      atual = { dia, inicio, fim, rotulo, tipo: aula ? 'aula' : 'rotina', ...(aula && info ? { materia: info.materia, sala: info.sala } : {}) };
      blocos.push(atual);
    });
  });
  return blocos;
}

/** Matérias da grade, sem repetir. */
export const materiasDaGrade = (blocos: BlocoGrade[]) => [...new Set(blocos.flatMap((b) => (b.materia ? [b.materia] : [])))];

/** Aulas de um dia da semana. */
export const aulasDoDia = (blocos: BlocoGrade[], dia: number) => blocos.filter((b) => b.dia === dia && b.tipo === 'aula').sort((a, b) => a.inicio - b.inicio);
