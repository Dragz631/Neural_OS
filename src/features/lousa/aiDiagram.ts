import type { TTDPersistenceAdapter, SavedChats } from '@excalidraw/excalidraw';
import { AIError, chat, type ChatMessage } from '../../services/ai/client';
import { idbGet, idbSet } from '../../services/idb';

// "Texto para diagrama" do Excalidraw, mas usando a NOSSA IA (Hermes/NVIDIA/Ollama)
// em vez do servidor pago deles. O Excalidraw manda a conversa, a gente devolve
// código Mermaid, e ele mesmo converte em formas editáveis.

const SYSTEM = `Você transforma pedidos em diagramas Mermaid para estudar.
Regras:
- Responda SOMENTE com código Mermaid válido, sem explicação e sem \`\`\`.
- Prefira "flowchart TD" (mapa geral em cima, detalhes embaixo); use mindmap, sequenceDiagram,
  classDiagram ou stateDiagram-v2 quando o assunto pedir.
- Textos curtos em português. Ligue cada conceito ao anterior (é assim que o aluno aprende).`;

type SubmitProps = {
  messages: { role: 'user' | 'assistant'; content: string }[];
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
};

/** Formato de erro que o Excalidraw espera (RequestError não é exportado em tempo de execução). */
function requestError(message: string, status = 500) {
  const err = Object.assign(new Error(message), { status, data: null, toObject: () => ({ name: 'RequestError', status, message }) });
  return err as never;
}

export async function onTextSubmit({ messages, onChunk, signal }: SubmitProps) {
  try {
    const history: ChatMessage[] = [{ role: 'system', content: SYSTEM }, ...messages];
    const raw = await chat(history, signal, 'dificil'); // desenho = motor difícil (Claude); se faltar, o servidor reveza
    const mermaid = raw.replace(/^```(?:mermaid)?\s*/i, '').replace(/```\s*$/, '').trim();
    // O Excalidraw monta a mensagem do chat SÓ pelos pedaços (onChunk), e o botão
    // "Inserir" usa essa mensagem. Sem isso, o diagrama aparece vazio.
    onChunk?.(mermaid);
    return { generatedResponse: mermaid, error: null };
  } catch (e) {
    const message = e instanceof AIError ? e.message : 'Não consegui gerar o diagrama.';
    return { error: requestError(message) };
  }
}

/** Guarda o histórico de conversas do "texto para diagrama" no IndexedDB. */
export const ttdPersistence: TTDPersistenceAdapter = {
  loadChats: async () => (await idbGet<SavedChats>('lousa:ttd-chats')) ?? [],
  saveChats: (chats) => idbSet('lousa:ttd-chats', chats),
};
