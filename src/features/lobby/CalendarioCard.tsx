import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { toLocalDate } from '../../domain/dates';
import { useEntregas } from '../../store/entregas';
import { usePresenca } from '../../store/presenca';
import { useStudy } from '../../store/study';
import { Panel } from '../../components/ui';
import { cn } from '../../lib/utils';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const pad = (n: number) => String(n).padStart(2, '0');

/** Mês com presença (clique marca/desmarca) e anel nos dias de entrega. */
export function CalendarioCard() {
  const hoje = toLocalDate();
  const [cursor, setCursor] = useState(() => ({ ano: new Date().getFullYear(), mes: new Date().getMonth() }));
  const manual = usePresenca((s) => s.dias);
  const alternar = usePresenca((s) => s.alternar);
  const sessions = useStudy((s) => s.sessions);
  const prazoTarget = useStudy((s) => s.target.deadline);
  const entregas = useEntregas((s) => s.lista);

  const estudados = useMemo(() => new Set([...manual, ...sessions.map((s) => s.date)]), [manual, sessions]);
  const prazos = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const e of entregas) if (e.prazo && e.status !== 'entregue') m.set(e.prazo, [...(m.get(e.prazo) ?? []), e.titulo]);
    if (prazoTarget) m.set(prazoTarget, [...(m.get(prazoTarget) ?? []), 'Prazo do Target']);
    return m;
  }, [entregas, prazoTarget]);

  const primeiro = new Date(cursor.ano, cursor.mes, 1);
  const vazios = (primeiro.getDay() + 6) % 7; // semana começa na segunda
  const diasNoMes = new Date(cursor.ano, cursor.mes + 1, 0).getDate();
  const mudar = (d: number) =>
    setCursor((c) => {
      const n = new Date(c.ano, c.mes + d, 1);
      return { ano: n.getFullYear(), mes: n.getMonth() };
    });

  return (
    <Panel
      title={`Calendário // ${MESES[cursor.mes]} ${cursor.ano}`}
      actions={
        <>
          <button type="button" onClick={() => mudar(-1)} className="text-muted hover:text-accent" aria-label="Mês anterior">
            <ChevronLeft size={14} />
          </button>
          <button type="button" onClick={() => mudar(1)} className="text-muted hover:text-accent" aria-label="Próximo mês">
            <ChevronRight size={14} />
          </button>
        </>
      }
    >
      <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
        {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
          <span key={i} className="text-muted">
            {d}
          </span>
        ))}
        {Array.from({ length: vazios }, (_, i) => (
          <span key={`v${i}`} />
        ))}
        {Array.from({ length: diasNoMes }, (_, i) => {
          const dia = `${cursor.ano}-${pad(cursor.mes + 1)}-${pad(i + 1)}`;
          const prazo = prazos.get(dia);
          return (
            <button
              key={dia}
              type="button"
              onClick={() => dia <= hoje && alternar(dia)}
              title={[estudados.has(dia) ? 'Estudei' : '', ...(prazo ?? [])].filter(Boolean).join(' · ') || undefined}
              className={cn(
                'aspect-square rounded text-[11px]',
                estudados.has(dia) ? 'bg-accent/30 text-fg' : 'text-muted hover:bg-panel-2',
                dia === hoje && 'font-bold text-accent',
                prazo && 'ring-2 ring-warn',
                dia > hoje && 'cursor-default opacity-60',
              )}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-muted">Verde = estudou · anel = entrega/prazo · clique marca presença</p>
    </Panel>
  );
}
