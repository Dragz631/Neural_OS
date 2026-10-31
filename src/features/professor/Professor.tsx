import { Orbe } from '../../components/Orbe';
import { useEffect, useMemo, useState } from 'react';
import { FileDown, PenLine, Play, Shapes, Sparkles, Square } from 'lucide-react';
import { formatShort } from '../../domain/dates';
import { GRADE_LABEL, gradeFromScore, isDue, type Grade } from '../../domain/srs';
import type { Id, Lesson, Topic } from '../../domain/types';
import { useAI } from '../../hooks/useAI';
import { toast } from '../../store/toast';
import { gerarCena } from '../../services/ai/cena';
import { evaluateExplanation, generateLesson, type ExplanationReview, type TopicContext } from '../../services/ai/professor';
import { exportTopic } from '../../services/vault';
import { useNav } from '../../store/nav';
import { useIALigada } from '../../store/conexoes';
import { topicPath, useStudy } from '../../store/study';
import { TopicModal, TopicSelect } from '../../components/TopicPicker';
import { Badge, Button, Empty, ErrorNote, Label, Modal, Panel, Textarea } from '../../components/ui';
import { cn } from '../../lib/utils';
import { QuadroProfessor } from './QuadroProfessor';
import { RevisaoGuiada } from '../revisao/RevisaoGuiada';

/** Junta tudo que a IA precisa saber sobre você neste tópico. */
function useTopicContext(topic?: Topic): TopicContext | undefined {
  const subjects = useStudy((s) => s.subjects);
  const topics = useStudy((s) => s.topics);
  const sessions = useStudy((s) => s.sessions);
  return useMemo(() => {
    if (!topic) return undefined;
    const parents: Topic[] = [];
    let p = topics.find((t) => t.id === topic.parentId);
    while (p && parents.length < 5) {
      parents.push(p);
      p = topics.find((t) => t.id === p!.parentId);
    }
    return { topic, subject: subjects.find((s) => s.id === topic.subjectId), parents, sessions: sessions.filter((s) => s.topicId === topic.id) };
  }, [topic, subjects, topics, sessions]);
}

export default function Professor() {
  const navTopicId = useNav((s) => s.topicId);
  const targetTopicId = useStudy((s) => s.target.topicId);
  const [topicId, setTopicId] = useState<Id | undefined>(navTopicId ?? targetTopicId);
  const topic = useStudy((s) => s.topics.find((t) => t.id === topicId));
  const subjects = useStudy((s) => s.subjects);
  const [newTopicOpen, setNewTopicOpen] = useState(false);

  // Se outra aba mandou abrir um tópico específico, segue ela.
  useEffect(() => {
    if (navTopicId) setTopicId(navTopicId);
  }, [navTopicId]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4">
      <Panel>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[240px] flex-1">
            <Label>Aula de hoje</Label>
            <TopicSelect value={topicId} onChange={setTopicId} />
          </label>
          <Button onClick={() => setNewTopicOpen(true)}>+ Novo tópico</Button>
          {topic && <SessionTimer key={topic.id} topic={topic} />}
        </div>
        {topic && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span>{topicPath(subjects, topic)}</span>
            <Badge>domínio {topic.mastery}%</Badge>
            {topic.lastStudiedAt && (isDue(topic.review) ? <Badge color="var(--color-warn)">revisão vencida</Badge> : <Badge>próxima revisão {formatShort(topic.review.due)}</Badge>)}
          </div>
        )}
      </Panel>

      {!topic ? (
        <Empty>Escolha um tópico (ou crie um) pra o Prof. A.Ilson preparar o quadro.</Empty>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
            <Blackboard key={topic.id} topic={topic} />
            <NotesPanel topic={topic} />
          </div>
          <RevisaoGuiada key={`revisao-${topic.id}`} topic={topic} />
          <ExplainPanel key={`explain-${topic.id}`} topic={topic} />
        </>
      )}

      <TopicModal open={newTopicOpen} onClose={() => setNewTopicOpen(false)} onCreated={setTopicId} />
    </div>
  );
}

