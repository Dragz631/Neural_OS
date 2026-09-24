import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import type {
  Profile,
  CollegeTask,
  StudyMission,
  Trophy,
  SkillNode,
  TargetGoal,
  WeeklyFocusData,
  AIConfig,
  ActiveStudySession,
  TrackId,
  KnowledgeSource,
  DungeonProgress,
  SandboxExportPayload,
  TrackProgressMap,
  SolvedSolution,
  StudyTelemetryEntry,
} from '../types';
import { ollamaService } from '../services/ai/ollamaService';
import { toast } from '../hooks/use-toast';
import { DEFAULT_KNOWLEDGE_SOURCES } from '../data/defaultKnowledgeSources';
import { BOILERPLATES_BY_TRACK, SANDBOX_SKILLS_BY_TRACK } from '../data/sandboxChallenges';

// ─── Initial Mock Data ────────────────────────────────────────────────────────

const INITIAL_TRACK_PROGRESS: TrackProgressMap = {
  csharp: {
    level: 3,
    xp: 450,
    xpToNextLevel: 600,
    unlockedSkillIds: ['cs_classes', 'cs_constructors', 'cs_encapsulation'],
    checkedSkillIds: ['cs_classes', 'cs_constructors'],
    editorDraft: BOILERPLATES_BY_TRACK.csharp,
    lastStudiedSkillId: 'cs_constructors',
    completedChallengeIds: ['classe_pessoa'],
    solutionsHistory: [
      {
        id: 'sol_init_csharp',
        challengeId: 'classe_pessoa',
        challengeTitle: 'Classe Simples Pessoa',
        track: 'csharp',
        skills: ['cs_classes'],
        codeSnippet: `using System;\n\npublic class Program {\n  public static void Main() {\n    Pessoa p = new Pessoa();\n    p.Apresentar();\n  }\n}\n\npublic class Pessoa {\n  public void Apresentar() {\n    Console.WriteLine("[NEURAL_OS STDOUT] Olá, sou um cidadão do NEURAL_OS");\n  }\n}`,
        completedAt: new Date(Date.now() - 86400000).toISOString(),
        xpEarned: 80,
      }
    ],
  },
  c_bases: {
    level: 2,
    xp: 120,
    xpToNextLevel: 300,
    unlockedSkillIds: ['c_io', 'c_primitives', 'c_conditionals'],
    checkedSkillIds: ['c_io', 'c_primitives'],
    editorDraft: BOILERPLATES_BY_TRACK.c_bases,
    lastStudiedSkillId: 'c_io',
    completedChallengeIds: ['c_hello_world'],
    solutionsHistory: [
      {
        id: 'sol_init_c',
        challengeId: 'c_hello_world',
        challengeTitle: 'Entrada e Saída Básica em C',
        track: 'c_bases',
        skills: ['c_io'],
        codeSnippet: `#include <stdio.h>\n\nint main() {\n  printf("Operador conectado ao NEURAL_OS C Bases!\\n");\n  return 0;\n}`,
        completedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        xpEarned: 80,
      }
    ],
  },
  lfa: {
    level: 2,
    xp: 80,
    xpToNextLevel: 300,
    unlockedSkillIds: ['lfa_alphabet', 'lfa_operations', 'lfa_dfa'],
    checkedSkillIds: ['lfa_alphabet', 'lfa_operations'],
    editorDraft: BOILERPLATES_BY_TRACK.lfa,
    lastStudiedSkillId: 'lfa_alphabet',
    completedChallengeIds: ['lfa_afd_final1'],
    solutionsHistory: [
      {
        id: 'sol_init_lfa',
        challengeId: 'lfa_afd_final1',
        challengeTitle: 'AFD Reconhecedor: Cadeias com Final 1',
        track: 'lfa',
        skills: ['lfa_dfa'],
        codeSnippet: `{\n  "alfabeto": ["0", "1"],\n  "estados": ["q0", "q1"],\n  "inicial": "q0",\n  "finais": ["q1"],\n  "transicoes": {\n    "q0,0": "q0",\n    "q0,1": "q1",\n    "q1,0": "q0",\n    "q1,1": "q1"\n  }\n}`,
        completedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        xpEarned: 80,
      }
    ],
  },
};

const INITIAL_PROFILE: Profile = {
  name: 'HUGO DEV // OPERADOR',
  title: 'Nível 3 // Construtor de Sistemas & Autômatos',
  email: 'hugo@neural.os',
  birthday: '2000-05-14',
  bio: 'Foco em C#, C Bases e Linguagens Formais. Contexto da IA: respostas objetivas, socráticas, táticas e com exemplos práticos.',
  avatarUrl: '',
  level: 3,
  xp: 450,
  xpToNextLevel: 600,
  streakDays: 4,
  lastStudiedDate: new Date().toISOString().slice(0, 10),
};

const INITIAL_TARGET: TargetGoal = {
  title: 'Dominar Encapsulamento & Memória Segura',
  description: 'Completar os desafios no Dungeon Protocol e passar na Prova da Matriz do Prof. A.Ilson.',
  category: 'PARADIGMAS DE PROGRAMAÇÃO',
  deadlineDate: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
  progress: 65,
  activeSince: 'Hoje às 08:30',
  priority: 'ALTA',
};

const INITIAL_MISSIONS: StudyMission[] = [
  {
    id: 'm1',
    title: 'Consultar Codex no Dungeon Protocol',
    description: 'Estude o conceito da fase atual antes de entrar na Arena de Batalha.',
    xpReward: 80,
    completed: true,
    category: 'daily',
    progress: 1,
    maxProgress: 1,
    linkedAction: 'dungeon',
  },
  {
    id: 'm2',
    title: 'Derrotar Guardião na Arena',
    description: 'Vença uma batalha de código sem tomar choque elétrico na cadeira.',
    xpReward: 120,
    completed: false,
    category: 'daily',
    progress: 0,
    maxProgress: 1,
    linkedAction: 'dungeon',
  },
  {
    id: 'm3',
    title: 'Prova da Matriz com Prof. A.Ilson',
    description: 'Obtenha nota acima de 80 na avaliação socrática discursiva.',
    xpReward: 150,
    completed: false,
    category: 'quest',
    progress: 0,
    maxProgress: 1,
    linkedAction: 'classroom',
  },
  {
    id: 'm4',
    title: 'Ingerir Fonte no Knowledge Vault',
    description: 'Carregue ou ative anotações/ementas no motor de fontes da IA.',
    xpReward: 100,
    completed: false,
    category: 'milestone',
    progress: 0,
    maxProgress: 1,
    linkedAction: 'classroom',
  },
];

