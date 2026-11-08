import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { toLocalDate } from '../domain/dates';
import { applyGrade, isDue, newReviewState, nextMastery, type Grade } from '../domain/srs';
import { somaXpSessoes } from '../domain/xp';
import type { EntradaDiario } from '../domain/diario';
import type {
  Challenge,
  DayCheckin,
  Id,
  Lesson,
  LocalDate,
  PlanItem,
  Profile,
  SessionKind,
  StudySession,
  Subject,
  Target,
  Topic,
  WeekPlan,
} from '../domain/types';

// ─── Store principal ─────────────────────────────────────────────────────────
// Um lugar só pra tudo que você estuda. Salvo automaticamente no navegador
// (localStorage) pelo middleware `persist` — sem 17 useEffect espalhados.

export const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export interface StudyData {
  profile: Profile;
  subjects: Subject[];
  topics: Topic[];
  sessions: StudySession[];
  challenges: Challenge[];
  target: Target;
  plans: Record<LocalDate, WeekPlan>; // chave = segunda-feira da semana
  checkins: Record<LocalDate, DayCheckin>;
}

interface StudyActions {
  setProfileName: (name: string) => void;
  updateProfile: (patch: Partial<Profile>) => void;
  /** XP de fora das sessões (entregas, troféus, Dungeon). */
  addXp: (amount: number) => void;

  addSubject: (s: Pick<Subject, 'name' | 'color' | 'language'>) => Id;
  updateSubject: (id: Id, patch: Partial<Subject>) => void;
  removeSubject: (id: Id) => void;

  addTopic: (t: Pick<Topic, 'subjectId' | 'title'> & { parentId?: Id }) => Id;
  updateTopic: (id: Id, patch: Partial<Pick<Topic, 'title' | 'notes' | 'parentId' | 'lesson'>>) => void;
  removeTopic: (id: Id) => void;
  setLesson: (id: Id, lesson: Lesson) => void;
  /** Registra uma revisão: atualiza domínio e agenda a próxima. */
  gradeTopic: (id: Id, grade: Grade) => void;
  /** Registra dúvida/erro/conceito no diário do tópico. */
  addDiario: (topicId: Id, entrada: Omit<EntradaDiario, 'id' | 'data'>) => void;

  /**
   * Registra uma sessão. O XP NÃO sai do tempo: quem chama calcula com `xpDeAprendizado`
   * (domain/xp.ts) e passa em `xp`. Sem `xp`, a sessão paga 0 (cronômetro, autoavaliação).
   */
  logSession: (s: {
    topicId: Id;
    minutes: number;
    kind: SessionKind;
    score?: number;
    note?: string;
    xp?: number;
    avaliadoPor?: 'ia' | 'eu';
    lacunas?: string[];
    pontosFortes?: string[];
    correcao?: string;
  }) => number;

  saveChallenge: (c: Challenge) => void;
  removeChallenge: (id: Id) => void;

  setTarget: (t: Target) => void;

  setWeekPlan: (plan: WeekPlan) => void;
  setCheckin: (c: DayCheckin) => void;
  togglePlanItem: (weekStart: LocalDate, dayIdx: number, itemId: Id) => void;

  replaceAll: (data: StudyData) => void;
}

const INITIAL: StudyData = {
  profile: { name: 'Hugo', xp: 0 },
  subjects: [],
  topics: [],
  sessions: [],
  challenges: [],
  target: { goal: '' },
  plans: {},
  checkins: {},
};

