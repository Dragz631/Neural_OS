import { Check, Lock } from 'lucide-react';
import { Panel, ProgressBar } from '../../components/ui';
import type { Habilidade } from '../../domain/sandbox';
import type { Id } from '../../domain/types';
import { cn } from '../../lib/utils';

export interface Trilha {
  nivel: number;
  xp: number;
  resolvidos: number;
  dominioMedio: number;
}

/**
 * Habilidades sinápticas = tópicos da matéria. Clicar no nome escolhe o que
 * praticar; marcar a caixa faz o desafio da IA cobrar aquilo junto.
 */
export function MatrizHabilidades({
  habilidades,
  topicId,
  foco,
  trilha,
  onEscolher,
  onAlternarFoco,
}: {
  habilidades: Habilidade[];
  topicId?: Id;
  foco: Set<Id>;
  trilha: Trilha;
  onEscolher: (id: Id) => void;
  onAlternarFoco: (id: Id) => void;
}) {
  return (
    <Panel title={`Matriz de conhecimento // LVL ${trilha.nivel}`}>
      <p className="mb-3 text-[11px] text-muted">Clique no tópico pra praticar. Marque outros pra o desafio cobrar junto. Cadeado = pré-requisito fraco (dá pra treinar, mas é aviso).</p>
      <ul className="space-y-1.5">
        {habilidades.map(({ topic, travadaPor, dominada }) => (
          <li key={topic.id} className={cn('rounded border px-2 py-1.5', topic.id === topicId ? 'border-accent/70 bg-accent/5' : 'border-line')}>
            <div className="flex items-center gap-2">
              <button
                type="button"
                role="checkbox"
                aria-checked={foco.has(topic.id)}
                aria-label={`Cobrar ${topic.title} junto`}
                onClick={() => onAlternarFoco(topic.id)}
                className={cn('flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border', foco.has(topic.id) ? 'border-accent bg-accent text-black' : 'border-line')}
              >
                {foco.has(topic.id) && <Check size={11} strokeWidth={3} />}
              </button>
              <button type="button" onClick={() => onEscolher(topic.id)} className="min-w-0 flex-1 truncate text-left text-xs hover:text-accent">
                {topic.title}
              </button>
              {travadaPor && <Lock size={11} className="shrink-0 text-warn" aria-label="Pré-requisito fraco" />}
              {dominada ? <span className="text-[9px] font-bold text-accent">DOMINADA</span> : <span className="text-[9px] text-muted">{topic.mastery}%</span>}
            </div>
            {travadaPor && topic.id === topicId && <p className="mt-1 pl-6 text-[10px] text-warn">Antes, reforce "{travadaPor.title}" ({travadaPor.mastery}%).</p>}
          </li>
        ))}
      </ul>
      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-line pt-3 text-[11px] text-muted">
        <span>
          Nível: <b className="text-accent">LVL {trilha.nivel}</b>
        </span>
        <span>
          XP da trilha: <b className="text-accent">{trilha.xp}</b>
        </span>
        <span>
          Resolvidos: <b className="text-accent">{trilha.resolvidos}</b>
        </span>
        <span>
          Domínio médio: <b className="text-accent">{trilha.dominioMedio}%</b>
        </span>
      </div>
      <div className="mt-2">
        <ProgressBar value={trilha.dominioMedio} />
      </div>
    </Panel>
  );
}
