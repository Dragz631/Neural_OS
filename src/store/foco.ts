import { create } from 'zustand';
import { persist } from '../lib/persistir';
import { toLocalDate } from '../domain/dates';
import {
  blocosQueCabem,
  depoisDaPausa,
  depoisDoFoco,
  minutosNoBloco,
  MOTIVOS_PARADA,
  novaSessao,
  pausar as pausarSessao,
  proximoFoco,
  retomar as retomarSessao,
  RITMO_MEU_PADRAO,
  ritmoDa,
  ritmoPelaEnergia,
  ritmoPor,
  ritmoValido,
  type IdRitmo,
  type MotivoParada,
  type Ritmo,
  type SessaoFoco,
} from '../domain/foco';
import { useStudy } from './study';
import { treinar } from './musculos';

// O estudo guiado (pomodoro) em andamento. É salvo e sincronizado: o celular mostra o
// mesmo relógio do PC. Qualquer aparelho pode virar a fase quando o tempo acaba; se os
// dois virarem juntos, a sincronia fica com uma versão só.
// 09/11/2026 (Hugo): dá pra pausar, montar o próprio ritmo e, ao parar, dizer POR QUÊ:
// "só testando" / "sem querer" apagam o tempo (o professor não acha que você estudou).

interface DiaFoco {
  blocos: number;
  pulos: number;
  minutos: number;
  /** Quantas vezes parou por cada motivo nesse dia. */
  motivos?: Partial<Record<MotivoParada, number>>;
}

interface FocoState {
  sessao?: SessaoFoco;
  /** Ritmo escolhido à mão (sem isso, vem da energia do check-in). */
  ritmoFixo?: IdRitmo;
  /** O ritmo que você montou ("Personalizado"). */
  meuRitmo: Ritmo;
  /** Resumo por dia (pra mente do professor saber o seu ritmo). Só os últimos 30 dias. */
  dias: Record<string, DiaFoco>;
  comecar: (topicId?: string, ritmo?: IdRitmo, blocos?: number) => void;
  /** O relógio da fase acabou: vira pra próxima. */
  virar: () => void;
  pausar: () => void;
  retomar: () => void;
  /** Pular a pausa (com atrito: segurar 3 s). Fica registrado. */
  pularPausa: () => void;
  /** Respondeu "o que vimos?" (ou pulou): começa o próximo bloco. */
  voltei: (lembrou?: string) => void;
  /** Parar. O motivo decide se o tempo conta (sem motivo: conta, é o fim normal). */
  parar: (motivo?: MotivoParada) => void;
  fixarRitmo: (r: IdRitmo | undefined) => void;
  salvarMeuRitmo: (r: Partial<Ritmo>) => void;
}

function somarDia(dias: Record<string, DiaFoco>, data: string, d: Partial<Omit<DiaFoco, 'motivos'>> & { motivo?: MotivoParada }): Record<string, DiaFoco> {
  const atual = dias[data] ?? { blocos: 0, pulos: 0, minutos: 0 };
  const motivos = { ...(atual.motivos ?? {}) };
  if (d.motivo) motivos[d.motivo] = (motivos[d.motivo] ?? 0) + 1;
  const novo = {
    ...dias,
    [data]: { blocos: Math.max(0, atual.blocos + (d.blocos ?? 0)), pulos: Math.max(0, atual.pulos + (d.pulos ?? 0)), minutos: Math.max(0, atual.minutos + (d.minutos ?? 0)), motivos },
  };
  const datas = Object.keys(novo).sort();
  for (const velha of datas.slice(0, Math.max(0, datas.length - 30))) delete novo[velha];
  return novo;
}

const marca = (s: SessaoFoco) => (s.id ? `foco:${s.id}` : undefined);

/** O ritmo de hoje: o escolhido à mão, senão pela energia do check-in. */
export function ritmoDeHoje(): { ritmo: IdRitmo; blocos: number } {
  const checkin = useStudy.getState().checkins[toLocalDate()];
  const { ritmoFixo, meuRitmo } = useFoco.getState();
  const ritmo = ritmoFixo ?? ritmoPelaEnergia(checkin?.energy);
  return { ritmo, blocos: blocosQueCabem(checkin?.minutesAvailable, ritmoPor(ritmo, meuRitmo)) };
}

