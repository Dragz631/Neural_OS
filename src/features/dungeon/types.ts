// Tipos do Dungeon Protocol (trilhas fixas: é o modo diversão de fim de semana).

export type TrackId = 'csharp' | 'c_bases' | 'lfa';

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
