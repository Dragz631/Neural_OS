import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cartao } from '../domain/cartoes';
import type { Id, LocalDate } from '../domain/types';

// Feed de cartões: o lote que a IA fez pra cada tópico (gasta conforme ele
// responde e é refeito quando acaba), as rodadas do dia e o som.

interface FeedState {
  /** Cartões da IA ainda não respondidos, por tópico. */
  cache: Record<Id, Cartao[]>;
  rodadas: { data: LocalDate; n: number };
  melhorCombo: number;
  som: boolean;
  guardar: (topicId: Id, cartoes: Cartao[]) => void;
  /** Tira do cache os cartões já respondidos. */
  gastar: (ids: Id[]) => void;
  fecharRodada: (hoje: LocalDate, combo: number) => void;
  alternarSom: () => void;
}

export const useFeed = create<FeedState>()(
  persist(
    (set) => ({
      cache: {},
      rodadas: { data: '', n: 0 },
      melhorCombo: 0,
      som: true,
      guardar: (topicId, cartoes) => set((s) => ({ cache: { ...s.cache, [topicId]: cartoes } })),
      gastar: (ids) =>
        set((s) => {
          const fora = new Set(ids);
          return { cache: Object.fromEntries(Object.entries(s.cache).map(([k, v]) => [k, v.filter((c) => !fora.has(c.id))])) };
        }),
      fecharRodada: (hoje, combo) =>
        set((s) => ({
          rodadas: { data: hoje, n: s.rodadas.data === hoje ? s.rodadas.n + 1 : 1 },
          melhorCombo: Math.max(s.melhorCombo, combo),
        })),
      alternarSom: () => set((s) => ({ som: !s.som })),
    }),
    { name: 'neural-os.feed', version: 1 },
  ),
);
