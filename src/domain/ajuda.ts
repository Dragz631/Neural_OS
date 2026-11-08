// Escada de ajuda: a ideia master do Neural-OS (Hugo, 08/11/2026).
// O professor faz o aluno PENSAR antes de entregar qualquer resposta. Ele só entrega
// quando o aluno tentou de verdade e não tem como absorver sem ela.
//   1. devolve uma pergunta   2. dica pequena   3. exemplo parecido (outros números)
//   4. passo a passo com lacunas   5. resposta completa + "agora faz um parecido sozinho"

export type Degrau = 1 | 2 | 3 | 4 | 5;

export interface Escada {
  /** O que o aluno quer resolver (o 1º pedido). */
  problema: string;
  degrau: Degrau;
  /** Respostas próprias dele de verdade (não "não sei"). */
  tentativas: number;
  desde: number;
}

/** Tentativas reais antes de liberar a resposta completa. */
export const TENTATIVAS_PRA_LIBERAR = 2;

export const NOME_DEGRAU: Record<Degrau, string> = {
  1: 'pergunta pra você pensar',
  2: 'dica pequena',
  3: 'exemplo parecido',
  4: 'passo a passo com lacunas',
  5: 'resposta explicada',
};

export const INSTRUCAO_DEGRAU: Record<Degrau, string> = {
  1: 'NÃO resolva e NÃO dê o resultado. Devolva UMA pergunta curta que faça ele pensar no primeiro passo (o que ele já sabe, o que o problema está pedindo).',
  2: 'NÃO resolva e NÃO dê o resultado. Dê UMA dica pequena que aponta o caminho (qual ideia ou fórmula usar), sem fazer a conta. Termine perguntando o que ele tentaria agora.',
  3: 'NÃO resolva o problema DELE. Mostre um exemplo PARECIDO com outros números, resolvido passo a passo, e peça pra ele aplicar o mesmo no dele.',
  4: 'Monte o passo a passo do problema DELE com lacunas (___) pra ele preencher. NÃO preencha o último passo nem o resultado final.',
  5: 'Agora pode mostrar a resolução completa, explicada passo a passo (e desenhada se ajudar). No fim, proponha UM exercício parecido pra ele fazer sozinho.',
};

/** O aluno está pedindo a resposta de um exercício (e não um ajuste de explicação)? */
export function pedeResposta(texto: string): boolean {
  const t = texto.toLowerCase();
  if (/(me d[aá]|qual [ée]|manda|passa)( a)? (resposta|resultado|gabarito|solu[cç][aã]o)/.test(t)) return true;
  if (/\b(resolve|resolva|resolver|calcula|calcule|faz pra mim|faça pra mim|responde (essa|esta|a) (quest|pergunta)|quanto d[aá]|quanto [ée])\b/.test(t)) return true;
  // Conta solta: "P(A|B) = ?", "3x + 2 = 11", "12/4?"
  return /[\d)]\s*[-+*/×÷=^]\s*[\d(x?]/.test(t) && /\?|=\s*$|quanto|resultado/.test(t);
}

/** Ele respondeu algo próprio (conta como tentativa)? "não sei", "?" e "ok" não contam. */
export function tentativaReal(texto: string): boolean {
  const t = texto.trim().toLowerCase();
  if (t.length < 6) return false;
  return !/^(n[aã]o sei|sei l[aá]|nao entendi|não entendi|desisto|me ajuda|ajuda|\?+|ok|hm+|sim|n[aã]o)\b/.test(t);
}

/** Começa uma escada nova pra este problema. */
export const novaEscada = (problema: string): Escada => ({ problema, degrau: 1, tentativas: 0, desde: Date.now() });

/** Pode liberar a resposta completa? Só com tentativas reais, ou se ele está travado de verdade. */
export const podeLiberar = (e: Escada, travadoDeVerdade = false) => travadoDeVerdade || e.tentativas >= TENTATIVAS_PRA_LIBERAR;

/**
 * Próximo degrau depois de uma mensagem do aluno na escada.
 * Tentativa real sobe um degrau; "não sei" também sobe, mas nunca libera o 5 sem tentativas.
 */
export function subir(e: Escada, mensagem: string, travadoDeVerdade = false): Escada {
  const tentou = tentativaReal(mensagem);
  const tentativas = e.tentativas + (tentou ? 1 : 0);
  const teto: Degrau = podeLiberar({ ...e, tentativas }, travadoDeVerdade) ? 5 : 4;
  const degrau = Math.min(teto, e.degrau + 1) as Degrau;
  return { ...e, tentativas, degrau };
}

/** "Desisti, me mostra": só sobe direto pro 5 se já pode liberar; senão vai até o 4. */
export function desistir(e: Escada, travadoDeVerdade = false): Escada {
  return { ...e, degrau: podeLiberar(e, travadoDeVerdade) ? 5 : (Math.max(e.degrau, 4) as Degrau) };
}
