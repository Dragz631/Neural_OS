import { useMemo, useState, type ReactNode } from 'react';
import { BookOpen, CalendarDays, Check, Code2, Flame, GitBranch, GraduationCap, Plus, RotateCcw } from 'lucide-react';
import { addDays, diffDays, formatShort, toLocalDate, weekStartOf } from '../../domain/dates';
import { levelFromXp } from '../../domain/xp';
import { KIND_META, useToday } from '../../hooks/useToday';
import { useNav } from '../../store/nav';
import { minutesByDate, streakDays, topicPath, useStudy } from '../../store/study';
import { SubjectModal, TopicModal, TopicSelect } from '../../components/TopicPicker';
import { Badge, Button, Empty, Input, Label, Panel, ProgressBar } from '../../components/ui';
import { cn } from '../../lib/utils';

export default function Lobby() {
  const subjects = useStudy((s) => s.subjects);

  return (
    <div className="mx-auto grid max-w-[1500px] gap-4 p-4 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-3">
        <ProfileCard />
        <Heatmap />
      </div>
      <div className="space-y-4 lg:col-span-6">
        {subjects.length === 0 ? <Onboarding /> : <TargetCard />}
        <MissionsCard />
      </div>
      <div className="space-y-4 lg:col-span-3">
        <ReviewsCard />
        <TreeCard />
      </div>
    </div>
  );
}

function ProfileCard() {
  const profile = useStudy((s) => s.profile);
  const sessions = useStudy((s) => s.sessions);
  const setName = useStudy((s) => s.setProfileName);
  const { level, into, needed } = levelFromXp(profile.xp);
  const minutes = useMemo(() => minutesByDate(sessions), [sessions]);
  const streak = streakDays(minutes);
  const week = weekStartOf(toLocalDate());
  const weekMinutes = Object.entries(minutes).reduce((sum, [d, m]) => (d >= week ? sum + m : sum), 0);

  return (
    <Panel title="Operador">
      <input
        value={profile.name}
        onChange={(e) => setName(e.target.value)}
        className="mb-3 w-full bg-transparent text-lg font-bold text-accent outline-none"
        aria-label="Seu nome"
      />
      <div className="mb-1 flex justify-between text-[11px] text-muted">
        <span>Nível {level}</span>
        <span>
          {into}/{needed} XP
        </span>
      </div>
      <ProgressBar value={(into / needed) * 100} />
      <div className="mt-4 grid grid-cols-2 gap-2 text-center">
        <Stat icon={<Flame size={14} />} value={`${streak}d`} label="Sequência" />
        <Stat icon={<CalendarDays size={14} />} value={`${Math.round(weekMinutes / 6) / 10}h`} label="Esta semana" />
      </div>
    </Panel>
  );
}

function Stat({ icon, value, label }: { icon: ReactNode; value: string; label: string }) {
  return (
    <div className="rounded border border-line bg-bg p-2">
      <div className="flex items-center justify-center gap-1 text-accent">
        {icon}
        <span className="font-bold">{value}</span>
      </div>
      <div className="text-[10px] uppercase tracking-widest text-muted">{label}</div>
    </div>
  );
}

