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

/** 'meu' = o ritmo que você montou (foco, pausa, pausa longa, a cada quantos). */
export type IdRitmo = 'cansado' | 'classico' | 'profundo' | 'teste' | 'meu';

export const RITMOS: Record<Exclude<IdRitmo, 'meu'>, Ritmo & { nome: string; quando: string }> = {
  cansado: { nome: '15 / 3', quando: 'dia cansado: blocos curtos', foco: 15, pausa: 3, longa: 10, aCada: 3 },
  classico: { nome: '25 / 5', quando: 'o clássico', foco: 25, pausa: 5, longa: 15, aCada: 4 },
  profundo: { nome: '50 / 10', quando: 'energia alta: foco profundo', foco: 50, pausa: 10, longa: 20, aCada: 2 },
  teste: { nome: '1 / 1', quando: 'só pra testar', foco: 1, pausa: 1, longa: 1, aCada: 2 },
};

export const RITMO_MEU_PADRAO: Ritmo = { foco: 25, pausa: 5, longa: 15, aCada: 4 };

/** Os números de um ritmo (o seu, se for 'meu'). */
export const ritmoPor = (id: IdRitmo, meu: Ritmo = RITMO_MEU_PADRAO): Ritmo => (id === 'meu' ? meu : RITMOS[id]);

/** Valida o ritmo que a pessoa digitou (minutos inteiros, com limites sãos). */
export function ritmoValido(r: Partial<Ritmo>): Ritmo {
  const n = (v: unknown, min: number, max: number, padrao: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : padrao);
  return { foco: n(r.foco, 1, 120, 25), pausa: n(r.pausa, 1, 30, 5), longa: n(r.longa, 1, 60, 15), aCada: n(r.aCada, 1, 8, 4) };
}

/** A energia do check-in do Molda-horário escolhe o ritmo. */
export const ritmoPelaEnergia = (e?: Energy): IdRitmo => (e === 1 ? 'cansado' : e === 3 ? 'profundo' : 'classico');

/** Quantos blocos cabem no tempo que você disse que tem hoje (mínimo 1, máximo 8). */
export function blocosQueCabem(minutos: number | undefined, r: Ritmo): number {
  if (!minutos) return 4;
  return Math.max(1, Math.min(8, Math.floor((minutos + r.pausa) / (r.foco + r.pausa))));
}

export interface SessaoFoco {
  /** Marca as sessões de estudo registradas por este pomodoro (pra descartar se foi teste). */
  id?: string;
  /** Os números do ritmo desta sessão (o personalizado também). Sessões antigas não têm: usa RITMOS. */
  cfg?: Ritmo;
  /** Pausado pela pessoa (ms): o relógio para até retomar. */
  pausadaEm?: number;
  /** Minutos de foco já registrados nesta sessão (blocos completos). */
  minutosFeitos?: number;
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

/** Os números do ritmo desta sessão. */
export const ritmoDa = (s: SessaoFoco): Ritmo => s.cfg ?? ritmoPor(s.ritmo);

/** Quanto falta na fase atual (ms, nunca negativo). Pausado, o relógio fica parado. */
export const restante = (s: SessaoFoco, agora = Date.now()) => Math.max(0, s.inicio + s.duracao - (s.pausadaEm ?? agora));

/** Pausar o foco: congela o relógio. */
export const pausar = (s: SessaoFoco, agora = Date.now()): SessaoFoco => (s.pausadaEm || s.fase !== 'foco' ? s : { ...s, pausadaEm: agora });

/** Retomar: o tempo parado não conta (empurra o início pra frente). */
export function retomar(s: SessaoFoco, agora = Date.now()): SessaoFoco {
  if (!s.pausadaEm) return s;
  const { pausadaEm, ...resto } = s;
  return { ...resto, inicio: s.inicio + (agora - pausadaEm) };
}

/** Minutos de foco já corridos no bloco atual (pra contar quando para no meio). */
export const minutosNoBloco = (s: SessaoFoco, agora = Date.now()) => (s.fase === 'foco' ? Math.floor((s.duracao - restante(s, agora)) / 60_000) : 0);

/** Por que você parou: decide se o tempo conta como estudo pro professor. */
export const MOTIVOS_PARADA = [
  { id: 'testando', rotulo: 'Só estava testando', conta: false, explica: 'O tempo desta sessão é apagado: o professor não conta como estudo.' },
  { id: 'sem-querer', rotulo: 'Comecei sem querer', conta: false, explica: 'O tempo desta sessão é apagado.' },
  { id: 'mudar-tempo', rotulo: 'Quero mudar o tempo', conta: true, explica: 'O que você estudou conta; depois você ajusta o ritmo e começa de novo.' },
  { id: 'terminei', rotulo: 'Terminei o que ia estudar', conta: true, explica: 'Conta o tempo que você estudou, até agora.' },
  { id: 'cansei', rotulo: 'Cansei / não rendeu', conta: true, explica: 'Conta, e o professor fica sabendo: na próxima, ele sugere blocos mais curtos.' },
  { id: 'interrompido', rotulo: 'Me interromperam', conta: true, explica: 'Conta o que deu pra estudar.' },
] as const;
export type MotivoParada = (typeof MOTIVOS_PARADA)[number]['id'];

/** Depois do foco: pausa, pausa longa, ou acabou o dia. */
export function depoisDoFoco(s: SessaoFoco, agora = Date.now()): SessaoFoco {
  const r = ritmoDa(s);
  if (s.bloco >= s.total) return { ...s, fase: 'fim', inicio: agora, duracao: 0 };
  const longa = s.bloco % r.aCada === 0;
  return { ...s, fase: longa ? 'longa' : 'pausa', inicio: agora, duracao: minutos(longa ? r.longa : r.pausa) };
}

/** Depois da pausa: a pergunta da volta ("o que vimos?"), sem relógio. */
export const depoisDaPausa = (s: SessaoFoco, agora = Date.now()): SessaoFoco => ({ ...s, fase: 'retorno', inicio: agora, duracao: 0 });

/** Respondeu a volta: começa o próximo bloco de foco. */
export const proximoFoco = (s: SessaoFoco, agora = Date.now()): SessaoFoco => ({ ...s, fase: 'foco', bloco: s.bloco + 1, inicio: agora, duracao: minutos(ritmoDa(s).foco) });

export function novaSessao(ritmo: IdRitmo, total: number, data: LocalDate, topicId?: string, agora = Date.now(), meu?: Ritmo): SessaoFoco {
  const cfg = ritmoPor(ritmo, meu);
  return { id: `foco_${agora.toString(36)}`, cfg, minutosFeitos: 0, fase: 'foco', inicio: agora, duracao: minutos(cfg.foco), bloco: 1, total, ritmo, topicId, pulos: 0, data };
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
