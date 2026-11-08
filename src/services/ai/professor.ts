import type { Challenge, CodeReview, Lesson, MiniAula, StudySession, Subject, Topic } from '../../domain/types';
import type { Retrato } from '../../domain/conhecimento';
import { aprendizParaIA } from '../../store/aprendiz';
import { useImportacao } from '../../store/importacao';
import { fontesDoTopico } from '../../domain/importacao';
import { asScore, asString, asStrings, chatJSON, type ChatMessage } from './client';
import { PROFESSOR } from './persona';

// ─── Prof. A.Ilson ───────────────────────────────────────────────────────────
// Todas as conversas com a IA passam por aqui. Cada pedido leva o SEU contexto:
// anotações, nota das últimas sessões, quantas vezes esqueceu. É isso que faz
// a aula ser sobre você, e não um texto genérico.

// Uma persona só pra aula, desenho, chat e correção: o professor de QUALQUER matéria (persona.ts).
const PERSONA = PROFESSOR;

export interface TopicContext {
  topic: Topic;
  subject?: Subject;
  parents: Topic[]; // do mais próximo ao mais distante
  sessions: StudySession[]; // sessões deste tópico
}

/** As anotações do aluno dizem quem ele é e onde trava. Nunca são fonte do conteúdo da matéria. */
export const AVISO_DIARIO =
  'DIÁRIO DO ALUNO (o que ele diz que entendeu e onde travou). Use só pra saber quem ele é e como ajudar. NÃO é fonte de fato: nunca ensine a partir dele nem o trate como verdade da matéria; se tiver erro, corrija com o que é conhecimento comprovado.';

function describe(ctx: TopicContext, comNotas = true): string {
  const { topic, subject, parents, sessions } = ctx;
  const scores = sessions.filter((s) => s.score !== undefined).slice(-5).map((s) => `${s.kind}: ${s.score}`);
  const notes = topic.notes.trim();
  return [
    `Matéria: ${subject?.name ?? 'não informada'}`,
    `Tópico: ${topic.title}`,
    parents.length ? `Vem depois de: ${parents.map((p) => p.title).join(' ← ')}` : 'Tópico base (sem pré-requisito cadastrado).',
    `Domínio atual: ${topic.mastery}/100. Esqueceu ${topic.review.lapses} vez(es). Sessões: ${sessions.length}.`,
    scores.length ? `Últimas notas: ${scores.join(', ')}` : 'Ainda sem avaliações.',
    !comNotas ? '' : notes ? `${AVISO_DIARIO}\n"""\n${notes.slice(0, 4000)}\n"""` : 'O aluno ainda não fez anotações.',
  ].join('\n');
}

const sys = (extra = ''): ChatMessage => ({ role: 'system', content: `${PERSONA}\n${aprendizParaIA()}\n${extra}` });

/**
 * Os slides da faculdade que combinam com este tópico (NotebookLM). Sem slide que combine,
 * usa o contexto geral da matéria. Vazio = aula sem material da faculdade.
 */
export function slidesDoTopico(ctx: TopicContext): string {
  const imp = useImportacao.getState();
  const fontes = fontesDoTopico(imp.porFonte[ctx.topic.subjectId], ctx.topic.title, ctx.parents.map((p) => p.title));
  if (fontes.length)
    return `SLIDES DA FACULDADE DELE sobre isto (NotebookLM). Use como FONTE PRINCIPAL da aula, com os termos e exemplos deles, e cite o slide pelo nome ("no slide X..."):\n${fontes.map((f) => `### ${f.titulo}\n${f.trecho}`).join('\n\n')}`;
  const geral = imp.contexto[ctx.topic.subjectId];
  return geral ? `Material da faculdade dele nesta matéria (use se tiver a ver com o tópico):\n"""\n${geral.slice(0, 3000)}\n"""` : '';
}

/** Reescrever com pedido ("mais curto", "foca em X"): a aula atual é a base, o pedido diz o que muda. */
export interface PedidoReescrita {
  pedido: string;
  aulaAtual: Lesson;
}

