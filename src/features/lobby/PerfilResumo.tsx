import { useMemo, useState } from 'react';
import { useDiasEstudados } from '../../hooks/useDiasEstudados';
import { CalendarDays, Flame, Pencil } from 'lucide-react';
import { toLocalDate, weekStartOf } from '../../domain/dates';
import { levelFromXp } from '../../domain/xp';
import { minutesByDate, streakDays, useStudy } from '../../store/study';
import { Button, Panel, ProgressBar } from '../../components/ui';
import { PerfilModal } from './PerfilModal';

/** Resumo do operador: nível, sequência e horas da semana. */
export function PerfilResumo() {
  const profile = useStudy((s) => s.profile);
  const sessions = useStudy((s) => s.sessions);
  const [editando, setEditando] = useState(false);
  const { level, into, needed } = levelFromXp(profile.xp);
  const minutos = useMemo(() => minutesByDate(sessions), [sessions]);
  const diasEstudados = useDiasEstudados();
  const semana = weekStartOf(toLocalDate());
  const horasSemana = Object.entries(minutos).reduce((s, [d, m]) => (d >= semana ? s + m : s), 0) / 60;

  return (
    <Panel
      title="Operador // perfil"
      actions={
        <Button className="px-2 py-1 text-[10px]" onClick={() => setEditando(true)} aria-label="Editar perfil">
          <Pencil size={11} />
        </Button>
      }
    >
      <p className="truncate text-base font-bold text-accent">{profile.name}</p>
      {profile.title && <p className="truncate text-[11px] text-muted">{profile.title}</p>}
      <div className="mb-1 mt-2 flex justify-between text-[10px] uppercase tracking-widest text-muted">
        <span>Nível {level}</span>
        <span>
          {into}/{needed} XP
        </span>
      </div>
      <ProgressBar value={(into / needed) * 100} />
      <div className="mt-3 flex justify-between text-xs">
        <span className="flex items-center gap-1 text-warn">
          <Flame size={13} /> {streakDays(diasEstudados)} dia(s)
        </span>
        <span className="flex items-center gap-1 text-muted">
          <CalendarDays size={13} /> {horasSemana.toFixed(1)} h na semana
        </span>
      </div>
      <PerfilModal open={editando} onClose={() => setEditando(false)} />
    </Panel>
  );
}
