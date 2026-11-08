import { useEffect, useState } from 'react';
import { Check, Circle, Sparkles } from 'lucide-react';
import type { Diagnostico } from '../../domain/revisao';
import { ERRO_TEXTO } from '../../domain/revisao';
import type { Lesson, MiniAula, Topic } from '../../domain/types';
import { useAI } from '../../hooks/useAI';
import { diagnosticar } from '../../services/ai/revisao';
import { gerarMinis, type TopicContext } from '../../services/ai/professor';
import { useIALigada } from '../../store/conexoes';
import { useStudy } from '../../store/study';
import { rodarTarefa, useTarefa } from '../../store/tarefas';
import { toast } from '../../store/toast';
import { Button, ErrorNote, Textarea } from '../../components/ui';
import { cn } from '../../lib/utils';

// A aula tem começo, meio e fim: ler, ver o desenho, ver o vídeo, escrever, resolver os
// minidesafios. Ela só reinicia quando tudo isso está feito. Até lá, tudo fica guardado.

interface Passo {
  id: string;
  rotulo: string;
  feito: boolean;
  /** Passos manuais a pessoa marca; os outros se completam sozinhos. */
  marcar?: () => void;
}

export function ProgressoAula({ topic, lesson, ctx }: { topic: Topic; lesson: Lesson; ctx: TopicContext }) {
  const setLesson = useStudy((s) => s.setLesson);
  const updateTopic = useStudy((s) => s.updateTopic);
  const aiOn = useIALigada();
  const chaveMinis = `minis:${topic.id}`;
  const { rodando: loading, erro: error } = useTarefa(chaveMinis);

  const prog = lesson.progresso ?? {};
  const minis = lesson.minis ?? [];
  const feitas = minis.filter((m) => m.ok).length;
  const anotou = topic.notes.trim().length >= 20;
  const semMinis = minis.length === 0;

  const alternar = (k: 'leu' | 'viuDesenho' | 'viuVideos') => setLesson(topic.id, { ...lesson, progresso: { ...prog, [k]: !prog[k] } });

  const passos: Passo[] = [
    { id: 'leu', rotulo: 'Ler a explicação no quadro', feito: !!prog.leu, marcar: () => alternar('leu') },
    { id: 'desenho', rotulo: 'Entender o desenho do professor', feito: !!prog.viuDesenho, marcar: () => alternar('viuDesenho') },
    { id: 'videos', rotulo: 'Assistir a pelo menos um vídeo', feito: !!prog.viuVideos, marcar: () => alternar('viuVideos') },
    { id: 'anotou', rotulo: 'Escrever nas minhas anotações o que entendi e onde travei', feito: anotou },
    { id: 'minis', rotulo: semMinis ? (aiOn ? 'Minidesafios (peça ao professor)' : 'Minidesafios (precisam de IA)') : `Minidesafios ${feitas}/${minis.length}`, feito: semMinis ? !aiOn : feitas === minis.length },
  ];
  const tudo = passos.every((p) => p.feito);
  const proximo = passos.find((p) => !p.feito);

  useEffect(() => {
    if (tudo && !lesson.concluidaEm) {
      setLesson(topic.id, { ...lesson, concluidaEm: new Date().toISOString() });
      toast({ title: 'Aula concluída', description: 'Tudo feito. Quando quiser, comece uma aula nova.', variant: 'success' });
    }
  }, [tudo, lesson, setLesson, topic.id]);

  const pedirMinis = () =>
    void rodarTarefa(chaveMinis, { rotulo: `Professor montando os minidesafios de ${topic.title}`, aba: 'professor', topicId: topic.id, avisarPronto: 'Minidesafios prontos' }, async (signal) => {
      const novas = await gerarMinis(ctx, lesson, signal);
      // Grava na aula mais nova (você pode ter marcado passos enquanto ele montava).
      const agora = useStudy.getState().topics.find((t) => t.id === topic.id)?.lesson;
      if (agora) useStudy.getState().setLesson(topic.id, { ...agora, minis: novas });
    });

  const novaAula = () => updateTopic(topic.id, { lesson: undefined });

  return (
    <div className="mb-4 space-y-3 rounded border border-line bg-bg p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="fonte-titulo text-[10px] uppercase tracking-[0.25em] text-accent">Passos da aula</p>
        {lesson.concluidaEm ? (
          <Button className="px-2 py-1 text-[10px]" variant="primary" onClick={novaAula}>
            Aula concluída. Começar uma nova
          </Button>
        ) : (
          proximo && (
            <p className="text-xs">
              <b className="text-accent">Agora:</b> {proximo.rotulo}
            </p>
          )
        )}
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-5">
        {passos.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              disabled={!p.marcar}
              onClick={p.marcar}
              className={cn('flex w-full items-start gap-2 rounded border p-2 text-left text-[11px] leading-snug', p.feito ? 'border-accent/60 bg-accent/10 text-fg' : 'border-line text-muted', p.marcar && 'hover:border-accent')}
              title={p.marcar ? 'Clique pra marcar como feito' : 'Completa sozinho'}
            >
              {p.feito ? <Check size={14} className="mt-px shrink-0 text-accent" /> : <Circle size={14} className="mt-px shrink-0" />}
              {p.rotulo}
            </button>
          </li>
        ))}
      </ul>

      {semMinis && aiOn && !lesson.concluidaEm && (
        <div>
          <Button onClick={pedirMinis} disabled={loading}>
            <Sparkles size={14} /> {loading ? 'Montando…' : 'Pedir os minidesafios ao professor'}
          </Button>
          <ErrorNote error={error} />
        </div>
      )}

      {minis.length > 0 && <Minis topic={topic} lesson={lesson} minis={minis} />}
    </div>
  );
}

