import type { Challenge } from './types';

// Escada de dicas 0→6 (método do Manware, com nossas palavras): cada degrau
// entrega um pouco mais. Antes do primeiro, ele diz o que tentou e o que
// espera que aconteça: metade das vezes isso sozinho destrava.

export const NIVEIS_DICA = [
  { nome: 'Pergunta', explica: 'Uma pergunta que faz você olhar pro lugar certo.' },
  { nome: 'Direção', explica: 'Pra que parte do problema olhar.' },
  { nome: 'Conceito', explica: 'Qual ideia do tópico resolve isso.' },
  { nome: 'Estratégia', explica: 'Os passos, sem código.' },
  { nome: 'Pseudocódigo', explica: 'A lógica em português estruturado.' },
  { nome: 'Trecho', explica: 'O pedaço de código que falta.' },
  { nome: 'Solução', explica: 'A resposta inteira (custa caro).' },
] as const;

export const NIVEL_MAX = NIVEIS_DICA.length - 1;

/**
 * Quanto da nota vale depois de abrir dicas. Até "Conceito" não custa nada
 * (é ensino); daí em diante cada degrau tira um pouco de XP e de domínio.
 */
export function fatorDica(nivel: number | undefined): number {
  if (nivel === undefined || nivel <= 2) return 1;
  return [1, 1, 1, 0.9, 0.8, 0.65, 0.5][Math.min(nivel, NIVEL_MAX)];
}

/** Orientação de cada degrau quando o banco não tem dica pra ele (nunca repete). */
const GERAL: Record<number, string> = {
  0: 'Releia o enunciado e escreva, numa linha, a entrada e a saída esperadas. O que muda entre elas?',
  1: 'Ache no enunciado a regra que o código precisa garantir. É nela que mora o problema.',
  2: 'Qual ideia do tópico resolve essa regra? Releia os pontos-chave da aula desse tópico.',
  3: 'Escreva em comentários os passos, um por linha: o que entra → a regra → o que sai.',
  4: 'Transforme cada comentário numa linha de pseudocódigo (SE… ENTÃO…, PARA CADA…). Depois só traduza.',
  5: 'Sem o motor do professor não tenho o trecho pronto. Compare seu pseudocódigo com o esqueleto inicial: o que falta preencher?',
  6: 'Sem o motor do professor não tenho a solução pronta. Conecte um modelo nas Configurações, ou cole o código no chat do Claude.',
};

/** Sem IA: cada dica do banco ocupa um degrau (a partir do 1); o resto usa a orientação geral. */
export function dicaSemIA(c: Pick<Challenge, 'hints' | 'starterCode'>, nivel: number): string {
  if (nivel >= 1 && nivel <= c.hints.length && nivel < NIVEL_MAX) return c.hints[nivel - 1];
  return GERAL[nivel];
}
