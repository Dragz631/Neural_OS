import type { Energy, LocalDate } from './types';

// Estudo guiado com pomodoro (Hugo, 08/11/2026): o professor sempre conduz.
// foco → pausa (forçada, com dica de descanso) → "voltou? o que vimos?" → próximo foco ...
// A cada N blocos a pausa é longa. Depois do último bloco: "chega por hoje".
// Tudo é calculado pelo HORÁRIO (início + duração), então trocar de aba, recarregar
// ou olhar no celular mostra o mesmo tempo.

export type FaseFoco = 'foco' | 'pausa' | 'longa' | 'retorno' | 'fim';

export interface Ritmo {
  foco: number; // minutos
  pausa: number;
  longa: number;
  /** Pausa longa a cada quantos blocos. */
  aCada: number;
}

export type IdRitmo = 'cansado' | 'classico' | 'profundo' | 'teste';

export const RITMOS: Record<IdRitmo, Ritmo & { nome: string; quando: string }> = {
  cansado: { nome: '15 / 3', quando: 'dia cansado: blocos curtos', foco: 15, pausa: 3, longa: 10, aCada: 3 },
  classico: { nome: '25 / 5', quando: 'o clássico', foco: 25, pausa: 5, longa: 15, aCada: 4 },
  profundo: { nome: '50 / 10', quando: 'energia alta: foco profundo', foco: 50, pausa: 10, longa: 20, aCada: 2 },
  teste: { nome: '1 / 1', quando: 'só pra testar', foco: 1, pausa: 1, longa: 1, aCada: 2 },
};

/** A energia do check-in do Molda-horário escolhe o ritmo. */
export const ritmoPelaEnergia = (e?: Energy): IdRitmo => (e === 1 ? 'cansado' : e === 3 ? 'profundo' : 'classico');

/** Quantos blocos cabem no tempo que você disse que tem hoje (mínimo 1, máximo 8). */
export function blocosQueCabem(minutos: number | undefined, r: Ritmo): number {
  if (!minutos) return 4;
  return Math.max(1, Math.min(8, Math.floor((minutos + r.pausa) / (r.foco + r.pausa))));
}

export interface SessaoFoco {
  fase: FaseFoco;
  /** Quando a fase atual começou (ms). */
  inicio: number;
  /** Duração da fase atual (ms). "retorno" e "fim" não têm relógio (0). */
  duracao: number;
  /** Bloco de foco atual (1 = o primeiro). */
  bloco: number;
  total: number;
  ritmo: IdRitmo;
  topicId?: string;
  /** Pausas puladas nesta sessão. */
  pulos: number;
  data: LocalDate;
}

export const minutos = (m: number) => m * 60_000;

/** Quanto falta na fase atual (ms, nunca negativo). */
export const restante = (s: SessaoFoco, agora = Date.now()) => Math.max(0, s.inicio + s.duracao - agora);

/** Depois do foco: pausa, pausa longa, ou acabou o dia. */
export function depoisDoFoco(s: SessaoFoco, agora = Date.now()): SessaoFoco {
  const r = RITMOS[s.ritmo];
  if (s.bloco >= s.total) return { ...s, fase: 'fim', inicio: agora, duracao: 0 };
  const longa = s.bloco % r.aCada === 0;
  return { ...s, fase: longa ? 'longa' : 'pausa', inicio: agora, duracao: minutos(longa ? r.longa : r.pausa) };
}

/** Depois da pausa: a pergunta da volta ("o que vimos?"), sem relógio. */
export const depoisDaPausa = (s: SessaoFoco, agora = Date.now()): SessaoFoco => ({ ...s, fase: 'retorno', inicio: agora, duracao: 0 });

/** Respondeu a volta: começa o próximo bloco de foco. */
export const proximoFoco = (s: SessaoFoco, agora = Date.now()): SessaoFoco => ({ ...s, fase: 'foco', bloco: s.bloco + 1, inicio: agora, duracao: minutos(RITMOS[s.ritmo].foco) });

export function novaSessao(ritmo: IdRitmo, total: number, data: LocalDate, topicId?: string, agora = Date.now()): SessaoFoco {
  return { fase: 'foco', inicio: agora, duracao: minutos(RITMOS[ritmo].foco), bloco: 1, total, ritmo, topicId, pulos: 0, data };
}

/** Dicas de descanso: o cérebro também é músculo. A primeira é do Hugo. */
export const DICAS_DESCANSO = [
  'Não pegue no celular nem force a pensar: olhe pra parede ou pela janela e deixe o cérebro descansar. Pensar é igual treinar o bíceps na academia: o músculo precisa de descanso.',
  'Olhe pra algo longe (uns 6 metros) por 20 segundos. Os olhos ficaram focados de perto o bloco inteiro.',
  'Levanta, anda um pouco, bebe água. O corpo parado deixa a cabeça pesada.',
  'Respira 4-7-8: puxa o ar em 4, segura 7, solta em 8. Duas ou três vezes.',
  'Alonga o pescoço e os ombros devagar. Sem tela, sem notícia, sem rede social.',
  'Não revise a matéria agora. O cérebro organiza o que você viu justamente quando você para.',
];

export const dicaDoBloco = (bloco: number) => DICAS_DESCANSO[(bloco - 1) % DICAS_DESCANSO.length];

/** Respiração em ASCII: o círculo cresce (puxa) e encolhe (solta). Um quadro por segundo. */
export const RESPIRACAO = [
  ['     .     ', '  puxa... '],
  ['    (.)    ', '  puxa... '],
  ['   ( o )   ', '  puxa... '],
  ['  (  O  )  ', '  segura  '],
  ['  (  O  )  ', '  segura  '],
  ['   ( o )   ', '  solta...'],
  ['    (.)    ', '  solta...'],
  ['     .     ', '  solta...'],
];
