import { create } from 'zustand';

// Qual painel de configuração está aberto. Qualquer tela pode pedir pra abrir um
// (ex.: a mensagem de boas-vindas abre a Aparência), e a barra do topo desenha o modal.

export type Painel = 'tema' | 'fontes' | 'celular' | null;

interface UIState {
  painel: Painel;
  abrir: (p: Exclude<Painel, null>) => void;
  fechar: () => void;
}

export const useUI = create<UIState>()((set) => ({
  painel: null,
  abrir: (painel) => set({ painel }),
  fechar: () => set({ painel: null }),
}));
