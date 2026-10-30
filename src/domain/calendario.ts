import { diffDays, parseLocalDate } from './dates';
import type { Entrega } from './entregas';
import { aulasDoDia, paraHora, type BlocoGrade } from './grade';
import type { LocalDate } from './types';

// Tudo que acontece num dia: aula da grade, prazo de entrega e evento.
// O calendário (mês e semana) e as missões leem daqui.

export interface ItemDoDia {
  chave: string;
  tipo: 'aula' | 'prazo' | 'evento';
  titulo: string;
  hora?: string;
  sala?: string;
}

export interface FontesCalendario {
  blocos: BlocoGrade[];
  entregas: Pick<Entrega, 'id' | 'titulo' | 'prazo' | 'status'>[];
  eventos: { id: string; titulo: string; data: LocalDate }[];
}

export function itensDoDia(dia: LocalDate, f: FontesCalendario): ItemDoDia[] {
  const semana = parseLocalDate(dia).getDay();
  return [
    ...f.entregas.filter((e) => e.prazo === dia && e.status !== 'entregue').map((e): ItemDoDia => ({ chave: `p-${e.id}`, tipo: 'prazo', titulo: e.titulo })),
    ...f.eventos.filter((e) => e.data === dia).map((e): ItemDoDia => ({ chave: `e-${e.id}`, tipo: 'evento', titulo: e.titulo })),
    ...aulasDoDia(f.blocos, semana).map((a): ItemDoDia => ({ chave: `a-${a.dia}-${a.inicio}`, tipo: 'aula', titulo: a.materia ?? a.rotulo, hora: `${paraHora(a.inicio)}–${paraHora(a.fim)}`, sala: a.sala })),
  ];
}

/** Prazos abertos nos próximos `dias` dias, do mais perto ao mais longe. */
export function prazosProximos(entregas: FontesCalendario['entregas'], hoje: LocalDate, dias: number) {
  return entregas
    .filter((e) => e.prazo && e.status !== 'entregue' && e.prazo >= hoje && diffDays(e.prazo, hoje) <= dias)
    .sort((a, b) => a.prazo!.localeCompare(b.prazo!))
    .map((e) => ({ ...e, faltam: diffDays(e.prazo!, hoje) }));
}
