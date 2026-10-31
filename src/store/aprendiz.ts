import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { derivarPerfil, descreverPerfil, ENTREVISTA, normalizarRespostas, PERFIL_PADRAO, type IdPergunta, type PerfilAprendiz, type Respostas } from '../domain/aprendiz';

// O perfil de aprendizagem da pessoa (resultado da entrevista). Fica no navegador
// e no backup; o professor lê daqui em todo pedido.

interface AprendizState {
  respostas: Respostas;
  /** Texto livre do fim da entrevista. */
  livre: string;
  perfil: PerfilAprendiz;
  /** Liga/desliga uma opção (pergunta de várias) ou troca a escolhida (pergunta de uma só). */
  alternar: (id: IdPergunta, valor: string) => void;
  /** Troca as opções da pergunta de uma vez. */
  definir: (id: IdPergunta, valores: string[]) => void;
  escrever: (livre: string) => void;
  /** Carrega respostas de um backup (aceita o formato antigo, de um valor por pergunta). */
  carregar: (dados: { respostas?: unknown; livre?: string }) => void;
  refazer: () => void;
}

const recalcular = (respostas: Respostas, livre: string) => derivarPerfil(respostas, new Date().toISOString(), livre);

export const useAprendiz = create<AprendizState>()(
  persist(
    (set, get) => ({
      respostas: {},
      livre: '',
      perfil: PERFIL_PADRAO,
      alternar: (id, valor) => {
        const multi = ENTREVISTA.find((p) => p.id === id)?.multi;
        const atual = get().respostas[id] ?? [];
        const lista = !multi ? [valor] : atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor];
        get().definir(id, lista);
      },
      definir: (id, valores) => {
        const respostas = { ...get().respostas, [id]: valores };
        if (valores.length === 0) delete respostas[id];
        set({ respostas, perfil: recalcular(respostas, get().livre) });
      },
      escrever: (livre) => set({ livre, perfil: recalcular(get().respostas, livre) }),
      carregar: (dados) => {
        const respostas = normalizarRespostas(dados.respostas);
        const livre = typeof dados.livre === 'string' ? dados.livre : '';
        set({ respostas, livre, perfil: recalcular(respostas, livre) });
      },
      refazer: () => set({ respostas: {}, livre: '', perfil: PERFIL_PADRAO }),
    }),
    {
      name: 'neural-os.aprendiz',
      version: 2,
      // v1 guardava um texto por pergunta; v2 guarda uma lista.
      migrate: (estado) => {
        const e = (estado ?? {}) as { respostas?: unknown; livre?: string };
        const respostas = normalizarRespostas(e.respostas);
        const livre = typeof e.livre === 'string' ? e.livre : '';
        return { respostas, livre, perfil: Object.keys(respostas).length || livre ? recalcular(respostas, livre) : PERFIL_PADRAO };
      },
    },
  ),
);

/** O que o professor precisa saber sobre como a pessoa aprende (vazio sem entrevista). */
export const aprendizParaIA = () => {
  const { perfil, respostas } = useAprendiz.getState();
  return descreverPerfil(perfil, respostas);
};
