import { asString, asStrings, chatJSON } from '../../services/ai/client';
import { PROFESSOR } from '../../services/ai/persona';

// "Prof., olha minha lousa": ele lê a estrutura do desenho e responde com
// UMA observação, UMA pergunta e UM próximo passo. Nada de lista enorme.

export interface BoardLook {
  strength: string;
  gap: string;
  question: string;
  nextStep: string;
  missingLinks: string[];
}

export async function lookAtBoard(boardName: string, sceneText: string, topicTitle?: string, signal?: AbortSignal): Promise<BoardLook> {
  return chatJSON(
    [
      { role: 'system', content: `${PROFESSOR}\nAgora você está olhando a lousa (mapa mental) que o aluno desenhou.` },
      {
        role: 'user',
        content: `Lousa: "${boardName}"${topicTitle ? ` (tópico: ${topicTitle})` : ''}
Conteúdo da lousa, lido como estrutura:
"""
${sceneText.slice(0, 6000)}
"""

Avalie o pensamento estruturado, não a estética. Formato JSON:
{
  "strength": "o que está bem conectado/claro (1 frase)",
  "gap": "a maior lacuna ou ligação errada (1 frase)",
  "question": "UMA pergunta que faça ele pensar e completar a lousa",
  "nextStep": "UMA ação concreta e pequena pra fazer agora na lousa",
  "missingLinks": ["até 3 ligações ou conceitos que faltam, curtos"]
}`,
      },
    ],
    (raw) => {
      const o = raw as Record<string, unknown>;
      return {
        strength: asString(o.strength, 'strength'),
        gap: asString(o.gap, 'gap'),
        question: asString(o.question, 'question'),
        nextStep: asString(o.nextStep, 'nextStep'),
        missingLinks: asStrings(o.missingLinks).slice(0, 3),
      };
    },
    signal,
  );
}
