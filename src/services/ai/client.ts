import type { Motor } from '../../domain/conexoes';
import { iaLigada, useConexoes } from '../../store/conexoes';
import { useSettings } from '../../store/settings';

// ─── Cliente de IA: o app pede por MOTOR, nunca por provedor ─────────────────
// Uma mente só (o Prof. A.Ilson); o motor é só quem faz a conta:
//   leve = cartões e coisas curtas · professor = aula, desafio, correção · dificil = Claude.
// O navegador chama /ai/motor/<motor> e o servidor (server/conexoes) escolhe a
// conexão, põe a chave do .env.local e reveza se uma cair. Chave nunca vem pra cá.
//
// Regra importante: se a IA falhar, a gente AVISA (lança AIError). O código antigo
// devolvia uma resposta pronta escondida, e você achava que a IA tinha respondido.

export class AIError extends Error {}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const TIMEOUT_MS = 180_000; // modelo local ou o Claude pela assinatura podem demorar

export async function chat(messages: ChatMessage[], signal?: AbortSignal, motor: Motor = 'professor'): Promise<string> {
  if (!iaLigada(useConexoes.getState().motores)) throw new AIError('Nenhum motor conectado. Abra Configurações → Conexões.');
  const { temperature } = useSettings.getState();

  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const res = await fetch(`/ai/motor/${motor}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, temperature }),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
  }).catch((e: unknown) => {
    const name = e instanceof Error ? e.name : '';
    if (name === 'TimeoutError') throw new AIError('A IA demorou demais pra responder.');
    if (name === 'AbortError') throw new AIError('Cancelado.');
    throw new AIError('Não consegui falar com o servidor. O "npm run dev" está rodando?');
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new AIError(data?.erro ?? `IA respondeu erro ${res.status}.`);
  const content: unknown = data?.texto;
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
export async function chatJSON<T>(messages: ChatMessage[], parse: (raw: unknown) => T, signal?: AbortSignal, motor: Motor = 'professor'): Promise<T> {
  const withRule: ChatMessage[] = [
    ...messages,
    { role: 'user', content: 'Responda APENAS com um objeto JSON válido, sem texto antes ou depois, sem ```.' },
  ];
  // Errou o formato? Tenta de novo no mesmo motor; na 2ª falha do professor, chama o difícil.
  const tentativas: Motor[] = motor === 'professor' ? ['professor', 'professor', 'dificil'] : motor === 'leve' ? ['leve', 'professor'] : [motor];
  let ultimoErro = '';
  for (const m of tentativas) {
    if (m === 'dificil' && !useConexoes.getState().motores.dificil) break;
    const text = await chat(withRule, signal, m);
    const json = extractJSONObject(text);
    if (!json) {
      ultimoErro = 'A IA não devolveu JSON.';
      continue;
    }
    try {
      return parse(JSON.parse(json));
    } catch (e) {
      ultimoErro = `Resposta da IA veio num formato inesperado: ${e instanceof Error ? e.message : e}`;
    }
  }
  throw new AIError(`${ultimoErro} Tente de novo.`);
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
