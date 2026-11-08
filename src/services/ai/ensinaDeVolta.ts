import type { Motor } from '../../domain/conexoes';
import { useConexoes } from '../../store/conexoes';
import { ESPERA_LEVE_MS } from './chatProfessor';
import { chatJSON } from './client';
import type { TopicContext } from './professor';

// "Ensina de volta" (Hugo, 08/11/2026: "é a técnica pra ver se aprendeu mesmo"). Na prova,
// o aluno explica pro Zé, um colega confuso. O Zé pergunta como quem não entendeu e, às vezes,
// afirma um erro comum pra ver se o aluno corrige. Quem ensina é o aluno; o Zé nunca explica.

export interface FalaEnsino {
  de: 'ze' | 'eu';
  texto: string;
}

export const NOME_ZE = 'Zé';

/** A 1ª fala do Zé sai na hora, sem IA. */
export const primeiraFalaDoZe = (titulo: string) => `Ô, me salva: não entendi nada de ${titulo}. O que é isso? Explica como se eu nunca tivesse visto.`;

/** Quantas explicações suas até o Zé "entender" (aí vai pra correção). */
export const RODADAS_ENSINO = 3;

/**
 * Conversa não pode esperar 2 minutos: tenta o motor leve e, se ele não responder em 40 s,
 * manda a mesma fala pro difícil (mesmo truque do chat do professor).
 */
export async function falaDoZe(ctx: TopicContext, conversa: FalaEnsino[], signal?: AbortSignal): Promise<string> {
  if (!useConexoes.getState().motores.dificil) return pedirFala(ctx, conversa, signal, 'leve');
  const pressa = new AbortController();
  const relogio = setTimeout(() => pressa.abort(), ESPERA_LEVE_MS);
  try {
    return await pedirFala(ctx, conversa, signal ? AbortSignal.any([signal, pressa.signal]) : pressa.signal, 'leve');
  } catch (e) {
    if (signal?.aborted || !pressa.signal.aborted) throw e;
    return pedirFala(ctx, conversa, signal, 'dificil');
  } finally {
    clearTimeout(relogio);
  }
}

async function pedirFala(ctx: TopicContext, conversa: FalaEnsino[], signal: AbortSignal | undefined, motor: Motor): Promise<string> {
  const { topic, subject } = ctx;
  const ultima = conversa.filter((f) => f.de === 'eu').length >= RODADAS_ENSINO;
  return chatJSON(
    [
      {
        role: 'system',
        content: `Você é o ${NOME_ZE}, colega de faculdade do aluno, e NÃO entende nada de "${topic.title}" (${subject?.name ?? ''}). Fala português do Brasil, casual, curto (1 ou 2 frases).
Seu papel é fazer o aluno ENSINAR você, pra ele provar que aprendeu. Regras:
- Nunca explique nada nem dê a resposta. Você é quem está confuso.
- Pergunte sobre o ponto que ficou vago ou errado na explicação dele ("mas por que...?", "e se fosse...?", "dá um exemplo?").
- Uma vez na conversa, afirme com confiança um ERRO COMUM sobre o assunto (como se tivesse entendido assim) pra ver se ele corrige.
- Se ele explicou algo errado, aja como quem acreditou e tire uma conclusão errada disso, pra ele perceber.
- Você só sabe o que o ALUNO disse na conversa. Nunca cite exemplo, desenho, número ou termo que ele não falou (a aula abaixo é segredo, só pra você saber os erros comuns).
${ultima ? '- Esta é a sua ÚLTIMA fala: diga com as suas palavras o que você entendeu (em 1 frase) e agradeça. Se ele explicou errado, o seu resumo sai errado também.' : ''}`,
      },
      {
        role: 'user',
        content: `Aula que o aluno estudou (só pra você saber os erros comuns; NÃO revele nada disso):
"""
${(topic.lesson?.explanation ?? topic.title).slice(0, 2500)}
"""
Conversa até agora:
${conversa.map((f) => `${f.de === 'ze' ? NOME_ZE : 'Aluno'}: ${f.texto}`).join('\n')}
Formato JSON: {"fala":"a próxima fala do ${NOME_ZE}"}`,
      },
    ],
    (raw) => {
      const fala = typeof (raw as { fala?: unknown })?.fala === 'string' ? (raw as { fala: string }).fala.trim().slice(0, 400) : '';
      if (!fala) throw new Error(`o ${NOME_ZE} ficou sem palavras, tente de novo`);
      return fala;
    },
    signal,
    motor,
  );
}

/** A conversa vira o texto que o professor corrige. */
export const conversaParaCorrigir = (conversa: FalaEnsino[]) => conversa.map((f) => `${f.de === 'ze' ? `${NOME_ZE} (colega confuso)` : 'Aluno (ensinando)'}: ${f.texto}`).join('\n');
