import { addDays, parseLocalDate } from './dates';
import type { Entrega } from './entregas';
import { aulasDoDia, paraHora, type BlocoGrade } from './grade';
import type { Energy, Id, LocalDate, PlanItem, SessionKind, Topic } from './types';

// A semana já pronta: aulas da grade, prazos, revisões e estudo, tudo no lugar.
// No dia, a energia só ENCOLHE o estudo (as aulas e os prazos não mudam). O que
// foi cortado não some: vira prioridade de revisão no dia seguinte.

export type TipoLinha = 'aula' | 'rotina' | 'prazo' | 'evento' | 'revisao' | 'estudo';

export interface Linha {
  chave: string;
  tipo: TipoLinha;
  titulo: string;
  /** Duração do estudo (aula/rotina usam `hora`). */
  minutos?: number;
  /** Duração original, quando a energia encurtou. */
  minutosOriginais?: number;
  hora?: string;
  sala?: string;
  topicId?: Id;
  kind?: SessionKind;
  /** Pode encolher ou ser adiado. Aula, prazo e evento nunca mudam. */
  flexivel: boolean;
  feito?: boolean;
}

export interface FontesSemana {
  blocos: BlocoGrade[];
  entregas: Pick<Entrega, 'id' | 'titulo' | 'prazo' | 'status'>[];
  eventos: { id: string; titulo: string; data: LocalDate }[];
  topics: Topic[];
  subjects: { id: Id; name: string }[];
  /** Itens que a pessoa mesma planejou naquele dia. */
  planejados: PlanItem[];
  /** Tópico "próximo" de uma matéria (pra revisão da aula apontar pra algum lugar). */
  proximoDe: (nomeMateria: string) => Topic | undefined;
}

const REVISAO_AULA_MIN = 20;
const REVISAO_VENCIDA_MIN = 10;

/** O dia como ele é quando você está com a energia lá em cima. */
export function diaBase(dia: LocalDate, f: FontesSemana): Linha[] {
  const semana = parseLocalDate(dia).getDay();
  const linhas: Linha[] = [];

  for (const b of f.blocos.filter((x) => x.dia === semana).sort((a, c) => a.inicio - c.inicio)) {
    linhas.push({
      chave: `b-${b.dia}-${b.inicio}`,
      tipo: b.tipo === 'aula' ? 'aula' : 'rotina',
      titulo: b.materia ?? b.rotulo,
      hora: `${paraHora(b.inicio)}–${paraHora(b.fim)}`,
      sala: b.sala,
      flexivel: false,
    });
  }
  for (const e of f.entregas.filter((x) => x.prazo === dia && x.status !== 'entregue')) linhas.push({ chave: `p-${e.id}`, tipo: 'prazo', titulo: e.titulo, flexivel: false });
  for (const e of f.eventos.filter((x) => x.data === dia)) linhas.push({ chave: `e-${e.id}`, tipo: 'evento', titulo: e.titulo, flexivel: false });

  // Teve aula → revisar enquanto está fresco (a revisão mais valiosa do dia).
  for (const a of aulasDoDia(f.blocos, semana)) {
    const t = a.materia ? f.proximoDe(a.materia) : undefined;
    linhas.push({ chave: `ra-${a.dia}-${a.inicio}`, tipo: 'revisao', titulo: `Revisar a aula de ${a.materia ?? 'hoje'}`, minutos: REVISAO_AULA_MIN, topicId: t?.id, kind: 'revisao', flexivel: true });
  }
  for (const t of f.topics.filter((x) => x.lastStudiedAt && x.review.due === dia).slice(0, 3)) {
    linhas.push({ chave: `rv-${t.id}`, tipo: 'revisao', titulo: `Revisar: ${t.title}`, minutos: REVISAO_VENCIDA_MIN, topicId: t.id, kind: 'revisao', flexivel: true });
  }
  for (const p of f.planejados) {
    linhas.push({ chave: `pl-${p.id}`, tipo: 'estudo', titulo: p.title, minutos: p.minutes, topicId: p.topicId, kind: p.kind, flexivel: !p.done, feito: p.done });
  }
  return linhas;
}

const arredonda5 = (n: number) => Math.max(5, Math.round(n / 5) * 5);

export interface DiaAjustado {
  linhas: Linha[];
  /** O que a energia cortou (volta amanhã como prioridade). */
  adiadas: Linha[];
  minutosEstudo: number;
}

const soma = (l: Linha[]) => l.reduce((s, x) => s + (x.minutos ?? 0), 0);

/**
 * Energia 3: tudo. Energia 2: o estudo encolhe a ~60%. Energia 1: só os 2 itens
 * mais importantes (revisão 5 min, estudo 10); o resto vai pra amanhã.
 */
export function aplicarEnergia(linhas: Linha[], energia: Energy): DiaAjustado {
  if (energia === 3) return { linhas, adiadas: [], minutosEstudo: soma(linhas) };
  const adiadas: Linha[] = [];
  let aceitos = 0;
  const ajustadas = linhas.flatMap((l): Linha[] => {
    if (!l.flexivel) return [l];
    const original = l.minutos ?? 0;
    if (energia === 2) return [{ ...l, minutos: Math.min(original, arredonda5(original * 0.6)), minutosOriginais: original }];
    if (aceitos >= 2) {
      adiadas.push(l);
      return [];
    }
    aceitos++;
    return [{ ...l, minutos: Math.min(original, l.tipo === 'revisao' ? 5 : 10), minutosOriginais: original }];
  });
  return { linhas: ajustadas, adiadas, minutosEstudo: soma(ajustadas) };
}

/** O que sobrou de ontem (dia cansado) e vira prioridade hoje. */
export function herdadasDeOntem(hoje: LocalDate, energiaOntem: Energy | undefined, fontesOntem: FontesSemana): Linha[] {
  if (energiaOntem !== 1) return [];
  return aplicarEnergia(diaBase(addDays(hoje, -1), fontesOntem), 1).adiadas.map((l) => ({
    ...l,
    chave: `herdada-${l.chave}`,
    titulo: `Prioridade, ficou de ontem: ${l.titulo}`,
    minutos: 10,
    minutosOriginais: l.minutos,
    kind: 'revisao',
  }));
}
