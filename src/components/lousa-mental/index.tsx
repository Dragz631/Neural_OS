import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Terminal, GraduationCap, ZoomIn, ZoomOut, RotateCcw, Sparkles } from 'lucide-react';
import type { AnchorSide, Corner, DrawPath, FlowEdge, FlowNode, Point, ToolId } from '../types';
import Toolbar from './Toolbar';
import SidePanel from './SidePanel';
import FatigueBar from './FatigueBar';
import NodeCard from './NodeCard';
import EdgesLayer from './EdgesLayer';
import SketchLayer from './SketchLayer';
import { anchorPointOf, erasePointsAt } from './geometry';
import { useNeural } from '../../context/NeuralContext';

let idSeq = 0;
const nextId = (p: string) => `${p}-${(idSeq += 1).toString(36)}`;

const CANVAS_RECT = { w: 4000, h: 3000 };
const NODE_W = 210;
const NODE_H = 88;
const MIN_NODE = 70;
const ERASE_RADIUS = 15;

const INITIAL_NODES: FlowNode[] = [
  {
    id: 'n_encapsulamento',
    kind: 'shape',
    x: 600,
    y: 400,
    w: 220,
    h: 95,
    title: 'Encapsulamento C#',
    description: 'Blindagem do estado interno para impedir mutações diretas de saldo.',
    translation: null,
  },
  {
    id: 'n_private_field',
    kind: 'text',
    x: 350,
    y: 560,
    w: 210,
    h: 88,
    title: 'private decimal _saldo;',
    description: 'Campo privado acessível apenas pela própria classe Conta.',
    translation: null,
  },
  {
    id: 'n_public_prop',
    kind: 'text',
    x: 850,
    y: 560,
    w: 210,
    h: 88,
    title: 'public decimal Saldo { get; private set; }',
    description: 'Propriedade com leitura pública e escrita estritamente interna.',
    translation: null,
  },
];

const INITIAL_EDGES: FlowEdge[] = [
  {
    id: 'e1',
    from: 'n_encapsulamento',
    fromAnchor: 'bottom',
    to: 'n_private_field',
    toAnchor: 'top',
  },
  {
    id: 'e1_2',
    from: 'n_encapsulamento',
    fromAnchor: 'bottom',
    to: 'n_public_prop',
    toAnchor: 'top',
  },
];

interface LousaMentalProps {
  onNavigateTab?: (tabId: 'professor' | 'sandbox' | 'lobby') => void;
}

