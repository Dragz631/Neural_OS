import type { Id } from './types';

// Caixa de entrada: anota rápido agora, decide depois pra onde vai.
// Nada fica solto: cada nota acaba num tópico (anotação ou dúvida) ou vira entrega.

export type DestinoNota = 'topico' | 'duvida' | 'entrega';

export interface NotaRapida {
  id: Id;
  texto: string;
  criadaEm: string;
  /** Preenchido quando a nota foi encaminhada (ela some da caixa). */
  destino?: DestinoNota;
}

export const pendentes = (notas: NotaRapida[]) => notas.filter((n) => !n.destino);
