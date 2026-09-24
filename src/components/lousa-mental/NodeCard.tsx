import { useEffect, useRef } from 'react';
import type { AnchorSide, Corner, FlowNode, Point } from '../types';

export const ANCHORS: AnchorSide[] = ['top', 'right', 'bottom', 'left'];
export const CORNERS: Corner[] = ['nw', 'ne', 'se', 'sw'];

export function anchorPoint(node: FlowNode, side: AnchorSide): Point {
  switch (side) {
    case 'top':
      return { x: node.x + node.w / 2, y: node.y };
    case 'right':
      return { x: node.x + node.w, y: node.y + node.h / 2 };
    case 'bottom':
      return { x: node.x + node.w / 2, y: node.y + node.h };
    case 'left':
      return { x: node.x, y: node.y + node.h / 2 };
  }
}

// First 2-3 lines of the description mirror into the card as a wrapped
// subtitle block. We keep the raw lines (no joining) so they wrap naturally
// inside the box and truncate with an ellipsis when the shape is too small.
function snippetLines(desc: string): string[] {
  return desc.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 2);
}

interface NodeCardProps {
  node: FlowNode;
  selected: boolean;
  connectMode: boolean;
  textMode: boolean;
  editingText: boolean;
  fatigue: boolean;
  onSelect: () => void;
  onOpenEditor: () => void;
  onDragStart: (e: React.PointerEvent, node: FlowNode) => void;
  onAnchorDown: (e: React.PointerEvent, nodeId: string, side: AnchorSide) => void;
  onResizeStart: (e: React.PointerEvent, nodeId: string, corner: Corner) => void;
  onRequestTextEdit: (nodeId: string) => void;
  onCommitText: (nodeId: string, text: string) => void;
}

export default function NodeCard({
  node,
  selected,
  connectMode,
  textMode,
  editingText,
  fatigue,
  onSelect,
  onOpenEditor,
  onDragStart,
  onAnchorDown,
  onResizeStart,
  onRequestTextEdit,
  onCommitText,
}: NodeCardProps) {
  const subLines = snippetLines(node.description);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingText) inputRef.current?.focus();
  }, [editingText]);

  // When text tool is active and hovering a box, show a caret hint cursor.
  const bodyCursor = editingText ? 'cursor-text' : textMode ? 'cursor-text' : connectMode ? 'cursor-crosshair' : 'cursor-grab active:cursor-grabbing';

  return (
    <div
      onPointerDown={(e) => {
        if (editingText) return; // let input handle its own events
        onSelect();
        if (textMode) {
          e.stopPropagation();
          onRequestTextEdit(node.id);
          return;
        }
        onDragStart(e, node);
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        onOpenEditor();
      }}
      className={`group absolute rounded-xl border transition-shadow duration-200 ${bodyCursor} ${
        selected
          ? 'border-neural-neon neon-border-glow bg-neural-panel/95'
          : 'border-neural-olive bg-neural-panel/85 hover:border-neural-green/70'
      }`}
      style={{ left: node.x, top: node.y, width: node.w, height: node.h }}
    >
      {editingText ? (
        <input
          ref={inputRef}
          defaultValue={node.title}
          onBlur={(e) => onCommitText(node.id, e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onCommitText(node.id, (e.target as HTMLInputElement).value);
            }
            if (e.key === 'Escape') {
              onCommitText(node.id, node.title);
            }
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="h-full w-full rounded-xl border border-neural-neon/60 bg-black/70 px-4 text-center font-handwriting text-xl text-neural-neon outline-none [box-shadow:0_0_14px_rgba(57,255,20,0.35)]"
          placeholder="digite o título..."
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-1 overflow-hidden text-center">
          <span
            className={`w-full max-w-full break-words whitespace-normal px-4 leading-tight ${
              node.kind === 'text'
                ? 'font-handwriting text-xl text-neural-green'
                : 'font-mono text-sm font-bold text-neural-green'
            }`}
          >
            {node.title.trim() || (
              <span className="italic text-neural-olive">sem título</span>
            )}
          </span>
          {subLines.length > 0 && (
            <p className="w-full max-w-full break-words whitespace-normal text-center px-4 text-[11px] leading-tight text-neural-olive line-clamp-2 overflow-hidden">
              {subLines.map((line, i) => (
                <span key={i} className="block">
                  {line}
                </span>
              ))}
            </p>
          )}
        </div>
      )}

      {selected && !editingText && (
        <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-neural-neon neon-glow animate-pulse-neon" />
      )}

      {/* Edge anchor handles for node-to-node linking */}
      {!editingText &&
        ANCHORS.map((side) => (
          <span
            key={side}
            onPointerDown={(e) => onAnchorDown(e, node.id, side)}
            className={`absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border transition-all ${
              fatigue
                ? 'cursor-not-allowed border-neural-olive/50 bg-neural-olive/40'
                : 'cursor-crosshair border-neural-neon bg-neural-bg hover:scale-150 hover:bg-neural-neon hover:shadow-[0_0_8px_rgba(57,255,20,0.9)]'
            } ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            style={anchorStyle(side)}
            title={fatigue ? 'Locked' : 'Drag to connect'}
          />
        ))}

      {/* Corner resize handles — only in selection mode, only when selected */}
      {selected && !editingText && !connectMode && !textMode && (
        <>
          {CORNERS.map((c) => (
            <span
              key={c}
              onPointerDown={(e) => onResizeStart(e, node.id, c)}
              className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-sm border border-neural-neon bg-neural-bg transition-transform hover:scale-125 hover:bg-neural-neon hover:shadow-[0_0_8px_rgba(57,255,20,0.9)]"
              style={cornerStyle(c)}
              title="Drag to resize"
            />
          ))}
        </>
      )}
    </div>
  );
}

function anchorStyle(side: AnchorSide): React.CSSProperties {
  switch (side) {
    case 'top':
      return { left: '50%', top: 0 };
    case 'right':
      return { left: '100%', top: '50%' };
    case 'bottom':
      return { left: '50%', top: '100%' };
    case 'left':
      return { left: 0, top: '50%' };
  }
}

function cornerStyle(c: Corner): React.CSSProperties {
  switch (c) {
    case 'nw':
      return { left: 0, top: 0, cursor: 'nwse-resize' };
    case 'ne':
      return { left: '100%', top: 0, cursor: 'nesw-resize' };
    case 'se':
      return { left: '100%', top: '100%', cursor: 'nwse-resize' };
    case 'sw':
      return { left: 0, top: '100%', cursor: 'nesw-resize' };
  }
}
