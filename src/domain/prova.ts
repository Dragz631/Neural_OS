// A prova do tópico ("Prove que entendeu"): explicar com as SUAS palavras, sem olhar.
// Regras num lugar só (pedido do Hugo, 08/11/2026): nota mínima 70, colar não vale,
// e texto quase igual ao da aula não é aceito.

export const NOTA_MINIMA = 70;

export const aprovou = (nota: number) => nota >= NOTA_MINIMA;

function palavras(t: string): string[] {
  return t
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

function trigramas(p: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i + 2 < p.length; i++) out.push(`${p[i]} ${p[i + 1]} ${p[i + 2]}`);
  return out;
}

/**
 * Quanto do texto do aluno é cópia da fonte (0 a 1): a fração dos trechos de 3 palavras
 * dele que aparecem igualzinho na aula. Texto curto demais (menos de 8 trechos) não é julgado.
 */
export function parecenca(texto: string, fonte: string): number {
  const dele = trigramas(palavras(texto));
  if (dele.length < 8) return 0;
  const daFonte = new Set(trigramas(palavras(fonte)));
  return dele.filter((t) => daFonte.has(t)).length / dele.length;
}

/** Mais de 60% igual à aula: não é explicação, é cópia. */
export const parecidoDemais = (texto: string, fonte: string) => parecenca(texto, fonte) > 0.6;