const INITIAL_TASKS: CollegeTask[] = [
  {
    id: 't1',
    label: 'Calculus Prep - Derivadas Parciais',
    status: 'in_progress',
    deadline: new Date(Date.now() + 86400000 * 2).toISOString().slice(0, 10),
    category: 'calculos',
    customTags: ['Cálculo II', 'Prova A1', 'Lista de Exercícios'],
    description: 'Revisar derivadas parciais e preparar lista de 15 exercícios para a prova de quinta-feira.',
    xpReward: 120,
    createdAt: new Date().toISOString(),
  },
  {
    id: 't2',
    label: 'Trabalho em Grupo: Modelagem de Banco',
    status: 'pending',
    deadline: new Date(Date.now() + 86400000 * 5).toISOString().slice(0, 10),
    category: 'web',
    customTags: ['Postgres', 'Drizzle ORM', 'Schema'],
    description: 'Criar diagramas relacionais ERD e definir migrations para a API de e-commerce.',
    xpReward: 160,
    createdAt: new Date().toISOString(),
  },
  {
    id: 't3',
    label: 'Assignment C# - Herança & Polimorfismo',
    status: 'done',
    deadline: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
    category: 'paradigmas',
    customTags: ['C#', 'POO', 'Virtual/Override', 'Entregue'],
    description: 'Implementar hierarquia de classes com métodos virtuais e classes abstratas.',
    xpReward: 150,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
  },
  {
    id: 't4',
    label: 'Relatório Lab de Redes - Topologia TCP/IP',
    status: 'pending',
    deadline: new Date(Date.now() + 86400000 * 9).toISOString().slice(0, 10),
    category: 'estudos',
    customTags: ['Redes', 'Wireshark', 'Packet Tracer'],
    description: 'Análise de pacotes capturados e documentação de handshake TCP de 3 vias.',
    xpReward: 100,
    createdAt: new Date().toISOString(),
  },
];

const INITIAL_TROPHIES: Trophy[] = [
  {
    id: 'tr_first_step',
    name: 'Primeira Sinapse',
    description: 'Completou a primeira missão de estudo na matriz.',
    iconName: 'Zap',
    category: 'discipline',
    unlocked: true,
    unlockedAt: '2026-08-20',
    progress: 1,
    maxProgress: 1,
    xpReward: 50,
    hint: 'Complete qualquer missão diária.',
  },
  {
    id: 'tr_dungeon_survivor',
    name: 'Sobrevivente da Cadeira Neural',
    description: 'Derrotou seu primeiro Guardião de Código no Dungeon Protocol.',
    iconName: 'Shield',
    category: 'mastery',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    xpReward: 150,
    hint: 'Vença uma fase na Arena de Batalha.',
  },
  {
    id: 'tr_pedreiro_digital',
    name: 'Pedreiro Digital',
    description: 'Criou 3 nós conectados na Lousa Mental.',
    iconName: 'Layers',
    category: 'mastery',
    unlocked: true,
    unlockedAt: '2026-08-22',
    progress: 3,
    maxProgress: 3,
    xpReward: 100,
    hint: 'Conecte conceitos na Lousa Mental.',
  },
  {
    id: 'tr_sync_master',
    name: 'Sync Master',
    description: 'Atingiu mais de 80% de taxa de sincronia e consistência.',
    iconName: 'Activity',
    category: 'discipline',
    unlocked: false,
    progress: 78,
    maxProgress: 80,
    xpReward: 150,
    hint: 'Mantenha seus estudos e tarefas em dia.',
  },
  {
    id: 'tr_arquiteto_poo',
    name: 'Arquiteto POO',
    description: 'Dominou Classes, Construtores, Encapsulamento e Herança no Dungeon C#.',
    iconName: 'Code2',
    category: 'mastery',
    unlocked: false,
    progress: 3,
    maxProgress: 5,
    xpReward: 250,
    hint: 'Complete as 5 fases da trilha C#.',
  },
  {
    id: 'tr_mestre_c_bases',
    name: 'Mestre da Memória Bruta',
    description: 'Derrotou o Segmentation Fault Titan na trilha C Bases.',
    iconName: 'Cpu',
    category: 'mastery',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    xpReward: 300,
    hint: 'Vença o Chefe da trilha C Bases.',
  },
  {
    id: 'tr_soberano_lfa',
    name: 'Soberano dos Autômatos',
    description: 'Neutralizou o Leviatã dos Autômatos Indeterministas.',
    iconName: 'Sparkles',
    category: 'mastery',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    xpReward: 350,
    hint: 'Vença o Chefe da trilha LFA.',
  },
  {
    id: 'tr_feynman_supremo',
    name: 'Feynman Supremo',
    description: 'Explicou um conceito com nota acima de 90 na avaliação do Prof. A.Ilson.',
    iconName: 'GraduationCap',
    category: 'speed',
    unlocked: false,
    progress: 0,
    maxProgress: 1,
    xpReward: 200,
    hint: 'Envie uma explicação clara e técnica na Prova da Matriz.',
  },
  {
    id: 'tr_vault_master',
    name: 'Curador da Matriz',
    description: 'Adicionou e ativou fontes personalizadas no Knowledge Vault.',
    iconName: 'Database',
    category: 'discipline',
    unlocked: true,
    unlockedAt: '2026-08-24',
    progress: 1,
    maxProgress: 1,
    xpReward: 100,
    hint: 'Mantenha o Knowledge Vault populado.',
  },
  {
    id: 'tr_streak_flame',
    name: 'Streak de Fogo',
    description: 'Manteve 7 dias seguidos de estudo na plataforma.',
    iconName: 'Flame',
    category: 'discipline',
    unlocked: false,
    progress: 4,
    maxProgress: 7,
    xpReward: 350,
    hint: 'Marque presença de estudo todos os dias.',
  },
];

