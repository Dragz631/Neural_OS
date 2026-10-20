import { Trash2 } from 'lucide-react';
import { formatShort } from '../../domain/dates';
import { CATEGORIA, STATUS } from '../../domain/entregas';
import { useEntregas } from '../../store/entregas';
import { useStudy } from '../../store/study';
import { Empty, Modal } from '../../components/ui';
import { NovaEntregaForm } from './NovaEntregaForm';

/** College Tracker: trabalhos, provas e listas, com ciclo de status. */
export function CollegeTracker({ open, onClose }: { open: boolean; onClose: () => void }) {
  const lista = useEntregas((s) => s.lista);
  const ciclar = useEntregas((s) => s.ciclarStatus);
  const apagar = useEntregas((s) => s.apagar);
  const subjects = useStudy((s) => s.subjects);

  return (
    <Modal open={open} onClose={onClose} title="College Tracker // trabalhos & entregas" wide>
      <NovaEntregaForm />
      <div className="mt-4 max-h-[50vh] space-y-2 overflow-y-auto">
        {lista.length === 0 && <Empty>Nada cadastrado ainda.</Empty>}
        {lista.map((e) => (
          <div key={e.id} className="flex items-start gap-3 rounded border border-line bg-bg p-2.5">
            <button
              type="button"
              onClick={() => ciclar(e.id)}
              className="mt-0.5 shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold"
              style={{ borderColor: STATUS[e.status].cor, color: STATUS[e.status].cor }}
              title="Avançar status (entregar dá XP)"
            >
              {STATUS[e.status].rotulo}
            </button>
            <div className="min-w-0 flex-1">
              <p className={e.status === 'entregue' ? 'text-sm text-muted line-through' : 'text-sm'}>{e.titulo}</p>
              <div className="mt-1 flex flex-wrap gap-1.5 text-[10px]">
                <span style={{ color: CATEGORIA[e.categoria].cor }}>{CATEGORIA[e.categoria].rotulo}</span>
                <span className="text-muted">· {e.tipo}</span>
                {e.prazo && <span className="text-warn">· prazo {formatShort(e.prazo)}</span>}
                {e.subjectId && <span className="text-info">· {subjects.find((s) => s.id === e.subjectId)?.name}</span>}
                {e.tags.map((t) => (
                  <span key={t} className="text-muted">
                    #{t}
                  </span>
                ))}
                <span className="text-accent">+{e.xp} XP</span>
              </div>
            </div>
            <button type="button" onClick={() => confirm(`Apagar "${e.titulo}"?`) && apagar(e.id)} className="text-muted hover:text-danger" aria-label="Apagar">
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </Modal>
  );
}
