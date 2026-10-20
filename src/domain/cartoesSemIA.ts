import type { Cartao } from './cartoes';
import type { Topic } from './types';

// Cartões sem IA, feitos do que o Hugo já tem: os pontos-chave da aula do
// Prof. e as linhas de lista das anotações. Viram lacuna (cloze): esconde a
// palavra mais "pesada" da frase e ele tem que lembrar. É lembrar ativo,
// não "defina X".

const MIN_PALAVRA = 5;

/** Esconde a palavra mais longa (ela costuma ser o conceito). */
export function lacuna(frase: string): { pergunta: string; resposta: string } | null {
  const palavras = frase.match(/[\p{L}\p{N}_#+.-]+/gu) ?? [];
  const alvo = palavras.filter((p) => p.length >= MIN_PALAVRA).sort((a, b) => b.length - a.length)[0];
  if (!alvo) return null;
  return { pergunta: frase.replace(alvo, '_____'), resposta: frase };
}

/** Linhas de lista das anotações ("- algo", "* algo", "1. algo"). */
function linhasDasNotas(notas: string): string[] {
  return notas
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => /^([-*]|\d+\.)\s+/.test(l))
    .map((l) => l.replace(/^([-*]|\d+\.)\s+/, ''))
    .filter((l) => l.length >= 15);
}

/** "> Por que estudar: ..." que o mapa da matéria grava nas anotações. */
export function porqueDoTopico(t: Topic): string | undefined {
  return t.notes.match(/^> Por que estudar: (.+)$/m)?.[1]?.trim();
}

export function cartoesSemIA(t: Topic): Cartao[] {
  const frases = [...(t.lesson?.keyPoints ?? []), ...linhasDasNotas(t.notes)];
  const lembra: Cartao[] = frases.flatMap((f, i) => {
    const l = lacuna(f);
    return l ? [{ id: `semia-${t.id}-${i}`, topicId: t.id, tipo: 'lembra' as const, pergunta: `Complete de cabeça: ${l.pergunta}`, resposta: l.resposta }] : [];
  });
  return [
    ...lembra,
    {
      id: `semia-${t.id}-frase`,
      topicId: t.id,
      tipo: 'frase',
      pergunta: `Explique pra um colega, em 1 frase: pra que serve "${t.title}" e quando você usaria?`,
      referencia: porqueDoTopico(t),
    },
  ];
}