/** Mapa de calor das últimas 12 semanas, gerado das sessões (não precisa marcar presença na mão). */
function Heatmap() {
  const sessions = useStudy((s) => s.sessions);
  const minutes = useMemo(() => minutesByDate(sessions), [sessions]);
  const today = toLocalDate();
  const start = addDays(weekStartOf(today), -7 * 11);
  const weeks = Array.from({ length: 12 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
  const shade = (m = 0) => (m === 0 ? 'bg-bg' : m < 20 ? 'bg-accent/25' : m < 45 ? 'bg-accent/50' : m < 90 ? 'bg-accent/75' : 'bg-accent');

  return (
    <Panel title="Constância (12 semanas)">
      <div className="flex justify-between gap-1">
        {weeks.map((days, i) => (
          <div key={i} className="flex flex-1 flex-col gap-1">
            {days.map((d) => (
              <div
                key={d}
                title={`${formatShort(d)}: ${minutes[d] ?? 0} min`}
                className={cn('aspect-square w-full rounded-sm border border-line/50', shade(minutes[d]), d > today && 'opacity-20')}
              />
            ))}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-muted">Cada quadrado é um dia (seg → dom). Preenche sozinho quando você registra uma sessão.</p>
    </Panel>
  );
}

function Onboarding() {
  const [subjectOpen, setSubjectOpen] = useState(false);
  return (
    <Panel title="Começar">
      <div className="space-y-3 text-sm leading-relaxed">
        <p>O Neural-OS gira em torno do que <b className="text-accent">você</b> está estudando. Nada vem pronto:</p>
        <ol className="list-decimal space-y-1 pl-5 text-muted">
          <li>Crie uma matéria (ex.: C#, Cálculo II, LFA).</li>
          <li>Crie o primeiro tópico e defina como Target.</li>
          <li>Inicie uma sessão com o Prof. A.Ilson. A árvore cresce conforme você aprende.</li>
        </ol>
        <Button variant="primary" onClick={() => setSubjectOpen(true)}>
          <Plus size={14} /> Criar primeira matéria
        </Button>
      </div>
      <SubjectModal open={subjectOpen} onClose={() => setSubjectOpen(false)} />
    </Panel>
  );
}

function TargetCard() {
  const target = useStudy((s) => s.target);
  const setTarget = useStudy((s) => s.setTarget);
  const subjects = useStudy((s) => s.subjects);
  const topic = useStudy((s) => s.topics.find((t) => t.id === s.target.topicId));
  const go = useNav((s) => s.go);
  const [topicOpen, setTopicOpen] = useState(false);
  const daysLeft = target.deadline ? diffDays(target.deadline, toLocalDate()) : undefined;

  return (
    <Panel title="Target atual — o que estou aprendendo" className="border-accent/40">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block">
          <Label>Tópico</Label>
          <TopicSelect value={target.topicId} onChange={(topicId) => setTarget({ ...target, topicId })} />
        </label>
        <div className="flex items-end">
          <Button onClick={() => setTopicOpen(true)}>
            <Plus size={14} /> Novo tópico
          </Button>
        </div>
      </div>

      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_160px]">
        <label className="block">
          <Label>Pra quê? (prova, trabalho, projeto...)</Label>
          <Input value={target.goal} onChange={(e) => setTarget({ ...target, goal: e.target.value })} placeholder="Ex.: Prova A1 de POO" />
        </label>
        <label className="block">
          <Label>Prazo</Label>
          <Input type="date" value={target.deadline ?? ''} onChange={(e) => setTarget({ ...target, deadline: e.target.value || undefined })} />
        </label>
      </div>

      {topic ? (
        <div className="mt-4 space-y-3 rounded border border-line bg-bg p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-fg">{topicPath(subjects, topic)}</span>
            <div className="flex gap-2">
              {daysLeft !== undefined && <Badge color={daysLeft <= 2 ? 'var(--color-danger)' : undefined}>{daysLeft >= 0 ? `${daysLeft} dias` : 'prazo passou'}</Badge>}
              <Badge>domínio {topic.mastery}%</Badge>
            </div>
          </div>
          <ProgressBar value={topic.mastery} />
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => go('professor', topic.id)}>
              <GraduationCap size={14} /> Iniciar sessão com Prof. A.Ilson
            </Button>
            <Button onClick={() => go('sandbox', topic.id)}>
              <Code2 size={14} /> Desafio no Sandbox
            </Button>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted">Escolha ou crie um tópico pra definir o foco.</p>
      )}

      <TopicModal open={topicOpen} onClose={() => setTopicOpen(false)} onCreated={(topicId) => setTarget({ ...target, topicId })} />
    </Panel>
  );
}

function MissionsCard() {
  const { missions, checkin, weekStart, dayIdx } = useToday();
  const togglePlanItem = useStudy((s) => s.togglePlanItem);
  const go = useNav((s) => s.go);
  const total = missions.reduce((s, m) => s + m.minutes, 0);

  return (
    <Panel
      title="Missões de hoje"
      actions={
        <Button onClick={() => go('horario')} className="px-2 py-1 text-[10px]">
          <CalendarDays size={12} /> {checkin ? 'Ajustar dia' : 'Check-in de energia'}
        </Button>
      }
    >
      {missions.length === 0 ? (
        <Empty>
          Nada planejado pra hoje e nenhuma revisão vencida.
          <br />
          Planeje a semana no <b>Molda-Horário</b> ou inicie uma sessão pelo Target.
        </Empty>
      ) : (
        <ul className="space-y-2">
          {missions.map((m) => {
            const isPlanItem = !m.fromReview && !m.id.startsWith('mini_');
            return (
              <li key={m.id} className={cn('flex items-center gap-3 rounded border border-line bg-bg p-2.5', m.done && 'opacity-50')}>
                <button
                  type="button"
                  disabled={!isPlanItem}
                  onClick={() => togglePlanItem(weekStart, dayIdx, m.id)}
                  className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded border', m.done ? 'border-accent bg-accent text-black' : 'border-line', !isPlanItem && 'opacity-30')}
                  aria-label="Marcar como feito"
                  title={isPlanItem ? 'Marcar como feito' : 'Revisões concluem quando você se avalia'}
                >
                  {m.done && <Check size={12} />}
                </button>
                <div className="min-w-0 flex-1">
                  <div className={cn('truncate text-sm', m.done && 'line-through')}>{m.title}</div>
                  <div className="text-[10px] uppercase tracking-wider text-muted">
                    {KIND_META[m.kind].label} · {m.minutes} min {m.shortened && '· versão curta'}
                  </div>
                </div>
                <Button className="px-2 py-1 text-[10px]" onClick={() => go(KIND_META[m.kind].tab, m.topicId)}>
                  Ir
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {missions.length > 0 && <p className="mt-2 text-right text-[10px] text-muted">Total: {total} min</p>}
    </Panel>
  );
}

function ReviewsCard() {
  const { due } = useToday();
  const subjects = useStudy((s) => s.subjects);
  const go = useNav((s) => s.go);
  return (
    <Panel title={`Revisões vencidas (${due.length})`}>
      {due.length === 0 ? (
        <Empty>
          <RotateCcw size={14} className="mx-auto mb-1" />
          Tudo em dia. O que você estuda volta aqui na hora certa de revisar.
        </Empty>
      ) : (
        <ul className="space-y-1.5">
          {due.slice(0, 8).map((t) => (
            <li key={t.id}>
              <button type="button" onClick={() => go('professor', t.id)} className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-panel-2">
                <span className="truncate">{topicPath(subjects, t)}</span>
                <BookOpen size={12} className="shrink-0 text-muted" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function TreeCard() {
  const topics = useStudy((s) => s.topics);
  const subjects = useStudy((s) => s.subjects);
  const go = useNav((s) => s.go);
  const mastered = topics.filter((t) => t.mastery >= 80).length;
  return (
    <Panel title="Árvore neural">
      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-[10px] uppercase text-muted">
        <div>
          <div className="text-lg font-bold text-fg">{subjects.length}</div>matérias
        </div>
        <div>
          <div className="text-lg font-bold text-fg">{topics.length}</div>tópicos
        </div>
        <div>
          <div className="text-lg font-bold text-accent">{mastered}</div>dominados
        </div>
      </div>
      <Button className="w-full" onClick={() => go('arvore')}>
        <GitBranch size={14} /> Abrir árvore
      </Button>
    </Panel>
  );
}