const INITIAL_SKILLS: SkillNode[] = [
  // Tier 1: FUNDAMENTOS
  {
    id: 'csharp_syntax',
    label: 'Sintaxe C# Core',
    branch: 'fundamentos',
    tier: 1,
    description: 'Fundamentos da linguagem C#, estrutura de programas e tipos de dados primitivos.',
    formalSummary: 'Declaração fortemente tipada, namespace System, blocos de escopo e convenções de nomenclatura.',
    keywords: ['using System', 'int', 'string', 'bool', 'void Main'],
    prerequisites: [],
    status: 'mastered',
    masteryProgress: 100,
    xpReward: 50,
    iconName: 'Terminal',
    x: 80,
    y: 80,
  },
  {
    id: 'memory_stack_heap',
    label: 'Memória: Stack vs Heap',
    branch: 'fundamentos',
    tier: 1,
    description: 'Compreensão de Value Types na Stack e Reference Types alocados na Heap gerenciada pelo Garbage Collector.',
    formalSummary: 'Value Types (struct, int) alocados na pilha com liberação rápida. Reference Types (class, string) alocados na heap.',
    keywords: ['Stack', 'Heap', 'Garbage Collector', 'Boxing', 'Unboxing'],
    prerequisites: ['csharp_syntax'],
    status: 'mastered',
    masteryProgress: 100,
    xpReward: 75,
    iconName: 'Cpu',
    x: 80,
    y: 200,
  },
  {
    id: 'control_flow',
    label: 'Controle de Fluxo & Loops',
    branch: 'fundamentos',
    tier: 1,
    description: 'Estruturas condicionais (if, switch, pattern matching) e iterações (for, foreach, while).',
    formalSummary: 'Desvio de fluxo, loops determinísticos e avaliação de padrões de tipos em C# moderno.',
    keywords: ['if/else', 'switch pattern', 'foreach', 'while'],
    prerequisites: ['csharp_syntax'],
    status: 'mastered',
    masteryProgress: 100,
    xpReward: 60,
    iconName: 'GitCommit',
    x: 80,
    y: 320,
  },

  // Tier 2: POO (PROGRAMAÇÃO ORIENTADA A OBJETOS)
  {
    id: 'classes_objects',
    label: 'Classes & Instâncias',
    branch: 'poo',
    tier: 2,
    description: 'Criação de tipos customizados, moldes de objetos e instanciamento via operador new.',
    formalSummary: 'Abstração fundamental de POO que encapsula dados (campos) e operações (métodos).',
    keywords: ['class', 'new', 'instância', 'membros'],
    prerequisites: ['csharp_syntax', 'memory_stack_heap'],
    status: 'mastered',
    masteryProgress: 100,
    xpReward: 100,
    iconName: 'Box',
    x: 280,
    y: 80,
  },
  {
    id: 'constructors',
    label: 'Construtores & Inicialização',
    branch: 'poo',
    tier: 2,
    description: 'Métodos especiais de inicialização de instâncias e construtores primários.',
    formalSummary: 'Garantem que um objeto seja instanciado em um estado consistente e invariante.',
    keywords: ['ctor', 'this', 'overload', 'primary constructor'],
    prerequisites: ['classes_objects'],
    status: 'mastered',
    masteryProgress: 100,
    xpReward: 100,
    iconName: 'Hammer',
    x: 280,
    y: 190,
  },
  {
    id: 'encapsulation',
    label: 'Encapsulamento & Props',
    branch: 'poo',
    tier: 2,
    description: 'Modificadores de acesso (private, protected, public) e propriedades inteligentes (get; set;).',
    formalSummary: 'Ocultação de estado interno para proteger invariâncias de negócio e reduzir acoplamento.',
    keywords: ['private', 'get; set;', 'init', 'Auto-Properties'],
    prerequisites: ['classes_objects', 'constructors'],
    status: 'in_progress',
    masteryProgress: 75,
    xpReward: 150,
    iconName: 'Shield',
    x: 280,
    y: 300,
  },
  {
    id: 'inheritance',
    label: 'Herança de Classes',
    branch: 'poo',
    tier: 2,
    description: 'Extensão de classes base, reutilização de código e palavra-chave base.',
    formalSummary: 'Relação "é-um" (is-a). Subclasses herdam membros públicos e protegidos da superclasse.',
    keywords: ['class Derived : Base', 'base()', 'protected'],
    prerequisites: ['classes_objects', 'encapsulation'],
    status: 'unlocked',
    masteryProgress: 40,
    xpReward: 150,
    iconName: 'GitBranch',
    x: 280,
    y: 410,
  },
  {
    id: 'polymorphism',
    label: 'Polimorfismo & Override',
    branch: 'poo',
    tier: 2,
    description: 'Despacho dinâmico de métodos via virtual, override e classes abstratas.',
    formalSummary: 'Habilidade de tratar objetos derivados através do tipo base mantendo comportamento polimórfico.',
    keywords: ['virtual', 'override', 'abstract', 'dynamic dispatch'],
    prerequisites: ['inheritance'],
    status: 'locked',
    masteryProgress: 0,
    xpReward: 180,
    iconName: 'Shuffle',
    x: 280,
    y: 520,
  },
  {
    id: 'interfaces',
    label: 'Interfaces & Contratos',
    branch: 'poo',
    tier: 2,
    description: 'Definição de contratos puros sem estado para desacoplamento e abstração.',
    formalSummary: 'Assinaturas de métodos e propriedades sem implementação obrigatória. Suporta herança múltipla de tipos.',
    keywords: ['interface IService', 'implements', 'polimorfismo puro'],
    prerequisites: ['encapsulation', 'polymorphism'],
    status: 'locked',
    masteryProgress: 0,
    xpReward: 180,
    iconName: 'FileCode',
    x: 280,
    y: 630,
  },
];

const INITIAL_WEEKLY_FOCUS: WeeklyFocusData = {
  days: [
    { dayKey: 'SEG', date: '2026-08-24', hours: 3.5, efficiency: 88, studied: true },
    { dayKey: 'TER', date: '2026-08-25', hours: 2.0, efficiency: 75, studied: true },
    { dayKey: 'QUA', date: '2026-08-26', hours: 4.0, efficiency: 92, studied: true },
    { dayKey: 'QUI', date: '2026-08-27', hours: 1.5, efficiency: 60, studied: true },
    { dayKey: 'SEX', date: '2026-08-28', hours: 3.0, efficiency: 85, studied: true },
    { dayKey: 'SAB', date: '2026-08-29', hours: 0.0, efficiency: 0, studied: false },
    { dayKey: 'DOM', date: '2026-08-30', hours: 0.0, efficiency: 0, studied: false },
  ],
  totalHours: 14.0,
  averageEfficiency: 80,
};

