import { useCallback, useEffect, useRef, useState } from 'react';
import { AIError } from '../services/ai/client';

/**
 * Roda uma chamada de IA com estado de carregando/erro e cancela sozinho
 * se você trocar de aba no meio (o componente desmonta).
 */
export function useAI() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => controller.current?.abort(), []);

  const run = useCallback(async <T,>(fn: (signal: AbortSignal) => Promise<T>): Promise<T | undefined> => {
    controller.current?.abort();
    const c = new AbortController();
    controller.current = c;
    setLoading(true);
    setError(null);
    try {
      return await fn(c.signal);
    } catch (e) {
      if (!c.signal.aborted) setError(e instanceof AIError ? e.message : `Erro inesperado: ${String(e)}`);
      return undefined;
    } finally {
      if (controller.current === c) setLoading(false);
    }
  }, []);

  return { run, loading, error, clearError: () => setError(null) };
}
