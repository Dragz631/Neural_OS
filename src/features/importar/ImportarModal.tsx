import { BookOpen, CalendarPlus, Map as MapIcon, X } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Badge, Button, Empty, Modal } from '../../components/ui';
import { XP_POR_TIPO } from '../../domain/entregas';
import { categoriaPorDisciplina, contextoDe, mesmoNome, type DisciplinaNotion, type Importacao, type Novidades } from '../../domain/importacao';
import { useEntregas } from '../../store/entregas';
import { useImportacao } from '../../store/importacao';
import { useStudy } from '../../store/study';
import { toast } from '../../store/toast';
import { NovaMateriaModal } from '../materia/NovaMateriaModal';

/** O que chegou do Notion e do NotebookLM: cada coisa vira algo útil no app, sem duplicar. */
export function ImportarModal({ open, onClose, imp, novas }: { open: boolean; onClose: () => void; imp: Importacao; novas: Novidades }) {
  const [mapaDe, setMapaDe] = useState<DisciplinaNotion | null>(null);
  const { marcarVisto, juntarContexto } = useImportacao.getState();
  const total = novas.disciplinas.length + novas.entregas.length + novas.cadernos.length;

  const importarEntregas = () => {
    const { subjects } = useStudy.getState();
    for (const e of novas.entregas) {
      useEntregas.getState().criar({
        titulo: e.titulo,
        tipo: e.tipo,
        categoria: categoriaPorDisciplina(e.disciplina),
        prazo: e.prazo,
        descricao: e.descricao,
        status: e.status,
        subjectId: e.disciplina ? subjects.find((s) => mesmoNome(s.name, e.disciplina!))?.id : undefined,
        tags: ['notion'],
        xp: XP_POR_TIPO[e.tipo],
        notionId: e.notionId,
      });
    }
    toast({ title: `${novas.entregas.length} entrega(s) importada(s)`, variant: 'success' });
  };

  return (
    <>
      <Modal open={open && !mapaDe} onClose={onClose} title={`Do Notion e NotebookLM // ${total} novo(s)`} wide>
        {total === 0 ? (
          <Empty>Nada novo. Quando quiser, peça pro Claude ler o Notion/NotebookLM de novo.</Empty>
        ) : (
          <div className="space-y-5">
            {novas.disciplinas.length > 0 && (
              <Secao titulo="Disciplinas novas" dica="O Prof. monta o mapa usando as suas anotações como base.">
                {novas.disciplinas.map((d) => (
                  <Linha key={d.notionId} onDispensar={() => marcarVisto([d.notionId])}>
                    <span className="min-w-0 flex-1 truncate font-bold">{d.nome}</span>
                    {d.anotacoes && <Badge>com anotações</Badge>}
                    <Button variant="primary" onClick={() => setMapaDe(d)}>
                      <MapIcon size={13} /> Montar mapa
                    </Button>
                  </Linha>
                ))}
              </Secao>
            )}
            {novas.entregas.length > 0 && (
              <Secao titulo="Trabalhos, provas e listas" dica="Entram no College Tracker com prazo e XP.">
                {novas.entregas.map((e) => (
                  <Linha key={e.notionId} onDispensar={() => marcarVisto([e.notionId])}>
                    <span className="min-w-0 flex-1 truncate">{e.titulo}</span>
                    <Badge>{e.tipo}</Badge>
                    {e.prazo && <span className="text-xs text-muted">{e.prazo.split('-').reverse().slice(0, 2).join('/')}</span>}
                  </Linha>
                ))}
                <Button onClick={importarEntregas}>
                  <CalendarPlus size={13} /> Importar {novas.entregas.length} entrega(s)
                </Button>
              </Secao>
            )}
            {novas.cadernos.length > 0 && (
              <Secao titulo="Cadernos do NotebookLM" dica="Viram material de apoio da matéria: os cartões do feed passam a usar.">
                {novas.cadernos.map(({ caderno, subject }) => (
                  <Linha key={caderno.id} onDispensar={() => marcarVisto([caderno.id])}>
                    <span className="min-w-0 flex-1 truncate">{caderno.titulo}</span>
                    <span className="text-xs" style={{ color: subject.color }}>
                      → {subject.name}
                    </span>
                    <Button
                      onClick={() => {
                        juntarContexto(subject.id, `Caderno do NotebookLM "${caderno.titulo}":\n${caderno.resumo}`);
                        marcarVisto([caderno.id]);
                      }}
                    >
                      <BookOpen size={13} /> Usar
                    </Button>
                  </Linha>
                ))}
              </Secao>
            )}
          </div>
        )}
      </Modal>
      {mapaDe && (
        <NovaMateriaModal
          key={mapaDe.notionId}
          open
          onClose={() => setMapaDe(null)}
          nomeInicial={mapaDe.nome}
          contextoInicial={contextoDe(mapaDe.nome, mapaDe.anotacoes, imp.cadernos)}
          onCriada={() => {
            // A disciplina e os cadernos dela já foram usados como contexto.
            marcarVisto([mapaDe.notionId, ...imp.cadernos.filter((c) => mesmoNome(c.disciplina ?? c.titulo, mapaDe.nome)).map((c) => c.id)]);
          }}
        />
      )}
    </>
  );
}

function Secao({ titulo, dica, children }: { titulo: string; dica: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">{titulo}</h3>
      <p className="text-xs text-muted">{dica}</p>
      {children}
    </section>
  );
}

function Linha({ children, onDispensar }: { children: ReactNode; onDispensar: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded border border-line bg-bg px-3 py-2 text-sm">
      {children}
      <button type="button" onClick={onDispensar} className="text-muted hover:text-danger" aria-label="Dispensar" title="Não quero isso no app">
        <X size={14} />
      </button>
    </div>
  );
}
