import type { Id, LocalDate } from './types';

// College Tracker: trabalhos, provas e listas da faculdade.

export type StatusEntrega = 'pendente' | 'em_curso' | 'entregue';
export type CategoriaEntrega = 'web' | 'paradigmas' | 'calculos' | 'estudos' | 'outro';
export type TipoEntrega = 'trabalho' | 'prova' | 'exercicio' | 'outro';

export interface Entrega {
  id: Id;
  titulo: string;
  status: StatusEntrega;
  tipo: TipoEntrega;
  categoria: CategoriaEntrega;
  tags: string[];
  prazo?: LocalDate;
  descricao?: string;
  xp: number;
  subjectId?: Id;
  /** Quando veio do Notion (pra não duplicar ao importar de novo). */
  notionId?: string;
  criadaEm: string;
  entregueEm?: string;
  /** XP já pago (voltar o status e entregar de novo não paga outra vez). */
  xpPago?: boolean;
}

export const CATEGORIA: Record<CategoriaEntrega, { rotulo: string; cor: string }> = {
  web: { rotulo: 'WEB / BACKEND', cor: 'var(--color-accent)' },
  paradigmas: { rotulo: 'PARADIGMAS & POO', cor: 'var(--color-info)' },
  calculos: { rotulo: 'CÁLCULO & EXATAS', cor: 'var(--color-warn)' },
  estudos: { rotulo: 'ESTUDOS GERAIS', cor: '#c084fc' },
  outro: { rotulo: 'OUTRO', cor: 'var(--color-muted)' },
};

export const STATUS: Record<StatusEntrega, { rotulo: string; cor: string }> = {
  pendente: { rotulo: 'PENDENTE', cor: 'var(--color-warn)' },
  em_curso: { rotulo: 'EM CURSO', cor: 'var(--color-info)' },
  entregue: { rotulo: 'ENTREGUE ✓', cor: 'var(--color-accent)' },
};

/** XP de cada tipo de entrega (pago uma vez, ao entregar). */
export const XP_POR_TIPO: Record<TipoEntrega, number> = { prova: 200, trabalho: 150, exercicio: 80, outro: 60 };

/** pendente → em curso → entregue → pendente */
export const proximoStatus = (s: StatusEntrega): StatusEntrega =>
  s === 'pendente' ? 'em_curso' : s === 'em_curso' ? 'entregue' : 'pendente';

/** Entregas abertas, da mais urgente pra menos (sem prazo vai pro fim). */
export const ordenarPorPrazo = (lista: Entrega[]) =>
  lista
    .filter((e) => e.status !== 'entregue')
    .sort((a, b) => (a.prazo ?? '9999').localeCompare(b.prazo ?? '9999'));