export default function LousaMental({ onNavigateTab }: LousaMentalProps) {
  const { fatigue, toggleFatigue, submitWhiteboardToProfessor, target } = useNeural();
  const [topic, setTopic] = useState(target.title || 'C# Encapsulamento & Propriedades');
  const [tool, setTool] = useState<ToolId>('select');

  // Persistence
  const [nodes, setNodes] = useState<FlowNode[]>(() => {
    try {
      const saved = localStorage.getItem('neural.whiteboard.nodes');
      return saved ? JSON.parse(saved) : INITIAL_NODES;
    } catch {
      return INITIAL_NODES;
    }
  });

  const [edges, setEdges] = useState<FlowEdge[]>(() => {
    try {
      const saved = localStorage.getItem('neural.whiteboard.edges');
      return saved ? JSON.parse(saved) : INITIAL_EDGES;
    } catch {
      return INITIAL_EDGES;
    }
  });

  const [paths, setPaths] = useState<DrawPath[]>(() => {
    try {
      const saved = localStorage.getItem('neural.whiteboard.paths');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('neural.whiteboard.nodes', JSON.stringify(nodes));
      localStorage.setItem('neural.whiteboard.edges', JSON.stringify(edges));
      localStorage.setItem('neural.whiteboard.paths', JSON.stringify(paths));
    } catch {
      /* ignore */
    }
  }, [nodes, edges, paths]);

  // Pan & Zoom Infinite Canvas state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: -200, y: -150 });
  const isPanningRef = useRef(false);
  const panStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [textEditingId, setTextEditingId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const resizeRef = useRef<{ id: string; corner: Corner; start: Point; origin: FlowNode } | null>(null);
  const connectRef = useRef<{ fromId: string; fromAnchor: AnchorSide; fromPoint: Point } | null>(null);
  const pencilRef = useRef<DrawPath | null>(null);
  const [pendingEdge, setPendingEdge] = useState<{ from: Point; to: Point } | null>(null);
  const [pendingPath, setPendingPath] = useState<DrawPath | null>(null);

  const selected = useMemo(
    () => nodes.find((n) => n.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const toLocal = useCallback(
    (clientX: number, clientY: number): Point => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: clientX, y: clientY };
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  // ---- Node CRUD ----
  const addNode = useCallback(
    (kind: 'text' | 'shape') => {
      if (fatigue) return;
      const rect = canvasRef.current?.getBoundingClientRect();
      const cx = rect ? (rect.width / 2 - pan.x) / zoom - NODE_W / 2 : 600;
      const cy = rect ? (rect.height / 2 - pan.y) / zoom - NODE_H / 2 : 400;
      const jitter = (nodes.length % 5) * 30;
      const node: FlowNode = {
        id: nextId('n'),
        kind,
        x: cx + jitter,
        y: cy + jitter,
        w: NODE_W,
        h: NODE_H,
        title: kind === 'text' ? 'Nova Anotação...' : 'Novo Módulo...',
        description: '',
        translation: null,
      };
      setNodes((p) => [...p, node]);
      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);
      setPanelOpen(true);
    },
    [fatigue, nodes.length, pan, zoom],
  );

  const updateNode = useCallback(
    (id: string, patch: Partial<Pick<FlowNode, 'title' | 'description' | 'translation' | 'x' | 'y' | 'w' | 'h'>>) => {
      setNodes((p) => p.map((n) => (n.id === id ? { ...n, ...patch } : n)));
    },
    [],
  );

  const commitText = useCallback(
    (id: string, text: string) => {
      updateNode(id, { title: text });
      setTextEditingId(null);
    },
    [updateNode],
  );

  const deleteNode = useCallback(
    (id: string) => {
      setNodes((p) => p.filter((n) => n.id !== id));
      setEdges((p) => p.filter((e) => e.from !== id && e.to !== id));
      if (selectedNodeId === id) setSelectedNodeId(null);
    },
    [selectedNodeId],
  );

  // ---- Dragging nodes ----
  const onDragStart = useCallback(
    (e: React.PointerEvent, node: FlowNode) => {
      if (tool === 'connect' || tool === 'pencil' || tool === 'eraser' || tool === 'text') return;
      setSelectedNodeId(node.id);
      setSelectedEdgeId(null);
      const local = toLocal(e.clientX, e.clientY);
      dragRef.current = { id: node.id, offsetX: local.x - node.x, offsetY: local.y - node.y };
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [tool, toLocal],
  );

  // ---- Resizing shapes via corner handles ----
  const onResizeStart = useCallback(
    (e: React.PointerEvent, nodeId: string, corner: Corner) => {
      e.stopPropagation();
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const local = toLocal(e.clientX, e.clientY);
      resizeRef.current = { id: nodeId, corner, start: local, origin: { ...node } };
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [nodes, toLocal],
  );

  // ---- Connect tool ----
  const onAnchorDown = useCallback(
    (e: React.PointerEvent, nodeId: string, anchor: AnchorSide) => {
      if (fatigue) return;
      e.stopPropagation();
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      const pt = anchorPointOf(node, anchor);
      connectRef.current = { fromId: nodeId, fromAnchor: anchor, fromPoint: pt };
      setPendingEdge({ from: pt, to: pt });
      (e.target as Element).setPointerCapture?.(e.pointerId);
    },
    [fatigue, nodes],
  );

  const selectNode = useCallback((id: string) => {
    setSelectedNodeId(id);
    setSelectedEdgeId(null);
    setPanelOpen(true);
  }, []);

  const eraseAt = useCallback((local: Point) => {
    setPaths((prev) => {
      const next: DrawPath[] = [];
      for (const path of prev) {
        const splits = erasePointsAt(local, path.points, ERASE_RADIUS);
        for (const pts of splits) next.push({ id: nextId('d'), points: pts });
      }
      return next;
    });
  }, []);

  // ---- Canvas Pointer Routing & Pan ----
  const onCanvasPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.target !== canvasRef.current) return;
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      setTextEditingId(null);

      // Middle click or select tool on empty canvas starts panning
      if (e.button === 1 || tool === 'select') {
        isPanningRef.current = true;
        panStartRef.current = {
          x: e.clientX,
          y: e.clientY,
          panX: pan.x,
          panY: pan.y,
        };
        (canvasRef.current as Element)?.setPointerCapture?.(e.pointerId);
        return;
      }

      if (tool === 'pencil' && !fatigue) {
        const p = toLocal(e.clientX, e.clientY);
        pencilRef.current = { id: nextId('d'), points: [p] };
        setPendingPath(pencilRef.current);
        return;
      }
      if (tool === 'eraser') {
        eraseAt(toLocal(e.clientX, e.clientY));
        return;
      }
    },
    [tool, fatigue, toLocal, eraseAt, pan],
  );

  const onCanvasPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (isPanningRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        setPan({
          x: panStartRef.current.panX + dx,
          y: panStartRef.current.panY + dy,
        });
        return;
      }

      const drag = dragRef.current;
      if (drag) {
        const local = toLocal(e.clientX, e.clientY);
        const x = Math.max(0, Math.min(local.x - drag.offsetX, CANVAS_RECT.w));
        const y = Math.max(0, Math.min(local.y - drag.offsetY, CANVAS_RECT.h));
        setNodes((p) => p.map((n) => (n.id === drag.id ? { ...n, x, y } : n)));
        return;
      }

      const rs = resizeRef.current;
      if (rs) {
        const local = toLocal(e.clientX, e.clientY);
        const o = rs.origin;
        let x = o.x;
        let y = o.y;
        let w = o.w;
        let h = o.h;
        const dx = local.x - rs.start.x;
        const dy = local.y - rs.start.y;
        if (rs.corner === 'nw') {
          x = Math.min(o.x + o.w - MIN_NODE, o.x + dx);
          y = Math.min(o.y + o.h - MIN_NODE, o.y + dy);
          w = o.w + (o.x - x);
          h = o.h + (o.y - y);
        } else if (rs.corner === 'ne') {
          y = Math.min(o.y + o.h - MIN_NODE, o.y + dy);
          w = Math.max(MIN_NODE, local.x - o.x);
          h = o.h + (o.y - y);
        } else if (rs.corner === 'se') {
          w = Math.max(MIN_NODE, local.x - o.x);
          h = Math.max(MIN_NODE, local.y - o.y);
        } else {
          x = Math.min(o.x + o.w - MIN_NODE, local.x);
          w = o.w + (o.x - x);
          h = Math.max(MIN_NODE, local.y - o.y);
        }
        setNodes((p) => p.map((n) => (n.id === rs.id ? { ...n, x, y, w, h } : n)));
        return;
      }

      const conn = connectRef.current;
      if (conn) {
        setPendingEdge({ from: conn.fromPoint, to: toLocal(e.clientX, e.clientY) });
        return;
      }

      const pen = pencilRef.current;
      if (pen) {
        const p = toLocal(e.clientX, e.clientY);
        const last = pen.points[pen.points.length - 1];
        if (!last || (p.x - last.x) ** 2 + (p.y - last.y) ** 2 > 4) {
          pen.points.push(p);
          setPendingPath({ ...pen, points: [...pen.points] });
        }
        return;
      }

      if (tool === 'eraser') {
        eraseAt(toLocal(e.clientX, e.clientY));
      }
    },
    [tool, toLocal, eraseAt],
  );

  const onCanvasPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
      }
      if (dragRef.current) {
        dragRef.current = null;
        return;
      }
      if (resizeRef.current) {
        resizeRef.current = null;
        return;
      }
      const conn = connectRef.current;
      if (conn) {
        const local = toLocal(e.clientX, e.clientY);
        const targetNode = nodes.find(
          (n) =>
            n.id !== conn.fromId &&
            local.x >= n.x &&
            local.x <= n.x + n.w &&
            local.y >= n.y &&
            local.y <= n.y + n.h,
        );
        if (targetNode) {
          const side: AnchorSide =
            Math.abs(local.x - targetNode.x) < 20 ? 'left'
            : Math.abs(local.x - (targetNode.x + targetNode.w)) < 20 ? 'right'
            : Math.abs(local.y - targetNode.y) < 20 ? 'top' : 'bottom';

          const newEdge: FlowEdge = {
            id: nextId('e'),
            from: conn.fromId,
            fromAnchor: conn.fromAnchor,
            to: targetNode.id,
            toAnchor: side,
          };
          setEdges((p) => [...p, newEdge]);
        }
        connectRef.current = null;
        setPendingEdge(null);
        return;
      }
      const pen = pencilRef.current;
      if (pen && pen.points.length > 1) {
        setPaths((p) => [...p, pen]);
        pencilRef.current = null;
        setPendingPath(null);
      }
    },
    [nodes, toLocal],
  );

  // Wheel to Zoom
  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((z) => Math.min(2.5, Math.max(0.4, z * zoomFactor)));
  }, []);

  // Submit study to Professor A.Ilson
  const handleFinishStudy = () => {
    const notesSummary = nodes.map((n) => `${n.title}: ${n.description || 'Definição visual'}`).filter(Boolean);
    submitWhiteboardToProfessor(topic, notesSummary, nodes.length);
    if (onNavigateTab) {
      onNavigateTab('professor');
    }
  };

  const deleteEdge = useCallback((id: string) => {
    setEdges((p) => p.filter((e) => e.id !== id));
    setSelectedEdgeId(null);
  }, []);

  const canvasCursor =
    tool === 'pencil' ? 'cursor-crosshair'
    : tool === 'eraser' ? 'cursor-cell'
    : tool === 'text' ? 'cursor-text'
    : 'cursor-grab';

  const dotGridStyle: React.CSSProperties = {
    backgroundColor: '#060709',
    backgroundImage: 'radial-gradient(circle, #152814 1.2px, transparent 1.2px)',
    backgroundSize: '24px 24px',
  };

  return (
    <div
      className="relative min-h-[calc(100vh-60px)] w-full overflow-hidden font-mono select-none"
      style={{ backgroundColor: '#060709', color: '#9dc197' }}
      onWheel={onWheel}
    >
      {/* Top Floating Control Bar */}
      <div className="absolute top-3 left-4 right-4 z-30 flex flex-wrap items-center justify-between gap-3 border border-[#3e5c38]/60 bg-[#0a0b0d]/90 px-4 py-2 backdrop-blur-md text-xs shadow-xl">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[#39ff14] font-bold tracking-widest text-[11px]">
            <Sparkles size={14} /> TÓPICO DO ESTUDO:
          </span>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Ex: C# Encapsulamento & Propriedades..."
            className="border-b border-[#3e5c38] bg-transparent px-2 py-0.5 text-xs text-[#39ff14] font-bold outline-none focus:border-[#39ff14] w-64 sm:w-80"
          />
        </div>

        <div className="flex items-center gap-2">
          {/* Zoom Controls */}
          <div className="flex items-center gap-1 border border-[#3e5c38] bg-black/60 px-2 py-1 text-[10px]">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.4, z - 0.15))}
              className="p-0.5 hover:text-[#39ff14]"
              title="Diminuir Zoom"
            >
              <ZoomOut size={13} />
            </button>
            <span className="w-10 text-center text-[#39ff14]">{Math.round(zoom * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(2.5, z + 0.15))}
              className="p-0.5 hover:text-[#39ff14]"
              title="Aumentar Zoom"
            >
              <ZoomIn size={13} />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1);
                setPan({ x: -200, y: -150 });
              }}
              className="border-l border-[#3e5c38] pl-1 ml-1 hover:text-[#39ff14]"
              title="Resetar Posição e Zoom"
            >
              <RotateCcw size={12} />
            </button>
          </div>

          {/* Finalize Study & Call Professor Button */}
          <button
            type="button"
            onClick={handleFinishStudy}
            className="flex items-center gap-2 border-2 border-[#39ff14] bg-[#39ff14] px-4 py-1.5 text-xs font-bold uppercase tracking-widest text-black shadow-[0_0_15px_rgba(57,255,20,0.6)] hover:bg-[#39ff14]/80 transition active:scale-95"
          >
            <GraduationCap size={16} />
            <span>FINALIZAR ESTUDO & CHAMAR O PROFESSOR</span>
          </button>
        </div>
      </div>

      {/* Infinite Canvas Container */}
      <div
        ref={canvasRef}
        className={`absolute inset-0 ${canvasCursor}`}
        style={dotGridStyle}
        onPointerDown={onCanvasPointerDown}
        onPointerMove={onCanvasPointerMove}
        onPointerUp={onCanvasPointerUp}
      >
        {/* Transformable Canvas Layer (Pan & Zoom) */}
        <div
          className="absolute origin-top-left transition-transform duration-75"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            width: `${CANVAS_RECT.w}px`,
            height: `${CANVAS_RECT.h}px`,
          }}
        >
          <SketchLayer paths={paths} pending={pendingPath} fatigue={fatigue} />

          <EdgesLayer
            edges={edges}
            nodes={nodes}
            fatigue={fatigue}
            pending={pendingEdge}
            selectedEdgeId={selectedEdgeId}
            onSelectEdge={setSelectedEdgeId}
            onDeleteEdge={deleteEdge}
          />

          {nodes.map((node) => (
            <NodeCard
              key={node.id}
              node={node}
              selected={node.id === selectedNodeId}
              connectMode={tool === 'connect'}
              textMode={tool === 'text'}
              editingText={textEditingId === node.id}
              fatigue={fatigue}
              onSelect={() => selectNode(node.id)}
              onOpenEditor={() => selectNode(node.id)}
              onDragStart={onDragStart}
              onAnchorDown={onAnchorDown}
              onResizeStart={onResizeStart}
              onRequestTextEdit={(id) => {
                setSelectedNodeId(id);
                setTextEditingId(id);
              }}
              onCommitText={commitText}
            />
          ))}

          {nodes.length === 0 && paths.length === 0 && (
            <div className="pointer-events-none absolute left-[800px] top-[500px] text-center">
              <Terminal size={32} className="mx-auto mb-3 text-[#3e5c38]/70 animate-pulse" />
              <p className="text-xs tracking-widest text-[#3e5c38]">
                CANVAS INFINITO VAZIO // USE A TOOLBAR À ESQUERDA PARA ADICIONAR NÓS OU DESENHAR
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <Toolbar
        tool={tool}
        fatigue={fatigue}
        onSelectTool={(t) => {
          setTool(t);
          if (t === 'ai') setPanelOpen(true);
        }}
        onAddNode={addNode}
      />

      {/* Side Panel for AI Translation */}
      <SidePanel
        open={panelOpen}
        onClose={() => setPanelOpen(false)}
        selected={selected}
        nodes={nodes}
        edges={edges}
        onUpdate={updateNode}
        onDeleteNode={deleteNode}
      />

      {/* Fatigue Bar */}
      <FatigueBar fatigue={fatigue} onToggle={toggleFatigue} />
    </div>
  );
}
