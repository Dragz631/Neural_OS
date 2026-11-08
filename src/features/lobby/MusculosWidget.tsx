import { useMemo } from 'react';
import { toLocalDate } from '../../domain/dates';
import { HABILIDADES, maisParada, semana, SOBRE } from '../../domain/musculos';
import { Panel } from '../../components/ui';
import { cn } from '../../lib/utils';
import { useMusculos } from '../../store/musculos';

/** O que você treinou do pensamento nesta semana, e o músculo que ficou parado. */
export function MusculosWidget() {
  const registro = useMusculos((s) => s.registro);
  const soma = useMemo(() => semana(registro, toLocalDate()), [registro]);
  const max = Math.max(1, ...HABILIDADES.map((h) => soma[h]));
  const parada = maisParada(soma);
  const vazio = HABILIDADES.every((h) => soma[h] === 0);

  return (
    <Panel title="Músculos do cérebro // 7 dias">
      {vazio ? (
        <p className="text-xs leading-relaxed text-muted">Ainda vazio. Cada prova, desafio, tabuada, plano da semana ou "Discordo" treina um músculo do pensamento. Ele aparece aqui.</p>
      ) : (
        <div className="space-y-1.5">
          {HABILIDADES.map((h) => (
            <div key={h} className="flex items-center gap-2 text-[11px]" title={`Treina com: ${SOBRE[h].treina}`}>
              <span className={cn('w-28 shrink-0 truncate', h === parada ? 'text-warn' : 'text-muted')}>{SOBRE[h].nome}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-line/50">
                <span className={cn('block h-full rounded-full', h === parada ? 'bg-warn' : 'bg-accent')} style={{ width: `${(soma[h] / max) * 100}%` }} />
              </span>
              <span className="w-6 shrink-0 text-right font-mono text-muted">{Math.round(soma[h])}</span>
            </div>
          ))}
          {parada && (
            <p className="mt-2 rounded border border-warn/50 bg-warn/5 p-2 text-[11px] leading-snug">
              <b className="text-warn">Treinou pouco {SOBRE[parada].nome.toLowerCase()}.</b> <span className="text-muted">{SOBRE[parada].comoTreinar}</span>
            </p>
          )}
        </div>
      )}
    </Panel>
  );
}
