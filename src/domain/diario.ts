import type { Id, LocalDate } from './types';

// Diário de cada tópico. Ideia do método do Manware (com nossas palavras):
// guardar o que VOCÊ pensou separado da versão corrigida, porque o erro original
// é o que mais ensina na revisão.

export type TipoEntradaDiario = 'duvida' | 'erro' | 'conceito';

/** De onde veio o erro (pra ver padrão: "sempre erro de estado", por exemplo). */
export type CategoriaErro =
  | 'sintaxe'
  | 'api'
  | 'modelo-mental'
  | 'fluxo'
  | 'estado'
  | 'suposicao'
  | 'ambiente'
  | 'decomposicao'
  | 'depuracao'
  | 'descuido';

export interface EntradaDiario {
  id: Id;
  data: LocalDate;
  tipo: TipoEntradaDiario;
  /** Como você pensou ou escreveu (nunca é reescrito). */
  original: string;
  /** A versão certa, quando houver. */
  corrigido?: string;
  categoria?: CategoriaErro;
  resolvida?: boolean;
}
