import { create } from 'zustand';
import { persist } from '../lib/persistir';
import { toLocalDate } from '../domain/dates';
import { chaveDe, registrarResposta, xpDoAcerto, type Conta, type FatoTabuada } from '../domain/tabuada';
import { useStudy } from './study';
import { treinar } from './musculos';

// Como você vai em cada conta da tabuada. Salvo e sincronizado (o celular vê o mesmo mapa).

interface TabuadaState {
  fatos: Record<string, FatoTabuada>;
  /** XP da tabuada de hoje (teto diário: não vira farm). */
  xpDia: { data: string; xp: number };
  divisao: boolean;
  /** Registra a resposta e devolve o XP ganho (0 ou 1). */
  responder: (c: Conta, certo: boolean, ms: number) => number;
  alternarDivisao: () => void;
}

export const useTabuada = create<TabuadaState>()(
  persist(
    (set, get) => ({
      fatos: {},
      xpDia: { data: '', xp: 0 },
      divisao: false,
      responder: (c, certo, ms) => {
        const k = chaveDe(c.a, c.b);
        const hoje = toLocalDate();
        const xpHoje = get().xpDia.data === hoje ? get().xpDia.xp : 0;
        const xp = certo ? xpDoAcerto(ms, xpHoje) : 0;
        set((s) => ({ fatos: { ...s.fatos, [k]: registrarResposta(s.fatos[k], certo, ms) }, xpDia: { data: hoje, xp: xpHoje + xp } }));
        if (xp) useStudy.getState().addXp(xp);
        if (certo) treinar('memoria', 0.2);
        return xp;
      },
      alternarDivisao: () => set((s) => ({ divisao: !s.divisao })),
    }),
    { name: 'neural-os.tabuada', version: 1 },
  ),
);