const INITIAL_AI_CONFIG: AIConfig = {
  endpoint: 'http://localhost:11434',
  selectedModel: 'qwen2.5-coder:7b',
  temperature: 0.4,
  isOnline: false,
  availableModels: [],
  useHeuristicFallback: true,
};

const INITIAL_DUNGEON_PROGRESS: DungeonProgress = {
  csharp: {
    currentStageNumber: 1,
    completedStageIds: [],
    defeatedBossIds: [],
    highScores: {},
  },
  c_bases: {
    currentStageNumber: 1,
    completedStageIds: [],
    defeatedBossIds: [],
    highScores: {},
  },
  lfa: {
    currentStageNumber: 1,
    completedStageIds: [],
    defeatedBossIds: [],
    highScores: {},
  },
};

// ─── Context Interface ────────────────────────────────────────────────────────

interface NeuralContextType {
  // Track Selection (C#, C Bases, LFA)
  activeTrack: TrackId;
  setActiveTrack: (track: TrackId) => void;

  // Profile & Progression
  profile: Profile;
  updateProfile: (patch: Partial<Profile>) => void;
  addXP: (amount: number, sourceLabel?: string) => void;

  // Target Goal
  target: TargetGoal;
  updateTarget: (patch: Partial<TargetGoal>) => void;

  // College Tasks
  tasks: CollegeTask[];
  addTask: (task: Omit<CollegeTask, 'id' | 'createdAt'>) => void;
  updateTask: (id: string, patch: Partial<CollegeTask>) => void;
  deleteTask: (id: string) => void;
  cycleTaskStatus: (id: string) => void;

  // Missions
  missions: StudyMission[];
  toggleMission: (id: string) => void;

  // Trophies
  trophies: Trophy[];
  unlockTrophy: (id: string) => void;

  // Skill Tree
  skills: SkillNode[];
  updateSkillStatus: (id: string, status: SkillNode['status']) => void;

  // Attendance / Study Calendar
  studiedDates: Set<string>;
  toggleStudyAttendance: (dateISO: string) => void;

  // Weekly Focus
  weeklyFocus: WeeklyFocusData;
  logStudyHours: (dayKey: WeeklyFocusData['days'][0]['dayKey'], hours: number) => void;

  // Quick Notes
  notes: string[];
  addNote: (text: string) => void;
  removeNote: (index: number) => void;
  clearNotes: () => void;

  // AI & Ollama Configuration
  aiConfig: AIConfig;
  updateAIConfig: (patch: Partial<AIConfig>) => void;
  checkOllamaStatus: () => Promise<void>;

  // System Override (Fatigue)
  fatigue: boolean;
  toggleFatigue: () => void;

  // Active Study Session
  activeSession: ActiveStudySession | null;
  submitWhiteboardToProfessor: (topic: string, notes: string[], nodesCount: number) => void;
  recordExamCompletion: (topic: string, score: number, passed: boolean) => void;

  // Knowledge Vault (Motor de Fontes)
  sources: KnowledgeSource[];
  addSource: (source: Omit<KnowledgeSource, 'id' | 'createdAt' | 'wordCount'>) => void;
  removeSource: (id: string) => void;
  toggleSource: (id: string) => void;
  updateSource: (id: string, patch: Partial<KnowledgeSource>) => void;
  resetToDefaultSources: () => void;

  // Track-isolated progress & Sandbox state
  trackProgress: TrackProgressMap;
  setTrackEditorDraft: (track: TrackId, draft: string) => void;
  toggleTrackSkill: (track: TrackId, skillId: string) => void;
  setTrackLastStudiedSkill: (track: TrackId, skillId: string) => void;

  // Solutions History & Study Telemetry for IA/RAG
  studyTelemetry: StudyTelemetryEntry[];
  recordSolutionSuccess: (solution: Omit<SolvedSolution, 'id' | 'completedAt'>) => void;
  getTrackSolutions: (track: TrackId) => SolvedSolution[];

  // Dungeon Protocol Progress
  dungeonProgress: DungeonProgress;
  updateDungeonProgress: (track: TrackId, stageId: string, stageNumber: number, won: boolean, score: number, isBoss?: boolean) => void;
  resetDungeonTrack: (track: TrackId) => void;

  // Sandbox Integration
  sandboxExportPayload: SandboxExportPayload | null;
  exportToSandbox: (code: string, language?: TrackId, title?: string, sourceModule?: 'dungeon' | 'professor' | 'lousa') => void;
  clearSandboxExport: () => void;
}

const NeuralContext = createContext<NeuralContextType | null>(null);

