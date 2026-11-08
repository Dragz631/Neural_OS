import type { Lesson, Topic } from '../../domain/types';
import { cn } from '../../lib/utils';
import { useIALigada } from '../../store/conexoes';
import { useRascunhos, type Marca } from '../../store/rascunhos';
import { partesDaAula, pedidoConfuso, type ParteAula } from './termometro';

// Termômetro da aula: uma faixa embaixo do quadro, um chip por parte do desenho.
// 🙂 = entendi. 😕 = não entrou, e já vira um "explica de outro jeito" no chat sobre
// aquela parte, sem precisar escrever nada. Zera quando o professor faz uma aula nova.

export function TermometroAula({ topic, lesson }: { topic: Topic; lesson: Lesson }) {
  const aiOn = useIALigada();
  const registro = useRascunhos((s) => s.termometro[topic.id]);
  const marcas = registro?.aula === lesson.generatedAt ? registro.marcas : {};
  const partes = partesDaAula(lesson);
  if (!partes.length) return null;

  const confusas = partes.filter((p) => marcas[p.id] === 'confuso').length;
  const ok = partes.filter((p) => marcas[p.id] === 'ok').length;

  const marcar = (p: ParteAula, m: Marca) => {
    const { marcarParte, pedirAoChat } = useRascunhos.getState();
    const nova = marcas[p.id] === m ? undefined : m;
    marcarParte(topic.id, lesson.generatedAt, p.id, nova);
    if (nova === 'confuso' && aiOn) pedirAoChat({ topicId: topic.id, tipo: 'mais-facil', pedido: pedidoConfuso(p.texto), sobre: p.texto });
  };

  return (
    <div className="mt-2 rounded border border-line p-2" aria-label="Termômetro da aula">
      <p className="mb-1.5 text-[10px] uppercase tracking-wider text-muted">
        Termômetro: como foi cada parte?{' '}
        <span className="normal-case tracking-normal">
          {ok + confusas === 0 ? (aiOn ? '😕 numa parte e o professor explica ela de outro jeito no chat.' : 'Marque o que entrou e o que não entrou.') : `${ok} 🙂 · ${confusas} 😕 de ${partes.length}`}
        </span>
      </p>
      <div className="flex flex-wrap gap-1.5">
        {partes.map((p) => {
          const m = marcas[p.id];
          return (
            <span key={p.id} className={cn('flex max-w-full items-center gap-1 rounded border py-0.5 pl-2 pr-1 text-xs', m === 'ok' ? 'border-accent/60 text-accent' : m === 'confuso' ? 'border-warn/70 text-warn' : 'border-line text-fg')}>
              <span className="truncate" title={p.texto}>
                {p.texto.length > 42 ? `${p.texto.slice(0, 40)}…` : p.texto}
              </span>
              <button type="button" onClick={() => marcar(p, 'ok')} aria-pressed={m === 'ok'} className={cn('rounded px-1', m === 'ok' ? 'bg-accent/20' : 'opacity-60 hover:opacity-100')} title="Entendi">
                🙂
              </button>
              <button type="button" onClick={() => marcar(p, 'confuso')} aria-pressed={m === 'confuso'} className={cn('rounded px-1', m === 'confuso' ? 'bg-warn/20' : 'opacity-60 hover:opacity-100')} title={aiOn ? 'Não entrou: o professor explica de outro jeito no chat' : 'Não entrou'}>
                😕
              </button>
            </span>
          );
        })}
      </div>
    </div>
  );
}
