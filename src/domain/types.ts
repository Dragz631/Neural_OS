import type { Cena } from './cena';
import type { EntradaDiario } from './diario';
// ─── Modelo de dados do Neural-OS v2 ─────────────────────────────────────────
// Tudo gira em torno de MATÉRIAS e TÓPICOS que você mesmo cria.
// Nada aqui é fixo: a árvore, as missões e os desafios nascem do que você estuda.

export type Id = string;

/** Data local no formato AAAA-MM-DD (nunca use toISOString().slice pra isso: dá o dia em UTC). */
export type LocalDate = string;

export interface Subject {
  id: Id;
  name: string; // "C#", "Cálculo II", "LFA"
  color: string; // cor do galho na árvore
  /** Linguagem usada nos desafios do Sandbox (vazio = matéria sem código). */
  language: string; // "csharp" | "c" | "python" | "" ...
  createdAt: string;
}

/** Estado de revisão espaçada (algoritmo SM-2 simplificado, ver srs.ts). */
export interface ReviewState {
  ease: number; // multiplicador de intervalo (começa em 2.5)
  intervalDays: number; // dias até a próxima revisão
  due: LocalDate; // quando revisar de novo
  reps: number; // acertos seguidos
  lapses: number; // quantas vezes esqueceu
}

/** Minidesafio da própria aula: o aluno responde com as palavras dele. */
export interface MiniAula {
  id: string;
  pergunta: string;
  /** Resposta-modelo, pra conferir quando não há IA. */
  referencia: string;
  resposta?: string;
  /** Acertou (ou quase) na última tentativa. */
  ok?: boolean;
}

export interface Lesson {
  explanation: string;
  keyPoints: string[];
  /** Termos de busca no YouTube (a IA não inventa URL de vídeo; a gente monta a busca). */
  videoSearches: string[];
  whereToResearch: string[];
  tips: string[];
  generatedAt: string;
  source: 'ia' | 'manual';
  /** Como o professor escolheu desenhar a aula no quadro (ausente nas aulas antigas). */
  cena?: Cena;
  /** Passos da aula que a pessoa marcou. A aula só reinicia quando tudo está feito. */
  progresso?: { leu?: boolean; viuDesenho?: boolean; viuVideos?: boolean };
  minis?: MiniAula[];
  concluidaEm?: string;
}

export interface Topic {
  id: Id;
  subjectId: Id;
  parentId?: Id; // tópico "pai" na árvore (pré-requisito)
  title: string;
  notes: string; // suas anotações (markdown) — o "um lugar só"
  mastery: number; // 0-100
  review: ReviewState;
  lesson?: Lesson; // o que o Prof. A.Ilson escreveu no quadro
  /** Diário do tópico: dúvidas, erros e conceitos, com data (ver domain/diario.ts). */
  log?: EntradaDiario[];
  /** Títulos dos slides novos (NotebookLM) que esta aula ainda não usa: aparece "Atualizar aula". */
  materialNovo?: MaterialNovo;
  createdAt: string;
  lastStudiedAt?: string;
}

export type SessionKind = 'aula' | 'leitura' | 'desafio' | 'revisao' | 'explicacao';

/** (no Topic) Slides novos do NotebookLM que têm a ver com este tópico e a aula ainda não usa. */
export type MaterialNovo = string[];

export interface StudySession {
  id: Id;
  topicId: Id;
  date: LocalDate;
  minutes: number;
  kind: SessionKind;
  score?: number; // 0-100 quando houve avaliação
  note?: string;
  /** Quem deu a nota. Sessões antigas não têm (contam como autoavaliação, a não ser que tenham nota). */
  avaliadoPor?: 'ia' | 'eu';
  /** XP que esta sessão pagou (regra de domain/xp.ts). Sessões antigas não têm. */
  xp?: number;
  /** Prova: o que faltou e o resumo do professor (pra mente do professor e o próximo passo). */
  lacunas?: string[];
  pontosFortes?: string[];
  correcao?: string;
}

export interface CodeReview {
  syntaxOk: boolean;
  logicOk: boolean;
  score: number; // 0-100
  issues: string[];
  feedback: string;
  source: 'ia' | 'basica';
}

export interface Challenge {
  id: Id;
  topicId: Id;
  language: string;
  prompt: string;
  hints: string[];
  starterCode: string;
  code: string;
  review?: CodeReview;
  /** Escada de dicas: o que você tentou e o que espera que aconteça (pedido antes da 1ª dica). */
  attempt?: string;
  prediction?: string;
  /** Maior nível de dica já aberto (0..6). Ausente = nenhuma dica. */
  hintLevel?: number;
  /** Dica de cada nível já gerada (índice = nível). */
  ladder?: string[];
  createdAt: string;
  solvedAt?: string;
  /** 'conceito' = a resposta é texto (explicar, prever, comparar); ausente = código. */
  formato?: 'codigo' | 'conceito';
  /** Ponto de vista do desafio (ver ANGULOS): muda a cada vez, a resposta certa não. */
  angulo?: string;
  /** Em que do que a pessoa estudou o desafio se baseou. */
  baseadoEm?: string[];
  /** Tópicos misturados além do principal (podem ser de outra matéria). */
  topicIds?: Id[];
}

export type Priority = 'NORMAL' | 'ALTA' | 'CRÍTICA';

export interface Target {
  topicId?: Id;
  priority?: Priority;
  description?: string;
  /** Por que estou estudando isso (prova, trabalho, curiosidade...). */
  goal: string;
  deadline?: LocalDate;
}

export interface PlanItem {
  id: Id;
  topicId?: Id;
  title: string;
  kind: SessionKind;
  minutes: number;
  done: boolean;
}

/** Plano de uma semana (segunda a domingo). */
export interface WeekPlan {
  weekStart: LocalDate; // segunda-feira
  days: PlanItem[][]; // 7 posições: 0 = segunda ... 6 = domingo
}

export type Energy = 1 | 2 | 3; // baixa, média, alta

export interface DayCheckin {
  date: LocalDate;
  energy: Energy;
  minutesAvailable: number;
  /** Hora em que avisou "cheguei do trabalho" (HH:MM). */
  chegadaEm?: string;
}

export interface Profile {
  name: string;
  xp: number;
  /** XP de antes da regra "só aprendizado conferido" (08/11/2026), guardado pra não perder. */
  xpAntigo?: number;
  /** Foto de perfil: id de um avatar ASCII, 'foto' (imagem própria) ou 'foto-ascii'. Sem nada = Orbe. */
  avatar?: string;
  /** Imagem própria, já recortada em quadrado e reduzida (data URL, ~256 px). */
  foto?: string;
  /** A imagem própria transformada em ASCII (linhas de texto). */
  fotoAscii?: string[];
  title?: string;
  email?: string;
  birthday?: LocalDate;
  /** O que a IA deve saber de você (vai junto em todo pedido ao professor). */
  bio?: string;
  /** Foto: endereço da imagem ou imagem embutida (data URL). */
  avatarUrl?: string;
}
