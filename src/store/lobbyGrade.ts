import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { encaixar, primeiroLivre, type ItemGrade, type Retangulo } from '../domain/lobbyGrade';

// Onde cada widget do Lobby está e que tamanho tem. O que a pessoa arruma fica guardado.
// O catálogo (nomes, tamanhos padrão) mora em features/lobby/widgets.tsx.

interface GradeState {
  itens: ItemGrade[];
  /** Falso até a 1ª vez que o Lobby abre (aí entra o arranjo padrão). */
  iniciado: boolean;
  /** Muda um widget de lugar/tamanho, empurrando os outros se eles tiverem pra onde ir. */
  ajustar: (id: string, r: Retangulo) => boolean;
  /** Tira da tela (volta pela bandeja). */
  ocultar: (id: string) => void;
  /** Traz de volta no primeiro espaço livre. false = grade cheia. */
  mostrar: (id: string, w: number, h: number) => boolean;
  restaurar: (padrao: ItemGrade[]) => void;
}

export const useGradeLobby = create<GradeState>()(
  persist(
    (set, get) => ({
      itens: [],
      iniciado: false,
      ajustar: (id, r) => {
        const novos = encaixar(get().itens, id, r);
        if (!novos) return false;
        set({ itens: novos });
        return true;
      },
      ocultar: (id) => set((s) => ({ itens: s.itens.filter((i) => i.id !== id) })),
      mostrar: (id, w, h) => {
        const livre = primeiroLivre(get().itens, w, h);
        if (!livre) return false;
        set((s) => ({ itens: [...s.itens, { id, ...livre }] }));
        return true;
      },
      restaurar: (padrao) => set({ itens: padrao, iniciado: true }),
    }),
    // v2: o arranjo padrão mudou de tamanho; quem não mexeu ganha o novo (migrate zera).
    { name: 'neural-os.lobby', version: 2, migrate: () => ({ itens: [], iniciado: false }) as never },
  ),
);
