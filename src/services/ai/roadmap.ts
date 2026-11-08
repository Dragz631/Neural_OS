import { validarAdaptacao, validarRoadmap, type Adaptacao, type Roadmap } from '../../domain/roadmap';
import { chatJSON } from './client';
import { PROFESSOR } from './persona';

// O professor monta o roadmap da matéria, no jeito do roadmap.sh: poucas etapas
// na espinha, e de cada uma saem os assuntos (essencial / opcional / escolha um).

export interface PedidoRoadmap {
  materia: string;
  objetivo?: string;
  /** Tópicos que o aluno já tem nesta matéria: o roadmap deve reaproveitar esses nomes. */
  topicosAtuais: string[];
  /** Os slides do NotebookLM da matéria (título + começo do texto): o roadmap cobre o que a faculdade dá. */
  slides?: { titulo: string; trecho: string }[];
}

const blocoSlides = (slides?: { titulo: string; trecho: string }[]) =>
  slides?.length
    ? `SLIDES DA FACULDADE DELE (NotebookLM). Cubra o que estes slides ensinam, com os nomes que eles usam:\n${slides
        .slice(0, 12)
        .map((s) => `- "${s.titulo}": ${s.trecho.replace(/\s+/g, ' ').slice(0, 500)}`)
        .join('\n')}\n`
    : '';

/**
 * Chegaram slides novos: o professor diz SÓ o que acrescentar no roadmap que já existe
 * (itens em etapas existentes ou etapas novas). Nunca reescreve nem apaga.
 */
export async function adaptarRoadmap(p: { materia: string; roadmap: Roadmap; topicosAtuais: string[]; novos: { titulo: string; trecho: string }[] }, signal?: AbortSignal): Promise<Adaptacao> {
  const atual = p.roadmap.etapas.map((e, i) => `${i + 1}. ${e.titulo}: ${e.itens.map((it) => it.titulo).join(', ')}`).join('\n');
  return chatJSON(
    [
      { role: 'system', content: PROFESSOR },
      {
        role: 'user',
        content: `O aluno já tem este ROADMAP de "${p.materia}":
${atual}
${p.topicosAtuais.length ? `Tópicos que ele já criou: ${p.topicosAtuais.slice(0, 40).join('; ')}.\n` : ''}
Chegaram SLIDES NOVOS da faculdade dele:
${p.novos.map((s) => `- "${s.titulo}": ${s.trecho.replace(/\s+/g, ' ').slice(0, 1500)}`).join('\n')}

Diga SÓ o que precisa ACRESCENTAR pro roadmap cobrir esses slides. Não repita o que já está lá, não apague nada, não reescreva.
- Assunto que cabe numa etapa existente: vai em "acrescimos" (use o título EXATO da etapa).
- Assunto que é um bloco novo: vai em "novasEtapas", com "depoisDe" = título exato da etapa existente que vem antes (vazio = no fim).
- Itens com título curto em português e "tipo": essencial | opcional | alternativa.
Formato JSON:
{"acrescimos":[{"etapa":"...","itens":[{"titulo":"...","tipo":"essencial"}]}],"novasEtapas":[{"titulo":"...","porque":"...","depoisDe":"...","itens":[{"titulo":"...","tipo":"essencial"}]}]}`,
      },
    ],
    (raw) => validarAdaptacao(raw),
    signal,
  );
}

export async function gerarRoadmap(p: PedidoRoadmap, signal?: AbortSignal): Promise<Roadmap> {
  return chatJSON(
    [
      { role: 'system', content: PROFESSOR },
      {
        role: 'user',
        content: `Monte o ROADMAP de estudo de "${p.materia}"${p.objetivo ? ` (pra quê: ${p.objetivo})` : ''}, no estilo do roadmap.sh: um caminho completo, do zero até dominar, que a pessoa lê de cima pra baixo.
${p.topicosAtuais.length ? `Tópicos que o aluno já criou (use EXATAMENTE estes nomes quando o assunto for o mesmo): ${p.topicosAtuais.slice(0, 40).join('; ')}.\n` : ''}${blocoSlides(p.slides)}Regras:
- De 6 a 12 etapas, na ordem de aprendizado (a espinha). Título curto, em português.
- Em cada etapa, de 2 a 6 itens (os assuntos de lado). Cada item: "titulo" curto e "tipo":
  "essencial" = tem que aprender; "opcional" = bom saber, pode deixar pra depois; "alternativa" = escolha UMA entre as alternativas da etapa (ex.: duas ferramentas que servem pro mesmo fim).
- "porque": 1 frase dizendo por que a etapa vem neste ponto.
- Varie os tipos como o roadmap.sh faz: do meio pra frente, quase toda etapa tem algum "opcional" (aprofundamento) e, quando houver ferramentas ou caminhos que servem pro mesmo fim, marque-os "alternativa" (ex.: dois bancos de dados, duas bibliotecas). No total, pelo menos um terço dos itens NÃO deve ser "essencial".
- Seja completo no que importa e cortado no que é enfeite. Nada de itens repetidos entre etapas.
Formato JSON:
{"objetivo":"...","etapas":[{"titulo":"...","porque":"...","itens":[{"titulo":"...","tipo":"essencial"}]}]}`,
      },
    ],
    (raw) => validarRoadmap(raw, p.materia),
    signal,
  );
}
