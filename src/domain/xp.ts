import type { StudySession } from './types';
import { NOTA_MINIMA } from './prova';

// XP mede APRENDIZADO, não clique (pedido do Hugo, 08/11/2026).
// Só paga quando alguém além de você conferiu: a IA avaliou, ou a resposta é objetiva.
// Cronômetro, autoavaliação ("Lembrei"), tarefa entregue e "lembra e confere" pagam 0.
// Cada nível custa um pouco mais que o anterior (100, 150, 200, ...).

export function levelFromXp(xp: number): { level: number; into: number; needed: number } {
  let level = 1;
  let remaining = xp;
  let needed = 100;
  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed += 50;
  }
  return { level, into: remaining, needed };
}

export type EventoXp =
  /** Prova (Feynman) avaliada pela IA. */
  | { tipo: 'prova'; nota: number; porIA: boolean; revisaoVencida: boolean; jaAprovadoAntes: boolean; jaAprovadoHoje: boolean }
  /** Revisão guiada: só as perguntas que a IA conferiu como "certo". */
  | { tipo: 'revisao-guiada'; certasPelaIA: number }
  /** Desafio do Sandbox corrigido pela IA. */
  | { tipo: 'desafio'; nota: number; minutos: number; resolvido: boolean; porIA: boolean };

export const XP_PROVA = 100;
export const XP_PROVA_BONUS_90 = 50;
export const XP_REVISAO_APROVADA = 40;
export const XP_POR_CERTA_REVISAO = 10;

/** A regra única: quanto XP este evento paga. 0 = não foi conferido, ou é repetição. */
export function xpDeAprendizado(e: EventoXp): number {
  switch (e.tipo) {
    case 'prova': {
      if (!e.porIA || e.nota < NOTA_MINIMA || e.jaAprovadoHoje) return 0;
      if (!e.jaAprovadoAntes) return XP_PROVA + (e.nota >= 90 ? XP_PROVA_BONUS_90 : 0);
      return e.revisaoVencida ? XP_REVISAO_APROVADA : 0;
    }
    case 'revisao-guiada':
      return Math.max(0, e.certasPelaIA) * XP_POR_CERTA_REVISAO;
    case 'desafio':
      if (!e.porIA || !e.resolvido) return 0;
      return Math.max(5, Math.round(e.minutos * 2)) + 20;
  }
}

/**
 * XP de uma sessão já registrada (pro nível de cada matéria e pro recálculo).
 * Sessões novas guardam o próprio `xp`. As antigas (antes de 08/11) seguem a regra nova:
 * explicação/revisão só com nota (a autoavaliação não gravava nota) ≥ 70; desafio só com nota ≥ 70.
 */
export function xpDaSessao(s: StudySession, anteriores: StudySession[] = []): number {
  if (s.xp !== undefined) return s.xp;
  if (s.score === undefined || s.score < NOTA_MINIMA) return 0;
  if (s.kind === 'desafio') return Math.max(5, Math.round(s.minutes * 2)) + 20;
  if (s.kind === 'explicacao' || s.kind === 'revisao') {
    const antes = anteriores.some((a) => a.topicId === s.topicId && (a.kind === 'explicacao' || a.kind === 'revisao') && (a.score ?? 0) >= NOTA_MINIMA);
    if (!antes) return XP_PROVA + (s.score >= 90 ? XP_PROVA_BONUS_90 : 0);
    return s.kind === 'revisao' ? XP_REVISAO_APROVADA : 0;
  }
  return 0;
}

/** Soma o XP de uma lista de sessões em ordem (cada uma vê as que vieram antes). */
export function somaXpSessoes(sessoes: StudySession[]): number {
  let total = 0;
  sessoes.forEach((s, i) => {
    total += xpDaSessao(s, sessoes.slice(0, i));
  });
  return total;
}
