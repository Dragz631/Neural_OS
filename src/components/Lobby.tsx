import React, { useState, useMemo, type FormEvent } from 'react';
import {
  Brain,
  Pencil,
  Power,
  Trophy,
  Lock,
  BookOpen,
  Zap,
  Check,
  X,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Upload,
  Calendar,
  Flame,
  Copy,
  ExternalLink,
  Target,
} from 'lucide-react';
import { useNeural } from '../context/NeuralContext';
import { NeuralTreeModal } from './lobby/NeuralTreeModal';
import type { CollegeTask, TaskCategory, WeeklyFocusData } from '../types';
import { toast } from '../hooks/use-toast';

const CATEGORY_META: Record<TaskCategory, { label: string; color: string }> = {
  web: { label: 'WEB / BACKEND', color: '#39ff14' },
  paradigmas: { label: 'PARADIGMAS & POO', color: '#7cf0ff' },
  calculos: { label: 'CÁLCULO & EXATAS', color: '#ffb347' },
  estudos: { label: 'ESTUDOS GERAIS', color: '#c084fc' },
  outro: { label: 'OUTRO', color: '#9dc197' },
};

const WEEK_DAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'] as const;

interface LobbyProps {
  onNavigateTab?: (tabId: 'sandbox' | 'professor' | 'lousa' | 'molda' | 'dungeon') => void;
}

export default function Lobby({ onNavigateTab }: LobbyProps) {
  const [treeModalOpen, setTreeModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0b0d] text-[#9dc197] font-mono selection:bg-[#39ff14] selection:text-black">
      {/* Top Banner Sub-Header */}
      <TopBar />

      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6">
        <div className="grid grid-cols-12 gap-6">
          {/* LEFT COLUMN: Perfil & Identidade, Missões & XP, Fadiga */}
          <section className="col-span-12 lg:col-span-3 flex flex-col gap-6">
            <ProfileCard />
            <MissionsCard onNavigateTab={onNavigateTab} />
            <SystemOverride />
          </section>

          {/* CENTER COLUMN: Alvo Atual, Calendário de Presença & Entregas, Sincronia, Neural Tree, Foco Semanal */}
          <section className="col-span-12 lg:col-span-6 flex flex-col gap-6">
            <TargetTerminal onNavigateTab={onNavigateTab} />
            <MiniCronograma />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SyncRateHUD />
              <NeuralTreePortal onOpenTree={() => setTreeModalOpen(true)} />
            </div>
            <WeeklyFocusChart />
          </section>

          {/* RIGHT COLUMN: College Tracker, Trophy Wall, Anotações Rápidas */}
          <section className="col-span-12 lg:col-span-3 flex flex-col gap-6">
            <CollegeTracker />
            <TrophyWall />
            <QuickNotesBuffer />
          </section>
        </div>
      </main>

      {/* Full RPG Neural Tree Modal */}
      <NeuralTreeModal
        isOpen={treeModalOpen}
        onClose={() => setTreeModalOpen(false)}
        onNavigateTab={onNavigateTab}
      />
    </div>
  );
}

// ─── Shared UI Helper Components ──────────────────────────────────────────────

