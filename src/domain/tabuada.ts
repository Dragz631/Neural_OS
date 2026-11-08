// Tabuada rápida (Hugo, 08/11/2026): partidas curtas só de tabuada, porque ela é a base de
// muita conta. Sem IA: abre na hora e funciona offline. Cada conta tem uma "caixa" (estilo
// Leitner): acertou rápido sobe, errou volta pra 0. A conta que você erra ou demora aparece
// mais; a que você sabe vai sumindo aos poucos.

export type Operacao = 'x' | '÷';

export interface Conta {
  a: number;
  b: number;
  op: Operacao;
}

/** Como você vai numa conta (7×8 e 8×7 contam como a mesma). */
export interface FatoTabuada {
  acertos: number;
  erros: number;
  /** Média dos tempos de acerto, em ms. */
  tempoMedio: number;
  /** 0 = errou por último / nunca acertou; 4 = sabe de cor. */
  caixa: number;
}

export const RAPIDO_MS = 5000;
export const XP_MAX_DIA = 30;
export const CONTAS_POR_PARTIDA = 20;
export const SEGUNDOS_POR_PARTIDA = 60;
const MAX_CAIXA = 4;

/** Chave da conta: sempre o menor primeiro ("7x8"). */
export const chaveDe = (a: number, b: number) => `${Math.min(a, b)}x${Math.max(a, b)}`;

export const resultado = (c: Conta) => (c.op === 'x' ? c.a * c.b : c.a);

/** Como a conta aparece: "7 × 8" ou, na divisão, "56 ÷ 8" (a resposta é 7). */
export function enunciado(c: Conta): string {
  return c.op === 'x' ? `${c.a} × ${c.b}` : `${c.a * c.b} ÷ ${c.b}`;
}

/** A conta certa por extenso, pra mostrar quando erra. */
export function contaCerta(c: Conta): string {
  return c.op === 'x' ? `${c.a} × ${c.b} = ${c.a * c.b}` : `${c.a * c.b} ÷ ${c.b} = ${c.a}`;
}

/** Peso de sorteio pela caixa: quanto menos sabe, mais aparece. */
const PESO = [8, 5, 3, 2, 1];

/** Todas as contas de 1×1 a 10×10, uma por par (sem repetir 7×8 e 8×7). */
export function todasAsChaves(): string[] {
  const out: string[] = [];
  for (let a = 1; a <= 10; a++) for (let b = a; b <= 10; b++) out.push(chaveDe(a, b));
  return out;
}

/**
 * Sorteia `n` contas. A 1 e a 10 pesam menos (são fáceis); a caixa decide o resto.
 * Nunca a mesma conta duas vezes seguidas. `sorte` dá pra fixar nos testes.
 */
export function sortearContas(fatos: Record<string, FatoTabuada>, n: number, divisao: boolean, sorte: () => number = Math.random): Conta[] {
  const chaves = todasAsChaves();
  const pesos = chaves.map((k) => {
    const [a, b] = k.split('x').map(Number);
    const base = PESO[fatos[k]?.caixa ?? 0];
    return a === 1 || b === 10 ? base * 0.3 : base;
  });
  const total = pesos.reduce((s, p) => s + p, 0);
  const out: Conta[] = [];
  let anterior = '';
  while (out.length < n) {
    let r = sorte() * total;
    let i = 0;
    while (r > pesos[i] && i < pesos.length - 1) r -= pesos[i++];
    if (chaves[i] === anterior) continue;
    anterior = chaves[i];
    const [x, y] = chaves[i].split('x').map(Number);
    const [a, b] = sorte() < 0.5 ? [x, y] : [y, x];
    out.push({ a, b, op: divisao && sorte() < 0.4 ? '÷' : 'x' });
  }
  return out;
}

/** Atualiza a conta depois de uma resposta. */
export function registrarResposta(f: FatoTabuada | undefined, certo: boolean, ms: number): FatoTabuada {
  const atual = f ?? { acertos: 0, erros: 0, tempoMedio: 0, caixa: 0 };
  if (!certo) return { ...atual, erros: atual.erros + 1, caixa: 0 };
  const tempoMedio = atual.acertos ? Math.round((atual.tempoMedio * atual.acertos + ms) / (atual.acertos + 1)) : Math.round(ms);
  // Certo mas devagar: sai do 0, mas não sobe além disso. Saber de cor é rápido.
  const caixa = ms < RAPIDO_MS ? Math.min(MAX_CAIXA, atual.caixa + 1) : Math.max(1, atual.caixa);
  return { ...atual, acertos: atual.acertos + 1, tempoMedio, caixa };
}

export type Dominio = 'novo' | 'fraco' | 'medio' | 'forte';

/** A cor do mapa 10×10. */
export function dominioDe(f: FatoTabuada | undefined): Dominio {
  if (!f || f.acertos + f.erros === 0) return 'novo';
  if (f.caixa === 0) return 'fraco';
  return f.caixa >= 3 ? 'forte' : 'medio';
}

/** As contas mais difíceis (as que você mais erra ou demora), pro "os seus difíceis". */
export function dificeis(fatos: Record<string, FatoTabuada>, max = 3): string[] {
  return Object.entries(fatos)
    .filter(([, f]) => f.erros > 0 && f.caixa < 3)
    .sort((x, y) => x[1].caixa - y[1].caixa || y[1].erros - x[1].erros || y[1].tempoMedio - x[1].tempoMedio)
    .slice(0, max)
    .map(([k]) => k.replace('x', '×'));
}

/** XP de um acerto: só se foi rápido, e o dia tem teto. */
export function xpDoAcerto(ms: number, xpHoje: number): number {
  return ms < RAPIDO_MS && xpHoje < XP_MAX_DIA ? 1 : 0;
}
