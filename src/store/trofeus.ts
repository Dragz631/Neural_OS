import { create } from 'zustand';
import { persist } from '../lib/persistir';

// Só guarda quais troféus já pagaram XP (o "destravado" é sempre calculado).

interface TrofeusState {
  pagos: string[];
  pagar: (ids: string[]) => void;
}

export const useTrofeusPagos = create<TrofeusState>()(
  persist(
    (set) => ({
      pagos: [],
      pagar: (ids) => set((s) => ({ pagos: [...new Set([...s.pagos, ...ids])] })),
    }),
    { name: 'neural-os.trofeus', version: 1 },
  ),
);
