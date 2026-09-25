import { useState, type FormEvent } from 'react';
import { BatteryFull, BatteryLow, BatteryMedium, ChevronLeft, ChevronRight, Plus, Wand2, X } from 'lucide-react';
import { addDays, formatShort, toLocalDate, weekStartOf, WEEKDAYS } from '../../domain/dates';
import { suggestWeek, totalMinutes } from '../../domain/planner';
import type { Energy, Id, PlanItem, SessionKind, WeekPlan } from '../../domain/types';
import { KIND_META, useToday } from '../../hooks/useToday';
import { useNav } from '../../store/nav';
import { newId, useStudy } from '../../store/study';
import { TopicSelect } from '../../components/TopicPicker';
import { Badge, Button, Empty, Input, Panel, Select } from '../../components/ui';
import { cn } from '../../lib/utils';

// Domingo: você monta a semana. Todo dia: diz sua energia e seu tempo, e o plano
// do dia se ajusta (sem nunca zerar). Trabalho sem horário fixo não quebra a rotina.

const emptyWeek = (weekStart: string): WeekPlan => ({ weekStart, days: Array.from({ length: 7 }, () => []) });

export default function Planner() {
  const today = toLocalDate();
  // No domingo, o planejamento padrão é o da semana que vem.
  const isSunday = new Date().getDay() === 0;
  const [weekStart, setWeekStart] = useState(() => (isSunday ? addDays(weekStartOf(today), 7) : weekStartOf(today)));

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4">
      <CheckinCard />
      <WeekBoard weekStart={weekStart} onShift={(w) => setWeekStart(addDays(weekStart, 7 * w))} />
    </div>
  );
}

const ENERGY: { value: Energy; label: string; icon: typeof BatteryLow; hint: string }[] = [
  { value: 1, label: 'Baixa', icon: BatteryLow, hint: 'troca aula pesada por leitura curta' },
  { value: 2, label: 'Média', icon: BatteryMedium, hint: 'segue o plano, cortando o que não couber' },
  { value: 3, label: 'Alta', icon: BatteryFull, hint: 'plano completo' },
];
const MINUTE_PRESETS = [15, 30, 60, 90, 120];

