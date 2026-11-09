import { ArrowRight, BatteryLow, Compass } from 'lucide-react';
import { useNextStep } from '../hooks/useNextStep';
import { useNav } from '../store/nav';

/** Barra fixa com UMA ação pra fazer agora. É o coração do Neural-OS. */
export function NextStepBar({ variant = 'bar' }: { variant?: 'bar' | 'hero' }) {
  const { step, tired } = useNextStep();
  const go = useNav((s) => s.go);
  const fazer = () => go(step.action, step.topicId);

  if (variant === 'hero') {
    return (
      <section data-tour="proximo-passo" className="glow scanlines relative overflow-hidden rounded border border-accent/70 bg-panel p-5">
        <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-accent">
          <span className="pulse-dot" aria-hidden />
          Próximo passo <span className="text-muted/70">// o que fazer agora</span>
          {tired && (
            <span className="ml-auto flex items-center gap-1 rounded border border-warn/60 px-2 py-0.5 text-[10px] tracking-wider text-warn">
              <BatteryLow size={12} /> modo mini
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <div className="min-w-0 flex-1">
            <h1 className="cursor-blink text-glow text-xl font-bold text-fg sm:text-2xl">{step.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {step.why}
              {step.minutes ? <span className="ml-2 text-accent">~{step.minutes} min</span> : null}
            </p>
          </div>
          <button
            type="button"
            onClick={fazer}
            className="flex items-center gap-2 rounded border border-accent bg-accent px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-on-accent hover:brightness-110"
          >
            Fazer agora <ArrowRight size={16} />
          </button>
        </div>
      </section>
    );
  }

  return (
    <div className="border-b border-accent/30 bg-accent/5">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2">
        <span className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.25em] text-accent">
          <Compass size={13} /> Próximo passo
        </span>
        <span className="min-w-0 flex-1 truncate text-sm font-bold text-fg">
          {step.title}
          {step.minutes ? <span className="ml-2 text-xs font-normal text-muted">~{step.minutes} min</span> : null}
        </span>
        <span className="hidden text-xs text-muted lg:inline">{step.why}</span>
        <button
          type="button"
          onClick={fazer}
          className="flex items-center gap-1 rounded border border-accent bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-on-accent hover:brightness-110"
        >
          Fazer agora <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
