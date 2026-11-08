import { lerCena, semGraficoFora, type Cena } from '../../domain/cena';
import type { Motor } from '../../domain/conexoes';
import type { Lesson } from '../../domain/types';
import { aprendizParaIA } from '../../store/aprendiz';
import { useConexoes } from '../../store/conexoes';
import type { MensagemChat } from '../../store/rascunhos';
import { GUIA_DESENHO } from './cena';
import { chatJSON } from './client';
import { PROFESSOR } from './persona';
import { AVISO_DIARIO, slidesDoTopico, type TopicContext } from './professor';
import { INSTRUCAO_DEGRAU, NOME_DEGRAU, type Escada } from '../../domain/ajuda';

// O mini chat do quadro: ajustes rápidos ("mais fácil", "desenha isso", "um exemplo").
// Resposta CURTA no motor leve; pedido de desenho vai pro difícil. Quando ajuda, vem um
// desenho pequeno que dá pra pôr no quadro.

/** Pedido de desenho vai pro motor "difícil": desenhar bem um diagrama pede um modelo mais forte. */
export const querDesenho = (pergunta: string) => /desenh|diagrama|esquema|mostra|visual|[áa]rvore|tabela|conjunto/i.test(pergunta);

export interface RespostaChat {
  texto: string;
  cena?: Cena;
}

/** Quanto o chat espera o motor leve antes de passar a pergunta pro difícil. */
export const ESPERA_LEVE_MS = 40_000;
/** Depois que o leve estoura o tempo, o chat fica esse tempo indo direto pro difícil. */
const PAUSA_LEVE_MS = 15 * 60_000;
let leveLentoAte = 0;

type Pedido = { ctx: TopicContext; aula?: Lesson; sobre?: string; historico: MensagemChat[]; pergunta: string; escada?: Escada };

/** Vale pra toda conversa: o professor faz pensar antes de responder (ideia master do Neural-OS). */
const REGRA_PENSAR = `REGRA DE OURO: você está aqui pra fazer o aluno PENSAR (raciocínio, resolver problemas, planejar, abstrair, julgar), não pra entregar resposta pronta. Se ele pedir a resposta de um exercício, conta ou questão, NUNCA entregue de primeira: devolva uma pergunta ou uma dica. Explicar o conceito de outro jeito (mais fácil, desenhado, com exemplo) é sempre permitido; entregar o resultado do exercício dele, não.`;

/** "Discordo": argumentar é treino de julgamento. O professor não cede só pra agradar. */
const REGRA_DISCORDAR = `SE O ALUNO DISCORDAR: não ceda só pra agradar. Repense de verdade. Se você estava certo, defenda com UM argumento simples ou um exemplo concreto que ele possa conferir sozinho, e pergunte o que o fez pensar diferente. Se você errou, admita claramente ("errei aqui: ...") e explique o certo. Elogie a discordância: questionar é pensar.`;

function blocoEscada(e: Escada): string {
  return `ESCADA DE AJUDA (o aluno está tentando resolver: "${e.problema.slice(0, 400)}"). Degrau ${e.degrau} de 5 (${NOME_DEGRAU[e.degrau]}); ele já tentou ${e.tentativas} vez(es).
Neste degrau: ${INSTRUCAO_DEGRAU[e.degrau]}
Se a mensagem dele for uma tentativa, comece dizendo o que está certo nela e onde está o tropeço (sem dar o resultado, a menos que seja o degrau 5).`;
}

/**
 * Chat é ajuste rápido: não dá pra esperar 3 minutos. Pergunta de texto vai pro leve; se ele
 * não responder em 40 s (a NVIDIA às vezes fica lenta), a mesma pergunta vai pro difícil.
 */
export async function perguntarAoProfessor(p: Pedido, signal?: AbortSignal, motor?: Motor): Promise<RespostaChat> {
  const { motores } = useConexoes.getState();
  const escolhido: Motor = motor ?? (querDesenho(p.pergunta) && motores.dificil ? 'dificil' : 'leve');
  if (escolhido !== 'leve' || !motores.dificil) return perguntar(p, signal, escolhido);
  // O leve acabou de estourar o tempo? Por um tempo nem tenta: vai direto pro difícil.
  if (Date.now() < leveLentoAte) return perguntar(p, signal, 'dificil');
  const pressa = new AbortController();
  const relogio = setTimeout(() => pressa.abort(), ESPERA_LEVE_MS);
  try {
    return await perguntar(p, signal ? AbortSignal.any([signal, pressa.signal]) : pressa.signal, 'leve');
  } catch (e) {
    if (signal?.aborted || !pressa.signal.aborted) throw e;
    leveLentoAte = Date.now() + PAUSA_LEVE_MS;
    return perguntar(p, signal, 'dificil');
  } finally {
    clearTimeout(relogio);
  }
}

/** Anotações e dúvidas do aluno neste tópico: pra saber onde ele trava (nunca é fonte de matéria). */
function diarioDoAluno(topic: TopicContext['topic']): string {
  const notas = topic.notes.trim().slice(0, 1200);
  const duvidas = (topic.log ?? [])
    .slice(0, 6)
    .map((d) => `- ${d.original.slice(0, 160)}`)
    .join('\n');
  if (!notas && !duvidas) return '';
  return `${AVISO_DIARIO}\n${notas ? `Anotações: """${notas}"""\n` : ''}${duvidas ? `Dúvidas e erros recentes:\n${duvidas}\n` : ''}`;
}

async function perguntar(p: Pedido, signal: AbortSignal | undefined, motor: Motor): Promise<RespostaChat> {
  const { topic, subject } = p.ctx;
  const slides = slidesDoTopico(p.ctx).slice(0, 2500);
  const conversa = p.historico
    .slice(-6)
    .map((m) => `${m.de === 'aluno' ? 'Aluno' : 'Você'}: ${m.texto}`)
    .join('\n');
  return chatJSON(
    [
      {
        role: 'system',
        content: `${PROFESSOR}\n${aprendizParaIA()}\n${REGRA_PENSAR}\n${REGRA_DISCORDAR}\nAgora você está no mini chat ao lado do quadro: o aluno pede ajustes rápidos durante a aula. Responda CURTO (no máximo 3 frases simples; no degrau 5 da escada pode usar até 8) e mude o JEITO de explicar quando ele pedir. Se um desenho explica melhor, mande também uma "cena" PEQUENA (1 a 6 elementos) seguindo o guia abaixo.\n${GUIA_DESENHO}`,
      },
      {
        role: 'user',
        content: `Matéria: ${subject?.name ?? 'não informada'}. Tópico: ${topic.title}.
${p.aula ? `O que está no quadro (a aula):\n"""\n${p.aula.explanation.slice(0, 3000)}\nPontos-chave: ${p.aula.keyPoints.join('; ')}\n"""\n` : ''}${slides ? `${slides}\n` : ''}${diarioDoAluno(topic)}${p.sobre ? `O aluno selecionou ESTA parte do quadro e está falando dela:\n"""\n${p.sobre.slice(0, 1500)}\n"""\n` : ''}${conversa ? `Conversa até agora:\n${conversa}\n` : ''}${p.escada ? `${blocoEscada(p.escada)}\n` : ''}Pedido do aluno: ${p.pergunta}
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
