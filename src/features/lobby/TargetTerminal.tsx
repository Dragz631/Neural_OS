import { useState } from 'react';
import { Code2, GraduationCap, Plus, SlidersHorizontal, Target as TargetIcon } from 'lucide-react';
import { diffDays, formatShort, toLocalDate } from '../../domain/dates';
import type { Priority } from '../../domain/types';
import { useNav } from '../../store/nav';
import { topicPath, useStudy } from '../../store/study';
import { SubjectModal, TopicModal, TopicSelect } from '../../components/TopicPicker';
import { Badge, Button, Input, Label, Panel, ProgressBar, Select, Textarea } from '../../components/ui';

const PRIORIDADES: Priority[] = ['NORMAL', 'ALTA', 'CRÍTICA'];
const COR_PRIORIDADE: Record<Priority, string> = {
  NORMAL: 'var(--color-muted)',
  ALTA: 'var(--color-warn)',
  CRÍTICA: 'var(--color-danger)',
};

/** TARGET_ATUAL // o que estou aprendendo agora. */
export function TargetTerminal() {
  const subjects = useStudy((s) => s.subjects);
  if (subjects.length === 0) return <Boasvindas />;
  return <Target />;
}

function Target() {
  const target = useStudy((s) => s.target);
  const setTarget = useStudy((s) => s.setTarget);
  const subjects = useStudy((s) => s.subjects);
  const topic = useStudy((s) => s.topics.find((t) => t.id === s.target.topicId));
  const go = useNav((s) => s.go);
  const [calibrando, setCalibrando] = useState(!target.topicId);
  const [topicOpen, setTopicOpen] = useState(false);
  const prioridade = target.priority ?? 'NORMAL';
  const dias = target.deadline ? diffDays(target.deadline, toLocalDate()) : undefined;

  return (
    <Panel
      accent
      title="Target_atual // foco prioritário"
      actions={
        <Button className="px-2 py-1 text-[10px]" onClick={() => setCalibrando((c) => !c)}>
          <SlidersHorizontal size={12} /> {calibrando ? 'Pronto' : 'Calibrar'}
        </Button>
      }
    >
      {topic && !calibrando ? (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <TargetIcon size={22} className="mt-1 shrink-0 animate-pulse text-accent" />
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap gap-2">
                <Badge color={COR_PRIORIDADE[prioridade]}>{prioridade}</Badge>
                {dias !== undefined && (
                  <Badge color={dias <= 2 ? 'var(--color-danger)' : 'var(--color-warn)'}>
                    {dias >= 0 ? `${dias} dia(s) · ${formatShort(target.deadline!)}` : 'prazo passou'}
                  </Badge>
                )}
              </div>
              <h3 className="cursor-blink text-glow text-lg font-bold text-fg">{topic.title}</h3>
              <p className="text-[11px] uppercase tracking-wider text-info">{topicPath(subjects, topic)}</p>
              {target.goal && <p className="mt-1 text-sm text-muted">Pra quê: {target.goal}</p>}
              {target.description && <p className="mt-1 text-sm leading-relaxed">{target.description}</p>}
            </div>
          </div>
          <div>
            <div className="mb-1 flex justify-between text-[10px] uppercase tracking-widest text-muted">
              <span>Domínio</span>
              <span>{topic.mastery}%</span>
            </div>
            <ProgressBar value={topic.mastery} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => go('professor', topic.id)}>
              <GraduationCap size={14} /> Iniciar sessão no Prof. A.Ilson
            </Button>
            <Button onClick={() => go('sandbox', topic.id)}>
              <Code2 size={14} /> Codar no Sandbox
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <label className="block">
              <Label>O que estou aprendendo</Label>
              <TopicSelect value={target.topicId} onChange={(topicId) => setTarget({ ...target, topicId })} />
            </label>
            <div className="flex items-end">
              <Button onClick={() => setTopicOpen(true)}>
                <Plus size={14} /> Novo tópico
              </Button>
            </div>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_150px_130px]">
            <label className="block">
              <Label>Pra quê? (prova, trabalho...)</Label>
              <Input value={target.goal} onChange={(e) => setTarget({ ...target, goal: e.target.value })} placeholder="Ex.: Prova A1 de POO" />
            </label>
            <label className="block">
              <Label>Prazo</Label>
              <Input type="date" value={target.deadline ?? ''} onChange={(e) => setTarget({ ...target, deadline: e.target.value || undefined })} />
            </label>
            <label className="block">
              <Label>Prioridade</Label>
              <Select value={prioridade} onChange={(e) => setTarget({ ...target, priority: e.target.value as Priority })}>
                {PRIORIDADES.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </Select>
            </label>
          </div>
          <label className="block">
            <Label>Descrição (opcional)</Label>
            <Textarea rows={2} value={target.description ?? ''} onChange={(e) => setTarget({ ...target, description: e.target.value || undefined })} />
          </label>
        </div>
      )}
      <TopicModal open={topicOpen} onClose={() => setTopicOpen(false)} onCreated={(topicId) => setTarget({ ...target, topicId })} />
    </Panel>
  );
}

function Boasvindas() {
  const [aberto, setAberto] = useState(false);
  return (
    <Panel accent title="Começar // primeiro passo">
      <div className="space-y-3 text-sm leading-relaxed">
        <p>
          O Neural-OS gira em torno do que <b className="text-accent">você</b> está estudando. Nada vem pronto:
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-muted">
          <li>Crie uma matéria (ex.: C#, Cálculo II, LFA).</li>
          <li>Crie o primeiro tópico e defina como Target.</li>
          <li>Siga o Próximo passo. A árvore cresce conforme você aprende.</li>
        </ol>
        <Button variant="primary" onClick={() => setAberto(true)}>
          <Plus size={14} /> Criar primeira matéria
        </Button>
      </div>
      <SubjectModal open={aberto} onClose={() => setAberto(false)} />
    </Panel>
  );
}