function blocoReescrita(r: PedidoReescrita): string {
  const extras = (r.aulaAtual.extras ?? []).map((e) => `- (ele pediu "${e.de}") ${e.texto.slice(0, 300)}`).join('\n');
  return `\nREESCREVA a aula que já está no quadro, mudando SÓ o que o aluno pediu: "${r.pedido}".
Mantenha o mesmo tema e o que já estava certo. O PEDIDO VENCE as regras de tamanho e formato abaixo: se ele pediu "mais curta", a explicação nova tem no máximo METADE da atual (hoje são ${r.aulaAtual.explanation.length} letras) e menos pontos-chave; se pediu "mais exemplos", troque teoria por exemplos concretos. Aula atual:
"""
${r.aulaAtual.explanation.slice(0, 4000)}
Pontos-chave: ${r.aulaAtual.keyPoints.join('; ')}
"""
${extras ? `Pedaços que ele montou junto com você no chat (o jeito que funcionou pra ele; aproveite):\n${extras}\n` : ''}`;
}

/** O chute que o aluno deu antes da aula: errar antes e ver depois fixa mais. */
/** "Não faço ideia", "nunca vi": ele disse que não sabe nada (isso também é informação valiosa). */
export const chuteNaoSabe = (chute: string) =>
  chute.trim().split(/\s+/).length <= 5 && !/acho|talvez|parece|seria|deve ser/i.test(chute) && /^\s*(n[aã]o (sei|fa[cç]o ideia|lembro|tenho ideia)|nunca (vi|ouvi)|nada|sei l[aá]|\?+)(?=[\s.,!?]|$)/i.test(chute);

function blocoChute(titulo: string, chute: string): string {
  if (chuteNaoSabe(chute))
    return `\nANTES DA AULA o aluno disse que NÃO SABE nada sobre "${titulo}" ("${chute.slice(0, 200)}"). Isso é ótimo de saber: comece do zero absoluto.
Diga que não saber é o ponto de partida normal. Abra com uma situação do dia a dia dele (sem nenhum termo técnico), só depois dê o nome das coisas, um termo novo por vez, cada um explicado na hora. Nada de supor base.\n`;
  return `\nANTES DA AULA o aluno chutou o que acha que é "${titulo}": "${chute.slice(0, 400)}".
O chute mostra COMO ele pensa e de onde partir: use as palavras e a ideia dele como ponte.
Comece a explicação respondendo o chute, com carinho e sem julgamento: o que ele já acertou (diga!) e o que não é bem assim, e por quê. Se o chute mostrar uma ideia errada comum, desmonte ela com um exemplo. Se ele já sabe bastante, não repita o básico: avance. Depois siga a aula a partir dali.\n`;
}

export async function generateLesson(ctx: TopicContext, signal?: AbortSignal, reescrita?: PedidoReescrita, chute?: string): Promise<Lesson> {
  const slides = slidesDoTopico(ctx);
  return chatJSON(
    [
      sys(),
      {
        role: 'user',
        content: `${describe(ctx)}
${slides ? `\n${slides}\n` : ''}${reescrita ? blocoReescrita(reescrita) : ''}${chute?.trim() ? blocoChute(ctx.topic.title, chute) : ''}
Escreva no quadro negro a aula deste tópico, ajustada ao nível e às anotações do aluno.
Se as anotações tiverem erro conceitual, corrija com gentileza na explicação.
Depois desta aula você vai DESENHAR no quadro: escreva já pensando no desenho, com o caso concreto (números, etapas, partes, quem vem antes de quem) que o desenho vai mostrar. Exemplo e analogia antes da definição formal.
Formato JSON:
{
  "explanation": "explicação clara em 2-4 parágrafos curtos, com exemplo concreto",
  "keyPoints": ["3 a 6 pontos que o aluno precisa lembrar"],
  "videoSearches": ["2 a 3 termos de busca pro YouTube, em português ou inglês"],
  "whereToResearch": ["2 a 4 fontes: documentação oficial, livro clássico, capítulo, site"],
  "tips": ["2 a 4 dicas de professor: armadilhas comuns, como estudar isso, como cai em prova"],
  "minis": [{ "pergunta": "pergunta curta que faz a pessoa explicar/aplicar (não decorar)", "referencia": "resposta-modelo em 1-2 frases" }]
}
"minis": exatamente 3, só sobre o que a SUA explicação acima ensina, do mais simples ao mais difícil.`,
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
        minis: lerMinis(o.minis),
        generatedAt: new Date().toISOString(),
        source: 'ia' as const,
      };
    },
    signal,
  );
}

