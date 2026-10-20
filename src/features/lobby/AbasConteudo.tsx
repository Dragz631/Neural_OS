import { useMemo } from 'react';
import { BookOpen } from 'lucide-react';
import { addDays, toLocalDate, weekStartOf, WEEKDAYS } from '../../domain/dates';
import { useToday } from '../../hooks/useToday';
import { useEntregas } from '../../store/entregas';
import { useNav } from '../../store/nav';
import { minutesByDate, topicPath, useStudy } from '../../store/study';
import { Empty } from '../../components/ui';

/** Horas reais por dia nesta semana (das sessões) + nota média. */
export function AbaFoco() {
  const sessions = useStudy((s) => s.sessions);
  const minutos = useMemo(() => minutesByDate(sessions), [sessions]);
  const inicio = weekStartOf(toLocalDate());
  const dias = Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
  const max = Math.max(60, ...dias.map((d) => minutos[d] ?? 0));
  const notas = sessions.filter((s) => s.date >= inicio && s.score !== undefined).map((s) => s.score!);
  const media = notas.length ? Math.round(notas.reduce((a, b) => a + b, 0) / notas.length) : undefined;
  const total = dias.reduce((s, d) => s + (minutos[d] ?? 0), 0);

  return (
    <div>
      <div className="flex h-28 items-end gap-2">
        {dias.map((d, i) => (
          <div key={d} className="flex flex-1 flex-col items-center gap-1" title={`${minutos[d] ?? 0} min`}>
            <div className="w-full rounded-t bg-accent/70" style={{ height: `${((minutos[d] ?? 0) / max) * 100}%`, minHeight: minutos[d] ? 4 : 0 }} />
            <span className={d === toLocalDate() ? 'text-[10px] font-bold text-accent' : 'text-[10px] text-muted'}>{WEEKDAYS[i]}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        {(total / 60).toFixed(1)} h nesta semana{media !== undefined ? ` · nota média ${media}` : ''}
      </p>
    </div>
  );
}

/** Sincronia: o quanto você está em dia (missões de hoje, revisões e entregas). */
export function AbaSync() {
  const { missions, due } = useToday();
  const entregas = useEntregas((s) => s.lista);
  const topics = useStudy((s) => s.topics);
  const hoje = toLocalDate();
  const atrasadas = entregas.filter((e) => e.status !== 'entregue' && e.prazo && e.prazo < hoje).length;
  const estudados = topics.filter((t) => t.lastStudiedAt).length;
  const partes = [
    { nome: 'Missões de hoje', valor: missions.length ? missions.filter((m) => m.done).length / missions.length : 1 },
    { nome: 'Revisões em dia', valor: estudados ? 1 - due.length / estudados : 1 },
    { nome: 'Entregas no prazo', valor: entregas.length ? 1 - atrasadas / entregas.length : 1 },
  ];
  const sync = Math.round((partes.reduce((s, p) => s + p.valor, 0) / partes.length) * 100);

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div className="text-center">
        <div className="text-glow text-4xl font-bold text-accent">{sync}%</div>
        <div className="text-[10px] uppercase tracking-widest text-muted">{sync >= 80 ? 'estável' : sync >= 50 ? 'moderado' : 'déficit'}</div>
      </div>
      <ul className="flex-1 space-y-1 text-xs">
        {partes.map((p) => (
          <li key={p.nome} className="flex justify-between">
            <span className="text-muted">{p.nome}</span>
            <span>{Math.round(p.valor * 100)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Revisões vencidas (o que está pra esquecer). */
export function AbaRevisoes() {
  const { due } = useToday();
  const subjects = useStudy((s) => s.subjects);
  const go = useNav((s) => s.go);
  if (due.length === 0) return <Empty>Tudo em dia. O que você estuda volta aqui na hora certa.</Empty>;
  return (
    <ul className="grid gap-1 sm:grid-cols-2">
      {due.map((t) => (
        <li key={t.id}>
          <button type="button" onClick={() => go('professor', t.id)} className="flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-panel-2">
            <span className="truncate">{topicPath(subjects, t)}</span>
            <BookOpen size={12} className="shrink-0 text-muted" />
          </button>
        </li>
      ))}
    </ul>
  );
}
