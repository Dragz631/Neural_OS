import { useMemo, useState, type FormEvent } from 'react';
import { BookOpen, HelpCircle, ListPlus, Trash2 } from 'lucide-react';
import { pendentes, type DestinoNota } from '../../domain/caixaEntrada';
import { useCaixa } from '../../store/caixaEntrada';
import { useEntregas } from '../../store/entregas';
import { useStudy } from '../../store/study';
import { toast } from '../../store/toast';
import { TopicSelect } from '../../components/TopicPicker';
import { Panel } from '../../components/ui';

/** Anota rápido agora, decide depois. Nada fica solto. */
export function CaixaEntradaCard() {
  const notas = useCaixa((s) => s.notas);
  const { adicionar, encaminhar, apagar } = useCaixa();
  const [texto, setTexto] = useState('');
  const [escolhendo, setEscolhendo] = useState<{ id: string; destino: Exclude<DestinoNota, 'entrega'> } | null>(null);
  const abertas = useMemo(() => pendentes(notas), [notas]);

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (texto.trim()) adicionar(texto);
    setTexto('');
  };

  const mandarPraTopico = (topicId?: string) => {
    if (!escolhendo || !topicId) return;
    const nota = notas.find((n) => n.id === escolhendo.id);
    const topic = useStudy.getState().topics.find((t) => t.id === topicId);
    if (!nota || !topic) return;
    if (escolhendo.destino === 'topico') {
      useStudy.getState().updateTopic(topicId, { notes: `${topic.notes}\n\n- ${nota.texto}`.trim() });
    } else {
      useStudy.getState().addDiario(topicId, { tipo: 'duvida', original: nota.texto });
    }
    encaminhar(nota.id, escolhendo.destino);
    toast({ title: escolhendo.destino === 'topico' ? 'Foi pras anotações' : 'Dúvida registrada', description: topic.title, variant: 'success' });
    setEscolhendo(null);
  };

  const virarEntrega = (id: string, titulo: string) => {
    useEntregas.getState().criar({ titulo, tipo: 'outro', categoria: 'estudos', tags: [], xp: 60 });
    encaminhar(id, 'entrega');
    toast({ title: 'Virou entrega', description: titulo, variant: 'success' });
  };

  return (
    <Panel title={`Caixa de entrada // ${abertas.length}`}>
      <form onSubmit={enviar} className="mb-2 flex items-center gap-2 rounded border border-line bg-bg px-2 focus-within:border-accent">
        <span className="text-accent">&gt;_</span>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="ideia, dúvida da aula, lembrete…"
          className="w-full bg-transparent py-1.5 text-sm outline-none placeholder:text-muted/60"
        />
      </form>
      {escolhendo && (
        <div className="mb-2 space-y-1 rounded border border-accent/40 p-2">
          <p className="text-[10px] uppercase tracking-widest text-accent">{escolhendo.destino === 'topico' ? 'Mandar pras anotações de…' : 'Registrar dúvida em…'}</p>
          <TopicSelect value={undefined} onChange={mandarPraTopico} />
          <button type="button" onClick={() => setEscolhendo(null)} className="text-[10px] text-muted hover:text-fg">
            cancelar
          </button>
        </div>
      )}
      <ul className="max-h-48 space-y-1 overflow-y-auto">
        {abertas.map((n) => (
          <li key={n.id} className="group flex items-start gap-2 rounded px-1 py-1 text-xs hover:bg-panel-2">
            <span className="min-w-0 flex-1 break-words">{n.texto}</span>
            <span className="flex shrink-0 gap-1.5 text-muted opacity-70 group-hover:opacity-100">
              <button type="button" title="Pras anotações de um tópico" onClick={() => setEscolhendo({ id: n.id, destino: 'topico' })} className="hover:text-accent">
                <BookOpen size={13} />
              </button>
              <button type="button" title="Virar dúvida de um tópico" onClick={() => setEscolhendo({ id: n.id, destino: 'duvida' })} className="hover:text-info">
                <HelpCircle size={13} />
              </button>
              <button type="button" title="Virar entrega" onClick={() => virarEntrega(n.id, n.texto)} className="hover:text-warn">
                <ListPlus size={13} />
              </button>
              <button type="button" title="Apagar" onClick={() => apagar(n.id)} className="hover:text-danger">
                <Trash2 size={13} />
              </button>
            </span>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
