import { useMemo } from 'react';
import { ComecarFoco } from '../../components/Foco';
import { addDays, toLocalDate } from '../../domain/dates';
import { useFoco } from '../../store/foco';
import { useStudy } from '../../store/study';
import { Panel } from '../../components/ui';

/** Widget do Lobby: começar o estudo guiado no Target e ver como foi a semana (blocos e pausas). */
export function FocoWidget() {
  const target = useStudy((s) => s.target.topicId);
  const dias = useFoco((s) => s.dias);
  const semana = useMemo(() => {
    const hoje = toLocalDate();
    return Array.from({ length: 7 }, (_, i) => {
      const d = addDays(hoje, i - 6);
      return { d, blocos: dias[d]?.blocos ?? 0, pulos: dias[d]?.pulos ?? 0 };
    });
  }, [dias]);
  const total = semana.reduce((s, x) => s + x.blocos, 0);
  const pulos = semana.reduce((s, x) => s + x.pulos, 0);

  return (
    <Panel title="Foco // estudo guiado">
      <ComecarFoco topicId={target} compacto />
      <div className="mt-3 flex items-end gap-1" aria-label={`${total} blocos de foco nos últimos 7 dias`}>
        {semana.map((x) => (
          <div key={x.d} className="flex flex-1 flex-col items-center gap-0.5" title={`${x.d}: ${x.blocos} bloco(s)${x.pulos ? `, ${x.pulos} pausa(s) pulada(s)` : ''}`}>
            <div className="w-full rounded-sm bg-accent/70" style={{ height: `${Math.min(40, x.blocos * 8) + 2}px`, opacity: x.blocos ? 1 : 0.15 }} />
            <span className="text-[9px] text-muted">{x.d.slice(8)}</span>
          </div>
        ))}
      </div>
      <p className="mt-1 text-[10px] text-muted">
        {total} bloco{total === 1 ? '' : 's'} na semana{pulos ? ` · ${pulos} pausa${pulos > 1 ? 's' : ''} pulada${pulos > 1 ? 's' : ''}` : ''}. Descansar também é treino.
      </p>
    </Panel>
  );
}