function lerMinis(raw: unknown): MiniAula[] {
  if (!Array.isArray(raw)) return [];
  const out: MiniAula[] = [];
  for (const m of raw.slice(0, 3)) {
    const o = (m ?? {}) as Record<string, unknown>;
    if (typeof o.pergunta !== 'string' || !o.pergunta.trim()) continue;
    out.push({ id: `mini-${out.length}-${Date.now().toString(36)}`, pergunta: o.pergunta.trim(), referencia: typeof o.referencia === 'string' ? o.referencia.trim() : '' });
  }
  return out;
}

/** Aulas antigas ou escritas à mão não têm minidesafios: o professor monta a partir da aula. */
export async function gerarMinis(ctx: TopicContext, lesson: Lesson, signal?: AbortSignal): Promise<MiniAula[]> {
  const minis = await chatJSON(
    [
      sys('Você cria minidesafios curtos que fazem a pessoa explicar ou aplicar o que a aula ensinou.'),
      {
        role: 'user',
        content: `Tópico: ${ctx.topic.title}

AULA:
${lesson.explanation}
Pontos-chave: ${lesson.keyPoints.join(' | ')}

Crie exatamente 3 minidesafios, só sobre o que esta aula ensina, do mais simples ao mais difícil. Formato JSON:
{ "minis": [{ "pergunta": "...", "referencia": "resposta-modelo em 1-2 frases" }] }`,
      },
    ],
    (raw) => lerMinis((raw as Record<string, unknown>).minis),
    signal,
  );
  if (!minis.length) throw new Error('o professor não conseguiu montar os minidesafios, tente de novo');
  return minis;
}

export interface ExplanationReview {
  score: number;
  strengths: string[];
  gaps: string[];
  correction: string;
}

