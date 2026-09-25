import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { CheckCircle2, CircleAlert, Dices, Eye, PenLine, Sparkles, Trash2 } from 'lucide-react';
import { basicCheck } from '../../domain/basicCheck';
import { gradeFromScore } from '../../domain/srs';
import type { Challenge, Id, Topic } from '../../domain/types';
import { CHALLENGE_BANK } from '../../data/challengeBank';
import { useAI } from '../../hooks/useAI';
import { toast } from '../../store/toast';
import { generateChallenge, reviewCode } from '../../services/ai/professor';
import { useNav } from '../../store/nav';
import { useSettings } from '../../store/settings';
import { newId, selectDueTopics, topicPath, useStudy } from '../../store/study';
import { TopicSelect } from '../../components/TopicPicker';
import { LANGUAGES } from '../../domain/catalog';
import { Badge, Button, Empty, ErrorNote, Label, Modal, Panel, Select, Textarea } from '../../components/ui';
import { cn } from '../../lib/utils';

// Sandbox = academia de prática. Os desafios saem do que você já estudou,
// priorizando o que está pra esquecer. O código NÃO roda: a correção lê
// a lógica e a sintaxe, como numa prova no papel.

export default function Sandbox() {
  const navTopicId = useNav((s) => s.topicId);
  const topics = useStudy((s) => s.topics);
  const subjects = useStudy((s) => s.subjects);
  const challenges = useStudy((s) => s.challenges);
  const targetTopicId = useStudy((s) => s.target.topicId);
  const due = useMemo(() => selectDueTopics(topics), [topics]);

  const [topicId, setTopicId] = useState<Id | undefined>(navTopicId ?? due[0]?.id ?? targetTopicId);
  const [activeId, setActiveId] = useState<Id | null>(null);

  useEffect(() => {
    if (navTopicId) setTopicId(navTopicId);
  }, [navTopicId]);

  const topic = topics.find((t) => t.id === topicId);
  const subject = subjects.find((s) => s.id === topic?.subjectId);
  const history = useMemo(() => challenges.filter((c) => c.topicId === topicId), [challenges, topicId]);
  const active = challenges.find((c) => c.id === activeId && c.topicId === topicId);

  return (
    <div className="mx-auto grid max-w-[1500px] gap-4 p-4 lg:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <Panel title="Praticar">
          <label className="block">
            <Label>Tópico</Label>
            <TopicSelect
              value={topicId}
              onChange={(id) => {
                setTopicId(id);
                setActiveId(null);
              }}
            />
          </label>
          {topic && <p className="mt-2 text-[11px] text-muted">Linguagem: {LANGUAGES.find((l) => l.id === subject?.language)?.label ?? '—'} (muda na matéria)</p>}
          {topic && <NewChallenge topic={topic} language={subject?.language ?? ''} onCreated={setActiveId} />}
        </Panel>

        {due.length > 0 && (
          <Panel title="Pra não esquecer">
            <ul className="space-y-1">
              {due.slice(0, 5).map((t) => (
                <li key={t.id}>
                  <button type="button" onClick={() => setTopicId(t.id)} className="w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-panel-2">
                    {topicPath(subjects, t)}
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        {topic && (
          <Panel title={`Histórico (${history.length})`}>
            {history.length === 0 ? (
              <Empty>Nenhum desafio neste tópico ainda.</Empty>
            ) : (
              <ul className="space-y-1">
                {history.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setActiveId(c.id)}
                      className={cn('flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-panel-2', c.id === activeId && 'bg-panel-2')}
                    >
                      {c.solvedAt ? <CheckCircle2 size={12} className="shrink-0 text-accent" /> : <CircleAlert size={12} className="shrink-0 text-muted" />}
                      <span className="truncate">{c.prompt.split('\n')[0]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>

      {active && topic ? (
        <ChallengeView key={active.id} challenge={active} topic={topic} />
      ) : (
        <Empty>{topic ? 'Gere ou escolha um desafio à esquerda.' : 'Escolha um tópico que você já estudou.'}</Empty>
      )}
    </div>
  );
}

function NewChallenge({ topic, language, onCreated }: { topic: Topic; language: string; onCreated: (id: Id) => void }) {
  const saveChallenge = useStudy((s) => s.saveChallenge);
  const subjects = useStudy((s) => s.subjects);
  const topics = useStudy((s) => s.topics);
  const sessions = useStudy((s) => s.sessions);
  const aiOn = useSettings((s) => s.provider !== 'off');
  const { run, loading, error } = useAI();
  const [size, setSize] = useState<'micro' | 'normal'>('normal');
  const [ownOpen, setOwnOpen] = useState(false);

  const create = (data: Pick<Challenge, 'prompt' | 'hints' | 'starterCode'>) => {
    const c: Challenge = { id: newId('ch'), topicId: topic.id, language, ...data, code: data.starterCode, createdAt: new Date().toISOString() };
    saveChallenge(c);
    onCreated(c.id);
  };

  const fromAI = () =>
    run(async (signal) => {
      const parents: Topic[] = [];
      let p = topics.find((t) => t.id === topic.parentId);
      while (p && parents.length < 5) {
        parents.push(p);
        p = topics.find((t) => t.id === p!.parentId);
      }
      const ctx = { topic, subject: subjects.find((s) => s.id === topic.subjectId), parents, sessions: sessions.filter((s) => s.topicId === topic.id) };
      create(await generateChallenge(ctx, language, size, signal));
    });

  const bank = CHALLENGE_BANK.filter((c) => c.language === language && c.micro === (size === 'micro'));
  const fromBank = () => {
    const c = bank[Math.floor(Math.random() * bank.length)];
    create({ prompt: `${c.title}\n\n${c.prompt}`, hints: c.hints, starterCode: c.starterCode });
  };

  return (
    <div className="mt-4 space-y-2">
      <label className="block">
        <Label>Tamanho</Label>
        <Select value={size} onChange={(e) => setSize(e.target.value as 'micro' | 'normal')}>
          <option value="micro">Micro (~5 min)</option>
          <option value="normal">Normal (15-25 min)</option>
        </Select>
      </label>
      <Button variant="primary" className="w-full" onClick={fromAI} disabled={!aiOn || loading} title={aiOn ? '' : 'Ative a IA nas configurações'}>
        <Sparkles size={14} /> {loading ? 'Criando desafio…' : 'Desafio personalizado (IA)'}
      </Button>
      {bank.length > 0 && (
        <Button className="w-full" onClick={fromBank}>
          <Dices size={14} /> Sortear do banco ({bank.length})
        </Button>
      )}
      <Button className="w-full" onClick={() => setOwnOpen(true)}>
        <PenLine size={14} /> Escrever meu próprio
      </Button>
      <ErrorNote error={error} />
      <OwnChallengeModal open={ownOpen} onClose={() => setOwnOpen(false)} onCreate={create} />
    </div>
  );
}

function OwnChallengeModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (d: Pick<Challenge, 'prompt' | 'hints' | 'starterCode'>) => void }) {
  const [prompt, setPrompt] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Meu desafio">
      <Textarea rows={6} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Ex.: Implementar uma classe ContaBancaria com saldo privado e método Sacar que não deixa ficar negativo." />
      <Button
        variant="primary"
        className="mt-3 w-full"
        disabled={!prompt.trim()}
        onClick={() => {
          onCreate({ prompt: prompt.trim(), hints: [], starterCode: '' });
          setPrompt('');
          onClose();
        }}
      >
        Criar
      </Button>
    </Modal>
  );
}

function ChallengeView({ challenge, topic }: { challenge: Challenge; topic: Topic }) {
  const saveChallenge = useStudy((s) => s.saveChallenge);
  const removeChallenge = useStudy((s) => s.removeChallenge);
  const gradeTopic = useStudy((s) => s.gradeTopic);
  const logSession = useStudy((s) => s.logSession);
  const aiOn = useSettings((s) => s.provider !== 'off');
  const { run, loading, error } = useAI();
  const [code, setCode] = useState(challenge.code);
  const [hintsShown, setHintsShown] = useState(0);
  const startedAt = useRef(Date.now());

  // Salva o rascunho (com um pequeno atraso pra não gravar a cada tecla).
  useEffect(() => {
    if (code === challenge.code) return;
    const id = setTimeout(() => saveChallenge({ ...challenge, code }), 600);
    return () => clearTimeout(id);
  }, [code, challenge, saveChallenge]);

  const submit = () =>
    run(async (signal) => {
      const keywords = CHALLENGE_BANK.find((b) => challenge.prompt.startsWith(b.title))?.keywords;
      const review = aiOn ? await reviewCode(challenge, code, signal) : basicCheck(code, challenge.language, keywords);
      const solved = review.source === 'ia' && review.syntaxOk && review.logicOk && review.score >= 70;
      saveChallenge({ ...challenge, code, review, solvedAt: solved ? new Date().toISOString() : challenge.solvedAt });

      if (review.source === 'ia') {
        gradeTopic(topic.id, gradeFromScore(review.score));
        const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60_000));
        const xp = logSession({ topicId: topic.id, minutes, kind: 'desafio', score: review.score });
        toast({ title: solved ? `Resolvido! +${xp} XP` : `Nota ${review.score} · +${xp} XP`, variant: solved ? 'success' : 'default' });
      }
    });

  // Checagem básica não sabe se a lógica está certa: você mesmo fecha o desafio.
  const selfGrade = (ok: boolean) => {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt.current) / 60_000));
    gradeTopic(topic.id, ok ? 'bom' : 'errei');
    const xp = logSession({ topicId: topic.id, minutes, kind: 'desafio', score: ok ? 75 : 40 });
    saveChallenge({ ...challenge, code, solvedAt: ok ? new Date().toISOString() : undefined });
    toast({ title: `Registrado · +${xp} XP`, variant: 'success' });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const { selectionStart: s, selectionEnd: end } = el;
      const next = `${code.slice(0, s)}    ${code.slice(end)}`;
      setCode(next);
      requestAnimationFrame(() => el.setSelectionRange(s + 4, s + 4));
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      submit();
    }
  };

  const review = challenge.review;
  const lines = Math.max(12, code.split('\n').length);

  return (
    <div className="space-y-4">
      <Panel
        title="Desafio"
        actions={
          <Button
            className="px-2 py-1 text-[10px]"
            variant="danger"
            onClick={() => confirm('Apagar este desafio?') && removeChallenge(challenge.id)}
            aria-label="Apagar desafio"
          >
            <Trash2 size={12} />
          </Button>
        }
      >
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{challenge.prompt}</p>
        {challenge.hints.length > 0 && (
          <div className="mt-3 space-y-1">
            {challenge.hints.slice(0, hintsShown).map((h, i) => (
              <p key={i} className="rounded border border-info/30 bg-info/5 p-2 text-xs text-info">
                Dica {i + 1}: {h}
              </p>
            ))}
            {hintsShown < challenge.hints.length && (
              <Button className="px-2 py-1 text-[10px]" onClick={() => setHintsShown((n) => n + 1)}>
                <Eye size={12} /> Ver dica {hintsShown + 1}/{challenge.hints.length}
              </Button>
            )}
          </div>
        )}
      </Panel>

      <div className="overflow-hidden rounded border border-line bg-bg">
        <div className="flex items-center justify-between border-b border-line bg-panel px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted">
          <span>{LANGUAGES.find((l) => l.id === challenge.language)?.label || 'código'}</span>
          <span>Tab = 4 espaços · Ctrl+Enter = corrigir</span>
        </div>
        <div className="flex max-h-[60vh] overflow-auto">
          <pre aria-hidden className="select-none border-r border-line px-2 py-3 text-right text-[13px] leading-6 text-muted/50">
            {Array.from({ length: lines }, (_, i) => i + 1).join('\n')}
          </pre>
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={onKeyDown}
            spellCheck={false}
            rows={lines}
            className="flex-1 resize-none bg-transparent px-3 py-3 text-[13px] leading-6 text-fg outline-none"
            placeholder="Escreva sua solução aqui…"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="primary" onClick={submit} disabled={loading || !code.trim()}>
          <Sparkles size={14} /> {loading ? 'Corrigindo…' : aiOn ? 'Corrigir com o professor' : 'Checagem básica'}
        </Button>
        {challenge.solvedAt && <Badge color="var(--color-accent)">resolvido</Badge>}
      </div>
      <ErrorNote error={error} />

      {review && (
        <Panel title={review.source === 'ia' ? 'Correção do professor' : 'Checagem básica (sem IA)'}>
          <div className="mb-3 flex flex-wrap gap-2">
            <Badge color={review.syntaxOk ? 'var(--color-accent)' : 'var(--color-danger)'}>sintaxe {review.syntaxOk ? 'ok' : 'com erro'}</Badge>
            {review.source === 'ia' && <Badge color={review.logicOk ? 'var(--color-accent)' : 'var(--color-danger)'}>lógica {review.logicOk ? 'ok' : 'com erro'}</Badge>}
            {review.source === 'ia' && <Badge>nota {review.score}</Badge>}
          </div>
          {review.issues.length > 0 && (
            <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-warn">
              {review.issues.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
          )}
          <p className="text-sm leading-relaxed">{review.feedback}</p>
          {review.source === 'basica' && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
              <span className="text-xs text-muted">Conferiu com o enunciado? Sua lógica resolve?</span>
              {review.issues.length === 0 && <Button onClick={() => selfGrade(true)}>Sim, resolvi</Button>}
              <Button onClick={() => selfGrade(false)}>Não, errei</Button>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
