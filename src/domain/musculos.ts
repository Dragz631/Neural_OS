// "Músculos do cérebro" (ideia master do Neural-OS, 08/11/2026): o app existe pra treinar o
// pensamento, não pra entregar resposta. Cada coisa que você faz aqui treina uma habilidade;
// o widget mostra a semana e aponta a que ficou parada, com o jeito de treinar.

import { addDays } from './dates';

export const HABILIDADES = ['raciocinio', 'resolucao', 'planejamento', 'abstracao', 'julgamento', 'memoria'] as const;
export type Habilidade = (typeof HABILIDADES)[number];

export const SOBRE: Record<Habilidade, { nome: string; treina: string; comoTreinar: string }> = {
  raciocinio: { nome: 'Raciocínio', treina: 'chutar antes da aula, tentar na escada de ajuda, acertar uma base', comoTreinar: 'Antes de pedir ajuda, tente: chute antes da aula e responda o professor com o que você acha, mesmo errado.' },
  resolucao: { nome: 'Resolver problemas', treina: 'desafio do Sandbox resolvido', comoTreinar: 'Faça um desafio no Sandbox sem abrir as dicas logo de cara.' },
  planejamento: { nome: 'Planejamento', treina: 'planejar a semana, blocos de estudo guiado', comoTreinar: 'Planeje a semana no Molda-Horário (domingo) ou comece um estudo guiado com os blocos do dia.' },
  abstracao: { nome: 'Abstração', treina: 'explicar com as suas palavras (prova, ensinar o Zé)', comoTreinar: 'Faça a prova de um tópico ou ensine o Zé: explicar do seu jeito é tirar a ideia do exemplo.' },
  julgamento: { nome: 'Julgamento', treina: 'discordar do professor, corrigir o Zé', comoTreinar: 'Questione: aperte "Discordo" quando algo não fechar, ou ensine o Zé e pegue os erros dele.' },
  memoria: { nome: 'Memória', treina: 'revisão, Feed, tabuada', comoTreinar: 'Faça a revisão vencida antes de reler, uma rodada do Feed ou uma partida de tabuada.' },
};

export interface Treino {
  data: string;
  h: Habilidade;
  n: number;
}

/** Soma dos últimos 7 dias (hoje incluso) por habilidade. */
export function semana(registro: Treino[], hoje: string): Record<Habilidade, number> {
  const desde = addDays(hoje, -6);
  const soma = Object.fromEntries(HABILIDADES.map((h) => [h, 0])) as Record<Habilidade, number>;
  for (const t of registro) if (t.data >= desde && t.data <= hoje && t.h in soma) soma[t.h] += t.n;
  return soma;
}

/** A habilidade mais parada da semana (só depois que ele já treinou alguma coisa). */
export function maisParada(soma: Record<Habilidade, number>): Habilidade | undefined {
  const total = HABILIDADES.reduce((s, h) => s + soma[h], 0);
  if (total < 3) return undefined;
  return [...HABILIDADES].sort((a, b) => soma[a] - soma[b])[0];
}
