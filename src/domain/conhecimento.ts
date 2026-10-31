import { normalizar } from './importacao';
import type { Challenge, Subject, StudySession, Topic } from './types';

// O que o professor SABE de você num tópico. Tudo que o app guarda vira um
// retrato: aula feita, anotações, explicações, revisões, erros, fontes
// importadas (Notion/NotebookLM) e desafios anteriores. O Sandbox só cria
// desafio até onde esse retrato alcança; sem retrato, ele pede antes uma aula.

export type NivelConhecimento = 'nada' | 'comeco' | 'andando' | 'firme';

export interface Retrato {
  topicId: string;
  titulo: string;
  materia: string;
  temAula: boolean;
  temNotas: boolean;
  /** Explicou com as próprias palavras ou foi bem numa revisão. */
  provou: boolean;
  /** Já fez revisão ou desafio com nota. */
  praticou: boolean;
  temFontes: boolean;
  erros: string[];
  nivel: NivelConhecimento;
  /** O que o professor viu, em frases pra mostrar a pessoa. */
  viu: string[];
  /** O que ainda falta pra ele conhecer melhor a pessoa. */
  falta: string[];
  /** Texto-base do prompt: SÓ daqui o desafio pode sair. */
  material: string;
  /** Até onde o desafio pode ir. */
  limite: string;
  /** Tem alguma evidência pra basear um desafio. */
  podeDesafio: boolean;
}

const PALAVRAS_VAZIAS = new Set(['para', 'com', 'como', 'entre', 'sobre', 'basico', 'basica', 'introducao', 'nocoes', 'parte', 'que', 'uma', 'dos', 'das']);

/** Radicais das palavras do título ("Classes e objetos" → classe, objet). */
export function radicais(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9#+]+/)
    .filter((p) => p.length >= 4 && !PALAVRAS_VAZIAS.has(p))
    .map((p) => p.slice(0, 6));
}

/** Parágrafos do contexto da matéria que falam deste tópico. */
export function trechosDoTopico(contexto: string, titulo: string, max = 2500): string {
  const alvo = radicais(titulo);
  if (!contexto || alvo.length === 0) return '';
  const achados = contexto.split(/\n{2,}/).filter((p) => {
    const n = normalizar(p);
    return alvo.some((a) => n.includes(a));
  });
  return achados.join('\n\n').slice(0, max);
}

const LIMITE: Record<NivelConhecimento, string> = {
  nada: 'Não há registro do que a pessoa sabe. Teste SÓ o fundamental do tópico, bem básico, sem assumir nada além do título.',
  comeco: 'A pessoa está no começo deste tópico. Fique no nível introdutório e use só ideias que o MATERIAL mostra.',
  andando: 'A pessoa já tem uma base. Pode combinar ideias do MATERIAL, mas não passe do que ele cobre.',
  firme: 'A pessoa já domina o MATERIAL. Pode pedir aplicação e casos de borda, ainda dentro do que ele cobre.',
};

