import { create } from 'zustand';
import { persist } from '../lib/persistir';
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
    // v3 (08/11/2026): widget "Foco" (estudo guiado) entra no primeiro espaço livre de quem já arrumou.
    {
      name: 'neural-os.lobby',
      version: 6,
      migrate: (estado, versao) => {
        if (versao < 2) return { itens: [], iniciado: false } as never;
        let s = estado as { itens: ItemGrade[]; iniciado: boolean };
        if (!s.iniciado) return s as never;
        // Widget novo entra no primeiro espaço livre (v3: Foco; v4/v5, 08/11/2026: Tabuada, com a grade maior; v6: Músculos do cérebro).
        for (const [id, w, h] of [['foco', 5, 3], ['tabuada', 3, 6], ['musculos', 4, 5]] as const) {
          if (s.itens.some((i) => i.id === id)) continue;
          const livre = primeiroLivre(s.itens, w, h);
          if (livre) s = { ...s, itens: [...s.itens, { id, ...livre }] };
        }
        return s as never;
      },
    },
  ),
);