function CheckinCard() {
  const { today, checkin, missions } = useToday();
  const setCheckin = useStudy((s) => s.setCheckin);
  const go = useNav((s) => s.go);
  const energy = checkin?.energy;
  const minutes = checkin?.minutesAvailable;

  const update = (patch: { energy?: Energy; minutesAvailable?: number }) =>
    setCheckin({ date: today, energy: patch.energy ?? energy ?? 2, minutesAvailable: patch.minutesAvailable ?? minutes ?? 30 });

  return (
    <Panel title={`Hoje (${WEEKDAYS[(new Date().getDay() + 6) % 7]}, ${formatShort(today)}): como você está?`}>
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-[10px] uppercase tracking-widest text-muted">Energia</p>
            <div className="flex flex-wrap gap-2">
              {ENERGY.map((e) => (
                <Button key={e.value} variant={energy === e.value ? 'primary' : 'ghost'} onClick={() => update({ energy: e.value })} title={e.hint}>
                  <e.icon size={14} /> {e.label}
                </Button>
              ))}
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-[10px] uppercase tracking-widest text-muted">Tempo livre hoje</p>
            <div className="flex flex-wrap items-center gap-2">
              {MINUTE_PRESETS.map((m) => (
                <Button key={m} variant={minutes === m ? 'primary' : 'ghost'} onClick={() => update({ minutesAvailable: m })}>
                  {m < 60 ? `${m} min` : `${m / 60}h`}
                </Button>
              ))}
              <Input
                type="number"
                min={5}
                step={5}
                className="w-24"
                placeholder="outro"
                value={minutes && !MINUTE_PRESETS.includes(minutes) ? minutes : ''}
                onChange={(e) => e.target.value && update({ minutesAvailable: Number(e.target.value) })}
              />
            </div>
          </div>
          {checkin && <p className="text-xs text-muted">{ENERGY.find((e) => e.value === checkin.energy)?.hint}.</p>}
        </div>

        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-widest text-muted">{checkin ? 'Seu dia ajustado' : 'Faça o check-in pra ajustar o dia'}</p>
          {missions.length === 0 ? (
            <Empty>Nada pra hoje. Monte a semana abaixo.</Empty>
          ) : (
            <ul className="space-y-1.5">
              {missions.map((m) => (
                <li key={m.id} className={cn('flex items-center gap-2 rounded border border-line bg-bg px-2.5 py-1.5 text-sm', m.done && 'opacity-50 line-through')}>
                  <span className="flex-1 truncate">{m.title}</span>
                  <Badge>{KIND_META[m.kind].label}</Badge>
                  <span className="w-14 text-right text-xs text-muted">{m.minutes} min</span>
                  <Button className="px-2 py-0.5 text-[10px]" onClick={() => go(KIND_META[m.kind].tab, m.topicId)}>
                    Ir
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Panel>
  );
}

function WeekBoard({ weekStart, onShift }: { weekStart: string; onShift: (weeks: number) => void }) {
  const plan = useStudy((s) => s.plans[weekStart]) ?? emptyWeek(weekStart);
  const setWeekPlan = useStudy((s) => s.setWeekPlan);
  const topics = useStudy((s) => s.topics);
  const targetTopic = useStudy((s) => s.topics.find((t) => t.id === s.target.topicId));
  const today = toLocalDate();
  const dates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const thisWeek = weekStartOf(today);
  const label = weekStart === thisWeek ? 'Esta semana' : weekStart === addDays(thisWeek, 7) ? 'Próxima semana' : `Semana de ${formatShort(weekStart)}`;

  const setDay = (dayIdx: number, items: PlanItem[]) => setWeekPlan({ ...plan, days: plan.days.map((d, i) => (i === dayIdx ? items : d)) });

  const suggest = () => {
    const hasItems = plan.days.some((d) => d.length > 0);
    if (hasItems && !confirm('Substituir o plano desta semana pela sugestão?')) return;
    setWeekPlan({ weekStart, days: suggestWeek(dates, topics, targetTopic, today, () => newId('pl')) });
  };

  return (
    <Panel
      title={`${label} — ${totalMinutes(plan.days.flat())} min planejados`}
      actions={
        <>
          <Button className="px-2 py-1" onClick={() => onShift(-1)} aria-label="Semana anterior">
            <ChevronLeft size={14} />
          </Button>
          <Button className="px-2 py-1" onClick={() => onShift(1)} aria-label="Próxima semana">
            <ChevronRight size={14} />
          </Button>
          <Button className="px-2 py-1 text-[10px]" onClick={suggest} title="Monta um rascunho com o Target e as revisões que vencem na semana">
            <Wand2 size={12} /> Sugerir semana
          </Button>
        </>
      }
    >
      <div className="grid gap-3 md:grid-cols-7">
        {dates.map((date, i) => (
          <DayColumn key={date} date={date} dayIdx={i} isToday={date === today} items={plan.days[i]} onChange={(items) => setDay(i, items)} />
        ))}
      </div>
    </Panel>
  );
}

function DayColumn({ date, dayIdx, isToday, items, onChange }: { date: string; dayIdx: number; isToday: boolean; items: PlanItem[]; onChange: (items: PlanItem[]) => void }) {
  const topics = useStudy((s) => s.topics);
  const [adding, setAdding] = useState(false);
  const [topicId, setTopicId] = useState<Id | undefined>();
  const [kind, setKind] = useState<SessionKind>('aula');
  const [minutes, setMinutes] = useState(30);

  const add = (e: FormEvent) => {
    e.preventDefault();
    const topic = topics.find((t) => t.id === topicId);
    if (!topic) return;
    onChange([...items, { id: newId('pl'), topicId: topic.id, title: topic.title, kind, minutes, done: false }]);
    setAdding(false);
  };

  return (
    <div className={cn('flex min-h-[180px] flex-col rounded border bg-bg p-2', isToday ? 'border-accent/60' : 'border-line')}>
      <div className="mb-2 flex items-baseline justify-between">
        <span className={cn('text-xs font-bold uppercase', isToday ? 'text-accent' : 'text-fg')}>{WEEKDAYS[dayIdx]}</span>
        <span className="text-[10px] text-muted">{formatShort(date)}</span>
      </div>
      <ul className="flex-1 space-y-1.5">
        {items.map((it) => (
          <li key={it.id} className={cn('group rounded border border-line bg-panel p-1.5 text-[11px]', it.done && 'opacity-50')}>
            <div className="flex items-start gap-1">
              <button
                type="button"
                onClick={() => onChange(items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))}
                className={cn('flex-1 text-left leading-snug', it.done && 'line-through')}
              >
                {it.title}
              </button>
              <button type="button" onClick={() => onChange(items.filter((x) => x.id !== it.id))} className="text-muted opacity-0 hover:text-danger group-hover:opacity-100" aria-label="Remover">
                <X size={12} />
              </button>
            </div>
            <div className="mt-0.5 text-[10px] text-muted">
              {KIND_META[it.kind].label} · {it.minutes}min
            </div>
          </li>
        ))}
      </ul>
      {adding ? (
        <form onSubmit={add} className="mt-2 space-y-1.5">
          <TopicSelect value={topicId} onChange={setTopicId} allowEmpty="— tópico —" />
          <Select value={kind} onChange={(e) => setKind(e.target.value as SessionKind)}>
            {(Object.keys(KIND_META) as SessionKind[]).map((k) => (
              <option key={k} value={k}>
                {KIND_META[k].label}
              </option>
            ))}
          </Select>
          <Input type="number" min={5} step={5} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
          <div className="flex gap-1">
            <Button type="submit" variant="primary" className="flex-1 px-1 py-1 text-[10px]" disabled={!topicId}>
              Ok
            </Button>
            <Button className="px-1 py-1 text-[10px]" onClick={() => setAdding(false)}>
              <X size={12} />
            </Button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="mt-2 flex items-center justify-center gap-1 rounded border border-dashed border-line py-1 text-[10px] text-muted hover:border-accent hover:text-accent">
          <Plus size={12} /> adicionar
        </button>
      )}
      {items.length > 0 && <div className="mt-1 text-right text-[10px] text-muted">{totalMinutes(items)} min</div>}
    </div>
  );
}
