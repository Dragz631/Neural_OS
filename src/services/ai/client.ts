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
/** O motor não respondeu a tempo (diferente de cancelado ou de resposta errada). */
export class AITempo extends AIError {}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

const TIMEOUT_MS = 180_000; // modelo local ou o Claude pela assinatura podem demorar

// Pedidos retomáveis: cada chamada leva um id. Se a conexão cair (celular com a tela apagada),
// o servidor termina e o app busca o resultado quando volta. Cancelar avisa o servidor pra parar.
const emAndamento = new Set<string>();
const novoId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`);
const cancelarNoServidor = (id: string) => {
  emAndamento.delete(id);
  void fetch('/ai/cancelar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }), keepalive: true }).catch(() => undefined);
};
// Fechar ou recarregar a página: o que estava pedindo não vai ser lido por ninguém, então para.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', (e) => {
    if (e.persisted) return; // foi só pro cache de voltar (bfcache): pode voltar e buscar
    for (const id of emAndamento) navigator.sendBeacon?.('/ai/cancelar', new Blob([JSON.stringify({ id })], { type: 'application/json' }));
    emAndamento.clear();
  });
}

const esperar = (ms: number, signal: AbortSignal) =>
  new Promise<void>((ok, falha) => {
    const t = setTimeout(ok, ms);
    signal.addEventListener('abort', () => {
      clearTimeout(t);
      falha(signal.reason);
    });
  });

/** A conexão caiu no meio: busca de novo o resultado do mesmo pedido até chegar (ou o tempo acabar). */
async function retomar(id: string, sinal: AbortSignal): Promise<Response> {
  for (;;) {
    await esperar(document.hidden ? 4000 : 1500, sinal);
    const r = await fetch(`/ai/motor/resultado?id=${encodeURIComponent(id)}`, { signal: sinal }).catch((e: unknown) => {
      if (sinal.aborted) throw e;
      return undefined; // ainda sem rede: tenta de novo
    });
    if (r) return r;
  }
}

export async function chat(messages: ChatMessage[], signal?: AbortSignal, motor: Motor = 'professor'): Promise<string> {
  if (!iaLigada(useConexoes.getState().motores)) throw new AIError('Nenhum motor conectado. Abra Configurações → Conexões.');
  const { temperature } = useSettings.getState();

  const id = novoId();
  emAndamento.add(id);
  const timeout = AbortSignal.timeout(TIMEOUT_MS);
  const sinal = signal ? AbortSignal.any([signal, timeout]) : timeout;
  const traduzir = (e: unknown): never => {
    const name = e instanceof Error ? e.name : '';
    if (timeout.aborted || name === 'TimeoutError') {
      cancelarNoServidor(id);
      throw new AITempo('A IA demorou demais pra responder.');
    }
    if (signal?.aborted || name === 'AbortError') {
      cancelarNoServidor(id);
      throw new AIError('Cancelado.');
    }
    emAndamento.delete(id);
    throw new AIError('Não consegui falar com o servidor. O "npm run dev" está rodando?');
  };

  let res: Response;
  try {
    res = await fetch(`/ai/motor/${motor}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-pedido': id },
      body: JSON.stringify({ messages, temperature }),
      signal: sinal,
    });
  } catch (e) {
    if (sinal.aborted) return traduzir(e);
    // Caiu a conexão (não foi cancelamento): o servidor continua; busca o resultado quando der.
    try {
      res = await retomar(id, sinal);
    } catch (e2) {
      return traduzir(e2);
    }
  }
  emAndamento.delete(id);

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
  // Estourou o tempo (provedor lento)? Não adianta insistir nele: vai direto pro difícil.
  const tentativas: Motor[] = motor === 'professor' ? ['professor', 'professor', 'dificil'] : motor === 'leve' ? ['leve', 'professor'] : [motor];
  const temDificil = () => !!useConexoes.getState().motores.dificil;
  let ultimoErro = '';
  for (const m of tentativas) {
    if (m === 'dificil' && !temDificil()) break;
    let text: string;
    try {
      text = await chat(withRule, signal, m);
    } catch (e) {
      if (e instanceof AITempo && m !== 'dificil' && temDificil() && !signal?.aborted) return chatJSON(messages, parse, signal, 'dificil');
      throw e;
    }
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
