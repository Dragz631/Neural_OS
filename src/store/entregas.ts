import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { proximoStatus, type Entrega } from '../domain/entregas';
import { newId, useStudy } from './study';
import { usePresenca } from './presenca';

// College Tracker: trabalhos, provas e listas. Entregar dá XP e marca presença no dia.

interface EntregasState {
  lista: Entrega[];
  criar: (e: Omit<Entrega, 'id' | 'criadaEm' | 'status'> & { status?: Entrega['status'] }) => string;
  atualizar: (id: string, patch: Partial<Entrega>) => void;
  apagar: (id: string) => void;
  ciclarStatus: (id: string) => void;
}

export const useEntregas = create<EntregasState>()(
  persist(
    (set, get) => ({
      lista: [],
      criar: (e) => {
        const id = newId('ent');
        set((s) => ({ lista: [{ status: 'pendente', ...e, id, criadaEm: new Date().toISOString() }, ...s.lista] }));
        return id;
      },
      atualizar: (id, patch) => set((s) => ({ lista: s.lista.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      apagar: (id) => set((s) => ({ lista: s.lista.filter((x) => x.id !== id) })),
      ciclarStatus: (id) => {
        const atual = get().lista.find((x) => x.id === id);
        if (!atual) return;
        const status = proximoStatus(atual.status);
        const entregue = status === 'entregue';
        set((s) => ({
          lista: s.lista.map((x) => (x.id === id ? { ...x, status, entregueEm: entregue ? new Date().toISOString() : undefined } : x)),
        }));
        if (entregue) {
          useStudy.getState().addXp(atual.xp);
          usePresenca.getState().marcar();
        }
      },
    }),
    { name: 'neural-os.entregas', version: 1 },
  ),
);
