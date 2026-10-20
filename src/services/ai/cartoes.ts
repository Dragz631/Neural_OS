import type { Cartao, CartaoEscolha, CartaoFrase } from '../../domain/cartoes';
import type { Topic } from '../../domain/types';
import { newId } from '../../store/study';
import { asScore, asString, asStrings, chatJSON } from './client';
import { PROFESSOR } from './persona';

// Lote de cartões de 1 minuto por tópico (fica guardado no store/feed.ts e é
// refeito quando acaba) + correção do "explique em 1 frase".

export interface ContextoCartoes {
  topic: Topic;
  materia: string;
  /** Linguagem da matéria ("" = teórica, sem micro-desafio de código). */
  linguagem: string;
}

function lerEscolha(raw: Record<string, unknown>, topicId: string): CartaoEscolha | null {
  const opcoes = asStrings(raw.opcoes);
  const certa = Number(raw.certa);
  if (opcoes.length < 2 || !Number.isInteger(certa) || certa < 0 || certa >= opcoes.length) return null;
  return {
    id: newId('cart'),
    topicId,
    tipo: raw.tipo === 'micro' ? 'micro' : 'revisao',
    pergunta: asString(raw.pergunta, 'pergunta'),
    codigo: typeof raw.codigo === 'string' && raw.codigo.trim() ? raw.codigo : undefined,
    opcoes,
    certa,
    explicacao: typeof raw.explicacao === 'string' ? raw.explicacao : '',
  };
}

function lerFrase(raw: Record<string, unknown>, topicId: string): CartaoFrase {
  return { id: newId('cart'), topicId, tipo: 'frase', pergunta: asString(raw.pergunta, 'pergunta'), referencia: typeof raw.referencia === 'string' ? raw.referencia : undefined };
}

export function lerCartoes(raw: unknown, topicId: string): Cartao[] {
  const lista = (raw as { cartoes?: unknown })?.cartoes;
  if (!Array.isArray(lista)) throw new Error('faltou a lista "cartoes"');
  const cartoes = lista.flatMap((c): Cartao[] => {
    if (!c || typeof c !== 'object') return [];
    const r = c as Record<string, unknown>;
    try {
      const lido = r.tipo === 'frase' ? lerFrase(r, topicId) : lerEscolha(r, topicId);
      return lido ? [lido] : [];
    } catch {
      return [];
    }
  });
  if (cartoes.length === 0) throw new Error('nenhum cartão válido');
  return cartoes;
}

export async function gerarCartoes({ topic, materia, linguagem }: ContextoCartoes, signal?: AbortSignal): Promise<Cartao[]> {
  const base = [topic.lesson?.keyPoints.join('\n'), topic.notes].filter(Boolean).join('\n').slice(0, 3000);
  const micro = linguagem
    ? `- 2 "micro": código curto em ${linguagem} (até 8 linhas) e pergunta "o que imprime?", "onde está o bug?" ou "qual linha completa?".`
    : '- 0 "micro" (matéria teórica).';
  return chatJSON(
    [
      { role: 'system', content: PROFESSOR },
      {
        role: 'user',
        content: `Crie cartões de 1 minuto pra revisar o tópico "${topic.title}" da matéria "${materia}".
${base ? `O que o aluno já viu/anotou:\n"""\n${base}\n"""\n` : ''}
Regras:
- NUNCA "defina X" ou "o que é X". Use: prever resultado, achar o erro, comparar duas coisas, aplicar num caso real.
- 3 "revisao": múltipla escolha com 3 ou 4 opções curtas e 1 certa.
${micro}
- 1 "frase": peça pra explicar em 1 frase, com "referencia" = boa resposta curta.
- "explicacao" em 1 frase dizendo POR QUE a certa é certa.
- "certa" = índice (base 0) da opção certa. Tudo em português.
Formato JSON:
{"cartoes": [{"tipo": "revisao", "pergunta": "...", "opcoes": ["..."], "certa": 0, "explicacao": "..."}, {"tipo": "micro", "pergunta": "...", "codigo": "...", "opcoes": ["..."], "certa": 1, "explicacao": "..."}, {"tipo": "frase", "pergunta": "...", "referencia": "..."}]}`,
      },
    ],
    (raw) => lerCartoes(raw, topic.id),
    signal,
  );
}

export interface NotaFrase {
  nota: number;
  dica: string;
}

export async function avaliarFrase(cartao: CartaoFrase, resposta: string, topico: string, signal?: AbortSignal): Promise<NotaFrase> {
  return chatJSON(
    [
      { role: 'system', content: PROFESSOR },
      {
        role: 'user',
        content: `Tópico: "${topico}". Pergunta: "${cartao.pergunta}".
${cartao.referencia ? `Boa resposta de referência: "${cartao.referencia}".\n` : ''}Resposta do aluno: "${resposta}".
Dê uma nota de 0 a 100 pela ideia (não pela gramática) e UMA dica curta pra melhorar (ou o que faltou).
Formato JSON: {"nota": 80, "dica": "..."}`,
      },
    ],
    (raw) => {
      const r = raw as Record<string, unknown>;
      return { nota: asScore(r.nota), dica: typeof r.dica === 'string' ? r.dica : '' };
    },
    signal,
  );
}
