import { create } from 'zustand';

// O que a pessoa selecionou no quadro agora (texto legível, via describeScene).
// O chat do professor usa isso pra saber DE QUAL PARTE ela está falando.
// Não é salvo: seleção é coisa do momento.

interface SelecaoState {
  boardId?: string;
  texto: string;
  definir: (boardId: string, texto: string) => void;
  limpar: () => void;
}

export const useSelecaoQuadro = create<SelecaoState>()((set) => ({
  texto: '',
  definir: (boardId, texto) => set({ boardId, texto }),
  limpar: () => set({ boardId: undefined, texto: '' }),
}));
