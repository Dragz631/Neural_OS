import { validarMapa, type MapaMateria } from '../../domain/mapa';
import { LANGUAGES } from '../../domain/catalog';
import type { Motor } from '../../domain/conexoes';
import { chatJSON } from './client';
import { PROFESSOR } from './persona';

// "Matéria em 1 frase": o professor monta o caminho inteiro de uma matéria nova.

export interface PedidoMapa {
  materia: string;
  objetivo?: string;
  /** O que o aluno já sabe/estuda (pra ligar o novo ao conhecido). */
  materiasAtuais: string[];
  bio?: string;
  /** Anotações do Notion, resumo do NotebookLM, ementa da faculdade... */
  contexto?: string;
}

export async function gerarMapa(p: PedidoMapa, signal?: AbortSignal, motor: Motor = 'professor'): Promise<MapaMateria> {
  const linguagens = LANGUAGES.map((l) => `"${l.id}"`).join(', ');
  return chatJSON(
    [
      { role: 'system', content: PROFESSOR },
      {
        role: 'user',
        content: `O aluno quer aprender: "${p.materia}"${p.objetivo ? ` (pra quê: ${p.objetivo})` : ''}.
Matérias que ele já estuda: ${p.materiasAtuais.join(', ') || 'nenhuma ainda'}.
${p.bio ? `O que ele contou de si: ${p.bio}\n` : ''}${p.contexto ? `Material dele sobre o assunto (use como base, respeite a ordem da ementa se houver):\n"""\n${p.contexto.slice(0, 6000)}\n"""\n` : ''}
Monte o MAPA da matéria: 8 a 15 tópicos em ordem de aprendizado, do mapa geral aos detalhes.
Regras:
- Cada tópico com "porque": 1 frase dizendo por que ele existe/importa (ligue ao que o aluno já sabe quando der).
- "pai" = índice (base 0) do tópico anterior do qual ele depende; o primeiro não tem pai. Pai SEMPRE menor que o próprio índice.
- "minutos" = duração realista da primeira aula (15 a 60).
- "linguagem" = uma destas: ${linguagens}. Se o material usa código, escolha a linguagem principal dele (a que tem mais exemplos ou a que ele diz ser o foco); "" só se a matéria não tem código nenhum.
- Títulos curtos, em português.
Formato JSON:
{"materia": "...", "linguagem": "", "topicos": [{"titulo": "...", "porque": "...", "pai": 0, "minutos": 30}]}`,
      },
    ],
    (raw) => {
      const mapa = validarMapa(raw);
      return { ...mapa, materia: p.materia.trim() || mapa.materia, objetivo: p.objetivo };
    },
    signal,
    motor,
  );
}
