import { CHALLENGE_BANK, type BankChallenge } from '../data/challengeBank';
import { normalizar } from './importacao';
import { DOMINADO, preRequisitoFraco } from './materias';
import type { Topic } from './types';

// Sandbox = academia de prática. O código NÃO roda: a correção lê lógica e
// sintaxe, como prova no papel. O "canal" é só o nome do compilador que a
// correção imita, pra ele saber em que mundo está.

export const CANAL_COMPILADOR: Record<string, string> = {
  csharp: 'dotnet csc // C#',
  c: 'gcc -std=c17 // C',
  python: 'python3 // Python',
  javascript: 'node // JavaScript',
  java: 'javac // Java',
  sql: 'psql // SQL',
  automato: 'simulador // Autômato',
  '': 'papel // pseudocódigo',
};

export interface Habilidade {
  topic: Topic;
  /** Pré-requisito ainda fraco: dá pra marcar, mas avisa (mesma regra da Árvore). */
  travadaPor?: Topic;
  dominada: boolean;
}

/** Habilidades sinápticas = tópicos da matéria, na ordem do caminho. */
export function habilidadesDa(topics: Topic[], subjectId: string): Habilidade[] {
  const daMateria = topics.filter((t) => t.subjectId === subjectId);
  return daMateria.map((topic) => ({ topic, travadaPor: preRequisitoFraco(topic, topics), dominada: topic.mastery >= DOMINADO }));
}

const PALAVRAS_VAZIAS = new Set(['para', 'com', 'como', 'entre', 'sobre', 'basico', 'basica', 'introducao', 'nocoes', 'parte']);

/** Radicais das palavras do tópico ("Classes e objetos" → classe, objet). */
function radicais(texto: string): string[] {
  return normalizar(texto)
    .split(/[^a-z0-9#+]+/)
    .filter((p) => p.length >= 4 && !PALAVRAS_VAZIAS.has(p))
    .map((p) => p.slice(0, 6));
}

/**
 * Desafios do banco que são DO ASSUNTO do tópico (mesma linguagem e alguma
 * palavra do título do tópico no desafio). Nada de sortear coisa sem relação.
 */
export function bancoDoTopico(topic: Topic, linguagem: string, micro: boolean): BankChallenge[] {
  const alvo = radicais(topic.title);
  if (alvo.length === 0) return [];
  return CHALLENGE_BANK.filter((c) => {
    if (c.language !== linguagem || c.micro !== micro) return false;
    const texto = radicais(`${c.title} ${c.prompt} ${c.keywords.join(' ')}`);
    return alvo.some((a) => texto.some((t) => t.startsWith(a) || a.startsWith(t)));
  });
}