function SessionTimer({ topic }: { topic: Topic }) {
  const logSession = useStudy((s) => s.logSession);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [, tick] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const id = setInterval(() => tick((n) => n + 1), 15_000);
    return () => clearInterval(id);
  }, [startedAt]);

  const minutes = startedAt ? Math.max(1, Math.round((Date.now() - startedAt) / 60_000)) : 0;

  if (!startedAt) {
    return (
      <Button variant="primary" onClick={() => setStartedAt(Date.now())}>
        <Play size={14} /> Iniciar sessão
      </Button>
    );
  }
  return (
    <Button
      variant="primary"
      onClick={() => {
        const xp = logSession({ topicId: topic.id, minutes, kind: 'aula' });
        toast({ title: `Sessão registrada: ${minutes} min`, description: `+${xp} XP em ${topic.title}`, variant: 'success' });
        setStartedAt(null);
      }}
    >
      <Square size={14} /> Encerrar ({minutes} min)
    </Button>
  );
}

function Blackboard({ topic }: { topic: Topic }) {
  const ctx = useTopicContext(topic);
  const setLesson = useStudy((s) => s.setLesson);
  const aiOn = useIALigada();
  const { run, loading, error } = useAI();
  const [editing, setEditing] = useState(false);
  const lesson = topic.lesson;

  // O desenho é uma segunda chamada: se falhar, a aula fica e o quadro usa o desenho em colunas.
  const desenhar = async (l: Lesson, signal: AbortSignal) => {
    try {
      return await gerarCena(ctx!, l, signal);
    } catch (e) {
      if (signal.aborted) throw e;
      return undefined;
    }
  };
  const generate = () =>
    run(async (signal) => {
      const l = await generateLesson(ctx!, signal);
      setLesson(topic.id, { ...l, cena: await desenhar(l, signal) });
    });
  /** Mesmo conteúdo, outro jeito de desenhar: entra ao lado, sem apagar o que já está no quadro. */
  const redesenhar = () =>
    run(async (signal) => {
      if (!lesson) return;
      const cena = await desenhar(lesson, signal);
      if (!cena) throw new Error('o professor não conseguiu desenhar de outro jeito agora, tente de novo');
      setLesson(topic.id, { ...lesson, cena, generatedAt: new Date().toISOString() });
    });

  return (
    <section className="rounded border-4 border-line bg-panel-2 p-5 shadow-[inset_0_0_60px_rgba(0,0,0,0.6)]">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-3">
          <Orbe estado={loading ? 'thinking' : 'idle'} tamanho={64} />
          <div>
            <p className="fonte-titulo text-[10px] uppercase tracking-[0.3em] text-muted">Quadro do Prof. A.Ilson</p>
            <h2 className="text-xl font-bold text-fg">{topic.title}</h2>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={generate} disabled={!aiOn || loading} title={aiOn ? '' : 'Ative a IA nas configurações'}>
            <Sparkles size={14} /> {loading ? 'Escrevendo…' : lesson ? 'Reescrever com IA' : 'Gerar aula com IA'}
          </Button>
          {lesson && (
            <Button onClick={redesenhar} disabled={!aiOn || loading} title="Mesmo conteúdo, desenhado de outro jeito">
              <Shapes size={14} /> Desenhar de outro jeito
            </Button>
          )}
          <Button onClick={() => setEditing(true)}>
            <PenLine size={14} /> {lesson ? 'Editar' : 'Escrever eu mesmo'}
          </Button>
        </div>
      </header>

      <ErrorNote error={error} />

      {!lesson && (
        <p className="mb-3 text-sm text-muted">
          {aiOn ? 'Peça a aula: o professor desenha no quadro (e lê suas anotações e seu histórico). O quadro já é seu pra anotar.' : 'Sem IA: escreva a aula você mesmo, ou conecte um modelo. O quadro já é seu pra anotar.'}
        </p>
      )}
      <QuadroProfessor topic={topic} lesson={lesson} />

      <LessonEditor key={lesson?.generatedAt ?? 'new'} open={editing} onClose={() => setEditing(false)} topic={topic} />
    </section>
  );
}

