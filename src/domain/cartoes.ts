import type { Id, LocalDate, Topic } from './types';

// Feed de cartões de 1 minuto. A "dopamina boa": rodadas curtas que fecham e
// devolvem pro Próximo passo. Nunca "defina X": sempre prever, achar o bug,
// comparar, aplicar ou explicar com as próprias palavras.
//
// Tipo novo de cartão = 1 entrada em TIPOS_CARTAO + 1 componente no feed.

export type TipoCartao = 'revisao' | 'micro' | 'frase' | 'lembra';

interface Base {
  id: Id;
  topicId: Id;
  tipo: TipoCartao;
  pergunta: string;
}

/** Múltipla escolha (revisão ativa e micro-desafio de código). */
export interface CartaoEscolha extends Base {
  tipo: 'revisao' | 'micro';
  /** Trecho de código pro micro-desafio ("o que imprime?", "onde está o bug?"). */
  codigo?: string;
  opcoes: string[];
  certa: number;
  explicacao: string;
}

/** Explique em 1 frase. Com IA vira nota + dica; sem IA, autoavaliação. */
export interface CartaoFrase extends Base {
  tipo: 'frase';
  /** Resposta-modelo (quando existe) pra comparar. */
  referencia?: string;
}

/** "Lembra e confere" (sem IA): pergunta, vira o cartão, você mesmo diz se lembrou. */
export interface CartaoLembra extends Base {
  tipo: 'lembra';
  resposta: string;
}

export type Cartao = CartaoEscolha | CartaoFrase | CartaoLembra;

export const TIPOS_CARTAO: Record<TipoCartao, { rotulo: string; xp: number }> = {
  revisao: { rotulo: 'Revisão ativa', xp: 5 },
  micro: { rotulo: 'Micro-desafio', xp: 8 },
  frase: { rotulo: 'Explique em 1 frase', xp: 6 },
  lembra: { rotulo: 'Lembra e confere', xp: 4 },
};

export const TAMANHO_RODADA = 5;
export const COMBO_MAX = 4;

/** XP do cartão: base do tipo × combo (x1 até x4). Errou = 0. */
export function pontuar(tipo: TipoCartao, acertou: boolean, combo: number): number {
  if (!acertou) return 0;
  return TIPOS_CARTAO[tipo].xp * Math.min(Math.max(combo, 1), COMBO_MAX);
}

/**
 * Ordem dos tópicos pra rodada: revisões vencidas → Target → estudados
 * recentemente. Tópico nunca estudado só entra se for o Target.
 */
export function ordemDosTopicos(topics: Topic[], hoje: LocalDate, targetId?: Id): Topic[] {
  const estudado = (t: Topic) => !!t.lastStudiedAt || t.review.reps > 0;
  const vencidos = topics.filter((t) => estudado(t) && t.review.due <= hoje).sort((a, b) => a.review.due.localeCompare(b.review.due));
  const target = topics.filter((t) => t.id === targetId);
  const recentes = topics
    .filter((t) => estudado(t))
    .sort((a, b) => (b.lastStudiedAt ?? '').localeCompare(a.lastStudiedAt ?? ''));
  const vistos = new Set<Id>();
  return [...vencidos, ...target, ...recentes].filter((t) => !vistos.has(t.id) && !!vistos.add(t.id));
}

/**
 * Monta a rodada pegando 1 cartão por tópico em rodízio (assim uma rodada
 * mistura assuntos), na ordem de prioridade.
 */
export function montarRodada(ordem: Topic[], cartoesDe: (t: Topic) => Cartao[], n = TAMANHO_RODADA): Cartao[] {
  const filas = ordem.map((t) => [...cartoesDe(t)]).filter((f) => f.length > 0);
  const rodada: Cartao[] = [];
  while (rodada.length < n && filas.some((f) => f.length > 0)) {
    for (const fila of filas) {
      const c = fila.shift();
      if (c) rodada.push(c);
      if (rodada.length === n) break;
    }
  }
  return rodada;
}

/**
 * Nota da revisão espaçada de um tópico ao fim da rodada:
 * tudo certo = lembrou; metade ou mais certo = difícil; menos = esqueceu.
 */
export function notaDoTopico(acertos: number, total: number): 'bom' | 'dificil' | 'errei' {
  if (acertos === total) return 'bom';
  return acertos * 2 >= total ? 'dificil' : 'errei';
}
