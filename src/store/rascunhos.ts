import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Id } from '../domain/types';

// O que a pessoa estava fazendo no meio. Sair da aba e voltar não pode perder nada:
// o tópico aberto no Professor, o texto do Feynman e a revisão guiada em andamento.

/** Foto da revisão guiada (RevisaoGuiada.tsx). Os tipos finos ficam lá; aqui só guardamos. */
export interface RevisaoSalva {
  fase: string;
  tamanho: string;
  cansado: boolean;
  slide: string;
  fila: unknown[];
  i: number;
  resposta: string;
  feitas: unknown[];
  diag: unknown;
  mini: boolean;
  consertos: Record<string, unknown>;
  inicioEm: number;
}

interface RascunhosState {
  ultimoTopico?: Id;
  feynman: Record<Id, string>;
  revisao: Record<Id, RevisaoSalva>;
  /** Molda-horário: dias abertos (data → aberto). Sem registro, só hoje abre. */
  diasAbertos: Record<string, boolean>;
  abrirDias: (datas: string[], aberto: boolean) => void;
  lembrarTopico: (id: Id) => void;
  escreverFeynman: (id: Id, texto: string) => void;
  guardarRevisao: (id: Id, r: RevisaoSalva | undefined) => void;
}

export const useRascunhos = create<RascunhosState>()(
  persist(
    (set) => ({
      feynman: {},
      revisao: {},
      diasAbertos: {},
      abrirDias: (datas, aberto) => set((s) => ({ diasAbertos: { ...s.diasAbertos, ...Object.fromEntries(datas.map((d) => [d, aberto])) } })),
      lembrarTopico: (id) => set({ ultimoTopico: id }),
      escreverFeynman: (id, texto) =>
        set((s) => {
          const feynman = { ...s.feynman };
          if (texto) feynman[id] = texto;
          else delete feynman[id];
          return { feynman };
        }),
      guardarRevisao: (id, r) =>
        set((s) => {
          const revisao = { ...s.revisao };
          if (r) revisao[id] = r;
          else delete revisao[id];
          return { revisao };
        }),
    }),
    { name: 'neural-os.rascunhos', version: 1 },
  ),
);
