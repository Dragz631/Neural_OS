import { create } from 'zustand';
import { persist } from '../lib/persistir';
import type { Id } from '../domain/types';
import { AIError } from '../services/ai/client';
import { useNav, type TabId } from './nav';
import { toast } from './toast';

// Tarefas longas de IA (aula, roadmap, feed, prova) vivem AQUI, fora das telas.
// Trocar de aba desmonta a tela, mas não cancela a tarefa: o resultado é gravado
// no store certo quando chega. Só o botão "Cancelar" aborta.
// Se a página recarregar no meio (o celular descartou a aba), a tarefa vira
// "interrompida" e o aviso no topo leva de volta pra pedir de novo.

export type StatusTarefa = 'rodando' | 'erro' | 'interrompida';

export interface Tarefa {
  chave: string;
  rotulo: string;
  status: StatusTarefa;
  inicio: number;
  erro?: string;
  /** Pra onde o aviso leva quando você clica. */
  aba: TabId;
  topicId?: Id;
}

interface TarefasState {
  lista: Record<string, Tarefa>;
  dispensar: (chave: string) => void;
}

const controles = new Map<string, AbortController>();

// Ao recarregar/fechar, o navegador derruba os pedidos em andamento e o fetch falha
// ("não consegui falar com o servidor"). Isso não é erro: a tarefa fica "rodando" no disco
// e, ao abrir de novo, vira "interrompida".
let saindo = false;
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => (saindo = true));
  window.addEventListener('beforeunload', () => (saindo = true));
}

export const useTarefas = create<TarefasState>()(
  persist(
    (set) => ({
      lista: {},
      dispensar: (chave) =>
        set((s) => {
          const lista = { ...s.lista };
          delete lista[chave];
          return { lista };
        }),
    }),
    {
      name: 'neural-os.tarefas',
      version: 1,
      // Ao abrir de novo, o que estava rodando não está mais (o fetch morreu junto com a página).
      merge: (salvo, atual) => {
        const lista: Record<string, Tarefa> = {};
        for (const t of Object.values((salvo as Partial<TarefasState> | undefined)?.lista ?? {})) {
          if (t.status === 'rodando' || t.status === 'interrompida') lista[t.chave] = { ...t, status: 'interrompida' };
          else if (t.status === 'erro') lista[t.chave] = t;
        }
        return { ...atual, lista };
      },
    },
  ),
);

function por(chave: string, t: Tarefa | undefined) {
  useTarefas.setState((s) => {
    const lista = { ...s.lista };
    if (t) lista[chave] = t;
    else delete lista[chave];
    return { lista };
  });
}

/**
 * Roda uma tarefa longa de IA. A própria `fn` grava o resultado (setLesson, salvar...).
 * Se a mesma chave já está rodando, não começa outra. Devolve o resultado ou undefined.
 */
export async function rodarTarefa<T>(
  chave: string,
  info: { rotulo: string; aba: TabId; topicId?: Id; avisarPronto?: string },
  fn: (signal: AbortSignal) => Promise<T>,
): Promise<T | undefined> {
  if (controles.has(chave)) return undefined;
  const c = new AbortController();
  controles.set(chave, c);
  por(chave, { chave, rotulo: info.rotulo, status: 'rodando', inicio: Date.now(), aba: info.aba, topicId: info.topicId });
  try {
    const r = await fn(c.signal);
    por(chave, undefined);
    // Avisa só se você não está olhando pra tela da tarefa.
    if (info.avisarPronto && (useNav.getState().tab !== info.aba || document.hidden)) {
      toast({ title: info.avisarPronto, description: 'Clique no aviso do topo ou abra a aba pra ver.', variant: 'success' });
    }
    return r;
  } catch (e) {
    if (saindo) return undefined;
    if (c.signal.aborted) por(chave, undefined);
    else por(chave, { ...useTarefas.getState().lista[chave], status: 'erro', erro: e instanceof AIError || e instanceof Error ? e.message : String(e) });
    return undefined;
  } finally {
    controles.delete(chave);
  }
}

export function cancelarTarefa(chave: string) {
  controles.get(chave)?.abort();
  useTarefas.getState().dispensar(chave);
}

/** Estado de uma tarefa pra tela: rodando?, erro?, e há quanto tempo. */
export function useTarefa(chave: string | undefined) {
  const t = useTarefas((s) => (chave ? s.lista[chave] : undefined));
  return {
    rodando: t?.status === 'rodando',
    erro: t?.status === 'erro' ? (t.erro ?? 'Algo deu errado.') : undefined,
    interrompida: t?.status === 'interrompida',
    inicio: t?.inicio,
    limpar: () => chave && useTarefas.getState().dispensar(chave),
    cancelar: () => chave && cancelarTarefa(chave),
  };
}