function Minis({ topic, lesson, minis }: { topic: Topic; lesson: Lesson; minis: MiniAula[] }) {
  const setLesson = useStudy((s) => s.setLesson);
  const aiOn = useIALigada();
  const { run, loading, error } = useAI();
  const [diag, setDiag] = useState<{ id: string; d: Diagnostico } | null>(null);
  const [verRef, setVerRef] = useState<string | null>(null);

  const atual = minis.find((m) => !m.ok);

  const salvar = (id: string, patch: Partial<MiniAula>) => setLesson(topic.id, { ...lesson, minis: minis.map((m) => (m.id === id ? { ...m, ...patch } : m)) });

  const material = [lesson.explanation, ...lesson.keyPoints].join('\n');

  const responder = async (m: MiniAula, naoSei = false) => {
    const texto = naoSei ? '' : (m.resposta ?? '').trim();
    if (!aiOn) return setVerRef(m.id);
    const d = await run((signal) => diagnosticar({ id: m.id, pergunta: m.pergunta, referencia: m.referencia }, texto, material, false, signal));
    if (!d) return;
    setDiag({ id: m.id, d });
    if (d.nivel !== 'errado') salvar(m.id, { ok: true });
  };

  const autoavaliar = (m: MiniAula, ok: boolean) => {
    setVerRef(null);
    salvar(m.id, { ok });
  };

  return (
    <ol className="space-y-2">
      {minis.map((m, idx) => {
        const aberta = atual?.id === m.id;
        return (
          <li key={m.id} className={cn('rounded border p-2 text-sm', m.ok ? 'border-accent/40' : aberta ? 'border-info/60' : 'border-line opacity-60')}>
            <p className="flex items-start gap-2">
              <span className="fonte-titulo text-[10px] text-muted">#{idx + 1}</span>
              <span className={cn('flex-1', m.ok && 'text-muted')}>{m.pergunta}</span>
              {m.ok && <Check size={14} className="shrink-0 text-accent" />}
            </p>
            {aberta && (
              <div className="mt-2 space-y-2">
                <Textarea rows={3} value={m.resposta ?? ''} onChange={(e) => salvar(m.id, { resposta: e.target.value })} placeholder="Com as suas palavras, sem olhar o quadro." />
                <ErrorNote error={error} />
                {diag?.id === m.id && diag.d.nivel === 'errado' && (
                  <div className="rounded border border-warn/50 bg-warn/5 p-2 text-xs">
                    <p className="font-bold uppercase tracking-widest text-warn">Ainda não: {ERRO_TEXTO[diag.d.tipoErro]}</p>
                    {diag.d.causa && <p className="mt-1">{diag.d.causa}</p>}
                    {diag.d.reparo.ideia && <p className="mt-1">{diag.d.reparo.ideia}</p>}
                    <p className="mt-1 text-muted">Ajuste a resposta e tente de novo.</p>
                  </div>
                )}
                {verRef === m.id ? (
                  <div className="rounded border border-accent/40 bg-accent/5 p-2 text-xs">
                    <p className="mb-1 font-bold uppercase tracking-widest text-accent">Resposta do material</p>
                    <p>{m.referencia || 'Compare com o quadro.'}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      Como foi?
                      <Button onClick={() => autoavaliar(m, true)}>Lembrei</Button>
                      <Button onClick={() => autoavaliar(m, false)}>Ainda não</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button variant="primary" onClick={() => responder(m)} disabled={loading || !(m.resposta ?? '').trim()}>
                      <Sparkles size={14} /> {loading ? 'O professor está ouvindo…' : aiOn ? 'Responder' : 'Ver a resposta'}
                    </Button>
                    <Button onClick={() => responder(m, true)} disabled={loading}>
                      Não sei
                    </Button>
                  </div>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
