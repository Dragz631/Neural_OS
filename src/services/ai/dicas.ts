import { NIVEIS_DICA } from '../../domain/dicas';
import type { Challenge } from '../../domain/types';
import { asString, chatJSON } from './client';
import { PROFESSOR } from './persona';

// Um degrau da escada de dicas por vez. O professor vê o código atual, o que
// o aluno tentou e o que ele esperava, e NÃO pula degrau.

export async function gerarDica(c: Challenge, codigo: string, nivel: number, signal?: AbortSignal): Promise<string> {
  const degrau = NIVEIS_DICA[nivel];
  const anteriores = (c.ladder ?? []).slice(0, nivel).map((d, i) => `${i}. ${NIVEIS_DICA[i].nome}: ${d}`);
  return chatJSON(
    [
      { role: 'system', content: PROFESSOR },
      {
        role: 'user',
        content: `Desafio (${c.language || 'sem linguagem'}):
"""
${c.prompt}
"""
Código atual do aluno:
"""
${codigo || '(vazio)'}
"""
O que ele tentou: ${c.attempt || '(não disse)'}
O que ele espera que aconteça: ${c.prediction || '(não disse)'}
${anteriores.length ? `Dicas que ele já recebeu:\n${anteriores.join('\n')}\n` : ''}
Dê APENAS o degrau ${nivel} da escada, "${degrau.nome}": ${degrau.explica}
${nivel < 5 ? 'Não mostre código.' : nivel === 5 ? 'Mostre só o trecho que falta, não a solução inteira.' : 'Agora pode mostrar a solução completa, explicando cada parte.'}
Se o que ele "espera que aconteça" estiver errado, comece por aí. Curto e direto.
Formato JSON: {"dica": "..."}`,
      },
    ],
    (raw) => asString((raw as Record<string, unknown>).dica, 'dica'),
    signal,
  );
}