export async function evaluateExplanation(ctx: TopicContext, explanation: string, signal?: AbortSignal, formato: 'explicar' | 'ensinar' = 'explicar'): Promise<ExplanationReview> {
  const comoFoi =
    formato === 'ensinar'
      ? 'Isto foi um "ENSINA DE VOLTA": o aluno ensinou um colega confuso (o Zé), numa conversa. Avalie SÓ as falas do aluno: explicou certo? respondeu as dúvidas do Zé? percebeu e CORRIGIU os erros que o Zé afirmou? Deixar um erro do Zé passar é lacuna. O resumo final do Zé mostra o que a explicação dele transmitiu.'
      : 'Você está avaliando uma explicação no estilo Técnica Feynman: o aluno explica com as próprias palavras.';
  return chatJSON(
    [
      sys(comoFoi),
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

export interface PedidoDesafio {
  principal: { ctx: TopicContext; retrato: Retrato };
  /** Outros tópicos misturados (mesma matéria ou outra). Todos com retrato que permite desafio. */
  companheiros: Retrato[];
  language: string;
  size: 'micro' | 'normal';
  angulo: { id: string; texto: string };
  /** Desafios anteriores dos mesmos tópicos: o novo precisa ser diferente. */
  anteriores: { prompt: string; angulo?: string }[];
  /** Sem registro nenhum, mas a pessoa disse "já estudei isso antes". */
  declarado: boolean;
}

export type DadosDesafio = Pick<Challenge, 'prompt' | 'hints' | 'starterCode' | 'formato' | 'baseadoEm'>;

/**
 * O desafio sai SÓ do que a pessoa estudou (aula, anotações, explicações, fontes,
 * erros). O ângulo muda a cada vez; a resposta certa do conceito, nunca.
 */
export async function generateChallenge(p: PedidoDesafio, signal?: AbortSignal): Promise<DadosDesafio> {
  const { ctx, retrato } = p.principal;
  const micro = p.size === 'micro';
  const mistura = p.companheiros.length > 0;
  return chatJSON(
    [
      sys('Você cria desafios que fazem a pessoa PENSAR, não decorar. Você só cobra o que ela já viu.'),
      {
        role: 'user',
        content: `${describe(ctx, false)}

${p.declarado ? 'ATENÇÃO: não há registro do que a pessoa estudou aqui, mas ela disse "já estudei isso antes, quero ver se lembro". Faça um desafio de REATIVAÇÃO: só o fundamental, curto, sem pegadinha.\n' : ''}LIMITE: ${retrato.limite}

MATERIAL DO TÓPICO PRINCIPAL (a única fonte do que você pode cobrar):
"""
${retrato.material.slice(0, 7000) || '(sem material: use só o título e fique no básico)'}
"""
${
  mistura
    ? `\nMISTURA: o desafio precisa juntar o principal com estes outros tópicos, num problema só. De cada um use SÓ o que o material dele mostra:\n${p.companheiros.map((c) => `### ${c.materia ? c.materia + ' / ' : ''}${c.titulo}\n"""\n${c.material.slice(0, 2200)}\n"""`).join('\n')}\n`
    : ''
}
PONTO DE VISTA DESTE DESAFIO (obrigatório): ${p.angulo.texto}
${p.anteriores.length ? `\nDesafios que a pessoa JÁ recebeu (não repita nem parafraseie):\n${p.anteriores.map((a) => `- ${a.prompt.replace(/\s+/g, ' ').slice(0, 140)}`).join('\n')}\n` : ''}
Regras:
1. Cobre só ideias que estão no material. Se o material não cobre algo, não pergunte.
2. Escolha o "formato": "conceito" quando o tópico é teoria/definição/comparação (a resposta é um texto curto, sem programar), "codigo" quando praticar é escrever código em "${p.language || 'pseudocódigo'}".${mistura ? ' Na mistura, use "codigo" se algum tópico for de programação.' : ''}
3. A resposta certa do conceito é sempre a mesma; mude só a situação, o cenário e a forma de perguntar. Faça a pessoa pensar fora da caixa e chegar no resultado esperado.
4. Se houver erros/dúvidas anotados, mire neles.
5. Tamanho: ${micro ? 'MICRO, resolve em 5 minutos' : '15 a 25 minutos'}. Não entregue a solução.
6. Enunciado simples e curto (no máximo 6 linhas), em linguagem do dia a dia. Nunca afirme um fato técnico de que você não tenha certeza e não use números ou casos exóticos que o material não mencione.
7. "baseadoEm": 1 a 3 itens curtos dizendo de QUE parte do material o desafio saiu (ex.: "ponto-chave: estado muda com o tempo", "sua anotação sobre classes").
Formato JSON:
{
  "formato": "conceito" | "codigo",
  "prompt": "enunciado claro, com exemplo quando fizer sentido",
  "hints": ["2 dicas progressivas, da mais vaga à mais específica"],
  "starterCode": "esqueleto pra começar (sem a solução). Se for conceito, uma ou duas linhas de comentário dizendo onde responder",
  "baseadoEm": ["..."]
}`,
      },
    ],
    (raw) => {
      const o = raw as Record<string, unknown>;
      return {
        prompt: asString(o.prompt, 'prompt'),
        hints: asStrings(o.hints),
        starterCode: typeof o.starterCode === 'string' ? o.starterCode : '',
        formato: o.formato === 'conceito' ? ('conceito' as const) : ('codigo' as const),
        baseadoEm: asStrings(o.baseadoEm).slice(0, 3),
      };
    },
    signal,
  );
}

/** `material` = o que a pessoa estudou: é a régua do que está certo. */
export async function reviewCode(challenge: Challenge, code: string, signal?: AbortSignal, material = ''): Promise<CodeReview> {
  const conceito = challenge.formato === 'conceito';
  return chatJSON(
    [
      sys(conceito ? 'Agora você corrige uma resposta em TEXTO, como numa prova discursiva: vale o raciocínio, não o vocabulário bonito.' : 'Agora você é um corretor de código. O código NÃO será executado: analise lendo, como numa prova no papel.'),
      {
        role: 'user',
        content: `Linguagem: ${challenge.language || 'não informada'}
Desafio:
"""
${challenge.prompt}
"""
${material ? `\nO que a pessoa estudou (use como referência do que é certo):\n"""\n${material.slice(0, 4000)}\n"""\n` : ''}
${conceito ? 'Resposta do aluno' : 'Código do aluno'}:
"""
${code}
"""

${conceito ? 'Verifique: (1) a ideia central está correta? (2) o raciocínio chega no resultado esperado? Em "syntaxOk" coloque true se a resposta é legível e responde a pergunta; em "logicOk" coloque true se o raciocínio está certo. Se a pessoa só copiou o enunciado ou deixou em branco, nota baixa.' : 'Verifique: (1) a sintaxe compila? (2) a lógica resolve o desafio, inclusive casos de borda?'}
Aponte o trecho quando houver problema. Não reescreva a solução inteira.
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
