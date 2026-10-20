import { useMemo, useState } from 'react';
import { ListChecks } from 'lucide-react';
import { diffDays, formatShort, toLocalDate } from '../../domain/dates';
import { ordenarPorPrazo, STATUS } from '../../domain/entregas';
import { useEntregas } from '../../store/entregas';
import { Button, Empty, Panel } from '../../components/ui';
import { CollegeTracker } from './CollegeTracker';

/** As 3 entregas mais urgentes; "abrir" mostra o College Tracker completo. */
export function EntregasCard() {
  const lista = useEntregas((s) => s.lista);
  const ciclar = useEntregas((s) => s.ciclarStatus);
  const [aberto, setAberto] = useState(false);
  const urgentes = useMemo(() => ordenarPorPrazo(lista), [lista]);
  const hoje = toLocalDate();

  return (
    <Panel
      title={`Entregas // ${urgentes.length} aberta(s)`}
      actions={
        <Button className="px-2 py-1 text-[10px]" onClick={() => setAberto(true)}>
          <ListChecks size={12} /> Abrir
        </Button>
      }
    >
      {urgentes.length === 0 ? (
        <Empty>Nenhum trabalho ou prova pendente.</Empty>
      ) : (
        <ul className="space-y-1.5">
          {urgentes.slice(0, 3).map((e) => {
            const dias = e.prazo ? diffDays(e.prazo, hoje) : undefined;
            return (
              <li key={e.id} className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => ciclar(e.id)}
                  className="shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold"
                  style={{ borderColor: STATUS[e.status].cor, color: STATUS[e.status].cor }}
                  title="Clique pra avançar o status"
                >
                  {STATUS[e.status].rotulo}
                </button>
                <span className="min-w-0 flex-1 truncate">{e.titulo}</span>
                {e.prazo && (
                  <span className={dias !== undefined && dias <= 2 ? 'text-danger' : 'text-muted'}>{formatShort(e.prazo)}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <CollegeTracker open={aberto} onClose={() => setAberto(false)} />
    </Panel>
  );
}
