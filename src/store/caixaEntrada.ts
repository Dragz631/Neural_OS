import { create } from 'zustand';
import { persist } from '../lib/persistir';
import type { DestinoNota, NotaRapida } from '../domain/caixaEntrada';
import { newId } from './study';

// Caixa de entrada do Lobby. "Encaminhar" quem faz é o componente (ele sabe o tópico
// ou a entrega de destino); aqui só marca a nota como resolvida.

interface CaixaState {
  notas: NotaRapida[];
  adicionar: (texto: string) => void;
  encaminhar: (id: string, destino: DestinoNota) => void;
  apagar: (id: string) => void;
}

export const useCaixa = create<CaixaState>()(
  persist(
    (set) => ({
      notas: [],
      adicionar: (texto) =>
        set((s) => ({ notas: [{ id: newId('nota'), texto: texto.trim(), criadaEm: new Date().toISOString() }, ...s.notas] })),
      encaminhar: (id, destino) => set((s) => ({ notas: s.notas.map((n) => (n.id === id ? { ...n, destino } : n)) })),
      apagar: (id) => set((s) => ({ notas: s.notas.filter((n) => n.id !== id) })),
    }),
    { name: 'neural-os.caixa', version: 1 },
  ),
);
