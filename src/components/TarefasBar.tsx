import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, X } from 'lucide-react';
import { cancelarTarefa, useTarefas, type Tarefa } from '../store/tarefas';
import { useNav } from '../store/nav';

function tempo(ms: number) {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Faixa fina, em qualquer aba: o que o professor está preparando e há quanto tempo. */
export function TarefasBar() {
  const lista = useTarefas((s) => s.lista);
  const tarefas = Object.values(lista);
  const rodando = tarefas.some((t) => t.status === 'rodando');
  const [, tick] = useState(0);

  useEffect(() => {
    if (!rodando) return;
    const id = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [rodando]);

  if (tarefas.length === 0) return null;
  const ir = (t: Tarefa) => useNav.getState().go(t.aba, t.topicId);

  return (
    <div className="border-b border-line bg-panel-2/80" role="status" aria-live="polite">
      <div className="mx-auto flex max-w-[1500px] flex-wrap gap-x-4 gap-y-1 px-4 py-1 text-[11px]">
        {tarefas.map((t) => (
          <div key={t.chave} className="flex min-w-0 items-center gap-2">
            {t.status === 'rodando' ? <Loader2 size={12} className="shrink-0 animate-spin text-accent" /> : <AlertTriangle size={12} className="shrink-0 text-warn" />}
            <button type="button" onClick={() => ir(t)} className="min-w-0 truncate text-left text-fg hover:text-accent" title="Abrir a tela desta tarefa">
              {t.status === 'rodando' && (
                <>
                  {t.rotulo} <span className="text-muted">· {tempo(Date.now() - t.inicio)}</span>
                </>
              )}
              {t.status === 'interrompida' && <>{t.rotulo}: foi interrompida (a página recarregou). Abra e peça de novo.</>}
              {t.status === 'erro' && (
                <>
                  {t.rotulo}: <span className="text-warn">{t.erro}</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => (t.status === 'rodando' ? cancelarTarefa(t.chave) : useTarefas.getState().dispensar(t.chave))}
              className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] text-muted hover:border-danger hover:text-danger"
              title={t.status === 'rodando' ? 'Cancelar' : 'Dispensar'}
            >
              {t.status === 'rodando' ? 'Cancelar' : <X size={10} />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