export function retratoDoTopico(topic: Topic, ctx: { subject?: Subject; sessions: StudySession[]; contexto?: string }): Retrato {
  const { subject, contexto = '' } = ctx;
  const minhas = ctx.sessions.filter((s) => s.topicId === topic.id);
  const temAula = !!topic.lesson?.explanation;
  const temNotas = topic.notes.trim().length >= 40;
  const explicacoes = minhas.filter((s) => s.kind === 'explicacao' && s.note);
  const provou = minhas.some((s) => (s.kind === 'explicacao' || s.kind === 'revisao') && (s.score ?? 0) >= 60);
  const praticou = minhas.some((s) => (s.kind === 'revisao' || s.kind === 'desafio') && s.score !== undefined);
  const fontes = trechosDoTopico(contexto, topic.title);
  const temFontes = fontes.length > 80;
  const erros = (topic.log ?? [])
    .filter((e) => e.tipo === 'erro' || e.tipo === 'duvida')
    .slice(-6)
    .map((e) => `${e.original.slice(0, 160)}${e.corrigido ? ` → certo: ${e.corrigido.slice(0, 160)}` : ''}`);

  const pontos = (temAula ? 1 : 0) + (temNotas ? 1 : 0) + (provou ? 2 : 0) + (praticou ? 1 : 0) + (topic.mastery >= 60 ? 1 : 0) + (temFontes ? 1 : 0);
  const nivel: NivelConhecimento = pontos === 0 ? 'nada' : pontos <= 2 ? 'comeco' : pontos <= 4 ? 'andando' : 'firme';

  const viu = [
    temAula && 'Você fez a aula deste tópico com o professor.',
    temNotas && 'Você escreveu anotações sobre ele.',
    provou && 'Você explicou com as próprias palavras (ou foi bem numa revisão).',
    praticou && !provou && 'Você já fez revisão ou desafio dele.',
    temFontes && 'Achei o assunto nos seus slides/cadernos importados.',
    erros.length > 0 && `Tenho ${erros.length} erro(s)/dúvida(s) seus anotados aqui.`,
  ].filter((x): x is string => !!x);
  const falta = [
    !temAula && 'Fazer a aula com o Prof. A.Ilson',
    !provou && 'Explicar com as suas palavras (Técnica Feynman)',
    !temNotas && 'Escrever suas anotações',
  ].filter((x): x is string => !!x);

  const material = [
    temAula ? `AULA QUE O ALUNO TEVE:\n${topic.lesson!.explanation}\nPontos-chave: ${topic.lesson!.keyPoints.join('; ')}` : '',
    temNotas ? `DIÁRIO DO ALUNO (o que ele diz que entendeu; não é fonte de fato, só mostra até onde ele foi):\n${topic.notes.slice(0, 3000)}` : '',
    explicacoes.length ? `COMO O ALUNO EXPLICOU COM AS PRÓPRIAS PALAVRAS:\n${explicacoes.slice(-2).map((s) => s.note).join('\n---\n')}` : '',
    temFontes ? `TRECHOS DOS SLIDES/CADERNOS DELE SOBRE O TÓPICO:\n${fontes}` : '',
    erros.length ? `ONDE ELE JÁ ERROU OU TEVE DÚVIDA:\n${erros.join('\n')}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  return {
    topicId: topic.id,
    titulo: topic.title,
    materia: subject?.name ?? '',
    temAula,
    temNotas,
    provou,
    praticou,
    temFontes,
    erros,
    nivel,
    viu,
    falta,
    material,
    limite: LIMITE[nivel],
    podeDesafio: pontos > 0,
  };
}

/** Jeitos de olhar pro MESMO conceito. A resposta certa não muda; o ponto de vista sim. */
export const ANGULOS = [
  { id: 'prever', texto: 'PREVER: mostre algo pronto e peça o que acontece (resultado, saída, efeito) e por quê.' },
  { id: 'achar-erro', texto: 'ACHAR O ERRO: entregue algo com um defeito sutil ligado ao conceito e peça pra achar e consertar.' },
  { id: 'dia-a-dia', texto: 'DIA A DIA: crie uma situação do cotidiano (loja, escola, jogo, cozinha) onde o conceito aparece e peça pra modelar.' },
  { id: 'ensinar', texto: 'ENSINAR: peça pra explicar o conceito pra um colega que nunca viu, com um exemplo inventado pela pessoa.' },
  { id: 'comparar', texto: 'COMPARAR: peça a diferença entre este conceito e outro parecido, com um caso onde cada um serve.' },
  { id: 'completar', texto: 'COMPLETAR: entregue algo quase pronto com lacunas no ponto central do conceito.' },
  { id: 'ao-contrario', texto: 'AO CONTRÁRIO: dê o resultado final e peça pra deduzir qual conceito/passo o produziu.' },
  { id: 'limite', texto: 'CASO DE BORDA: peça um caso extremo ou estranho (vazio, zero, o maior valor) e como o conceito se comporta.' },
] as const;

/** Escolhe um ângulo que não foi usado nos desafios mais recentes. */
export function escolherAngulo(anteriores: Challenge[], sorteio = Math.random()): (typeof ANGULOS)[number] {
  const recentes = anteriores
    .slice(0, 4)
    .map((c) => c.angulo)
    .filter(Boolean);
  const livres = ANGULOS.filter((a) => !recentes.includes(a.id));
  const base = livres.length ? livres : ANGULOS;
  return base[Math.floor(sorteio * base.length)];
}
