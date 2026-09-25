import { Eraser, GitCommit, MousePointer2, Pencil, Square, Type, Wand2 } from 'lucide-react';
import type { ToolId } from './types';

const TOOLS: {
  id: ToolId;
  icon: typeof MousePointer2;
  hint: string;
  addsNode?: boolean;
}[] = [
  { id: 'select', icon: MousePointer2, hint: 'V — Select & move' },
  { id: 'text', icon: Type, hint: 'T — Spawn text node', addsNode: true },
  { id: 'shape', icon: Square, hint: 'S — Spawn block node', addsNode: true },
  { id: 'connect', icon: GitCommit, hint: 'C — Draw arrows between nodes' },
  { id: 'pencil', icon: Pencil, hint: 'P — Freehand sketch' },
  { id: 'eraser', icon: Eraser, hint: 'E — Erase sketches' },
  { id: 'ai', icon: Wand2, hint: 'A — Open Espejo Técnico' },
];

interface ToolbarProps {
  tool: ToolId;
  fatigue: boolean;
  onSelectTool: (t: ToolId) => void;
  onAddNode: (kind: 'text' | 'shape') => void;
}

export default function Toolbar({ tool, fatigue, onSelectTool, onAddNode }: ToolbarProps) {
  return (
    <aside className="absolute left-5 top-1/2 z-30 -translate-y-1/2">
      <div className="flex flex-col gap-1 rounded-2xl border border-neural-olive/40 bg-neural-panel/70 p-2 backdrop-blur-md">
        {TOOLS.map((t) => {
          const Icon = t.icon;
          const active = tool === t.id;
          const disabled = fatigue && !!t.addsNode;
          return (
            <button
              key={t.id}
              disabled={disabled}
              onClick={() =>
                t.addsNode ? onAddNode(t.id as 'text' | 'shape') : onSelectTool(t.id)
              }
              title={disabled ? 'DAMAGE REDUCTION active — adding nodes locked' : t.hint}
              className={`group relative flex h-11 w-11 items-center justify-center rounded-xl border transition-all duration-200 ${
                disabled
                  ? 'cursor-not-allowed border-transparent text-neural-olive/40 opacity-40'
                  : active
                    ? 'border-neural-neon/70 bg-neural-neon/10 text-neural-neon neon-glow'
                    : 'border-transparent text-neural-green/70 hover:border-neural-neon/50 hover:text-neural-neon hover:[box-shadow:0_0_10px_rgba(57,255,20,0.4)]'
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.4 : 2} />
              <span className="pointer-events-none absolute left-14 z-50 whitespace-nowrap rounded-md border border-neural-olive/40 bg-neural-panel/95 px-2 py-1 text-[10px] tracking-widest text-neural-green opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                {disabled ? 'LOCKED · DAMAGE REDUCTION' : t.hint}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
