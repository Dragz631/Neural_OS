import { ArrowRight, Compass } from 'lucide-react';
import { nextStep } from '../domain/nextStep';
import { useToday } from '../hooks/useToday';
import { useNav } from '../store/nav';
import { useStudy } from '../store/study';

/** Barra fixa com UMA ação pra fazer agora. É o coração do Neural-OS. */
export function NextStepBar() {
  const { missions, due, targetTopic, checkin } = useToday();
  const hasTopics = useStudy((s) => s.topics.length > 0);
  const go = useNav((s) => s.go);

  const step = nextStep({ missions, due, target: targetTopic, hasTopics, tired: checkin?.energy === 1 });

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
          onClick={() => go(step.action, step.topicId)}
          className="flex items-center gap-1 rounded border border-accent bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wider text-black hover:brightness-110"
        >
          Fazer agora <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
