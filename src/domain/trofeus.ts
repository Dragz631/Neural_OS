import type { Challenge, StudySession, Topic } from './types';

// Troféus: regras sobre os SEUS dados (nada inventado, nada pré-desbloqueado).
// Cada regra diz quanto já foi e quanto falta.

export interface ContextoTrofeus {
  sessions: StudySession[];
  topics: Topic[];
  challenges: Challenge[];
  sequencia: number; // dias seguidos estudando
  entregues: number; // entregas do College Tracker concluídas
  maiorLousa: number; // elementos na lousa mais cheia
  fasesDungeon: number;
  chefesDungeon: number;
  revisoesVencidas: number;
}

export interface Trofeu {
  id: string;
  nome: string;
  descricao: string;
  xp: number;
  calc: (c: ContextoTrofeus) => { progresso: number; total: number };
}

const maxNota = (s: StudySession[], kinds: string[]) => s.filter((x) => kinds.includes(x.kind)).reduce((m, x) => Math.max(m, x.score ?? 0), 0);

// XP só nos troféus que exigem acerto conferido (Feynman 90+, desafio sem dica, Dungeon, domínio).
// Os de tempo, sequência, lousa e entrega são medalha: aparecem, mas pagam 0 (08/11/2026).
export const TROFEUS: Trofeu[] = [
  { id: 'primeira-sinapse', nome: 'Primeira Sinapse', descricao: 'Registrar a primeira sessão de estudo.', xp: 0, calc: (c) => ({ progresso: Math.min(1, c.sessions.length), total: 1 }) },
  { id: 'streak-fogo', nome: 'Streak de Fogo', descricao: 'Estudar 7 dias seguidos.', xp: 0, calc: (c) => ({ progresso: Math.min(7, c.sequencia), total: 7 }) },
  { id: 'feynman-supremo', nome: 'Feynman Supremo', descricao: 'Tirar 90 ou mais explicando um tópico com suas palavras.', xp: 200, calc: (c) => ({ progresso: Math.min(90, maxNota(c.sessions, ['explicacao', 'revisao'])), total: 90 }) },
  {
    id: 'arquiteto',
    nome: 'Arquiteto',
    descricao: 'Dominar (80%+) 5 tópicos da mesma matéria.',
    xp: 250,
    calc: (c) => {
      const porMateria = new Map<string, number>();
      for (const t of c.topics) if (t.mastery >= 80) porMateria.set(t.subjectId, (porMateria.get(t.subjectId) ?? 0) + 1);
      return { progresso: Math.min(5, Math.max(0, ...porMateria.values())), total: 5 };
    },
  },
  { id: 'pedreiro-digital', nome: 'Pedreiro Digital', descricao: 'Montar uma lousa com 10 ou mais elementos.', xp: 0, calc: (c) => ({ progresso: Math.min(10, c.maiorLousa), total: 10 }) },
  { id: 'sem-escada', nome: 'Sem Escada', descricao: 'Resolver um desafio sem abrir nenhuma dica.', xp: 150, calc: (c) => ({ progresso: c.challenges.some((x) => x.solvedAt && x.review?.source === 'ia' && x.hintLevel === undefined) ? 1 : 0, total: 1 }) },
  { id: 'maratonista', nome: 'Maratonista', descricao: 'Somar 10 horas de estudo registradas.', xp: 0, calc: (c) => ({ progresso: Math.min(600, c.sessions.reduce((s, x) => s + x.minutes, 0)), total: 600 }) },
  { id: 'entregador', nome: 'Entregador', descricao: 'Entregar 5 trabalhos/provas/listas.', xp: 0, calc: (c) => ({ progresso: Math.min(5, c.entregues), total: 5 }) },
  {
    id: 'em-dia',
    nome: 'Em Dia',
    descricao: 'Ter 5 tópicos estudados e nenhuma revisão vencida.',
    xp: 0,
    calc: (c) => {
      const estudados = c.topics.filter((t) => t.lastStudiedAt).length;
      return { progresso: c.revisoesVencidas === 0 ? Math.min(5, estudados) : 0, total: 5 };
    },
  },
  { id: 'sobrevivente', nome: 'Sobrevivente da Cadeira Neural', descricao: 'Vencer uma fase do Dungeon.', xp: 150, calc: (c) => ({ progresso: Math.min(1, c.fasesDungeon), total: 1 }) },
  { id: 'cacador-chefes', nome: 'Caçador de Chefes', descricao: 'Derrotar 3 chefes do Dungeon.', xp: 300, calc: (c) => ({ progresso: Math.min(3, c.chefesDungeon), total: 3 }) },
];

export function avaliarTrofeus(c: ContextoTrofeus) {
  return TROFEUS.map((t) => {
    const { progresso, total } = t.calc(c);
    return { ...t, progresso, total, destravado: progresso >= total };
  });
}
