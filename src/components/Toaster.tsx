import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { dismissToast, useToasts } from '../store/toast';
import { cn } from '../lib/utils';

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-live="polite">
      {toasts.map((t) => {
        const Icon = t.variant === 'destructive' ? AlertTriangle : t.variant === 'success' ? CheckCircle2 : Info;
        return (
          <div
            key={t.id}
            className={cn(
              'pointer-events-auto flex max-w-sm items-start gap-3 rounded border bg-panel p-3 shadow-2xl',
              t.variant === 'destructive' ? 'border-danger text-danger' : t.variant === 'success' ? 'border-accent text-accent' : 'border-line text-fg',
            )}
          >
            <Icon size={16} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-xs font-bold uppercase tracking-wider">{t.title}</div>
              {t.description && <div className="mt-0.5 break-words text-[11px] text-fg/80">{t.description}</div>}
            </div>
            <button type="button" onClick={() => dismissToast(t.id)} className="shrink-0 text-muted hover:text-fg" aria-label="Fechar aviso">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
