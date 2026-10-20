import { CheckCircle2, CircleAlert, CornerDownLeft, FolderOpen } from 'lucide-react';
import { Button, Empty, Modal } from '../../components/ui';
import type { Challenge, Id, Topic } from '../../domain/types';

/** Todos os desafios da matéria: abrir de novo, ou trazer o código pro desafio atual. */
export function GavetaHistorico({
  open,
  onClose,
  desafios,
  topics,
  ativoId,
  onAbrir,
  onRestaurar,
}: {
  open: boolean;
  onClose: () => void;
  desafios: Challenge[];
  topics: Topic[];
  ativoId?: Id;
  onAbrir: (c: Challenge) => void;
  onRestaurar: (c: Challenge) => void;
}) {
  const ordenados = [...desafios].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <Modal open={open} onClose={onClose} title={`Histórico // ${desafios.length} desafio(s)`} wide>
      {ordenados.length === 0 ? (
        <Empty>Nenhum desafio nesta matéria ainda.</Empty>
      ) : (
        <ul className="space-y-2">
          {ordenados.map((c) => (
            <li key={c.id} className="flex items-center gap-2 rounded border border-line bg-bg px-3 py-2 text-sm">
              {c.solvedAt ? <CheckCircle2 size={14} className="shrink-0 text-accent" /> : <CircleAlert size={14} className="shrink-0 text-muted" />}
              <div className="min-w-0 flex-1">
                <p className="truncate">{c.prompt.split('\n')[0]}</p>
                <p className="text-[10px] text-muted">
                  {topics.find((t) => t.id === c.topicId)?.title} · {c.createdAt.slice(0, 10).split('-').reverse().join('/')}
                  {c.review?.source === 'ia' ? ` · nota ${c.review.score}` : ''}
                  {c.hintLevel !== undefined ? ` · dica ${c.hintLevel}/6` : ''}
                </p>
              </div>
              <Button onClick={() => onAbrir(c)} disabled={c.id === ativoId}>
                <FolderOpen size={12} /> Abrir
              </Button>
              {ativoId && c.id !== ativoId && c.code.trim() && (
                <Button onClick={() => onRestaurar(c)} title="Trazer este código pro desafio aberto">
                  <CornerDownLeft size={12} /> Restaurar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
