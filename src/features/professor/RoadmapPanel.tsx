import { useMemo, useState } from 'react';
import { Map as MapaIcon, Sparkles } from 'lucide-react';
import { acharTopico, type ItemRoadmap, type TipoItem } from '../../domain/roadmap';
import { useAI } from '../../hooks/useAI';
import { gerarRoadmap } from '../../services/ai/roadmap';
import { useIALigada } from '../../store/conexoes';
import { useRoadmaps } from '../../store/roadmaps';
import { useStudy } from '../../store/study';
import { toast } from '../../store/toast';
import { Badge, Button, Empty, ErrorNote, Panel, ProgressBar } from '../../components/ui';
import { cn } from '../../lib/utils';
import { useBoards } from '../lousa/boardsStore';
import { Board } from '../lousa/LousaPage';

const FEITO = 60; // domínio a partir do qual o assunto conta como feito

const ROTULO: Record<TipoItem, string> = { essencial: 'essencial', opcional: 'opcional', alternativa: 'escolha uma' };

/**
 * Roadmap da matéria (estilo roadmap.sh), criado pelo professor. A lousa do roadmap
 * é uma só por matéria; refazer troca por uma nova, sem acumular notas.
 */
export function RoadmapPanel({ subjectId, onEstudar }: { subjectId: string; onEstudar: (topicId: string) => void }) {
  const subject = useStudy((s) => s.subjects.find((x) => x.id === subjectId));
  const topics = useStudy((s) => s.topics);
  const roadmap = useRoadmaps((s) => s.porMateria[subjectId]);
  const aiOn = useIALigada();
  const { run, loading, error } = useAI();
  const [visao, setVisao] = useState<'lista' | 'desenho'>('lista');
  const lousa = useBoards((s) => s.boards.find((b) => b.roadmapDe === subjectId));

  const daMateria = useMemo(() => topics.filter((t) => t.subjectId === subjectId), [topics, subjectId]);

  if (!subject) return null;

  const criar = () => {
    if (roadmap && !confirm('Refazer o roadmap troca a lousa dele por uma nova (o que você anotou nela se perde). Continuar?')) return;
    void run(async (signal) => {
      const r = await gerarRoadmap({ materia: subject.name, topicosAtuais: daMateria.map((t) => t.title) }, signal);
      useRoadmaps.getState().salvar(subjectId, r);
      toast({ title: 'Roadmap pronto.' });
      setVisao('lista');
    });
  };

  const estudar = (item: ItemRoadmap) => {
    const existente = acharTopico(daMateria, item.titulo);
    const id = existente?.id ?? useStudy.getState().addTopic({ subjectId, title: item.titulo });
    onEstudar(id);
  };

  if (!roadmap) {
    return (
      <Panel title={`Roadmap de ${subject.name}`}>
        <ErrorNote error={error} />
        <Empty>O professor desenha o caminho completo de {subject.name}: as etapas na ordem e, em cada uma, o que é essencial, opcional ou escolha. Ele fica numa lousa só dele.</Empty>
        <Button variant="primary" className="mt-3" onClick={criar} disabled={!aiOn || loading} title={aiOn ? '' : 'Ative a IA nas configurações'}>
          <Sparkles size={14} /> {loading ? 'Montando o roadmap…' : `Criar o roadmap de ${subject.name}`}
        </Button>
      </Panel>
    );
  }

  return (
    <Panel
      title={`Roadmap de ${roadmap.materia}`}
      actions={
        <>
          <Button onClick={() => setVisao(visao === 'lista' ? 'desenho' : 'lista')} disabled={!lousa}>
            <MapaIcon size={14} /> {visao === 'lista' ? 'Ver desenhado' : 'Ver em lista'}
          </Button>
          <Button onClick={criar} disabled={!aiOn || loading}>
            <Sparkles size={14} /> {loading ? 'Refazendo…' : 'Refazer'}
          </Button>
        </>
      }
    >
      <ErrorNote error={error} />
      {roadmap.objetivo && <p className="mb-3 text-sm text-muted">{roadmap.objetivo}</p>}
      {visao === 'desenho' && lousa ? (
        <div className="h-[72vh] min-h-[420px] overflow-hidden rounded border border-line">
          <Board key={lousa.id} boardId={lousa.id} name={lousa.name} />
        </div>
      ) : (
        <>
      <p className="mb-3 text-[11px] text-muted">Clique num assunto pra estudar com o professor (se ainda não existe, ele vira um tópico seu).</p>
      <ol className="space-y-4">
        {roadmap.etapas.map((etapa, i) => {
          const feitos = etapa.itens.filter((it) => (acharTopico(daMateria, it.titulo)?.mastery ?? 0) >= FEITO).length;
          return (
            <li key={`${i}-${etapa.titulo}`} className="rounded border border-line bg-bg p-3">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-sm font-bold text-accent">
                  {i + 1}. {etapa.titulo}
                </h3>
                {etapa.itens.length > 0 && (
                  <span className="text-[11px] text-muted">
                    {feitos}/{etapa.itens.length} feitos
                  </span>
                )}
              </div>
              {etapa.porque && <p className="mt-0.5 text-xs text-muted">{etapa.porque}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {etapa.itens.map((it) => {
                  const t = acharTopico(daMateria, it.titulo);
                  const feito = (t?.mastery ?? 0) >= FEITO;
                  return (
                    <button
                      key={it.titulo}
                      type="button"
                      onClick={() => estudar(it)}
                      title={t ? `Domínio ${t.mastery}%` : 'Ainda não estudado: cria o tópico'}
                      className={cn(
                        'rounded border px-2.5 py-1.5 text-left text-xs hover:border-accent hover:text-accent',
                        it.tipo === 'essencial' && 'border-accent/60 bg-accent/10',
                        it.tipo === 'opcional' && 'border-dashed border-line text-muted',
                        it.tipo === 'alternativa' && 'border-dotted border-info/70 bg-info/10',
                        feito && 'opacity-60',
                      )}
                    >
                      {feito ? '✓ ' : ''}
                      {it.titulo}
                      <span className="ml-1.5 text-[10px] uppercase tracking-wide text-muted">{ROTULO[it.tipo]}</span>
                      {t && !feito && t.mastery > 0 && <ProgressBar value={t.mastery} />}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ol>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge>cheio = essencial</Badge>
        <Badge>tracejado = opcional</Badge>
        <Badge>pontilhado = escolha uma</Badge>
      </div>
        </>
      )}
    </Panel>
  );
}
