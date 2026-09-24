// ─── Neural-OS Domain Types ───────────────────────────────────────────────────

export type TrackId = 'csharp' | 'c_bases' | 'lfa';

export interface Profile {
  name: string;
  title: string;
  email: string;
  birthday: string;
  bio: string;
  avatarUrl: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  streakDays: number;
  lastStudiedDate?: string;
}

export type TaskCategory = 'web' | 'paradigmas' | 'calculos' | 'estudos' | 'outro';

export interface CollegeTask {
  id: string;
  label: string;
  status: 'pending' | 'in_progress' | 'done';
  deadline?: string; // YYYY-MM-DD
  category: TaskCategory;
  customTags: string[];
  description?: string;
  xpReward: number;
  createdAt: string;
  completedAt?: string;
}

export interface StudyMission {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  completed: boolean;
  category: 'daily' | 'quest' | 'milestone';
  progress: number; // 0 to maxProgress
  maxProgress: number;
  linkedAction?: string; // e.g. "classroom", "sandbox", "lousa", "dungeon", "molda"
}

export interface Trophy {
  id: string;
  name: string;
  description: string;
  iconName: string;
  category: 'mastery' | 'discipline' | 'speed' | 'secret';
  unlocked: boolean;
  unlockedAt?: string;
  progress: number;
  maxProgress: number;
  xpReward: number;
  hint?: string;
}

export type SkillStatus = 'locked' | 'unlocked' | 'in_progress' | 'mastered';

export interface SkillNode {
  id: string;
  label: string;
  branch: 'fundamentos' | 'poo' | 'arquitetura' | 'backend';
  tier: number; // 1, 2, 3, 4
  description: string;
  formalSummary: string;
  keywords: string[];
  prerequisites: string[]; // IDs of required nodes
  status: SkillStatus;
  masteryProgress: number; // 0-100%
  xpReward: number;
  iconName: string;
  isAiGenerated?: boolean;
  x?: number;
  y?: number;
}

export interface ActiveStudySession {
  topic: string;
  category: string;
  notesSummary: string[];
  nodesCount: number;
  startedAt: string;
  readyForExam: boolean;
}

export interface DayStudyRecord {
  date: string; // YYYY-MM-DD
  studied: boolean;
  minutesStudied: number;
  notes?: string;
  tasksCompleted: string[];
}

export interface WeeklyFocusData {
  days: {
    dayKey: 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM';
    date: string;
    hours: number;
    efficiency: number; // 0-100
    studied: boolean;
  }[];
  totalHours: number;
  averageEfficiency: number;
}

export interface TargetGoal {
  title: string;
  description: string;
  category: string;
  deadlineDate?: string;
  progress: number; // 0-100
  activeSince: string;
  priority: 'ALTA' | 'CRÍTICA' | 'NORMAL';
}

export interface AIConfig {
  endpoint: string; // default: "http://localhost:11434"
  selectedModel: string; // default: "llama3" or "deepseek-r1" or "qwen2.5-coder"
  temperature: number;
  isOnline: boolean;
  lastChecked?: string;
  availableModels: string[];
  useHeuristicFallback: boolean;
}

// ─── Knowledge Vault (Motor de Fontes / RAG) ───────────────────────────────────

export interface KnowledgeSource {
  id: string;
  title: string;
  track: TrackId;
  content: string;
  type: 'syllabus' | 'notes' | 'doc' | 'code';
  active: boolean;
  createdAt: string;
  wordCount: number;
  summary?: string;
}

export interface DailyGuideline {
  id: string;
  track: TrackId;
  dayTitle: string;
  objective: string;
  checkpoints: { text: string; completed: boolean }[];
  recommendedAction: { label: string; tab: 'sandbox' | 'dungeon' | 'professor' | 'lousa' };
  estimatedMinutes: number;
}

// ─── Dungeon Protocol Types ───────────────────────────────────────────────────

export type BattleChallengeType = 'bug_fix' | 'output_predict' | 'architecture_choice';

export interface BattleOption {
  id: string;
  label: string;
  correct: boolean;
  explanation: string;
}

export interface DungeonStage {
  id: string;
  number: number;
  title: string;
  track: TrackId;
  isBoss: boolean;
  guardianName: string;
  bossName?: string;
  bossTitle?: string;
  synapticReward: string;
  xpReward: number;
  codex: {
    topic: string;
    essence: string;
    syntaxBreakdown: { term: string; explanation: string }[];
    codeExample: string;
    pitfalls: string[];
  };
  battle: {
    type: BattleChallengeType;
    questionPrompt: string;
    codeSnippet: string;
    options: BattleOption[];
    buggyLineTarget?: number;
    expectedOutput?: string;
    hint: string;
  };
}

export interface TrackDungeonState {
  currentStageNumber: number;
  completedStageIds: string[];
  defeatedBossIds: string[];
  highScores: Record<string, number>;
}

export type DungeonProgress = Record<TrackId, TrackDungeonState>;

// ─── Sandbox Integration Types ────────────────────────────────────────────────

export interface SandboxExportPayload {
  code: string;
  language: TrackId;
  title?: string;
  sourceModule?: 'dungeon' | 'professor' | 'lousa';
}

export interface SandboxSkill {
  id: string;
  name: string;
  track: TrackId;
  requiresLevel: number;
  description: string;
}

export interface SandboxChallenge {
  id: string;
  track: TrackId;
  title: string;
  description: string;
  boilerplate: string;
  hints: string[];
  validationKeywords: string[];
  expectedOutput: string;
  successMessage: string;
  requiredSkills: string[];
  isMini?: boolean;
}

export interface SolvedSolution {
  id: string;
  challengeId: string;
  challengeTitle: string;
  track: TrackId;
  skills: string[];
  codeSnippet: string;
  completedAt: string; // ISO string
  xpEarned: number;
}

export interface StudyTelemetryEntry {
  id: string;
  track: TrackId;
  challengeId: string;
  challengeTitle: string;
  skills: string[];
  success: boolean;
  timestamp: string;
  codeSnippet: string;
  module: 'sandbox' | 'dungeon' | 'professor' | 'lousa';
}

export interface TrackProgressState {
  level: number;
  xp: number;
  xpToNextLevel: number;
  unlockedSkillIds: string[];
  checkedSkillIds: string[];
  editorDraft: string;
  lastStudiedSkillId?: string;
  completedChallengeIds?: string[];
  solutionsHistory?: SolvedSolution[];
}

export type TrackProgressMap = Record<TrackId, TrackProgressState>;
