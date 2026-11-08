import { create } from 'zustand';
import { persist } from '../lib/persistir';
import { proximoStatus, type Entrega } from '../domain/entregas';
import { newId } from './study';
import { usePresenca } from './presenca';

// College Tracker: trabalhos, provas e listas. Entregar marca presença no dia (não paga XP desde 08/11/2026).

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
        set((s) => ({ lista: [{ ...e, status: e.status ?? 'pendente', id, criadaEm: new Date().toISOString() }, ...s.lista] }));
        return id;
      },
      atualizar: (id, patch) => set((s) => ({ lista: s.lista.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      apagar: (id) => set((s) => ({ lista: s.lista.filter((x) => x.id !== id) })),
      ciclarStatus: (id) => {
        const atual = get().lista.find((x) => x.id === id);
        if (!atual) return;
        const status = proximoStatus(atual.status);
        const entregue = status === 'entregue';
        const pagaAgora = entregue && !atual.xpPago;
        set((s) => ({
          lista: s.lista.map((x) =>
            x.id === id ? { ...x, status, entregueEm: entregue ? new Date().toISOString() : undefined, xpPago: x.xpPago || pagaAgora } : x,
          ),
        }));
        // Entregar não paga XP (08/11/2026): marcar "feito" não prova que você aprendeu.
        // O XP vem das provas e desafios conferidos. Entregar conta pra presença e pro troféu.
        if (entregue) usePresenca.getState().marcar();
      },
    }),
    { name: 'neural-os.entregas', version: 1 },
  ),
);
