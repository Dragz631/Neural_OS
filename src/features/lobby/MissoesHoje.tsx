import { useState } from 'react';
import { BatteryLow, CalendarDays, Check, Zap } from 'lucide-react';
import { KIND_META, useToday } from '../../hooks/useToday';
import { useNav } from '../../store/nav';
import { useStudy } from '../../store/study';
import { toast } from '../../store/toast';
import { Button, Empty, Panel, ProgressBar } from '../../components/ui';
import { cn } from '../../lib/utils';

/** MISSÕES_DE_HOJE // o plano do dia (já ajustado pela energia) + revisões vencidas. */
export function MissoesHoje() {
  const { missions, checkin, today, weekStart, dayIdx } = useToday();
  const togglePlanItem = useStudy((s) => s.togglePlanItem);
  const setCheckin = useStudy((s) => s.setCheckin);
  const go = useNav((s) => s.go);
  const cansado = checkin?.energy === 1;
  const [perguntando, setPerguntando] = useState(false);
  const feitas = missions.filter((m) => m.done).length;
  const total = missions.reduce((s, m) => s + m.minutes, 0);

  // "Cheguei do trabalho": guarda a hora e pergunta como ele chegou. Cansado → dia em versão mini.
  const chegou = (bem: boolean) => {
    const chegadaEm = checkin?.chegadaEm ?? new Date().toTimeString().slice(0, 5);
    setPerguntando(false);
    if (bem) {
      setCheckin({ date: today, energy: 2, minutesAvailable: checkin?.minutesAvailable ?? 60, chegadaEm });
      toast({ title: `Chegou às ${chegadaEm}`, description: 'Plano normal de hoje.', variant: 'success' });
    } else {
      setCheckin({ date: today, energy: 1, minutesAvailable: Math.min(checkin?.minutesAvailable ?? 30, 30), chegadaEm });
      toast({ title: `Chegou às ${chegadaEm}: modo mini`, description: 'Só o essencial: blocos curtos, sem aula pesada.', variant: 'success' });
    }
  };

  return (
    <Panel
      title="Missões_de_hoje // estudo & xp"
      actions={
        <>
          <Button
            onClick={() => (cansado ? chegou(true) : setPerguntando((p) => !p))}
            className={cn('px-2 py-1 text-[10px]', cansado && 'border-warn bg-warn/15 text-warn')}
            title="Avise que chegou: guarda a hora e, se estiver cansado, o dia vira versão mini (5–15 min por bloco)."
          >
            <BatteryLow size={12} /> {cansado ? `Modo mini · ${checkin?.chegadaEm ?? ''}` : checkin?.chegadaEm ? `Chegou ${checkin.chegadaEm}` : 'Cheguei do trabalho'}
          </Button>
          <Button onClick={() => go('horario')} className="px-2 py-1 text-[10px]" title="Ajustar energia e tempo no Molda-Horário">
            <CalendarDays size={12} />
          </Button>
        </>
      }
    >
      {perguntando && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-accent/40 bg-accent/5 p-2 text-xs">
          <span className="text-fg">Como você chegou?</span>
          <Button className="px-2 py-1 text-[10px]" onClick={() => chegou(true)}>
            Tô bem
          </Button>
          <Button className="px-2 py-1 text-[10px]" onClick={() => chegou(false)}>
            Tô cansado
          </Button>
        </div>
      )}
      {missions.length === 0 ? (
        <Empty>
          Nada planejado pra hoje e nenhuma revisão vencida.
          <br />
          Planeje a semana no <b>Molda-Horário</b> ou siga o Próximo passo.
        </Empty>
      ) : (
        <>
          <div className="mb-3">
            <div className="mb-1 flex justify-between text-[10px] uppercase tracking-widest text-muted">
              <span>
                {feitas}/{missions.length} feitas
              </span>
              <span>{total} min no total</span>
            </div>
            <ProgressBar value={(feitas / missions.length) * 100} />
          </div>
          <ul className="space-y-2">
            {missions.map((m) => {
              const doPlano = !m.fromReview && !m.id.startsWith('mini_');
              return (
                <li key={m.id} className={cn('flex items-center gap-3 rounded border border-line bg-bg p-2.5', m.done && 'opacity-50')}>
                  <button
                    type="button"
                    disabled={!doPlano}
                    onClick={() => togglePlanItem(weekStart, dayIdx, m.id)}
                    className={cn('flex h-5 w-5 shrink-0 items-center justify-center rounded border', m.done ? 'border-accent bg-accent text-black' : 'border-line', !doPlano && 'opacity-30')}
                    aria-label="Marcar como feito"
                    title={doPlano ? 'Marcar como feito' : 'Revisões concluem quando você se avalia'}
                  >
                    {m.done && <Check size={12} />}
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className={cn('truncate text-sm', m.done && 'line-through')}>{m.title}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted">
                      {KIND_META[m.kind].label} · {m.minutes} min {m.shortened && '· versão curta'}
                    </div>
                  </div>
                  <span className="hidden items-center gap-0.5 text-[10px] text-accent sm:flex">
                    <Zap size={10} />+{Math.max(5, m.minutes * 2)}
                  </span>
                  <Button className="px-2 py-1 text-[10px]" onClick={() => go(KIND_META[m.kind].tab, m.topicId)}>
                    Ir
                  </Button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Panel>
  );
}
