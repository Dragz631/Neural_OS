import { asString, chatJSON } from './client';
import { PROFESSOR } from './persona';

// Quando o aluno PASSA na prova, o professor escreve 3 linhas sobre COMO ele aprendeu
// (não sobre a matéria). Isso vira a "mente do professor" e vai junto em todo pedido.

export interface EntradaMemoria {
  materia: string;
  topico: string;
  nota: number;
  /** O que ele pediu no chat durante a aula ("mais fácil", "desenha", perguntas). */
  pedidos: string[];
  /** Partes da aula marcadas com 😕 no termômetro. */
  confusas: string[];
  /** Lacunas das tentativas anteriores da prova (antes de passar). */
  lacunasAntes: string[];
  /** A explicação com que ele passou. */
  explicacao: string;
  /** Trecho das anotações dele. */
  notas: string;
}

export interface ResumoMemoria {
  oQueFuncionou: string;
  oQueTravou: string;
  comoExplicar: string;
}

export async function resumirAprendizado(e: EntradaMemoria, signal?: AbortSignal): Promise<ResumoMemoria> {
  return chatJSON(
    [
      { role: 'system', content: `${PROFESSOR}\nAgora você anota, pra você mesmo, como ESTE aluno aprendeu. É sobre o jeito dele, não sobre a matéria.` },
      {
        role: 'user',
        content: `O aluno acabou de PASSAR na prova de "${e.topico}" (${e.materia}) com nota ${e.nota}.

O que ele pediu durante a aula: ${e.pedidos.length ? e.pedidos.join(' | ') : 'nada'}
Partes que marcou como "não entrou": ${e.confusas.length ? e.confusas.join(' | ') : 'nenhuma'}
O que faltava nas tentativas anteriores: ${e.lacunasAntes.length ? e.lacunasAntes.join(' | ') : 'passou de primeira'}
Anotações dele (trecho): """${e.notas.slice(0, 1200)}"""
A explicação com que passou: """${e.explicacao.slice(0, 1500)}"""

Escreva 3 frases curtas (máx. 25 palavras cada), concretas, sobre ELE:
{
  "oQueFuncionou": "o que fez ele entender (ex.: a árvore desenhada, exemplo com dados, ir passo a passo)",
  "oQueTravou": "onde ele travou ou o erro que cometeu antes de acertar",
  "comoExplicar": "como explicar o próximo assunto parecido pra ele, já de cara"
}`,
      },
    ],
    (raw) => {
      const o = raw as Record<string, unknown>;
      return {
        oQueFuncionou: asString(o.oQueFuncionou, 'oQueFuncionou').slice(0, 240),
        oQueTravou: asString(o.oQueTravou, 'oQueTravou').slice(0, 240),
        comoExplicar: asString(o.comoExplicar, 'comoExplicar').slice(0, 240),
      };
    },
    signal,
  );
}
