import { validarRoadmap, type Roadmap } from '../../domain/roadmap';
import { chatJSON } from './client';
import { PROFESSOR } from './persona';

// O professor monta o roadmap da matéria, no jeito do roadmap.sh: poucas etapas
// na espinha, e de cada uma saem os assuntos (essencial / opcional / escolha um).

export interface PedidoRoadmap {
  materia: string;
  objetivo?: string;
  /** Tópicos que o aluno já tem nesta matéria: o roadmap deve reaproveitar esses nomes. */
  topicosAtuais: string[];
}

export async function gerarRoadmap(p: PedidoRoadmap, signal?: AbortSignal): Promise<Roadmap> {
  return chatJSON(
    [
      { role: 'system', content: PROFESSOR },
      {
        role: 'user',
        content: `Monte o ROADMAP de estudo de "${p.materia}"${p.objetivo ? ` (pra quê: ${p.objetivo})` : ''}, no estilo do roadmap.sh: um caminho completo, do zero até dominar, que a pessoa lê de cima pra baixo.
${p.topicosAtuais.length ? `Tópicos que o aluno já criou (use EXATAMENTE estes nomes quando o assunto for o mesmo): ${p.topicosAtuais.slice(0, 40).join('; ')}.\n` : ''}Regras:
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