/** Edição manual: cada lista é uma linha por item. */
function LessonEditor({ open, onClose, topic }: { open: boolean; onClose: () => void; topic: Topic }) {
  const setLesson = useStudy((s) => s.setLesson);
  const l = topic.lesson;
  const [explanation, setExplanation] = useState(l?.explanation ?? '');
  const [keyPoints, setKeyPoints] = useState(l?.keyPoints.join('\n') ?? '');
  const [videos, setVideos] = useState(l?.videoSearches.join('\n') ?? topic.title);
  const [where, setWhere] = useState(l?.whereToResearch.join('\n') ?? '');
  const [tips, setTips] = useState(l?.tips.join('\n') ?? '');
  const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

  const save = () => {
    setLesson(topic.id, {
      explanation,
      keyPoints: lines(keyPoints),
      videoSearches: lines(videos),
      whereToResearch: lines(where),
      tips: lines(tips),
      generatedAt: new Date().toISOString(),
      source: 'manual',
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Escrever no quadro" wide>
      <div className="space-y-3">
        <label className="block">
          <Label>Explicação</Label>
          <Textarea rows={6} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <Label>Pontos-chave (um por linha)</Label>
            <Textarea rows={4} value={keyPoints} onChange={(e) => setKeyPoints(e.target.value)} />
          </label>
          <label className="block">
            <Label>Buscas no YouTube (uma por linha)</Label>
            <Textarea rows={4} value={videos} onChange={(e) => setVideos(e.target.value)} />
          </label>
          <label className="block">
            <Label>Onde pesquisar</Label>
            <Textarea rows={4} value={where} onChange={(e) => setWhere(e.target.value)} />
          </label>
          <label className="block">
            <Label>Dicas</Label>
            <Textarea rows={4} value={tips} onChange={(e) => setTips(e.target.value)} />
          </label>
        </div>
        <Button variant="primary" className="w-full" onClick={save}>
          Salvar no quadro
        </Button>
      </div>
    </Modal>
  );
}

function NotesPanel({ topic }: { topic: Topic }) {
  const updateTopic = useStudy((s) => s.updateTopic);
  const subject = useStudy((s) => s.subjects.find((x) => x.id === topic.subjectId));
  const parent = useStudy((s) => s.topics.find((x) => x.id === topic.parentId));
  const [saving, setSaving] = useState(false);

  const toObsidian = async () => {
    setSaving(true);
    try {
      const path = await exportTopic(topic, subject, parent);
      toast({ title: 'Salvo no Obsidian', description: path, variant: 'success' });
    } catch (e) {
      toast({ title: 'Não salvou no Obsidian', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel
      title="Minhas anotações"
      actions={
        <Button className="px-2 py-1 text-[10px]" onClick={toObsidian} disabled={saving}>
          <FileDown size={12} /> Obsidian
        </Button>
      }
      className="flex flex-col"
    >
      <Textarea
        value={topic.notes}
        onChange={(e) => updateTopic(topic.id, { notes: e.target.value })}
        placeholder={'Escreva com suas palavras o que entendeu.\nO professor lê isso pra montar a aula e os desafios.'}
        className="min-h-[320px] flex-1 font-mono text-[13px]"
      />
      <p className="mt-2 text-[10px] text-muted">Salva sozinho. Aceita markdown.</p>
    </Panel>
  );
}

/** Técnica Feynman: explique com suas palavras. Resultado agenda a próxima revisão. */
function ExplainPanel({ topic }: { topic: Topic }) {
  const ctx = useTopicContext(topic);
  const gradeTopic = useStudy((s) => s.gradeTopic);
  const logSession = useStudy((s) => s.logSession);
  const aiOn = useIALigada();
  const { run, loading, error } = useAI();
  const [text, setText] = useState('');
  const [review, setReview] = useState<ExplanationReview | null>(null);
  const [done, setDone] = useState<Grade | null>(null);
  const due = !!topic.lastStudiedAt && isDue(topic.review);

  const finish = (grade: Grade, score?: number) => {
    gradeTopic(topic.id, grade);
    const xp = logSession({ topicId: topic.id, minutes: 5, kind: due ? 'revisao' : 'explicacao', score, note: text.slice(0, 500) || undefined });
    setDone(grade);
    toast({ title: `${GRADE_LABEL[grade]} · +${xp} XP`, description: 'Próxima revisão agendada.', variant: 'success' });
  };

  const evaluate = () =>
    run(async (signal) => {
      const r = await evaluateExplanation(ctx!, text, signal);
      setReview(r);
      finish(gradeFromScore(r.score), r.score);
    });

  return (
    <Panel title={due ? 'Revisão — explique sem olhar as anotações' : 'Prove que entendeu (Técnica Feynman)'}>
      <p className="mb-3 text-xs leading-relaxed text-muted">
        Explique como se fosse pra alguém que nunca viu o assunto. Se travar em algum ponto, é ali que está a lacuna.
      </p>
      <Textarea rows={5} value={text} onChange={(e) => setText(e.target.value)} placeholder={`O que é ${topic.title}, pra que serve, e um exemplo…`} disabled={!!done} />
      <ErrorNote error={error} />

      {!done && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {aiOn && (
            <Button variant="primary" onClick={evaluate} disabled={loading || text.trim().length < 20}>
              <Sparkles size={14} /> {loading ? 'Avaliando…' : 'Avaliar com o professor'}
            </Button>
          )}
          <span className="text-[10px] uppercase tracking-widest text-muted">{aiOn ? 'ou avalie você mesmo:' : 'Compare com o quadro e avalie-se:'}</span>
          {(Object.keys(GRADE_LABEL) as Grade[]).map((g) => (
            <Button key={g} onClick={() => finish(g)} className={cn(g === 'errei' && 'text-danger')}>
              {GRADE_LABEL[g]}
            </Button>
          ))}
        </div>
      )}

      {review && (
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded border border-line bg-bg p-3 text-center">
            <div className={cn('text-3xl font-bold', review.score >= 70 ? 'text-accent' : review.score >= 50 ? 'text-warn' : 'text-danger')}>{review.score}</div>
            <div className="text-[10px] uppercase text-muted">nota</div>
          </div>
          <FeedbackList title="Acertou" items={review.strengths} color="text-accent" />
          <FeedbackList title="Faltou" items={review.gaps} color="text-warn" />
          <p className="rounded border border-line bg-bg p-3 text-sm leading-relaxed md:col-span-3">
            <b className="text-info">Resumo do professor:</b> {review.correction}
          </p>
        </div>
      )}

      {done && (
        <div className="mt-3 flex items-center gap-2 text-xs text-muted">
          Avaliado como <Badge>{GRADE_LABEL[done]}</Badge>
          <Button
            className="px-2 py-1 text-[10px]"
            onClick={() => {
              setDone(null);
              setReview(null);
              setText('');
            }}
          >
            Explicar de novo
          </Button>
        </div>
      )}
    </Panel>
  );
}

function FeedbackList({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div className="rounded border border-line bg-bg p-3">
      <div className={cn('mb-1 text-[10px] font-bold uppercase tracking-widest', color)}>{title}</div>
      <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed">
        {items.length ? items.map((i) => <li key={i}>{i}</li>) : <li className="list-none text-muted">—</li>}
      </ul>
    </div>
  );
}