function loadLocal<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function saveLocal<T>(key: string, value: T) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export const NeuralProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTrack, setActiveTrackState] = useState<TrackId>(() => loadLocal('neural.active_track', 'csharp'));
  const [trackProgress, setTrackProgress] = useState<TrackProgressMap>(() =>
    loadLocal('neural.track_progress', INITIAL_TRACK_PROGRESS)
  );
  const [profile, setProfile] = useState<Profile>(() => {
    const savedProf = loadLocal('neural.profile', INITIAL_PROFILE);
    const savedTracks = loadLocal('neural.track_progress', INITIAL_TRACK_PROGRESS);
    const curTrack = loadLocal('neural.active_track', 'csharp') as TrackId;
    const trackData = savedTracks[curTrack] || INITIAL_TRACK_PROGRESS[curTrack];
    return {
      ...savedProf,
      level: trackData.level,
      xp: trackData.xp,
      xpToNextLevel: trackData.xpToNextLevel,
    };
  });
  const [target, setTarget] = useState<TargetGoal>(() => loadLocal('neural.target', INITIAL_TARGET));
  const [tasks, setTasks] = useState<CollegeTask[]>(() => loadLocal('neural.tasks', INITIAL_TASKS));
  const [missions, setMissions] = useState<StudyMission[]>(() => loadLocal('neural.missions', INITIAL_MISSIONS));
  const [trophies, setTrophies] = useState<Trophy[]>(() => loadLocal('neural.trophies', INITIAL_TROPHIES));
  const [skills, setSkills] = useState<SkillNode[]>(() => loadLocal('neural.skills', INITIAL_SKILLS));
  const [studiedDatesArray, setStudiedDatesArray] = useState<string[]>(() =>
    loadLocal('neural.studied_dates', [
      new Date().toISOString().slice(0, 10),
      new Date(Date.now() - 86400000).toISOString().slice(0, 10),
      new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
      new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10),
    ])
  );
  const [weeklyFocus, setWeeklyFocus] = useState<WeeklyFocusData>(() =>
    loadLocal('neural.weekly_focus', INITIAL_WEEKLY_FOCUS)
  );
  const [notes, setNotes] = useState<string[]>(() =>
    loadLocal('neural.notes', [
      'Revisar diferença entre classes e structs no C#',
      'Encapsulamento: usar private nos fields e public get/set nas props',
      'Ponteiros em C: passagem por referência com operador & e *',
      'LFA: AFD aceita cadeias quando o estado final pertence a F',
    ])
  );
  const [aiConfig, setAiConfig] = useState<AIConfig>(() => loadLocal('neural.ai_config', INITIAL_AI_CONFIG));
  const [fatigue, setFatigue] = useState<boolean>(() => loadLocal('neural.fatigue', false));

  // Knowledge Vault Sources
  const [sources, setSources] = useState<KnowledgeSource[]>(() =>
    loadLocal('neural.sources', DEFAULT_KNOWLEDGE_SOURCES)
  );

  // Dungeon Progress
  const [dungeonProgress, setDungeonProgress] = useState<DungeonProgress>(() =>
    loadLocal('neural.dungeon_progress', INITIAL_DUNGEON_PROGRESS)
  );

  // Sandbox Export Payload
  const [sandboxExportPayload, setSandboxExportPayload] = useState<SandboxExportPayload | null>(() =>
    loadLocal('neural.sandbox_export', null)
  );

  // Study Telemetry for IA & RAG Context
  const [studyTelemetry, setStudyTelemetry] = useState<StudyTelemetryEntry[]>(() =>
    loadLocal('neural.study_telemetry', [
      {
        id: 'tel_init_1',
        track: 'csharp',
        challengeId: 'classe_pessoa',
        challengeTitle: 'Classe Simples Pessoa',
        skills: ['cs_classes'],
        success: true,
        timestamp: new Date().toISOString(),
        codeSnippet: `public class Pessoa { public void Apresentar() { Console.WriteLine("Ola mundo"); } }`,
        module: 'sandbox',
      },
    ])
  );

  // Sync to local storage
  useEffect(() => saveLocal('neural.active_track', activeTrack), [activeTrack]);
  useEffect(() => saveLocal('neural.track_progress', trackProgress), [trackProgress]);
  useEffect(() => saveLocal('neural.study_telemetry', studyTelemetry), [studyTelemetry]);
  useEffect(() => saveLocal('neural.profile', profile), [profile]);
  useEffect(() => saveLocal('neural.target', target), [target]);
  useEffect(() => saveLocal('neural.tasks', tasks), [tasks]);
  useEffect(() => saveLocal('neural.missions', missions), [missions]);
  useEffect(() => saveLocal('neural.trophies', trophies), [trophies]);
  useEffect(() => saveLocal('neural.skills', skills), [skills]);
  useEffect(() => saveLocal('neural.studied_dates', studiedDatesArray), [studiedDatesArray]);
  useEffect(() => saveLocal('neural.weekly_focus', weeklyFocus), [weeklyFocus]);
  useEffect(() => saveLocal('neural.notes', notes), [notes]);
  useEffect(() => saveLocal('neural.ai_config', aiConfig), [aiConfig]);
  useEffect(() => saveLocal('neural.fatigue', fatigue), [fatigue]);
  useEffect(() => saveLocal('neural.sources', sources), [sources]);
  useEffect(() => saveLocal('neural.dungeon_progress', dungeonProgress), [dungeonProgress]);
  useEffect(() => saveLocal('neural.sandbox_export', sandboxExportPayload), [sandboxExportPayload]);

  // Check Ollama health periodically
  const checkOllamaStatus = async () => {
    const { online, models } = await ollamaService.checkHealth(aiConfig.endpoint);
    setAiConfig((prev) => ({
      ...prev,
      isOnline: online,
      availableModels: models,
      lastChecked: new Date().toLocaleTimeString(),
      selectedModel: models.length > 0 && !models.includes(prev.selectedModel) ? models[0] : prev.selectedModel,
    }));
  };

  useEffect(() => {
    checkOllamaStatus();
    const interval = setInterval(checkOllamaStatus, 30000);
    return () => clearInterval(interval);
  }, [aiConfig.endpoint]);

  // Global Track Switcher with Profile and Sandbox Sync
  const setActiveTrack = (track: TrackId) => {
    setActiveTrackState(track);
    const data = trackProgress[track] || INITIAL_TRACK_PROGRESS[track];
    setProfile((prev) => ({
      ...prev,
      level: data.level,
      xp: data.xp,
      xpToNextLevel: data.xpToNextLevel,
    }));
  };

  // Solution History & Telemetry Recording
  const recordSolutionSuccess = (solutionData: Omit<SolvedSolution, 'id' | 'completedAt'>) => {
    const newSolutionId = 'sol_' + Date.now();
    const completedAt = new Date().toISOString();
    const newSolution: SolvedSolution = {
      ...solutionData,
      id: newSolutionId,
      completedAt,
    };

    setTrackProgress((prev) => {
      const cur = prev[solutionData.track] || INITIAL_TRACK_PROGRESS[solutionData.track];
      const prevIds = cur.completedChallengeIds || [];
      const updatedIds = prevIds.includes(solutionData.challengeId)
        ? prevIds
        : [...prevIds, solutionData.challengeId];
      const prevHistory = cur.solutionsHistory || [];

      return {
        ...prev,
        [solutionData.track]: {
          ...cur,
          completedChallengeIds: updatedIds,
          solutionsHistory: [newSolution, ...prevHistory],
          lastStudiedSkillId: solutionData.skills[0] || cur.lastStudiedSkillId,
        },
      };
    });

    const telemetryEntry: StudyTelemetryEntry = {
      id: 'tel_' + Date.now(),
      track: solutionData.track,
      challengeId: solutionData.challengeId,
      challengeTitle: solutionData.challengeTitle,
      skills: solutionData.skills,
      success: true,
      timestamp: completedAt,
      codeSnippet: solutionData.codeSnippet,
      module: 'sandbox',
    };
    setStudyTelemetry((prev) => [telemetryEntry, ...prev]);

    addXP(solutionData.xpEarned || 80, `Sandbox: ${solutionData.challengeTitle}`);

    toast({
      title: 'SOLUÇÃO REGISTRADA // LOG DE CONQUISTAS',
      description: `Desafio "${solutionData.challengeTitle}" salvo no histórico de ${solutionData.track.toUpperCase()}.`,
      variant: 'neon',
    });
  };

  const getTrackSolutions = (track: TrackId): SolvedSolution[] => {
    return trackProgress[track]?.solutionsHistory || [];
  };

  // Track Editor Draft Management
  const setTrackEditorDraft = (track: TrackId, draft: string) => {
    setTrackProgress((prev) => ({
      ...prev,
      [track]: {
        ...(prev[track] || INITIAL_TRACK_PROGRESS[track]),
        editorDraft: draft,
      },
    }));
  };

  // Track Knowledge Matrix Skill Toggling
  const toggleTrackSkill = (track: TrackId, skillId: string) => {
    setTrackProgress((prev) => {
      const current = prev[track] || INITIAL_TRACK_PROGRESS[track];
      const isChecked = current.checkedSkillIds.includes(skillId);
      const nextChecked = isChecked
        ? current.checkedSkillIds.filter((id) => id !== skillId)
        : [...current.checkedSkillIds, skillId];
      return {
        ...prev,
        [track]: {
          ...current,
          checkedSkillIds: nextChecked,
        },
      };
    });
  };

  const setTrackLastStudiedSkill = (track: TrackId, skillId: string) => {
    setTrackProgress((prev) => ({
      ...prev,
      [track]: {
        ...(prev[track] || INITIAL_TRACK_PROGRESS[track]),
        lastStudiedSkillId: skillId,
      },
    }));
  };

  // Track-isolated XP and Level-up calculation
  const addXP = (amount: number, sourceLabel?: string) => {
    setTrackProgress((prev) => {
      const current = prev[activeTrack] || INITIAL_TRACK_PROGRESS[activeTrack];
      let newXP = current.xp + amount;
      let newLevel = current.level;
      let newXpToNext = current.xpToNextLevel;
      let didLevelUp = false;

      while (newXP >= newXpToNext) {
        newXP -= newXpToNext;
        newLevel += 1;
        newXpToNext = Math.round(newXpToNext * 1.35);
        didLevelUp = true;
      }

      // Unlock skills corresponding to the new level
      const allTrackSkills = SANDBOX_SKILLS_BY_TRACK[activeTrack] || [];
      const unlockedNow = allTrackSkills
        .filter((s) => s.requiresLevel <= newLevel)
        .map((s) => s.id);

      const nextUnlocked = Array.from(new Set([...current.unlockedSkillIds, ...unlockedNow]));

      if (didLevelUp) {
        toast({
          title: `⚡ LEVEL UP! [${activeTrack.toUpperCase()} // NÍVEL ${newLevel}]`,
          description: `Parabéns operador! Nível ${newLevel} atingido. Novos nós sinápticos liberados na matriz!`,
          variant: 'neon',
        });
      } else if (sourceLabel) {
        toast({
          title: `+${amount} XP RECOMPENSA`,
          description: `${sourceLabel} concluído com sucesso.`,
          variant: 'success',
        });
      }

      return {
        ...prev,
        [activeTrack]: {
          ...current,
          level: newLevel,
          xp: newXP,
          xpToNextLevel: newXpToNext,
          unlockedSkillIds: nextUnlocked,
        },
      };
    });

    setProfile((prev) => {
      const curTrack = trackProgress[activeTrack] || INITIAL_TRACK_PROGRESS[activeTrack];
      return {
        ...prev,
        level: curTrack.level,
        xp: curTrack.xp + amount,
      };
    });
  };

  const updateProfile = (patch: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
  };

  const updateTarget = (patch: Partial<TargetGoal>) => {
    setTarget((prev) => ({ ...prev, ...patch }));
  };

  // Tasks Management
  const addTask = (newTaskData: Omit<CollegeTask, 'id' | 'createdAt'>) => {
    const newTask: CollegeTask = {
      ...newTaskData,
      id: `t_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
    toast({
      title: 'PROJETO REGISTRADO',
      description: `"${newTask.label}" adicionado ao College Tracker.`,
      variant: 'default',
    });
  };

  const updateTask = (id: string, patch: Partial<CollegeTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const deleteTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const cycleTaskStatus = (id: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const nextStatus: CollegeTask['status'] =
          t.status === 'pending' ? 'in_progress' : t.status === 'in_progress' ? 'done' : 'pending';

        if (nextStatus === 'done' && t.status !== 'done') {
          addXP(t.xpReward || 100, `Trabalho: ${t.label}`);
          const todayISO = new Date().toISOString().slice(0, 10);
          setStudiedDatesArray((dates) => (dates.includes(todayISO) ? dates : [...dates, todayISO]));
        }

        return {
          ...t,
          status: nextStatus,
          completedAt: nextStatus === 'done' ? new Date().toISOString() : undefined,
        };
      })
    );
  };

  // Missions
  const toggleMission = (id: string) => {
    setMissions((prev) =>
      prev.map((m) => {
        if (m.id !== id) return m;
        const nextCompleted = !m.completed;
        if (nextCompleted) {
          addXP(m.xpReward, `Missão: ${m.title}`);
        }
        return {
          ...m,
          completed: nextCompleted,
          progress: nextCompleted ? m.maxProgress : 0,
        };
      })
    );
  };

  // Trophies
  const unlockTrophy = (id: string) => {
    setTrophies((prev) =>
      prev.map((t) => {
        if (t.id !== id || t.unlocked) return t;
        addXP(t.xpReward, `Troféu Desbloqueado: ${t.name}`);
        toast({
          title: `🏆 TROFÉU DESBLOQUEADO: ${t.name}`,
          description: t.description,
          variant: 'neon',
        });
        return { ...t, unlocked: true, unlockedAt: new Date().toISOString().slice(0, 10) };
      })
    );
  };

  // Skill Tree
  const updateSkillStatus = (id: string, status: SkillNode['status']) => {
    setSkills((prev) => {
      const updated = prev.map((s) => {
        if (s.id !== id) return s;
        if (status === 'mastered' && s.status !== 'mastered') {
          addXP(s.xpReward, `Habilidade Dominada: ${s.label}`);
        }
        return {
          ...s,
          status,
          masteryProgress: status === 'mastered' ? 100 : status === 'in_progress' ? 60 : 0,
        };
      });

      const masteredIds = new Set(updated.filter((s) => s.status === 'mastered').map((s) => s.id));
      return updated.map((s) => {
        if (s.status === 'locked' && s.prerequisites.length > 0) {
          const allPrereqsMet = s.prerequisites.every((pId) => masteredIds.has(pId));
          if (allPrereqsMet) {
            return { ...s, status: 'unlocked' };
          }
        }
        return s;
      });
    });
  };

  // Attendance Dates
  const studiedDates = useMemo(() => new Set(studiedDatesArray), [studiedDatesArray]);

  const toggleStudyAttendance = (dateISO: string) => {
    setStudiedDatesArray((prev) => {
      if (prev.includes(dateISO)) {
        return prev.filter((d) => d !== dateISO);
      } else {
        toast({
          title: 'PRESENÇA REGISTRADA',
          description: `Estudo marcado no dia ${dateISO}.`,
          variant: 'success',
        });
        return [...prev, dateISO];
      }
    });
  };

  // Weekly Focus
  const logStudyHours = (dayKey: WeeklyFocusData['days'][0]['dayKey'], hours: number) => {
    setWeeklyFocus((prev) => {
      const updatedDays = prev.days.map((d) => (d.dayKey === dayKey ? { ...d, hours, studied: hours > 0 } : d));
      const totalHours = updatedDays.reduce((acc, cur) => acc + cur.hours, 0);
      return {
        ...prev,
        days: updatedDays,
        totalHours,
      };
    });
  };

  // Notes
  const addNote = (text: string) => {
    if (!text.trim()) return;
    setNotes((prev) => [text.trim(), ...prev]);
  };

  const removeNote = (index: number) => {
    setNotes((prev) => prev.filter((_, i) => i !== index));
  };

  const clearNotes = () => {
    setNotes([]);
  };

  const updateAIConfig = (patch: Partial<AIConfig>) => {
    setAiConfig((prev) => ({ ...prev, ...patch }));
  };

  const toggleFatigue = () => {
    setFatigue((prev) => !prev);
  };

  const [activeSession, setActiveSession] = useState<ActiveStudySession | null>(() =>
    loadLocal<ActiveStudySession | null>('neural.active_session', {
      topic: 'C# Encapsulamento & Propriedades',
      category: 'PARADIGMAS DE PROGRAMAÇÃO',
      notesSummary: [
        'Campos privados protegem o saldo de injeções indevidas',
        'Auto-Properties com get público e private set',
        'Invariâncias de regras de negócio validadas no set',
      ],
      nodesCount: 3,
      startedAt: new Date().toISOString(),
      readyForExam: true,
    })
  );

  useEffect(() => saveLocal('neural.active_session', activeSession), [activeSession]);

  const submitWhiteboardToProfessor = (topic: string, notes: string[], nodesCount: number) => {
    const newSession: ActiveStudySession = {
      topic: topic || 'Estudo de POO & Arquitetura',
      category: 'PARADIGMAS & C#',
      notesSummary: notes,
      nodesCount,
      startedAt: new Date().toISOString(),
      readyForExam: true,
    };
    setActiveSession(newSession);

    setSkills((prev) => {
      const existing = prev.find((s) => s.label.toLowerCase() === topic.toLowerCase() || s.id.toLowerCase() === topic.toLowerCase());
      if (existing) {
        return prev.map((s) => (s.id === existing.id ? { ...s, status: s.status === 'mastered' ? 'mastered' : 'in_progress' } : s));
      }

      const newNode: SkillNode = {
        id: `ai_skill_${Date.now()}`,
        label: topic,
        branch: 'poo',
        tier: 2,
        description: `Conceito estudado na Lousa Mental: ${notes.slice(0, 2).join('; ') || topic}`,
        formalSummary: `Sintese conceitual gerada pela matriz neural a partir das anotações da Lousa.`,
        keywords: [topic, 'C#', 'POO'],
        prerequisites: ['classes_objects'],
        status: 'in_progress',
        masteryProgress: 50,
        xpReward: 120,
        iconName: 'Box',
        isAiGenerated: true,
      };

      return [...prev, newNode];
    });

    toast({
      title: 'ESTUDO ENVIADO AO PROFESSOR',
      description: `O Prof. A.Ilson preparou o quadro negro sobre "${topic}".`,
      variant: 'neon',
    });
  };

  const recordExamCompletion = (topic: string, score: number, passed: boolean) => {
    if (passed) {
      addXP(150, `Aprovado pelo Prof. A.Ilson (${score}/100)`);
      const todayISO = new Date().toISOString().slice(0, 10);
      setStudiedDatesArray((dates) => (dates.includes(todayISO) ? dates : [...dates, todayISO]));

      setSkills((prev) =>
        prev.map((s) => {
          if (s.label.toLowerCase().includes(topic.toLowerCase()) || topic.toLowerCase().includes(s.label.toLowerCase())) {
            return { ...s, status: 'mastered', masteryProgress: 100 };
          }
          return s;
        })
      );

      if (score >= 90) {
        unlockTrophy('tr_feynman_supremo');
      }
    } else {
      toast({
        title: 'REVISÃO SOLICITADA PELO PROFESSOR',
        description: 'Nota insuficiente. Revise o conceito antes de refazer a prova.',
        variant: 'destructive',
      });
    }
  };

  // ─── Knowledge Vault Handlers ─────────────────────────────────────────────

  const addSource = (sourceData: Omit<KnowledgeSource, 'id' | 'createdAt' | 'wordCount'>) => {
    const words = sourceData.content.trim().split(/\s+/).filter(Boolean).length;
    const newSource: KnowledgeSource = {
      ...sourceData,
      id: `source_${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10),
      wordCount: words,
      summary: sourceData.summary || sourceData.content.slice(0, 120) + '...',
    };
    setSources((prev) => [newSource, ...prev]);
    toast({
      title: 'DOCUMENTO INGERIDO NO VAULT',
      description: `"${newSource.title}" (${words} palavras) adicionado ao escopo da IA.`,
      variant: 'neon',
    });
    unlockTrophy('tr_vault_master');
  };

  const removeSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
    toast({
      title: 'FONTE REMOVIDA DO VAULT',
      description: 'O escopo da IA foi recalculado.',
      variant: 'default',
    });
  };

  const toggleSource = (id: string) => {
    setSources((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const nextActive = !s.active;
        toast({
          title: nextActive ? 'FONTE ATIVADA NO ESCOPO' : 'FONTE DESATIVADA',
          description: `"${s.title}" ${nextActive ? 'incluída no RAG' : 'removida do RAG'}.`,
          variant: nextActive ? 'success' : 'default',
        });
        return { ...s, active: nextActive };
      })
    );
  };

  const updateSource = (id: string, patch: Partial<KnowledgeSource>) => {
    setSources((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, ...patch };
        if (patch.content) {
          updated.wordCount = patch.content.trim().split(/\s+/).filter(Boolean).length;
        }
        return updated;
      })
    );
  };

  const resetToDefaultSources = () => {
    setSources(DEFAULT_KNOWLEDGE_SOURCES);
    toast({
      title: 'KNOWLEDGE VAULT RESTAURADO',
      description: 'As fontes canônicas de C#, C Bases e LFA foram restabelecidas.',
      variant: 'neon',
    });
  };

  // ─── Dungeon Protocol Handlers ────────────────────────────────────────────

  const updateDungeonProgress = (
    track: TrackId,
    stageId: string,
    stageNumber: number,
    won: boolean,
    score: number,
    isBoss?: boolean
  ) => {
    if (!won) return;

    setDungeonProgress((prev) => {
      const currentTrackState = prev[track] || {
        currentStageNumber: 1,
        completedStageIds: [],
        defeatedBossIds: [],
        highScores: {},
      };

      const completed = currentTrackState.completedStageIds.includes(stageId)
        ? currentTrackState.completedStageIds
        : [...currentTrackState.completedStageIds, stageId];

      const bosses = isBoss && !currentTrackState.defeatedBossIds.includes(stageId)
        ? [...currentTrackState.defeatedBossIds, stageId]
        : currentTrackState.defeatedBossIds;

      const nextStageNumber = Math.max(currentTrackState.currentStageNumber, stageNumber + 1);

      return {
        ...prev,
        [track]: {
          currentStageNumber: nextStageNumber,
          completedStageIds: completed,
          defeatedBossIds: bosses,
          highScores: {
            ...currentTrackState.highScores,
            [stageId]: Math.max(currentTrackState.highScores[stageId] || 0, score),
          },
        },
      };
    });

    // Award trophies if boss defeated
    if (isBoss) {
      if (track === 'csharp') unlockTrophy('tr_arquiteto_poo');
      if (track === 'c_bases') unlockTrophy('tr_mestre_c_bases');
      if (track === 'lfa') unlockTrophy('tr_soberano_lfa');
    } else {
      unlockTrophy('tr_dungeon_survivor');
    }
  };

  const resetDungeonTrack = (track: TrackId) => {
    setDungeonProgress((prev) => ({
      ...prev,
      [track]: {
        currentStageNumber: 1,
        completedStageIds: [],
        defeatedBossIds: [],
        highScores: {},
      },
    }));
    toast({
      title: 'PROGRESSO REINICIADO',
      description: `A trilha ${track.toUpperCase()} foi reiniciada na Fase 1.`,
      variant: 'default',
    });
  };

  // ─── Sandbox Integration Handlers ─────────────────────────────────────────

  const exportToSandbox = (
    code: string,
    language: TrackId = 'csharp',
    title?: string,
    sourceModule: 'dungeon' | 'professor' | 'lousa' = 'dungeon'
  ) => {
    const payload: SandboxExportPayload = {
      code,
      language,
      title: title || `Snippet Exportado [${sourceModule.toUpperCase()}]`,
      sourceModule,
    };
    setSandboxExportPayload(payload);
    toast({
      title: 'CÓDIGO EXPORTADO PARA A SANDBOX',
      description: `Trecho "${payload.title}" pronto no editor de testes.`,
      variant: 'neon',
    });
  };

  const clearSandboxExport = () => {
    setSandboxExportPayload(null);
  };

  return (
    <NeuralContext.Provider
      value={{
        activeTrack,
        setActiveTrack,
        profile,
        updateProfile,
        addXP,
        target,
        updateTarget,
        tasks,
        addTask,
        updateTask,
        deleteTask,
        cycleTaskStatus,
        missions,
        toggleMission,
        trophies,
        unlockTrophy,
        skills,
        updateSkillStatus,
        studiedDates,
        toggleStudyAttendance,
        weeklyFocus,
        logStudyHours,
        notes,
        addNote,
        removeNote,
        clearNotes,
        aiConfig,
        updateAIConfig,
        checkOllamaStatus,
        fatigue,
        toggleFatigue,
        activeSession,
        submitWhiteboardToProfessor,
        recordExamCompletion,
        sources,
        addSource,
        removeSource,
        toggleSource,
        updateSource,
        resetToDefaultSources,
        dungeonProgress,
        updateDungeonProgress,
        resetDungeonTrack,
        trackProgress,
        setTrackEditorDraft,
        toggleTrackSkill,
        setTrackLastStudiedSkill,
        studyTelemetry,
        recordSolutionSuccess,
        getTrackSolutions,
        sandboxExportPayload,
        exportToSandbox,
        clearSandboxExport,
      }}
    >
      {children}
    </NeuralContext.Provider>
  );
};

export const useNeural = () => {
  const context = useContext(NeuralContext);
  if (!context) {
    throw new Error('useNeural must be used within a NeuralProvider');
  }
  return context;
};
