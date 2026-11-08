import { lerCena, semGraficoFora, type Cena } from '../../domain/cena';
import type { Motor } from '../../domain/conexoes';
import type { Lesson } from '../../domain/types';
import { aprendizParaIA } from '../../store/aprendiz';
import type { MensagemChat } from '../../store/rascunhos';
import { GUIA_DESENHO } from './cena';
import { chatJSON } from './client';
import { PROFESSOR } from './persona';
import type { TopicContext } from './professor';

// O mini chat do quadro: ajustes rápidos ("mais fácil", "desenha isso", "um exemplo").
// Resposta CURTA no motor leve; pedido de desenho vai pro difícil. Quando ajuda, vem um
// desenho pequeno que dá pra pôr no quadro.

/** Pedido de desenho vai pro motor "difícil": desenhar bem um diagrama pede um modelo mais forte. */
export const querDesenho = (pergunta: string) => /desenh|diagrama|esquema|mostra|visual|[áa]rvore|tabela|conjunto/i.test(pergunta);

export interface RespostaChat {
  texto: string;
  cena?: Cena;
}

export async function perguntarAoProfessor(
  p: { ctx: TopicContext; aula?: Lesson; sobre?: string; historico: MensagemChat[]; pergunta: string },
  signal?: AbortSignal,
  motor: Motor = querDesenho(p.pergunta) ? 'dificil' : 'leve',
): Promise<RespostaChat> {
  const { topic, subject } = p.ctx;
  const conversa = p.historico
    .slice(-6)
    .map((m) => `${m.de === 'aluno' ? 'Aluno' : 'Você'}: ${m.texto}`)
    .join('\n');
  return chatJSON(
    [
      {
        role: 'system',
        content: `${PROFESSOR}\n${aprendizParaIA()}\nAgora você está no mini chat ao lado do quadro: o aluno pede ajustes rápidos durante a aula. Responda CURTO (no máximo 3 frases simples) e mude o JEITO de explicar quando ele pedir. Se um desenho explica melhor, mande também uma "cena" PEQUENA (1 a 6 elementos) seguindo o guia abaixo.\n${GUIA_DESENHO}`,
      },
      {
        role: 'user',
        content: `Matéria: ${subject?.name ?? 'não informada'}. Tópico: ${topic.title}.
${p.aula ? `O que está no quadro (a aula):\n"""\n${p.aula.explanation.slice(0, 3000)}\nPontos-chave: ${p.aula.keyPoints.join('; ')}\n"""\n` : ''}${p.sobre ? `O aluno selecionou ESTA parte do quadro e está falando dela:\n"""\n${p.sobre.slice(0, 1500)}\n"""\n` : ''}${conversa ? `Conversa até agora:\n${conversa}\n` : ''}Pedido do aluno: ${p.pergunta}
Formato JSON: {"texto":"resposta curta","cena": {opcional, mesmo formato do quadro: "estilo","porque","elementos","ligacoes","anotacoes"}}
Se pedirem desenho, a "cena" é obrigatória. Se não precisa de desenho, omita "cena".`,
      },
    ],
    (raw) => {
      const o = (raw ?? {}) as Record<string, unknown>;
      const texto = typeof o.texto === 'string' ? o.texto.trim().slice(0, 900) : '';
      const cenaLida = o.cena ? lerCena(o.cena) : null;
      if (!texto && !cenaLida) throw new Error('o professor não respondeu');
      const cena = cenaLida ? semGraficoFora(cenaLida, `${topic.title} ${subject?.name ?? ''} ${p.aula?.explanation ?? ''} ${p.pergunta}`) : undefined;
      return { texto: texto || 'Desenhei pra você:', cena };
    },
    signal,
    motor,
  );
}
