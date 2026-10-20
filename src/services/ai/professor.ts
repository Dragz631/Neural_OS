import type { Challenge, CodeReview, Lesson, StudySession, Subject, Topic } from '../../domain/types';
import { asScore, asString, asStrings, chatJSON, type ChatMessage } from './client';

// ─── Prof. A.Ilson ───────────────────────────────────────────────────────────
// Todas as conversas com a IA passam por aqui. Cada pedido leva o SEU contexto:
// anotações, nota das últimas sessões, quantas vezes esqueceu. É isso que faz
// a aula ser sobre você, e não um texto genérico.

const PERSONA = `Você é o Prof. A.Ilson, professor universitário de computação e exatas.
Estilo: direto, prático, exigente mas encorajador. Você reforça o que o aluno já faz bem
e usa isso como ponte pro que falta. Sempre em português do Brasil.
Nunca invente links ou URLs. Quando recomendar vídeos, dê TERMOS DE BUSCA pro YouTube.`;

export interface TopicContext {
  topic: Topic;
  subject?: Subject;
  parents: Topic[]; // do mais próximo ao mais distante
  sessions: StudySession[]; // sessões deste tópico
}

function describe(ctx: TopicContext): string {
  const { topic, subject, parents, sessions } = ctx;
  const scores = sessions.filter((s) => s.score !== undefined).slice(-5).map((s) => `${s.kind}: ${s.score}`);
  const notes = topic.notes.trim();
  return [
    `Matéria: ${subject?.name ?? 'não informada'}`,
    `Tópico: ${topic.title}`,
    parents.length ? `Vem depois de: ${parents.map((p) => p.title).join(' ← ')}` : 'Tópico base (sem pré-requisito cadastrado).',
    `Domínio atual: ${topic.mastery}/100. Esqueceu ${topic.review.lapses} vez(es). Sessões: ${sessions.length}.`,
    scores.length ? `Últimas notas: ${scores.join(', ')}` : 'Ainda sem avaliações.',
    notes ? `Anotações do aluno:\n"""\n${notes.slice(0, 4000)}\n"""` : 'O aluno ainda não fez anotações.',
  ].join('\n');
}

const sys = (extra = ''): ChatMessage => ({ role: 'system', content: `${PERSONA}\n${extra}` });

export async function generateLesson(ctx: TopicContext, signal?: AbortSignal): Promise<Lesson> {
  return chatJSON(
    [
      sys(),
      {
        role: 'user',
        content: `${describe(ctx)}

Escreva no quadro negro a aula deste tópico, ajustada ao nível e às anotações do aluno.
Se as anotações tiverem erro conceitual, corrija com gentileza na explicação.
Formato JSON:
{
  "explanation": "explicação clara em 2-4 parágrafos curtos, com exemplo concreto",
  "keyPoints": ["3 a 6 pontos que o aluno precisa lembrar"],
  "videoSearches": ["2 a 3 termos de busca pro YouTube, em português ou inglês"],
  "whereToResearch": ["2 a 4 fontes: documentação oficial, livro clássico, capítulo, site"],
  "tips": ["2 a 4 dicas de professor: armadilhas comuns, como estudar isso, como cai em prova"]
}`,
      },
    ],
    (raw) => {
      const o = raw as Record<string, unknown>;
      return {
        explanation: asString(o.explanation, 'explanation'),
        keyPoints: asStrings(o.keyPoints),
        videoSearches: asStrings(o.videoSearches),
        whereToResearch: asStrings(o.whereToResearch),
        tips: asStrings(o.tips),
        generatedAt: new Date().toISOString(),
        source: 'ia' as const,
      };
    },
    signal,
  );
}

export interface ExplanationReview {
  score: number;
  strengths: string[];
  gaps: string[];
  correction: string;
}

export async function evaluateExplanation(ctx: TopicContext, explanation: string, signal?: AbortSignal): Promise<ExplanationReview> {
  return chatJSON(
    [
      sys('Você está avaliando uma explicação no estilo Técnica Feynman: o aluno explica com as próprias palavras.'),
      {
        role: 'user',
        content: `${describe(ctx)}

Explicação do aluno:
"""
${explanation}
"""

Avalie de 0 a 100 o quanto ele entendeu de verdade (não o vocabulário bonito).
Comece pelos pontos fortes. Formato JSON:
{
  "score": 0,
  "strengths": ["o que ele acertou"],
  "gaps": ["o que faltou ou está errado"],
  "correction": "como você resumiria o conceito corretamente, em poucas frases"
}`,
      },
    ],
    (raw) => {
      const o = raw as Record<string, unknown>;
      return {
        score: asScore(o.score),
        strengths: asStrings(o.strengths),
        gaps: asStrings(o.gaps),
        correction: asString(o.correction, 'correction'),
      };
    },
    signal,
  );
}

export async function generateChallenge(
  ctx: TopicContext,
  language: string,
  size: 'micro' | 'normal',
  /** Habilidades marcadas no Sandbox que o desafio também deve cobrar. */
  foco: string[] = [],
  signal?: AbortSignal,
): Promise<Pick<Challenge, 'prompt' | 'hints' | 'starterCode'>> {
  return chatJSON(
    [
      sys('Agora você cria desafios de programação pra manter a prática do aluno.'),
      {
        role: 'user',
        content: `${describe(ctx)}

Crie UM desafio ${size === 'micro' ? 'MICRO (resolve em 5 minutos, poucas linhas)' : 'de 15-25 minutos'} na linguagem "${language || 'pseudocódigo'}"
que obrigue a usar este tópico.${foco.length ? ` Combine também com: ${foco.join(', ')}.` : ''} Mire nas lacunas do aluno, se houver. Não entregue a solução.
Formato JSON:
{
  "prompt": "enunciado claro, com exemplo de entrada/saída quando fizer sentido",
  "hints": ["2 dicas progressivas, da mais vaga à mais específica"],
  "starterCode": "esqueleto mínimo de código pra começar (sem a solução)"
}`,
      },
    ],
    (raw) => {
      const o = raw as Record<string, unknown>;
      return { prompt: asString(o.prompt, 'prompt'), hints: asStrings(o.hints), starterCode: typeof o.starterCode === 'string' ? o.starterCode : '' };
    },
    signal,
  );
}

export async function reviewCode(challenge: Challenge, code: string, signal?: AbortSignal): Promise<CodeReview> {
  return chatJSON(
    [
      sys('Agora você é um corretor de código. O código NÃO será executado: analise lendo, como numa prova no papel.'),
      {
        role: 'user',
        content: `Linguagem: ${challenge.language || 'não informada'}
Desafio:
"""
${challenge.prompt}
"""

Código do aluno:
"""
${code}
"""

Verifique: (1) a sintaxe compila? (2) a lógica resolve o desafio, inclusive casos de borda?
Aponte linha/trecho quando houver problema. Não reescreva a solução inteira.
Formato JSON:
{
  "syntaxOk": true,
  "logicOk": true,
  "score": 0,
  "issues": ["problemas encontrados, um por item"],
  "feedback": "comentário curto: o que está bom e o próximo passo"
}`,
      },
    ],
    (raw) => {
      const o = raw as Record<string, unknown>;
      return {
        syntaxOk: o.syntaxOk === true,
        logicOk: o.logicOk === true,
        score: asScore(o.score),
        issues: asStrings(o.issues),
        feedback: asString(o.feedback, 'feedback'),
        source: 'ia' as const,
      };
    },
    signal,
  );
}
