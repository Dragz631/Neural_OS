import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { Code2, GitBranchPlus, GraduationCap, Maximize2, Plus, Trash2 } from 'lucide-react';
import { formatShort, toLocalDate } from '../../domain/dates';
import { isDue } from '../../domain/srs';
import { bounds, layoutTree, type TreeNode } from '../../domain/tree';
import type { Id } from '../../domain/types';
import { useNav } from '../../store/nav';
import { topicPath, useStudy } from '../../store/study';
import { SubjectModal, TopicModal } from '../../components/TopicPicker';
import { Badge, Button, Empty, Label, Panel, ProgressBar, Select } from '../../components/ui';
import { LANGUAGES } from '../../domain/catalog';

interface View {
  x: number;
  y: number;
  scale: number;
}

const INITIAL_VIEW: View = { x: 0, y: 0, scale: 1 };

export default function NeuralTree() {
  const subjects = useStudy((s) => s.subjects);
  const topics = useStudy((s) => s.topics);
  const { nodes, edges } = useMemo(() => layoutTree(subjects, topics), [subjects, topics]);
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const [selected, setSelected] = useState<Id | null>(null);
  const [view, setView] = useState<View>(INITIAL_VIEW);
  const drag = useRef<{ x: number; y: number } | null>(null);
  // Fica true depois de arrastar, pra o clique que termina o arraste não selecionar nó.
  const moved = useRef(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const svgRef = useRef<SVGSVGElement>(null);
  const today = toLocalDate();

  // Enquadra a árvore inteira na área visível.
  const fit = useCallback(() => {
    const el = svgRef.current;
    if (!el || nodes.length < 2) return setView(INITIAL_VIEW);
    const { width, height } = el.getBoundingClientRect();
    const b = bounds(nodes);
    const scale = Math.min(1.2, width / (b.maxX - b.minX), height / (b.maxY - b.minY));
    setView({ scale, x: -((b.minX + b.maxX) / 2) * scale, y: -((b.minY + b.maxY) / 2) * scale });
  }, [nodes]);

  // Enquadra ao abrir e quando a quantidade de nós muda.
  useEffect(fit, [nodes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Arrastar pra mover, roda do mouse pra zoom.
  const onPointerDown = (e: PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY };
    moved.current = false;
  };
  const onPointerMove = (e: PointerEvent) => {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    if (!moved.current && Math.abs(dx) + Math.abs(dy) > 3) {
      moved.current = true;
      // Só "prende" o ponteiro quando vira arraste; antes disso, clique em nó funciona normal.
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    }
    drag.current.x = e.clientX;
    drag.current.y = e.clientY;
    setView((v) => ({ ...v, x: v.x + dx, y: v.y + dy }));
  };
  const onPointerUp = () => {
    drag.current = null;
  };
  const onWheel = (e: WheelEvent) => {
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
    setView((v) => ({ ...v, scale: Math.min(3, Math.max(0.3, v.scale * factor)) }));
  };
  const pick = (id: Id) => {
    if (!moved.current) setSelected(id);
  };

  const selectedNode = selected ? byId.get(selected) : undefined;

  return (
    <div className="mx-auto grid max-w-[1500px] gap-4 p-4 lg:grid-cols-[1fr_340px]">
      <div className="relative h-[calc(100vh-120px)] min-h-[420px] overflow-hidden rounded border border-line bg-[radial-gradient(circle_at_center,#0f1e17_0%,#0a0f0d_70%)]">
        <div className="absolute left-3 top-3 z-10 flex gap-2">
          <Button onClick={() => setSubjectOpen(true)}>
            <Plus size={14} /> Matéria
          </Button>
          <Button onClick={fit} title="Enquadrar a árvore">
            <Maximize2 size={14} />
          </Button>
        </div>
        <Legend />

        {subjects.length === 0 ? (
          <div className="flex h-full items-center justify-center p-8">
            <Empty>Sua árvore está vazia. Crie uma matéria, e cada tópico que você estudar vira um galho novo.</Empty>
          </div>
        ) : (
          <svg
            ref={svgRef}
            className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onWheel={onWheel}
          >
            {/* svg interno em 50%/50% = origem (0,0) no centro da tela; o <g> aplica arrastar/zoom. */}
            <svg x="50%" y="50%" overflow="visible">
            <g transform={`translate(${view.x} ${view.y}) scale(${view.scale})`}>
              {edges.map((e) => {
                const a = byId.get(e.from)!;
                const b = byId.get(e.to)!;
                const active = b.topic ? b.topic.mastery > 0 : true;
                return <line key={`${e.from}-${e.to}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={e.color} strokeOpacity={active ? 0.55 : 0.15} strokeWidth={active ? 2 : 1} />;
              })}
              {nodes.map((n) => (
                <NodeShape key={n.id} node={n} selected={n.id === selected} due={!!n.topic?.lastStudiedAt && isDue(n.topic.review, today)} onPick={() => pick(n.id)} />
              ))}
            </g>
            </svg>
          </svg>
        )}
      </div>

      <DetailPanel node={selectedNode} onDeleted={() => setSelected(null)} />
      <SubjectModal open={subjectOpen} onClose={() => setSubjectOpen(false)} />
    </div>
  );
}

function NodeShape({ node, selected, due, onPick }: { node: TreeNode; selected: boolean; due: boolean; onPick: () => void }) {
  if (node.kind === 'root') {
    return (
      <g onClick={onPick}>
        <circle r={30} fill="#0a0f0d" stroke={node.color} strokeWidth={2} />
        <text textAnchor="middle" dy={4} fontSize={11} fill={node.color} fontWeight="bold">
          VOCÊ
        </text>
      </g>
    );
  }

  const isSubject = node.kind === 'subject';
  const mastery = node.topic?.mastery ?? 100;
  const studied = isSubject || !!node.topic?.lastStudiedAt;
  const r = isSubject ? 34 : 22;
  const circumference = 2 * Math.PI * (r + 4);

  return (
    <g transform={`translate(${node.x} ${node.y})`} onClick={onPick} className="cursor-pointer">
      {selected && <circle r={r + 10} fill="none" stroke="#ffffff" strokeOpacity={0.5} strokeDasharray="4 4" />}
      {due && (
        <circle r={r + 8} fill="none" stroke="var(--color-warn)" strokeWidth={2}>
          <animate attributeName="stroke-opacity" values="1;0.2;1" dur="2s" repeatCount="indefinite" />
        </circle>
      )}
      <circle
        r={r}
        fill={studied ? `${node.color}22` : '#0a0f0d'}
        stroke={node.color}
        strokeOpacity={studied ? 1 : 0.35}
        strokeWidth={isSubject ? 3 : 2}
        style={mastery >= 80 && !isSubject ? { filter: `drop-shadow(0 0 8px ${node.color})` } : undefined}
      />
      {!isSubject && (
        // Anel de domínio: enche conforme a nota sobe.
        <circle
          r={r + 4}
          fill="none"
          stroke={node.color}
          strokeWidth={3}
          strokeDasharray={`${(mastery / 100) * circumference} ${circumference}`}
          transform="rotate(-90)"
        />
      )}
      <text textAnchor="middle" dy={4} fontSize={isSubject ? 12 : 10} fill={studied ? '#e6ffe9' : '#6f8f69'} fontWeight={isSubject ? 'bold' : 'normal'}>
        {isSubject ? node.label.slice(0, 10) : `${mastery}%`}
      </text>
      {!isSubject && (
        <text textAnchor="middle" y={r + 18} fontSize={11} fill={studied ? '#b9d4b3' : '#6f8f69'}>
          {node.label.length > 22 ? `${node.label.slice(0, 21)}…` : node.label}
        </text>
      )}
    </g>
  );
}

function Legend() {
  return (
    <div className="absolute bottom-3 left-3 z-10 space-y-1 rounded border border-line bg-bg/90 p-2 text-[10px] text-muted">
      <div>● apagado = ainda não estudou</div>
      <div>◯ anel = domínio do tópico</div>
      <div className="text-warn">◌ piscando = hora de revisar</div>
      <div>arraste pra mover · roda pra zoom</div>
    </div>
  );
}

function DetailPanel({ node, onDeleted }: { node?: TreeNode; onDeleted: () => void }) {
  const subjects = useStudy((s) => s.subjects);
  const removeTopic = useStudy((s) => s.removeTopic);
  const removeSubject = useStudy((s) => s.removeSubject);
  const updateSubject = useStudy((s) => s.updateSubject);
  const go = useNav((s) => s.go);
  const [topicOpen, setTopicOpen] = useState(false);

  if (!node || node.kind === 'root') {
    return (
      <Panel title="Detalhes">
        <Empty>Clique num galho ou tópico da árvore.</Empty>
      </Panel>
    );
  }

  if (node.subject) {
    const s = node.subject;
    return (
      <Panel title="Matéria">
        <h3 className="mb-3 text-lg font-bold" style={{ color: s.color }}>
          {s.name}
        </h3>
        <label className="mb-4 block">
          <Label>Linguagem dos desafios</Label>
          <Select value={s.language} onChange={(e) => updateSubject(s.id, { language: e.target.value })}>
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </Select>
        </label>
        <div className="space-y-2">
          <Button variant="primary" className="w-full" onClick={() => setTopicOpen(true)}>
            <Plus size={14} /> Novo tópico nesta matéria
          </Button>
          <Button
            variant="danger"
            className="w-full"
            onClick={() => {
              if (confirm(`Apagar "${s.name}" e TODOS os tópicos dela?`)) {
                removeSubject(s.id);
                onDeleted();
              }
            }}
          >
            <Trash2 size={14} /> Apagar matéria
          </Button>
        </div>
        <TopicModal key={s.id} open={topicOpen} onClose={() => setTopicOpen(false)} defaultSubjectId={s.id} />
      </Panel>
    );
  }

  const t = node.topic!;
  return (
    <Panel title="Tópico">
      <p className="text-[11px] text-muted">{topicPath(subjects, t)}</p>
      <h3 className="mb-3 text-lg font-bold" style={{ color: node.color }}>
        {t.title}
      </h3>
      <div className="mb-1 flex justify-between text-[11px] text-muted">
        <span>Domínio</span>
        <span>{t.mastery}%</span>
      </div>
      <ProgressBar value={t.mastery} color={node.color} />
      <div className="mt-3 flex flex-wrap gap-2">
        {t.lastStudiedAt ? <Badge>revisar em {formatShort(t.review.due)}</Badge> : <Badge>não estudado</Badge>}
        {t.review.lapses > 0 && <Badge color="var(--color-warn)">esqueceu {t.review.lapses}x</Badge>}
      </div>
      {t.notes && <p className="mt-3 line-clamp-6 whitespace-pre-wrap rounded border border-line bg-bg p-2 text-xs text-muted">{t.notes}</p>}
      <div className="mt-4 space-y-2">
        <Button variant="primary" className="w-full" onClick={() => go('professor', t.id)}>
          <GraduationCap size={14} /> Estudar com o Prof.
        </Button>
        <Button className="w-full" onClick={() => go('sandbox', t.id)}>
          <Code2 size={14} /> Desafio
        </Button>
        <Button className="w-full" onClick={() => setTopicOpen(true)}>
          <GitBranchPlus size={14} /> Tópico derivado
        </Button>
        <Button
          variant="danger"
          className="w-full"
          onClick={() => {
            if (confirm(`Apagar o tópico "${t.title}"? Os tópicos derivados sobem um nível.`)) {
              removeTopic(t.id);
              onDeleted();
            }
          }}
        >
          <Trash2 size={14} /> Apagar
        </Button>
      </div>
      <TopicModal key={t.id} open={topicOpen} onClose={() => setTopicOpen(false)} defaultSubjectId={t.subjectId} defaultParentId={t.id} />
    </Panel>
  );
}