export const useFoco = create<FocoState>()(
  persist(
    (set, get) => ({
      dias: {},
      meuRitmo: RITMO_MEU_PADRAO,
      comecar: (topicId, ritmo, blocos) => {
        const hoje = ritmoDeHoje();
        set({ sessao: novaSessao(ritmo ?? hoje.ritmo, blocos ?? hoje.blocos, toLocalDate(), topicId, Date.now(), get().meuRitmo) });
      },
      virar: () => {
        const s = get().sessao;
        if (!s || s.pausadaEm) return;
        if (s.fase === 'foco') {
          const m = ritmoDa(s).foco;
          // O tempo de foco entra no seu histórico (sequência, horas da semana). Não paga XP.
          // A marca deixa apagar depois, se a pessoa disser que era só teste.
          if (s.topicId) useStudy.getState().logSession({ topicId: s.topicId, minutes: m, kind: 'aula', note: marca(s) });
          set({ sessao: { ...depoisDoFoco(s), minutosFeitos: (s.minutosFeitos ?? 0) + m }, dias: somarDia(get().dias, s.data, { blocos: 1, minutos: m }) });
          treinar('planejamento', 0.5);
        } else if (s.fase === 'pausa' || s.fase === 'longa') set({ sessao: depoisDaPausa(s) });
      },
      pausar: () => {
        const s = get().sessao;
        if (s) set({ sessao: pausarSessao(s) });
      },
      retomar: () => {
        const s = get().sessao;
        if (s) set({ sessao: retomarSessao(s) });
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
      parar: (motivo) => {
        const s = get().sessao;
        if (!s) return;
        const conta = !motivo || MOTIVOS_PARADA.find((m) => m.id === motivo)?.conta !== false;
        let dias = get().dias;
        if (!conta) {
          // Era teste (ou sem querer): some tudo que esta sessão registrou.
          const tag = marca(s);
          if (tag) useStudy.setState((st) => ({ sessions: st.sessions.filter((x) => x.note !== tag) }));
          const blocosFeitos = Math.round((s.minutosFeitos ?? 0) / Math.max(1, ritmoDa(s).foco));
          dias = somarDia(dias, s.data, { blocos: -blocosFeitos, minutos: -(s.minutosFeitos ?? 0), pulos: -s.pulos });
        } else {
          // Parou no meio de um bloco: o que estudou até aqui conta (a partir de 1 minuto).
          const m = minutosNoBloco(s);
          if (m >= 1 && s.topicId) useStudy.getState().logSession({ topicId: s.topicId, minutes: m, kind: 'aula', note: marca(s) });
          if (m >= 1) dias = somarDia(dias, s.data, { minutos: m });
        }
        if (motivo) dias = somarDia(dias, s.data, { motivo });
        set({ sessao: undefined, dias, ...(motivo === 'mudar-tempo' ? { ritmoFixo: 'meu' as const } : {}) });
      },
      fixarRitmo: (r) => set({ ritmoFixo: r }),
      salvarMeuRitmo: (r) => set({ meuRitmo: ritmoValido({ ...get().meuRitmo, ...r }) }),
    }),
    { name: 'neural-os.foco', version: 1 },
  ),
);

const NOME_MOTIVO: Partial<Record<MotivoParada, string>> = { cansei: 'parou cansado/sem render', interrompido: 'foi interrompido', 'mudar-tempo': 'parou pra mudar o tempo' };

/** O que o professor sabe do seu tempo: o bloco atual e como você tem usado as pausas. */
export function focoParaIA(): string {
  const { sessao, dias } = useFoco.getState();
  const linhas: string[] = [];
  if (sessao && sessao.fase !== 'fim') {
    const r = ritmoDa(sessao);
    linhas.push(
      `ESTUDO GUIADO: o aluno está em blocos de ${r.foco} min de foco (bloco ${sessao.bloco} de ${sessao.total}). Faça o que você escrever caber em UM bloco de ${r.foco} min: uma parte só, um exemplo, um mini-exercício. Se o assunto é maior, diga que continua no próximo bloco.`,
    );
  }
  const semana = Object.entries(dias).filter(([d]) => d >= toLocalDate(new Date(Date.now() - 7 * 86_400_000)));
  const pulos = semana.reduce((s, [, d]) => s + d.pulos, 0);
  const blocos = semana.reduce((s, [, d]) => s + d.blocos, 0);
  if (blocos) linhas.push(`Ritmo dele nos últimos 7 dias: ${blocos} blocos de foco${pulos ? `, pulou ${pulos} pausa(s)` : ''}.${pulos >= 3 ? ' Lembre com carinho que a pausa faz parte do aprender (o cérebro organiza o que viu quando para).' : ''}`);
  // Por que ele parou (sem contar teste/sem querer, que não dizem nada sobre o estudo).
  const motivos = semana.flatMap(([, d]) => Object.entries(d.motivos ?? {})).filter(([m]) => NOME_MOTIVO[m as MotivoParada]);
  const soma = new Map<string, number>();
  for (const [m, n] of motivos) soma.set(m, (soma.get(m) ?? 0) + (n ?? 0));
  if (soma.size)
    linhas.push(
      `Quando parou o estudo guiado antes do fim: ${[...soma].map(([m, n]) => `${NOME_MOTIVO[m as MotivoParada]} ${n}x`).join(', ')}.${(soma.get('cansei') ?? 0) >= 2 ? ' Ele tem cansado no meio: sugira blocos mais curtos (15 min) e aula em partes menores.' : ''}`,
    );
  return linhas.join('\n');
}
