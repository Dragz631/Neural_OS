import { create } from 'zustand';
import { persist } from '../lib/persistir';
import { toLocalDate } from '../domain/dates';
import type { LocalDate } from '../domain/types';

// Presença: dias que você marcou à mão como "estudei".
// O calendário soma isso com os dias que têm sessão registrada.

interface PresencaState {
  dias: LocalDate[];
  alternar: (dia: LocalDate) => void;
  marcar: (dia?: LocalDate) => void;
}

export const usePresenca = create<PresencaState>()(
  persist(
    (set) => ({
      dias: [],
      alternar: (dia) => set((s) => ({ dias: s.dias.includes(dia) ? s.dias.filter((d) => d !== dia) : [...s.dias, dia] })),
      marcar: (dia = toLocalDate()) => set((s) => (s.dias.includes(dia) ? s : { dias: [...s.dias, dia] })),
    }),
    { name: 'neural-os.presenca', version: 1 },
  ),
);