export const useStudy = create<StudyData & StudyActions>()(
  persist(
    (set) => ({
      ...INITIAL,

      setProfileName: (name) => set((s) => ({ profile: { ...s.profile, name } })),
      updateProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      addXp: (amount) => set((s) => ({ profile: { ...s.profile, xp: s.profile.xp + amount } })),

      addSubject: (data) => {
        const id = newId('sub');
        set((s) => ({ subjects: [...s.subjects, { ...data, id, createdAt: new Date().toISOString() }] }));
        return id;
      },
      updateSubject: (id, patch) =>
        set((s) => ({ subjects: s.subjects.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeSubject: (id) =>
        set((s) => {
          const removed = new Set(s.topics.filter((t) => t.subjectId === id).map((t) => t.id));
          return {
            subjects: s.subjects.filter((x) => x.id !== id),
            topics: s.topics.filter((t) => !removed.has(t.id)),
            target: s.target.topicId && removed.has(s.target.topicId) ? { goal: s.target.goal } : s.target,
          };
        }),

      addTopic: ({ subjectId, title, parentId }) => {
        const id = newId('top');
        const topic: Topic = {
          id,
          subjectId,
          parentId,
          title: title.trim(),
          notes: '',
          mastery: 0,
          review: newReviewState(),
          createdAt: new Date().toISOString(),
        };
        set((s) => ({ topics: [...s.topics, topic] }));
        return id;
      },
      updateTopic: (id, patch) =>
        set((s) => ({ topics: s.topics.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),
      removeTopic: (id) =>
        set((s) => {
          const gone = s.topics.find((t) => t.id === id);
          return {
            // Filhos "sobem" pro avô, a árvore não quebra.
            topics: s.topics
              .filter((t) => t.id !== id)
              .map((t) => (t.parentId === id ? { ...t, parentId: gone?.parentId } : t)),
            target: s.target.topicId === id ? { goal: s.target.goal } : s.target,
          };
        }),
      setLesson: (id, lesson) =>
        set((s) => ({ topics: s.topics.map((t) => (t.id === id ? { ...t, lesson } : t)) })),
      addDiario: (topicId, entrada) =>
        set((s) => ({
          topics: s.topics.map((t) =>
            t.id === topicId ? { ...t, log: [{ ...entrada, id: newId('dia'), data: toLocalDate() }, ...(t.log ?? [])] } : t,
          ),
        })),
      gradeTopic: (id, grade) =>
        set((s) => ({
          topics: s.topics.map((t) =>
            t.id === id ? { ...t, review: applyGrade(t.review, grade), mastery: nextMastery(t.mastery, grade) } : t,
          ),
        })),

      logSession: ({ xp: xpPedido, ...dados }) => {
        const xp = Math.max(0, Math.round(xpPedido ?? 0));
        const { topicId } = dados;
        const session: StudySession = { id: newId('ses'), date: toLocalDate(), ...dados, xp };
        set((s) => ({
          sessions: [...s.sessions, session],
          profile: { ...s.profile, xp: s.profile.xp + xp },
          topics: s.topics.map((t) => (t.id === topicId ? { ...t, lastStudiedAt: new Date().toISOString() } : t)),
        }));
        return xp;
      },

      saveChallenge: (c) =>
        set((s) => ({
          challenges: s.challenges.some((x) => x.id === c.id)
            ? s.challenges.map((x) => (x.id === c.id ? c : x))
            : [c, ...s.challenges],
        })),
      removeChallenge: (id) => set((s) => ({ challenges: s.challenges.filter((c) => c.id !== id) })),

      setTarget: (target) => set({ target }),

      setWeekPlan: (plan) => set((s) => ({ plans: { ...s.plans, [plan.weekStart]: plan } })),
      setCheckin: (c) => set((s) => ({ checkins: { ...s.checkins, [c.date]: c } })),
      togglePlanItem: (weekStart, dayIdx, itemId) =>
        set((s) => {
          const plan = s.plans[weekStart];
          if (!plan) return {};
          const days = plan.days.map((items, i) =>
            i === dayIdx ? items.map((it): PlanItem => (it.id === itemId ? { ...it, done: !it.done } : it)) : items,
          );
          return { plans: { ...s.plans, [weekStart]: { ...plan, days } } };
        }),

      replaceAll: (data) => set({ ...INITIAL, ...data }),
    }),
    {
      name: 'neural-os.v2',
      version: 2,
      // v2 (08/11/2026): XP passa a medir só aprendizado conferido. O XP antigo fica guardado
      // em `xpAntigo` e o atual é recalculado das sessões aprovadas (regra de domain/xp.ts).
      migrate: (salvo, versao) => {
        const s = salvo as StudyData;
        if (versao < 2 && s?.profile) {
          const sessoes = [...(s.sessions ?? [])].sort((a, b) => a.date.localeCompare(b.date));
          s.profile = { ...s.profile, xpAntigo: s.profile.xpAntigo ?? s.profile.xp, xp: somaXpSessoes(sessoes) };
        }
        return s;
      },
    },
  ),
);

// ─── Seletores (leituras derivadas, sem duplicar estado) ─────────────────────
// Recebem só o pedaço de estado que precisam. Nos componentes, use com useMemo:
// selecionar direto com useStudy(s => s.topics.filter(...)) cria array novo a cada
// render e o Zustand entra em loop.

export const selectDueTopics = (topics: Topic[], today = toLocalDate()) =>
  topics.filter((t) => t.lastStudiedAt && isDue(t.review, today)).sort((a, b) => a.review.due.localeCompare(b.review.due));

export const topicPath = (subjects: Subject[], topic?: Topic): string => {
  if (!topic) return '';
  const subject = subjects.find((x) => x.id === topic.subjectId);
  return `${subject?.name ?? '?'} › ${topic.title}`;
};

export const minutesByDate = (sessions: StudySession[]): Record<LocalDate, number> => {
  const out: Record<LocalDate, number> = {};
  for (const ses of sessions) out[ses.date] = (out[ses.date] ?? 0) + ses.minutes;
  return out;
};

export function streakDays(minutes: Record<LocalDate, number>, today = toLocalDate()): number {
  let streak = 0;
  const d = new Date();
  // Se ainda não estudou hoje, a sequência conta a partir de ontem.
  if (!minutes[today]) d.setDate(d.getDate() - 1);
  while (minutes[toLocalDate(d)]) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function exportData(): StudyData {
  const { profile, subjects, topics, sessions, challenges, target, plans, checkins } = useStudy.getState();
  return { profile, subjects, topics, sessions, challenges, target, plans, checkins };
}
