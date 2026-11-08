import { create } from 'zustand';
import { persist } from '../lib/persistir';
import { toLocalDate } from '../domain/dates';
import { blocosQueCabem, depoisDaPausa, depoisDoFoco, novaSessao, proximoFoco, RITMOS, ritmoPelaEnergia, type IdRitmo, type SessaoFoco } from '../domain/foco';
import { useStudy } from './study';

// O estudo guiado (pomodoro) em andamento. É salvo e sincronizado: o celular mostra o
// mesmo relógio do PC. Qualquer aparelho pode virar a fase quando o tempo acaba; se os
// dois virarem juntos, a sincronia fica com uma versão só.

interface DiaFoco {
  blocos: number;
  pulos: number;
  minutos: number;
}

interface FocoState {
  sessao?: SessaoFoco;
  /** Ritmo escolhido à mão (sem isso, vem da energia do check-in). */
  ritmoFixo?: IdRitmo;
  /** Resumo por dia (pra mente do professor saber o seu ritmo). Só os últimos 30 dias. */
  dias: Record<string, DiaFoco>;
  comecar: (topicId?: string, ritmo?: IdRitmo, blocos?: number) => void;
  /** O relógio da fase acabou: vira pra próxima. */
  virar: () => void;
  /** Pular a pausa (com atrito: segurar 3 s). Fica registrado. */
  pularPausa: () => void;
  /** Respondeu "o que vimos?" (ou pulou): começa o próximo bloco. */
  voltei: (lembrou?: string) => void;
  parar: () => void;
  fixarRitmo: (r: IdRitmo | undefined) => void;
}

function somarDia(dias: Record<string, DiaFoco>, data: string, d: Partial<DiaFoco>): Record<string, DiaFoco> {
  const atual = dias[data] ?? { blocos: 0, pulos: 0, minutos: 0 };
  const novo = { ...dias, [data]: { blocos: atual.blocos + (d.blocos ?? 0), pulos: atual.pulos + (d.pulos ?? 0), minutos: atual.minutos + (d.minutos ?? 0) } };
  const datas = Object.keys(novo).sort();
  for (const velha of datas.slice(0, Math.max(0, datas.length - 30))) delete novo[velha];
  return novo;
}

/** O ritmo de hoje: o escolhido à mão, senão pela energia do check-in. */
export function ritmoDeHoje(): { ritmo: IdRitmo; blocos: number } {
  const checkin = useStudy.getState().checkins[toLocalDate()];
  const ritmo = useFoco.getState().ritmoFixo ?? ritmoPelaEnergia(checkin?.energy);
  return { ritmo, blocos: blocosQueCabem(checkin?.minutesAvailable, RITMOS[ritmo]) };
}

export const useFoco = create<FocoState>()(
  persist(
    (set, get) => ({
      dias: {},
      comecar: (topicId, ritmo, blocos) => {
        const hoje = ritmoDeHoje();
        set({ sessao: novaSessao(ritmo ?? hoje.ritmo, blocos ?? hoje.blocos, toLocalDate(), topicId) });
      },
      virar: () => {
        const s = get().sessao;
        if (!s) return;
        if (s.fase === 'foco') {
          const m = RITMOS[s.ritmo].foco;
          // O tempo de foco entra no seu histórico (sequência, horas da semana). Não paga XP.
          if (s.topicId) useStudy.getState().logSession({ topicId: s.topicId, minutes: m, kind: 'aula' });
          set({ sessao: depoisDoFoco(s), dias: somarDia(get().dias, s.data, { blocos: 1, minutos: m }) });
        } else if (s.fase === 'pausa' || s.fase === 'longa') set({ sessao: depoisDaPausa(s) });
      },
      pularPausa: () => {
        const s = get().sessao;
        if (!s || (s.fase !== 'pausa' && s.fase !== 'longa')) return;
        set({ sessao: { ...depoisDaPausa(s), pulos: s.pulos + 1 }, dias: somarDia(get().dias, s.data, { pulos: 1 }) });
      },
      voltei: (lembrou) => {
        const s = get().sessao;
        if (!s || s.fase !== 'retorno') return;
        // O que você lembrou depois da pausa vai pro diário do tópico (é um mini "lembra e explica").
        if (lembrou?.trim() && s.topicId) useStudy.getState().addDiario(s.topicId, { tipo: 'conceito', original: `[volta da pausa, bloco ${s.bloco}] ${lembrou.trim().slice(0, 400)}` });
        set({ sessao: proximoFoco(s) });
      },
      parar: () => set({ sessao: undefined }),
      fixarRitmo: (r) => set({ ritmoFixo: r }),
    }),
    { name: 'neural-os.foco', version: 1 },
  ),
);

/** O que o professor sabe do seu tempo: o bloco atual e como você tem usado as pausas. */
export function focoParaIA(): string {
  const { sessao, dias } = useFoco.getState();
  const linhas: string[] = [];
  if (sessao && sessao.fase !== 'fim') {
    const r = RITMOS[sessao.ritmo];
    linhas.push(
      `ESTUDO GUIADO: o aluno está em blocos de ${r.foco} min de foco (bloco ${sessao.bloco} de ${sessao.total}). Faça o que você escrever caber em UM bloco de ${r.foco} min: uma parte só, um exemplo, um mini-exercício. Se o assunto é maior, diga que continua no próximo bloco.`,
    );
  }
  const semana = Object.entries(dias).filter(([d]) => d >= toLocalDate(new Date(Date.now() - 7 * 86_400_000)));
  const pulos = semana.reduce((s, [, d]) => s + d.pulos, 0);
  const blocos = semana.reduce((s, [, d]) => s + d.blocos, 0);
  if (blocos) linhas.push(`Ritmo dele nos últimos 7 dias: ${blocos} blocos de foco${pulos ? `, pulou ${pulos} pausa(s)` : ''}.${pulos >= 3 ? ' Lembre com carinho que a pausa faz parte do aprender (o cérebro organiza o que viu quando para).' : ''}`);
  return linhas.join('\n');
}