function Panel({
  children,
  className = '',
  title,
  accent = false,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={[
        'relative rounded-sm border bg-[#0d0e12]/90 backdrop-blur-sm',
        accent
          ? 'border-[#39ff14] shadow-[0_0_12px_rgba(57,255,20,0.3)]'
          : 'border-[#3e5c38]/80',
        'p-4',
        className,
      ].join(' ')}
    >
      {title ? (
        <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-[0.2em] text-[#9dc197]/70 border-b border-[#3e5c38]/40 pb-1.5">
          <span className="font-bold">{title}</span>
          <span className="text-[#39ff14] animate-pulse">●</span>
        </div>
      ) : null}
      {children}
    </div>
  );
}

function TopBar() {
  const { profile, fatigue } = useNeural();
  return (
    <div className="border-b border-[#3e5c38]/60 bg-[#0d0e12]">
      <div className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-2.5 text-xs uppercase tracking-[0.25em]">
        <div className="flex items-center gap-3 text-[#39ff14]">
          <span className="h-2 w-2 animate-pulse rounded-full bg-[#39ff14] shadow-[0_0_8px_rgba(57,255,20,0.9)]" />
          <span>NEURAL_OS // OPERATIONAL LOBBY</span>
        </div>
        <div className="hidden gap-6 text-[#9dc197]/70 md:flex text-[11px]">
          <span className="flex items-center gap-1">
            <Flame size={12} className="text-[#39ff14]" /> STREAK: {profile.streakDays} DIAS
          </span>
          <span>LATÊNCIA: 8ms</span>
          <span className={fatigue ? 'text-red-400' : 'text-[#39ff14]'}>
            STATUS: {fatigue ? 'FADIGA CRÍTICA' : 'SINCRONIZADO'}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── 1. IDENTIDADE (Profile Card) ─────────────────────────────────────────────

function ProfileCard() {
  const { profile, updateProfile } = useNeural();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(profile);

  const startEdit = () => {
    setDraft(profile);
    setEditing(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setDraft((prev) => ({ ...prev, avatarUrl: reader.result as string }));
      }
    };
    reader.readAsDataURL(file);
  };

  const save = (e: FormEvent) => {
    e.preventDefault();
    updateProfile(draft);
    setEditing(false);
    toast({
      title: 'IDENTIDADE ATUALIZADA',
      description: 'Perfil salvo com sucesso na matriz local.',
      variant: 'success',
    });
  };

  const xpPercent = Math.min(100, Math.round((profile.xp / profile.xpToNextLevel) * 100));

  return (
    <Panel title="IDENTIDADE // OPERADOR" accent>
      {!editing ? (
        <div className="flex flex-col items-center text-center">
          {/* Avatar Container */}
          <div className="relative mb-3 h-28 w-28 overflow-hidden rounded-sm border-2 border-[#39ff14] bg-[#0a0b0d] shadow-[0_0_16px_rgba(57,255,20,0.4)]">
            {profile.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Avatar do Operador"
                className="h-full w-full object-cover grayscale contrast-125 hover:grayscale-0 transition duration-300"
              />
            ) : (
              <DefaultCyberAvatar />
            )}
            <div className="absolute bottom-0 right-0 border-l border-t border-[#39ff14] bg-black/80 px-1 py-0.5 text-[8px] text-[#39ff14]">
              LVL {profile.level}
            </div>
          </div>

          <div className="text-sm font-bold tracking-[0.15em] text-[#39ff14]">
            {profile.name}
          </div>
          <div className="mt-0.5 text-[10px] uppercase tracking-widest text-[#9dc197]/70">
            {profile.title}
          </div>

          {/* Level Progress Bar */}
          <div className="mt-3 w-full border border-[#3e5c38] bg-[#0a0b0d] p-2 text-left">
            <div className="flex justify-between text-[9px] uppercase tracking-widest mb-1">
              <span className="text-[#39ff14] font-bold">NÍVEL {profile.level} PROGRESSO</span>
              <span className="text-[#9dc197]">
                {profile.xp} / {profile.xpToNextLevel} XP ({xpPercent}%)
              </span>
            </div>
            <div className="h-2 w-full border border-[#3e5c38] bg-black overflow-hidden">
              <div
                className="h-full bg-[#39ff14] transition-all duration-500 shadow-[0_0_8px_rgba(57,255,20,0.8)]"
                style={{ width: `${xpPercent}%` }}
              />
            </div>
          </div>

          {/* Bio Preview */}
          {profile.bio && (
            <p className="mt-2.5 text-[10px] leading-relaxed text-[#9dc197]/60 italic border-t border-[#3e5c38]/40 pt-2">
              "{profile.bio}"
            </p>
          )}

          <button
            type="button"
            onClick={startEdit}
            className="mt-3 inline-flex items-center gap-1.5 border border-[#3e5c38] px-3 py-1.5 text-[10px] uppercase tracking-widest text-[#9dc197] transition hover:border-[#39ff14] hover:text-[#39ff14] hover:shadow-[0_0_10px_rgba(57,255,20,0.3)]"
          >
            <Pencil size={11} /> EDITAR IDENTIDADE
          </button>
        </div>
      ) : (
        <form onSubmit={save} className="space-y-2.5 text-[11px]">
          {/* Avatar Upload / URL */}
          <div>
            <label className="block text-[9px] uppercase tracking-widest text-[#9dc197]/70 font-bold mb-1">
              FOTO DE PERFIL / AVATAR
            </label>
            <div className="flex items-center gap-2">
              <label className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 border border-[#39ff14]/60 bg-[#39ff14]/10 py-1.5 text-[10px] uppercase tracking-widest text-[#39ff14] hover:bg-[#39ff14] hover:text-black transition">
                <Upload size={12} />
                <span>CARREGAR ARQUIVO</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>
            <input
              type="text"
              value={draft.avatarUrl}
              onChange={(e) => setDraft({ ...draft, avatarUrl: e.target.value })}
              placeholder="Ou cole a URL da imagem..."
              className="mt-1.5 w-full border border-[#3e5c38] bg-[#0a0b0d] px-2 py-1 text-[10px] text-[#9dc197] outline-none focus:border-[#39ff14]"
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-widest text-[#9dc197]/70 font-bold">
              NOME DO OPERADOR
            </label>
            <input
              type="text"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              className="mt-1 w-full border border-[#3e5c38] bg-[#0a0b0d] px-2 py-1 text-[#39ff14] outline-none focus:border-[#39ff14]"
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-widest text-[#9dc197]/70 font-bold">
              TÍTULO // ESPECIALIDADE
            </label>
            <input
              type="text"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
              className="mt-1 w-full border border-[#3e5c38] bg-[#0a0b0d] px-2 py-1 text-[#9dc197] outline-none focus:border-[#39ff14]"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] uppercase tracking-widest text-[#9dc197]/70 font-bold">
                EMAIL
              </label>
              <input
                type="email"
                value={draft.email}
                onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                className="mt-1 w-full border border-[#3e5c38] bg-[#0a0b0d] px-2 py-1 text-[#9dc197] outline-none focus:border-[#39ff14]"
              />
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-widest text-[#9dc197]/70 font-bold">
                DATA DE NASCIMENTO
              </label>
              <input
                type="date"
                value={draft.birthday}
                onChange={(e) => setDraft({ ...draft, birthday: e.target.value })}
                className="mt-1 w-full border border-[#3e5c38] bg-[#0a0b0d] px-2 py-1 text-[#9dc197] outline-none focus:border-[#39ff14]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-widest text-[#9dc197]/70 font-bold">
              BIO // CONTEXTO PARA IA
            </label>
            <textarea
              value={draft.bio}
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
              rows={2}
              className="mt-1 w-full resize-none border border-[#3e5c38] bg-[#0a0b0d] px-2 py-1 text-[10px] text-[#9dc197] outline-none focus:border-[#39ff14]"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              className="flex flex-1 items-center justify-center gap-1 border border-[#39ff14] bg-[#39ff14]/10 py-1.5 text-[10px] uppercase tracking-widest text-[#39ff14] hover:bg-[#39ff14] hover:text-black transition font-bold"
            >
              <Check size={12} /> SALVAR
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex flex-1 items-center justify-center gap-1 border border-[#3e5c38] py-1.5 text-[10px] uppercase tracking-widest text-[#9dc197] hover:border-red-500 hover:text-red-500 transition"
            >
              <X size={12} /> CANCELAR
            </button>
          </div>
        </form>
      )}
    </Panel>
  );
}

function DefaultCyberAvatar() {
  return (
    <svg viewBox="0 0 100 100" className="h-full w-full">
      <rect width="100" height="100" fill="#0a0b0d" />
      <g
        fill="none"
        stroke="#39ff14"
        strokeWidth="1"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M30 45 Q30 22 50 22 Q70 22 70 45 L70 58 Q70 68 62 72 L62 80 L38 80 L38 72 Q30 68 30 58 Z" opacity="0.8" />
        <path d="M38 68 Q50 75 62 68" />
        <path d="M38 48 L44 48" />
        <path d="M56 48 L62 48" />
        <circle cx="41" cy="48" r="1.5" fill="#39ff14" />
        <circle cx="59" cy="48" r="1.5" fill="#39ff14" />
        <path d="M50 50 L48 58 L52 58" />
        <path d="M44 65 Q50 67 56 65" />
        <path d="M30 50 L70 50" strokeDasharray="2 3" opacity="0.3" stroke="#9dc197" />
        <path d="M50 22 L50 80" strokeDasharray="2 3" opacity="0.3" stroke="#9dc197" />
      </g>
    </svg>
  );
}

// ─── 2. MISSÕES DE ESTUDO & XP ────────────────────────────────────────────────

function MissionsCard({ onNavigateTab }: { onNavigateTab?: LobbyProps['onNavigateTab'] }) {
  const { missions, toggleMission } = useNeural();

  return (
    <Panel title="MISSÕES DE ESTUDO & XP">
      <div className="space-y-2">
        {missions.map((m) => (
          <div
            key={m.id}
            className={`border p-2.5 transition flex items-start justify-between gap-2 ${
              m.completed
                ? 'border-[#39ff14]/40 bg-[#39ff14]/5 text-[#39ff14]'
                : 'border-[#3e5c38] bg-[#0a0b0d] text-[#9dc197]'
            }`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => toggleMission(m.id)}
                  className={`h-4 w-4 shrink-0 rounded-sm border flex items-center justify-center transition ${
                    m.completed
                      ? 'border-[#39ff14] bg-[#39ff14] text-black shadow-[0_0_8px_rgba(57,255,20,0.8)]'
                      : 'border-[#3e5c38] hover:border-[#39ff14]'
                  }`}
                  aria-label="Toggle mission"
                >
                  {m.completed && <Check size={12} strokeWidth={3} />}
                </button>
                <span
                  className={`text-xs font-bold truncate ${
                    m.completed ? 'line-through opacity-75' : ''
                  }`}
                >
                  {m.title}
                </span>
              </div>

              <p className="mt-1 text-[10px] leading-relaxed text-[#9dc197]/70 pl-6">
                {m.description}
              </p>

              {/* Progress bar per mission */}
              <div className="mt-2 pl-6 flex items-center gap-2">
                <div className="h-1.5 flex-1 border border-[#3e5c38] bg-black">
                  <div
                    className="h-full bg-[#39ff14] transition-all"
                    style={{ width: `${m.completed ? 100 : (m.progress / m.maxProgress) * 100}%` }}
                  />
                </div>
                <span className="text-[9px] uppercase tracking-widest text-[#39ff14] font-bold shrink-0">
                  +{m.xpReward} XP
                </span>
              </div>
            </div>

            {m.linkedAction && onNavigateTab && !m.completed && (
              <button
                type="button"
                onClick={() => onNavigateTab(m.linkedAction as any)}
                className="shrink-0 p-1 border border-[#3e5c38] text-[#9dc197] hover:border-[#39ff14] hover:text-[#39ff14] transition"
                title="Ir para módulo"
              >
                <ExternalLink size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </Panel>
  );
}

// ─── 3. SYSTEM OVERRIDE (Fadiga) ──────────────────────────────────────────────

function SystemOverride() {
  const { fatigue, toggleFatigue } = useNeural();

  return (
    <Panel title="SYSTEM_OVERRIDE // FADIGA">
      <button
        type="button"
        onClick={toggleFatigue}
        className={[
          'group flex w-full items-center justify-between border px-3 py-2.5 text-[11px] uppercase tracking-[0.2em] transition focus:outline-none',
          fatigue
            ? 'border-red-500 bg-red-950/30 text-red-400 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
            : 'border-[#3e5c38] text-[#9dc197] hover:border-[#39ff14] hover:text-[#39ff14]',
        ].join(' ')}
      >
        <span className="flex items-center gap-2 font-bold">
          <Power size={14} className={fatigue ? 'text-red-400' : 'text-[#39ff14]'} />
          CHEGUEI DO TRABALHO
        </span>
        <span className={fatigue ? 'text-red-400 font-bold' : 'text-[#9dc197]/60'}>
          {fatigue ? 'FADIGA ACTIVA [ON]' : '[OFF]'}
        </span>
      </button>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-widest">
        <div className="border border-[#3e5c38] p-2 bg-[#0a0b0d]">
          <div className="text-[#9dc197]/60">UPTIME MATRIZ</div>
          <div className="mt-0.5 text-xs text-[#39ff14] font-bold">04:35:12</div>
        </div>
        <div className="border border-[#3e5c38] p-2 bg-[#0a0b0d]">
          <div className="text-[#9dc197]/60">ÍNDICE DE FOCO</div>
          <div className={`mt-0.5 text-xs font-bold ${fatigue ? 'text-red-400' : 'text-[#39ff14]'}`}>
            {fatigue ? '38% // BAIXO' : '85% // ALTO'}
          </div>
        </div>
      </div>
    </Panel>
  );
}

// ─── 4. MINI CRONOGRAMA & PRESENÇA ────────────────────────────────────────────

function MiniCronograma() {
  const { tasks, studiedDates, toggleStudyAttendance } = useNeural();
  const now = new Date();
  const [cursor, setCursor] = useState<{ y: number; m: number }>({
    y: now.getFullYear(),
    m: now.getMonth(),
  });

  const deadlinesByDay = useMemo(() => {
    const map = new Map<string, CollegeTask[]>();
    for (const t of tasks) {
      if (!t.deadline) continue;
      const list = map.get(t.deadline) ?? [];
      list.push(t);
      map.set(t.deadline, list);
    }
    return map;
  }, [tasks]);

  const firstDay = new Date(cursor.y, cursor.m, 1);
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const startWeekday = firstDay.getDay(); // 0 = Sun
  const cells: (number | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthLabel = firstDay.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  const todayISO = new Date().toISOString().slice(0, 10);

  const shift = (delta: number) => {
    setCursor((c) => {
      const nd = new Date(c.y, c.m + delta, 1);
      return { y: nd.getFullYear(), m: nd.getMonth() };
    });
  };

  const [hoverDay, setHoverDay] = useState<string | null>(null);
  const hoverTasks = hoverDay ? deadlinesByDay.get(hoverDay) ?? [] : [];

  return (
    <Panel title="MINI_CRONOGRAMA // PRESENÇA & ENTREGAS">
      {/* Month Navigation */}
      <div className="mb-2.5 flex items-center justify-between text-[10px] uppercase tracking-widest">
        <button
          type="button"
          onClick={() => shift(-1)}
          className="border border-[#3e5c38] p-1 text-[#9dc197] hover:border-[#39ff14] hover:text-[#39ff14] transition"
        >
          <ChevronLeft size={12} />
        </button>
        <span className="text-[#39ff14] font-bold">{monthLabel}</span>
        <button
          type="button"
          onClick={() => shift(1)}
          className="border border-[#3e5c38] p-1 text-[#9dc197] hover:border-[#39ff14] hover:text-[#39ff14] transition"
        >
          <ChevronRight size={12} />
        </button>
      </div>

      {/* Weekday Headers */}
      <div className="grid grid-cols-7 gap-1 text-[8px] uppercase tracking-widest text-[#9dc197]/50 text-center font-bold">
        {WEEK_DAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="mt-1.5 grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={i} className="aspect-square" />;
          const iso = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const hasDeadline = deadlinesByDay.has(iso);
          const didStudy = studiedDates.has(iso);
          const isToday = iso === todayISO;
          const isPast = iso < todayISO;

          return (
            <button
              key={i}
              type="button"
              onClick={() => toggleStudyAttendance(iso)}
              onMouseEnter={() => setHoverDay(iso)}
              onMouseLeave={() => setHoverDay((h) => (h === iso ? null : h))}
              className={`relative flex aspect-square flex-col items-center justify-center border text-[10px] transition ${
                hasDeadline
                  ? 'border-[#39ff14] bg-[#39ff14]/20 text-[#39ff14] font-bold shadow-[0_0_8px_rgba(57,255,20,0.6)] ring-1 ring-[#39ff14]'
                  : didStudy
                  ? 'border-[#39ff14]/60 bg-[#39ff14]/10 text-[#39ff14]'
                  : isToday
                  ? 'border-[#9dc197] bg-white/5 text-white font-bold'
                  : isPast
                  ? 'border-[#3e5c38]/40 text-[#9dc197]/30'
                  : 'border-[#3e5c38] text-[#9dc197]/60 hover:border-[#39ff14]'
              }`}
              title={
                hasDeadline
                  ? `Entrega: ${deadlinesByDay.get(iso)!.map((t) => t.label).join(', ')}`
                  : didStudy
                  ? 'Estudo Realizado (Clique para desmarcar)'
                  : 'Clique para marcar presença de estudo'
              }
            >
              <span>{d}</span>
              {/* Presence dot */}
              {didStudy && (
                <span className="absolute bottom-0.5 h-1 w-1 rounded-full bg-[#39ff14] shadow-[0_0_4px_#39ff14]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend & Hover Info */}
      <div className="mt-3 min-h-[36px] border-t border-[#3e5c38]/40 pt-2 text-[9px] uppercase tracking-widest">
        {hoverTasks.length > 0 ? (
          <div className="space-y-0.5">
            <div className="text-[#39ff14] font-bold">ENTREGA PREVISTA:</div>
            {hoverTasks.map((t) => (
              <div key={t.id} className="text-[#7cf0ff] truncate">
                ▸ {t.label}
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-between text-[#9dc197]/50">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#39ff14]" /> Estudei
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-[#3e5c38]" /> Faltei
            </span>
            <span className="text-[#39ff14]">Borda = Entrega</span>
          </div>
        )}
      </div>
    </Panel>
  );
}

// ─── 5. TARGET ATUAL (Terminal de Alvo) ────────────────────────────────────────

function TargetTerminal({ onNavigateTab }: { onNavigateTab?: LobbyProps['onNavigateTab'] }) {
  const { target, updateTarget } = useNeural();
  const [editing, setEditing] = useState(false);
  const [titleDraft, setTitleDraft] = useState(target.title);
  const [descDraft, setDescDraft] = useState(target.description);
  const [categoryDraft, setCategoryDraft] = useState(target.category);

  const save = (e: FormEvent) => {
    e.preventDefault();
    updateTarget({
      title: titleDraft,
      description: descDraft,
      category: categoryDraft,
    });
    setEditing(false);
    toast({
      title: 'ALVO ATUALIZADO',
      description: 'Novo foco estratégico calibrado na matriz.',
      variant: 'neon',
    });
  };

  return (
    <Panel accent className="bg-gradient-to-br from-[#0d0e12] to-[#0a150b]">
      {!editing ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#39ff14]/30 pb-2">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-[#39ff14] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#39ff14]">
                TARGET_ATUAL // FOCO PRIORITÁRIO
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="border border-[#39ff14]/60 bg-[#39ff14]/10 px-2 py-0.5 text-[9px] font-bold text-[#39ff14]">
                {target.priority}
              </span>
              <button
                type="button"
                onClick={() => {
                  setTitleDraft(target.title);
                  setDescDraft(target.description);
                  setCategoryDraft(target.category);
                  setEditing(true);
                }}
                className="border border-[#3e5c38] px-2 py-0.5 text-[9px] uppercase tracking-widest text-[#9dc197] hover:border-[#39ff14] hover:text-[#39ff14] transition"
              >
                <Pencil size={10} className="inline mr-1" /> CALIBRAR
              </button>
            </div>
          </div>

          <div>
            <h2 className="text-lg font-bold tracking-wide text-[#39ff14] drop-shadow-[0_0_8px_rgba(57,255,20,0.5)]">
              {target.title}
              <span className="ml-1 inline-block h-3.5 w-2 animate-pulse bg-[#39ff14] align-middle" />
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-[#9dc197]">
              {target.description}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 border-t border-[#3e5c38]/40 pt-2 text-[10px] uppercase tracking-widest">
            <div className="border border-[#3e5c38] bg-black/40 p-2">
              <span className="text-[#9dc197]/50 block">CATEGORIA:</span>
              <span className="text-[#7cf0ff] font-bold">{target.category}</span>
            </div>
            <div className="border border-[#3e5c38] bg-black/40 p-2">
              <span className="text-[#9dc197]/50 block">PRAZO ESTIMADO:</span>
              <span className="text-[#ffb347] font-bold">{target.deadlineDate || 'Em aberto'}</span>
            </div>
            <div className="border border-[#3e5c38] bg-black/40 p-2">
              <span className="text-[#9dc197]/50 block">PROGRESSO:</span>
              <span className="text-[#39ff14] font-bold">{target.progress}% CONCLUÍDO</span>
            </div>
          </div>

          {onNavigateTab && (
            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => onNavigateTab('professor')}
                className="flex-1 border border-[#39ff14] bg-[#39ff14] py-2 text-xs font-bold uppercase tracking-widest text-black shadow-[0_0_12px_rgba(57,255,20,0.6)] hover:bg-[#39ff14]/80 transition flex items-center justify-center gap-1.5"
              >
                <Zap size={13} /> INICIAR SESSÃO NO PROF. A.ILSON
              </button>
              <button
                type="button"
                onClick={() => onNavigateTab('sandbox')}
                className="flex-1 border border-[#39ff14]/80 bg-[#39ff14]/10 py-2 text-xs font-bold uppercase tracking-widest text-[#39ff14] hover:bg-[#39ff14] hover:text-black transition flex items-center justify-center gap-1.5"
              >
                <BookOpen size={13} /> CODAR NO SANDBOX C#
              </button>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={save} className="space-y-3">
          <div className="text-xs font-bold uppercase tracking-widest text-[#39ff14]">
            CALIBRAR TARGET ATUAL
          </div>
          <div>
            <label className="block text-[9px] uppercase tracking-widest text-[#9dc197]/70 font-bold">
              TÍTULO DO ALVO
            </label>
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              className="mt-1 w-full border border-[#3e5c38] bg-[#0a0b0d] px-3 py-1.5 text-xs text-[#39ff14] outline-none focus:border-[#39ff14]"
              required
            />
          </div>
          <div>
            <label className="block text-[9px] uppercase tracking-widest text-[#9dc197]/70 font-bold">
              DESCRIÇÃO / OBJETIVO DETALHADO
            </label>
            <textarea
              value={descDraft}
              onChange={(e) => setDescDraft(e.target.value)}
              rows={2}
              className="mt-1 w-full resize-none border border-[#3e5c38] bg-[#0a0b0d] px-3 py-1.5 text-xs text-[#9dc197] outline-none focus:border-[#39ff14]"
            />
          </div>
          <div>
            <label className="block text-[9px] uppercase tracking-widest text-[#9dc197]/70 font-bold">
              MATÉRIA / CATEGORIA
            </label>
            <input
              type="text"
              value={categoryDraft}
              onChange={(e) => setCategoryDraft(e.target.value)}
              className="mt-1 w-full border border-[#3e5c38] bg-[#0a0b0d] px-3 py-1.5 text-xs text-[#9dc197] outline-none focus:border-[#39ff14]"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 border border-[#39ff14] bg-[#39ff14] py-1.5 text-xs font-bold uppercase tracking-widest text-black"
            >
              SALVAR ALVO
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex-1 border border-[#3e5c38] py-1.5 text-xs uppercase tracking-widest text-[#9dc197]"
            >
              CANCELAR
            </button>
          </div>
        </form>
      )}
    </Panel>
  );
}

// ─── 6. RADIAL SYNC RATE HUD ──────────────────────────────────────────────────

function SyncRateHUD() {
  const { tasks, missions } = useNeural();

  const totalItems = tasks.length + missions.length;
  const completedItems =
    tasks.filter((t) => t.status === 'done').length + missions.filter((m) => m.completed).length;
  const syncRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 80;

  const size = 180;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (syncRate / 100) * circumference;

  return (
    <Panel title="SYNC_RATE // INTEGRIDADE" accent className="flex flex-col items-center">
      <div className="relative my-2">
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#3e5c38"
            strokeWidth={stroke}
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#39ff14"
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-[stroke-dashoffset] duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[9px] uppercase tracking-[0.2em] text-[#9dc197]/70">SINCRONIA</div>
          <div className="text-3xl font-bold text-[#39ff14] drop-shadow-[0_0_10px_rgba(57,255,20,0.6)]">
            {syncRate}%
          </div>
          <div className="text-[8px] uppercase tracking-widest text-[#9dc197]/50">
            {syncRate >= 80 ? 'ESTÁVEL' : syncRate >= 50 ? 'MODERADO' : 'DÉFICIT'}
          </div>
        </div>
      </div>
    </Panel>
  );
}

// ─── 7. NEURAL TREE PORTAL ────────────────────────────────────────────────────

function NeuralTreePortal({ onOpenTree }: { onOpenTree: () => void }) {
  const { skills } = useNeural();
  const masteredCount = skills.filter((s) => s.status === 'mastered').length;
  const totalCount = skills.length;

  return (
    <Panel title="NEURAL_TREE // REDE DE HABILIDADES" className="flex flex-col items-center justify-between">
      <div className="flex flex-col items-center gap-3 py-1">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-[#39ff14]/20 blur-xl" />
          <Brain
            size={56}
            className="relative text-[#39ff14] drop-shadow-[0_0_16px_rgba(57,255,20,0.8)]"
            strokeWidth={1.2}
          />
        </div>
        <div className="text-center">
          <div className="text-xs font-bold text-[#39ff14]">
            {masteredCount}/{totalCount} SINAPSES DOMINADAS
          </div>
          <p className="text-[9px] text-[#9dc197]/60">Árvore RPG de POO, SOLID e Backend</p>
        </div>
      </div>

      <button
        type="button"
        onClick={onOpenTree}
        className="mt-2 w-full border border-[#39ff14] bg-[#39ff14]/10 py-2.5 text-xs font-bold uppercase tracking-[0.25em] text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black hover:shadow-[0_0_16px_rgba(57,255,20,0.7)]"
      >
        <Zap size={13} className="inline mr-1.5" /> ABRIR ÁRVORE NEURAL
      </button>
    </Panel>
  );
}

// ─── 8. WEEKLY FOCUS CHART ───────────────────────────────────────────────────

function WeeklyFocusChart() {
  const { weeklyFocus } = useNeural();
  const maxHours = Math.max(...weeklyFocus.days.map((d) => d.hours), 4);
  const currentDayIndex = new Date().getDay(); // 0 = Sun
  // Convert Sunday=0 to match SEG-DOM order if desired, or keep direct
  const dayKeysMap: Record<number, WeeklyFocusData['days'][0]['dayKey']> = {
    0: 'DOM',
    1: 'SEG',
    2: 'TER',
    3: 'QUA',
    4: 'QUI',
    5: 'SEX',
    6: 'SAB',
  };
  const todayKey = dayKeysMap[currentDayIndex];

  return (
    <Panel title="WEEKLY_FOCUS // RENDIMENTO DA SEMANA">
      <div className="mb-3 flex items-center justify-between text-[10px] uppercase tracking-widest text-[#9dc197]/70">
        <span>TOTAL: <strong className="text-[#39ff14]">{weeklyFocus.totalHours} HORAS ESTUDADAS</strong></span>
        <span>EFICIÊNCIA MÉDIA: <strong className="text-[#7cf0ff]">{weeklyFocus.averageEfficiency}%</strong></span>
      </div>

      <div className="flex h-36 items-end gap-3 pt-2">
        {weeklyFocus.days.map((d) => {
          const isToday = d.dayKey === todayKey;
          const hPercent = Math.max(8, (d.hours / maxHours) * 100);

          return (
            <div key={d.dayKey} className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[9px] text-[#9dc197]/60">{d.hours}h</span>
              <div className="w-full flex-1 flex items-end">
                <div
                  className={`w-full transition-all rounded-t-sm ${
                    d.hours > 0
                      ? isToday
                        ? 'bg-[#39ff14] shadow-[0_0_12px_rgba(57,255,20,0.8)]'
                        : 'bg-[#3e5c38] hover:bg-[#39ff14]/70'
                      : 'bg-[#151a16] border border-[#3e5c38]/30'
                  }`}
                  style={{ height: `${hPercent}%` }}
                  title={`${d.dayKey}: ${d.hours} horas (${d.efficiency}% foco)`}
                />
              </div>
              <span
                className={`text-[9px] uppercase tracking-widest font-bold ${
                  isToday ? 'text-[#39ff14]' : 'text-[#9dc197]/60'
                }`}
              >
                {d.dayKey}
              </span>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

// ─── 9. COLLEGE TRACKER (Projetos & Trabalhos) ─────────────────────────────────

function CollegeTracker() {
  const { tasks, addTask, updateTask, deleteTask, cycleTaskStatus } = useNeural();
  const [adding, setAdding] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newDeadline, setNewDeadline] = useState(
    new Date(Date.now() + 86400000 * 7).toISOString().slice(0, 10)
  );
  const [newCategory, setNewCategory] = useState<TaskCategory>('paradigmas');
  const [newDescription, setNewDescription] = useState('');
  const [newTagInput, setNewTagInput] = useState('');
  const [customTags, setCustomTags] = useState<string[]>(['C#', 'POO']);
  const [openTaskId, setOpenTaskId] = useState<string | null>(null);

  const openTask = tasks.find((t) => t.id === openTaskId) ?? null;

  const handleAddTag = () => {
    const v = newTagInput.trim();
    if (!v || customTags.includes(v)) return;
    setCustomTags([...customTags, v]);
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setCustomTags(customTags.filter((t) => t !== tagToRemove));
  };

  const handleCreateTask = (e: FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim()) return;

    addTask({
      label: newLabel.trim(),
      status: 'pending',
      deadline: newDeadline || undefined,
      category: newCategory,
      customTags,
      description: newDescription.trim() || undefined,
      xpReward: 120,
    });

    setNewLabel('');
    setNewDescription('');
    setNewTagInput('');
    setCustomTags(['C#', 'POO']);
    setAdding(false);
  };

  return (
    <Panel title="COLLEGE_TRACKER // TRABALHOS & ENTREGAS">
      <ul className="space-y-2 text-[11px] max-h-[380px] overflow-y-auto pr-1 neural-scroll">
        {tasks.length === 0 && (
          <li className="text-[10px] uppercase tracking-widest text-[#9dc197]/40 py-3 text-center">
            // NENHUM TRABALHO REGISTRADO
          </li>
        )}
        {tasks.map((t) => (
          <li
            key={t.id}
            className="group flex flex-col border border-[#3e5c38] bg-[#0a0b0d] p-2 transition hover:border-[#39ff14]/70"
          >
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => setOpenTaskId(t.id)}
                className="flex-1 text-left min-w-0"
              >
                <div
                  className={`text-xs font-bold truncate hover:text-[#39ff14] transition ${
                    t.status === 'done' ? 'line-through text-[#9dc197]/50' : 'text-[#9dc197]'
                  }`}
                >
                  {t.label}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] uppercase tracking-widest">
                  <span
                    className="border px-1 py-[1px] font-bold"
                    style={{
                      borderColor: CATEGORY_META[t.category]?.color || '#3e5c38',
                      color: CATEGORY_META[t.category]?.color || '#9dc197',
                    }}
                  >
                    {CATEGORY_META[t.category]?.label || t.category}
                  </span>
                  {t.deadline && (
                    <span className="flex items-center gap-0.5 text-[#ffb347]">
                      <Calendar size={10} /> {t.deadline}
                    </span>
                  )}
                </div>
              </button>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => cycleTaskStatus(t.id)}
                  title="Alterar Status (Clique para avançar)"
                >
                  <StatusPill status={t.status} />
                </button>
                <button
                  type="button"
                  onClick={() => deleteTask(t.id)}
                  className="p-1 text-[#9dc197]/40 hover:text-red-500 transition"
                  title="Deletar trabalho"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* Custom tags chips */}
            {t.customTags && t.customTags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {t.customTags.map((tag) => (
                  <span
                    key={tag}
                    className="border border-[#3e5c38]/60 bg-[#3e5c38]/10 px-1.5 py-0.2 text-[8px] text-[#7cf0ff]"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>

      {adding ? (
        <form onSubmit={handleCreateTask} className="mt-3 space-y-2.5 border border-[#39ff14]/40 bg-[#0a0b0d] p-3 text-[11px]">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#39ff14]">
            + NOVO TRABALHO // PROJETO
          </div>

          <input
            type="text"
            autoFocus
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Nome do trabalho / assignment..."
            className="w-full border border-[#3e5c38] bg-[#0d0e12] px-2 py-1.5 text-xs text-[#39ff14] outline-none focus:border-[#39ff14]"
            required
          />

          {/* Category selection */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
            {(Object.keys(CATEGORY_META) as TaskCategory[]).map((k) => {
              const meta = CATEGORY_META[k];
              const active = newCategory === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setNewCategory(k)}
                  className="border py-1 text-[8px] uppercase tracking-widest transition"
                  style={{
                    borderColor: active ? meta.color : '#3e5c38',
                    color: active ? meta.color : '#9dc197',
                    backgroundColor: active ? `${meta.color}15` : 'transparent',
                  }}
                >
                  {meta.label}
                </button>
              );
            })}
          </div>

          {/* Tags manager */}
          <div>
            <label className="block text-[8px] uppercase tracking-widest text-[#9dc197]/70 font-bold mb-1">
              TAGS PERSONALIZADAS (DIGITE O NOME DA TAG):
            </label>
            <div className="flex gap-1">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                placeholder="Ex: Prova A1, C#, Linq..."
                className="flex-1 border border-[#3e5c38] bg-[#0d0e12] px-2 py-1 text-[10px] text-[#9dc197] outline-none focus:border-[#39ff14]"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="border border-[#39ff14] bg-[#39ff14]/10 px-2 py-1 text-[9px] uppercase tracking-widest text-[#39ff14] font-bold"
              >
                + ADD TAG
              </button>
            </div>
            {customTags.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {customTags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1 border border-[#39ff14]/40 bg-[#39ff14]/10 px-1.5 py-0.5 text-[8px] text-[#39ff14]"
                  >
                    #{tag}
                    <button
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                      className="hover:text-red-500"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-[8px] uppercase tracking-widest text-[#9dc197]/70 font-bold">
              DATA DE CONCLUSÃO / ENTREGA
            </label>
            <input
              type="date"
              value={newDeadline}
              onChange={(e) => setNewDeadline(e.target.value)}
              className="mt-1 w-full border border-[#3e5c38] bg-[#0d0e12] px-2 py-1 text-[10px] text-[#ffb347] outline-none focus:border-[#39ff14]"
            />
          </div>

          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Especificações, links, requisitos do professor..."
            rows={2}
            className="w-full resize-none border border-[#3e5c38] bg-[#0d0e12] px-2 py-1 text-[10px] text-[#9dc197] outline-none focus:border-[#39ff14]"
          />

          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 border border-[#39ff14] bg-[#39ff14] py-1.5 text-[10px] font-bold uppercase tracking-widest text-black"
            >
              REGISTRAR (+120 XP)
            </button>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="flex-1 border border-[#3e5c38] py-1.5 text-[10px] uppercase tracking-widest text-[#9dc197]"
            >
              CANCELAR
            </button>
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 border border-[#39ff14] bg-[#39ff14]/10 py-2 text-[10px] font-bold uppercase tracking-widest text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black shadow-[0_0_10px_rgba(57,255,20,0.3)]"
        >
          <Plus size={12} /> NOVO TRABALHO / ASSIGNMENT
        </button>
      )}

      {/* Task Detail Modal */}
      {openTask && (
        <TaskDetailModal
          task={openTask}
          onClose={() => setOpenTaskId(null)}
          onUpdate={(patch) => updateTask(openTask.id, patch)}
        />
      )}
    </Panel>
  );
}

function StatusPill({ status }: { status: CollegeTask['status'] }) {
  const map = {
    pending: 'border-[#ffb347] bg-[#ffb347]/10 text-[#ffb347]',
    in_progress: 'border-[#7cf0ff] bg-[#7cf0ff]/10 text-[#7cf0ff] font-bold animate-pulse',
    done: 'border-[#39ff14] bg-[#39ff14]/20 text-[#39ff14] font-bold',
  } as const;

  const label = { pending: 'PENDENTE', in_progress: 'EM CURSO', done: 'ENTREGUE ✓' }[status];

  return (
    <span className={`border px-1.5 py-0.5 text-[8px] uppercase tracking-widest ${map[status]}`}>
      {label}
    </span>
  );
}

function TaskDetailModal({
  task,
  onClose,
  onUpdate,
}: {
  task: CollegeTask;
  onClose: () => void;
  onUpdate: (patch: Partial<CollegeTask>) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [desc, setDesc] = useState(task.description ?? '');
  const [deadline, setDeadline] = useState(task.deadline ?? '');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(task.customTags || []);

  const save = () => {
    onUpdate({
      description: desc.trim() || undefined,
      deadline: deadline || undefined,
      customTags: tags,
    });
    setEditing(false);
  };

  const handleAddTag = () => {
    if (!tagInput.trim() || tags.includes(tagInput.trim())) return;
    setTags([...tags, tagInput.trim()]);
    setTagInput('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm font-mono"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg border-2 border-[#39ff14] bg-[#0d0e12] p-6 shadow-[0_0_30px_rgba(57,255,20,0.4)] text-[#9dc197]"
      >
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-[#3e5c38] pb-3">
          <div>
            <div className="text-[9px] uppercase tracking-[0.3em] text-[#39ff14] font-bold">
              ESPECIFICAÇÕES DO TRABALHO
            </div>
            <h2 className="mt-1 text-base font-bold text-[#39ff14]">{task.label}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="border border-[#3e5c38] p-1 hover:border-red-500 hover:text-red-500 transition"
          >
            <X size={14} />
          </button>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2 text-[10px] uppercase tracking-widest">
          <div className="border border-[#3e5c38] p-2 bg-[#0a0b0d]">
            <span className="text-[#9dc197]/50 block">DATA LIMITE:</span>
            <span className="text-[#ffb347] font-bold">{task.deadline || 'SEM DATA'}</span>
          </div>
          <div className="border border-[#3e5c38] p-2 bg-[#0a0b0d]">
            <span className="text-[#9dc197]/50 block">STATUS:</span>
            <StatusPill status={task.status} />
          </div>
        </div>

        {editing ? (
          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[9px] uppercase tracking-widest text-[#9dc197]/70 font-bold mb-1">
                DATA DE CONCLUSÃO
              </label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full border border-[#3e5c38] bg-[#0a0b0d] px-2 py-1 text-[#ffb347] outline-none"
              />
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-widest text-[#9dc197]/70 font-bold mb-1">
                TAGS (DIGITE E ADICIONE)
              </label>
              <div className="flex gap-1 mb-1.5">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="Nova tag..."
                  className="flex-1 border border-[#3e5c38] bg-[#0a0b0d] px-2 py-1 text-[#9dc197] outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddTag}
                  className="border border-[#39ff14] px-2 py-1 text-[9px] text-[#39ff14]"
                >
                  ADD
                </button>
              </div>
              <div className="flex flex-wrap gap-1">
                {tags.map((t) => (
                  <span key={t} className="border border-[#39ff14]/50 px-1.5 py-0.5 text-[9px] text-[#39ff14] flex items-center gap-1">
                    #{t}
                    <button type="button" onClick={() => setTags(tags.filter((item) => item !== t))}>×</button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[9px] uppercase tracking-widest text-[#9dc197]/70 font-bold mb-1">
                DESCRIÇÃO E REQUISITOS
              </label>
              <textarea
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                rows={4}
                className="w-full resize-none border border-[#3e5c38] bg-[#0a0b0d] p-2 text-xs text-[#9dc197] outline-none"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={save}
                className="flex-1 border border-[#39ff14] bg-[#39ff14] py-1.5 text-xs font-bold uppercase text-black"
              >
                SALVAR
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="flex-1 border border-[#3e5c38] py-1.5 text-xs uppercase text-[#9dc197]"
              >
                CANCELAR
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <div className="text-[9px] uppercase tracking-widest text-[#9dc197]/60 mb-1 font-bold">
                DESCRIÇÃO // ANOTAÇÕES
              </div>
              <div className="min-h-[90px] border border-[#3e5c38] bg-[#0a0b0d] p-3 text-xs leading-relaxed">
                {task.description || '// Nenhuma anotação informada.'}
              </div>
            </div>

            {task.customTags && task.customTags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.customTags.map((tag) => (
                  <span key={tag} className="border border-[#7cf0ff]/40 bg-[#7cf0ff]/10 px-2 py-0.5 text-[9px] text-[#7cf0ff]">
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => setEditing(true)}
              className="w-full border border-[#3e5c38] py-2 text-xs uppercase tracking-widest text-[#9dc197] hover:border-[#39ff14] hover:text-[#39ff14] transition"
            >
              <Pencil size={12} className="inline mr-1" /> EDITAR DETALHES
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── 10. TROPHY WALL (Mural de Troféus RPG) ───────────────────────────────────

function TrophyWall() {
  const { trophies } = useNeural();
  const [selectedTrophy, setSelectedTrophy] = useState<typeof trophies[0] | null>(null);

  return (
    <Panel title="TROPHY_WALL // CONQUISTAS RPG">
      <div className="grid grid-cols-4 gap-2">
        {trophies.map((b) => (
          <button
            key={b.id}
            type="button"
            onClick={() => setSelectedTrophy(b)}
            className={`group relative flex aspect-square flex-col items-center justify-center border p-1 text-center transition ${
              b.unlocked
                ? 'border-[#39ff14] bg-[#39ff14]/10 text-[#39ff14] shadow-[0_0_10px_rgba(57,255,20,0.4)] hover:scale-105'
                : 'border-[#3e5c38]/60 bg-[#0a0b0d] text-[#9dc197]/30 hover:border-[#3e5c38]'
            }`}
            title={b.name}
          >
            {b.unlocked ? (
              <Trophy size={20} className="text-[#39ff14]" />
            ) : (
              <Lock size={18} className="text-[#9dc197]/30" />
            )}
            <div className="mt-1 text-[7px] uppercase tracking-wider leading-tight truncate w-full px-0.5">
              {b.unlocked ? b.name : 'BLOQUEADO'}
            </div>
          </button>
        ))}
      </div>

      {selectedTrophy && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
          onClick={() => setSelectedTrophy(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm border-2 border-[#39ff14] bg-[#0d0e12] p-5 text-center text-[#9dc197] shadow-[0_0_30px_rgba(57,255,20,0.4)]"
          >
            <Trophy size={40} className={`mx-auto ${selectedTrophy.unlocked ? 'text-[#39ff14]' : 'text-[#9dc197]/40'}`} />
            <h3 className="mt-2 text-sm font-bold tracking-widest text-[#39ff14]">
              {selectedTrophy.name}
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-[#9dc197]">
              {selectedTrophy.description}
            </p>
            <div className="mt-3 border-t border-[#3e5c38] pt-2 text-[10px] uppercase tracking-widest text-[#39ff14]">
              RECOMPENSA: +{selectedTrophy.xpReward} XP
            </div>
            {selectedTrophy.hint && (
              <p className="mt-1 text-[9px] text-[#9dc197]/50 italic">
                Dica: {selectedTrophy.hint}
              </p>
            )}
            <button
              type="button"
              onClick={() => setSelectedTrophy(null)}
              className="mt-4 w-full border border-[#3e5c38] py-1.5 text-xs uppercase tracking-widest text-[#9dc197] hover:border-[#39ff14] hover:text-[#39ff14]"
            >
              FECHAR
            </button>
          </div>
        </div>
      )}
    </Panel>
  );
}

// ─── 11. ANOTAÇÕES RÁPIDAS (Quick Notes Buffer) ───────────────────────────────

function QuickNotesBuffer() {
  const { notes, addNote, removeNote, clearNotes } = useNeural();
  const [input, setInput] = useState('');

  const submit = () => {
    if (!input.trim()) return;
    addNote(input);
    setInput('');
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'COPIADO',
      description: 'Anotação copiada para a área de transferência.',
      variant: 'default',
    });
  };

  return (
    <Panel title="ANOTAÇÃO_RÁPIDA // BUFFER SINÁPTICO">
      <div className="flex items-center gap-2 border border-[#3e5c38] bg-[#0a0b0d] px-2 py-1.5 focus-within:border-[#39ff14] focus-within:shadow-[0_0_8px_rgba(57,255,20,0.3)]">
        <span className="text-[#39ff14] font-bold">&gt;_</span>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="Anotar pensamento rápido..."
          className="flex-1 bg-transparent text-[11px] text-[#9dc197] placeholder:text-[#9dc197]/40 outline-none"
        />
        <button
          type="button"
          onClick={submit}
          className="text-[#39ff14] text-[10px] font-bold hover:underline"
        >
          SALVAR
        </button>
      </div>

      <ul className="mt-3 space-y-1.5 max-h-[160px] overflow-y-auto pr-1 neural-scroll text-[11px]">
        {notes.length === 0 ? (
          <li className="text-[10px] uppercase tracking-widest text-[#9dc197]/40 py-2 text-center">
            // BUFFER VAZIO
          </li>
        ) : (
          notes.map((n, i) => (
            <li
              key={`${n}-${i}`}
              className="group flex items-start justify-between gap-2 border border-[#3e5c38]/40 bg-[#0a0b0d] px-2 py-1.5 transition hover:border-[#39ff14]/60"
            >
              <span className="min-w-0 flex-1 break-words pr-1">
                <span className="mr-1 text-[#39ff14]">·</span>
                {n}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => copyToClipboard(n)}
                  className="text-[#9dc197]/40 hover:text-[#39ff14] transition p-0.5"
                  title="Copiar anotação"
                >
                  <Copy size={10} />
                </button>
                <button
                  type="button"
                  onClick={() => removeNote(i)}
                  className="text-[#9dc197]/40 hover:text-red-500 transition p-0.5"
                  title="Deletar anotação"
                >
                  <Trash2 size={10} />
                </button>
              </div>
            </li>
          ))
        )}
      </ul>

      {notes.length > 0 && (
        <div className="mt-2 flex items-center justify-between border-t border-[#3e5c38]/40 pt-1.5 text-[9px] uppercase tracking-widest text-[#9dc197]/50">
          <span>{notes.length} anotação(ões)</span>
          <button
            type="button"
            onClick={clearNotes}
            className="hover:text-red-500 transition"
          >
            LIMPAR TUDO
          </button>
        </div>
      )}
    </Panel>
  );
}