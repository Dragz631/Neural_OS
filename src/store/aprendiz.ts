import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { derivarPerfil, descreverPerfil, PERFIL_PADRAO, type PerfilAprendiz, type Respostas } from '../domain/aprendiz';

// O perfil de aprendizagem da pessoa (resultado da entrevista). Fica no navegador
// e no backup; o professor lê daqui em todo pedido.

interface AprendizState {
  respostas: Respostas;
  perfil: PerfilAprendiz;
  responder: (id: keyof Respostas, valor: string) => void;
  refazer: () => void;
}

export const useAprendiz = create<AprendizState>()(
  persist(
    (set, get) => ({
      respostas: {},
      perfil: PERFIL_PADRAO,
      responder: (id, valor) => {
        const respostas = { ...get().respostas, [id]: valor };
        set({ respostas, perfil: derivarPerfil(respostas, new Date().toISOString()) });
      },
      refazer: () => set({ respostas: {}, perfil: PERFIL_PADRAO }),
    }),
    { name: 'neural-os.aprendiz' },
  ),
);

/** O que o professor precisa saber sobre como a pessoa aprende (vazio sem entrevista). */
export const aprendizParaIA = () => descreverPerfil(useAprendiz.getState().perfil);
