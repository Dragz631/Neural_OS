// Grade do Lobby, como a tela inicial de um celular: colunas e linhas fixas, cada widget
// ocupa um retângulo de células. Regra do Hugo: soltar em cima de outro widget EMPURRA o outro
// (pra baixo, pra cima ou pro lado), mas só se ele tiver pra onde ir. Se algum não tiver espaço
// (ou passar da grade), nada se mexe e o widget volta pro lugar.

export const COLUNAS = 12;
export const LINHAS = 36;
export const ALTURA_LINHA = 56;
export const ESPACO = 12;

export interface Retangulo {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface ItemGrade extends Retangulo {
  id: string;
}

export const bate = (a: Retangulo, b: Retangulo) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

export const dentro = (r: Retangulo) => r.w >= 1 && r.h >= 1 && r.x >= 0 && r.y >= 0 && r.x + r.w <= COLUNAS && r.y + r.h <= LINHAS;

/** O retângulo cabe na grade sem tocar em nenhum outro item (ignorando o próprio)? */
export const cabe = (itens: ItemGrade[], r: Retangulo, ignorarId?: string) => dentro(r) && !itens.some((i) => i.id !== ignorarId && bate(i, r));

type Mapa = Map<string, ItemGrade>;

/** Pra onde um item empurrado pode ir (nesta ordem): abaixo, acima, direita, esquerda do que o empurrou. */
const direcoes = (por: Retangulo, o: ItemGrade): Partial<Retangulo>[] => [{ y: por.y + por.h }, { y: por.y - o.h }, { x: por.x + por.w }, { x: por.x - o.w }];

function resolver(mapa: Mapa, movido: ItemGrade, travados: Set<string>, orcamento: { n: number }): Mapa | undefined {
  let atual = mapa;
  for (const c of [...mapa.values()].filter((o) => o.id !== movido.id && bate(o, movido))) {
    const o = atual.get(c.id)!;
    if (!bate(o, movido)) continue; // já saiu do caminho por outro empurrão
    if (travados.has(o.id)) return undefined;
    let feito: Mapa | undefined;
    for (const d of direcoes(movido, o)) {
      if (--orcamento.n < 0) return undefined;
      const novo = { ...o, ...d };
      if (!dentro(novo)) continue;
      const m = new Map(atual);
      m.set(o.id, novo);
      feito = resolver(m, novo, new Set([...travados, movido.id]), orcamento);
      if (feito) break;
    }
    if (!feito) return undefined;
    atual = feito;
  }
  return atual;
}

/**
 * Põe o item `id` em `alvo`, empurrando quem estiver no caminho. Devolve a grade nova,
 * ou undefined se o alvo sai da grade ou algum empurrado não tem pra onde ir.
 */
export function encaixar(itens: ItemGrade[], id: string, alvo: Retangulo): ItemGrade[] | undefined {
  if (!dentro(alvo)) return undefined;
  const mapa: Mapa = new Map(itens.map((i) => [i.id, i.id === id ? { ...i, ...alvo } : i]));
  const movido = mapa.get(id);
  if (!movido) return undefined;
  const feito = resolver(mapa, movido, new Set([id]), { n: 400 });
  if (!feito) return undefined;
  const lista = [...feito.values()];
  // Conferência final: nada fora da grade nem sobreposto.
  const ok = lista.every((a, i) => dentro(a) && lista.every((b, j) => i === j || !bate(a, b)));
  return ok ? itens.map((i) => feito.get(i.id) ?? i) : undefined;
}

/** Primeiro espaço livre (de cima pra baixo, da esquerda pra direita) pra um w x h. */
export function primeiroLivre(itens: ItemGrade[], w: number, h: number): Retangulo | undefined {
  for (let y = 0; y + h <= LINHAS; y++) {
    for (let x = 0; x + w <= COLUNAS; x++) {
      const r = { x, y, w, h };
      if (cabe(itens, r)) return r;
    }
  }
  return undefined;
}

/** Ordem de leitura (usada no celular, onde tudo vira uma coluna só). */
export const emOrdem = (itens: ItemGrade[]) => [...itens].sort((a, b) => a.y - b.y || a.x - b.x);
