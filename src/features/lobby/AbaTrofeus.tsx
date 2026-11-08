import { Lock, Trophy } from 'lucide-react';
import { ProgressBar } from '../../components/ui';
import { cn } from '../../lib/utils';
import { useTrofeus } from './useTrofeus';

/** Troféus com "quanto falta": cada um é um mini próximo passo. */
export function AbaTrofeus() {
  const trofeus = useTrofeus();
  const ordenados = [...trofeus].sort((a, b) => Number(b.destravado) - Number(a.destravado) || b.progresso / b.total - a.progresso / a.total);

  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
      {ordenados.map((t) => (
        <div key={t.id} className={cn('rounded border p-2.5', t.destravado ? 'glow border-accent/60' : 'border-line')}>
          <div className="flex items-center gap-2">
            {t.destravado ? <Trophy size={16} className="text-accent" /> : <Lock size={14} className="text-muted" />}
            <span className={cn('text-xs font-bold', t.destravado ? 'text-accent' : 'text-fg')}>{t.nome}</span>
            <span className="ml-auto text-[10px] text-muted">{t.xp ? `+${t.xp}` : 'medalha'}</span>
          </div>
          <p className="my-1 text-[11px] text-muted">{t.descricao}</p>
          {!t.destravado && (
            <>
              <ProgressBar value={(t.progresso / t.total) * 100} />
              <p className="mt-0.5 text-right text-[10px] text-muted">
                {t.progresso}/{t.total}
              </p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
