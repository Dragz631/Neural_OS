import { useSettings, type AIProvider } from '../../store/settings';

// ─── Cliente de IA (formato OpenAI /v1/chat/completions) ─────────────────────
// Hermes Agent, NVIDIA NIM e Ollama falam o mesmo "idioma" (API compatível com OpenAI).
// O navegador nunca vê chave de API: ele chama /ai/<provedor>/..., e o servidor do
// Vite (server/devApi.ts) repassa pro destino real colocando a chave do .env.local.
//
// Regra importante: se a IA falhar, a gente AVISA (lança AIError). O código antigo
// devolvia uma resposta pronta escondida, e você achava que a IA tinha respondido.

export class AIError extends Error {}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const BASE: Record<Exclude<AIProvider, 'off'>, string> = {
  hermes: '/ai/hermes/v1',
  nvidia: '/ai/nvidia/v1',
  ollama: '/ai/ollama/v1',
};

const TIMEOUT_MS = 180_000; // modelo local/agent pode demorar na primeira chamada

export function isAIEnabled(): boolean {
  return useSettings.getState().provider !== 'off';
}

export async function chat(messages: ChatMessage[], signal?: AbortSignal): Promise<string> {
  const { provider, models, temperature } = useSettings.getState();
  if (provider === 'off') throw new AIError('IA desligada. Ative um provedor nas configurações.');

  const model = models[provider];
  if (!model) throw new AIError('Escolha um modelo nas configurações de IA.');

  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const res = await fetch(`${BASE[provider]}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, temperature, stream: false }),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  }).catch((e: unknown) => {
    const name = e instanceof Error ? e.name : '';
    if (name === 'TimeoutError') throw new AIError('A IA demorou demais pra responder.');
    if (name === 'AbortError') throw new AIError('Cancelado.');
    throw new AIError('Não consegui falar com o servidor. O "npm run dev" está rodando?');
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new AIError(`IA respondeu erro ${res.status}. ${detail.slice(0, 200)}`);
  }

  const data = await res.json();
  const content: unknown = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) throw new AIError('A IA respondeu vazio.');
  return stripThinking(content);
}

/** Modelos de raciocínio (deepseek-r1, qwen3...) escrevem <think>...</think> antes da resposta. */
export function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

/**
 * Pede JSON e valida. `parse` recebe o objeto cru e devolve o tipo certo
 * (ou lança erro se faltar campo) — nunca confie cegamente no que a IA mandou.
 */
export async function chatJSON<T>(messages: ChatMessage[], parse: (raw: unknown) => T, signal?: AbortSignal): Promise<T> {
  const withRule: ChatMessage[] = [
    ...messages,
    { role: 'user', content: 'Responda APENAS com um objeto JSON válido, sem texto antes ou depois, sem ```.' },
  ];
  const text = await chat(withRule, signal);
  const json = extractJSONObject(text);
  if (!json) throw new AIError('A IA não devolveu JSON. Tente de novo.');
  try {
    return parse(JSON.parse(json));
  } catch (e) {
    throw new AIError(`Resposta da IA veio num formato inesperado: ${e instanceof Error ? e.message : e}`);
  }
}

/**
 * Acha o primeiro objeto JSON completo no texto, contando chaves e ignorando
 * as que estão dentro de strings. Mais seguro que a regex gulosa /\{[\s\S]*\}/.
 */
export function extractJSONObject(text: string): string | null {
  const start = text.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '{') depth++;
    else if (ch === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  return null;
}

export async function listModels(provider: AIProvider): Promise<string[]> {
  if (provider === 'off') return [];
  const res = await fetch(`${BASE[provider]}/models`, { signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new AIError(`Erro ${res.status} ao listar modelos.`);
  const data = await res.json();
  return (data?.data ?? []).map((m: { id: string }) => m.id).sort();
}

// ─── Validadores pequenos pra resposta da IA ─────────────────────────────────

export const asString = (v: unknown, field: string): string => {
  if (typeof v !== 'string') throw new Error(`campo "${field}" ausente`);
  return v;
};

export const asStrings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

export const asScore = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) throw new Error('nota inválida');
  return Math.round(Math.min(100, Math.max(0, n)));
};
