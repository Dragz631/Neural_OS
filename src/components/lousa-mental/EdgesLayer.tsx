import type { FlowEdge, FlowNode, Point } from '../types';
import { anchorPointOf, bezier } from './geometry';

interface EdgesLayerProps {
  edges: FlowEdge[];
  nodes: FlowNode[];
  fatigue: boolean;
  pending: { from: Point; to: Point } | null;
  selectedEdgeId: string | null;
  onSelectEdge: (id: string | null) => void;
  onDeleteEdge: (id: string) => void;
}

export default function EdgesLayer({
  edges,
  nodes,
  fatigue,
  pending,
  selectedEdgeId,
  onSelectEdge,
  onDeleteEdge,
}: EdgesLayerProps) {
  const accent = fatigue ? '#3e5c38' : '#39ff14';
  const muted = fatigue ? '#2a3a25' : '#39ff14';

  return (
    <svg className="pointer-events-none absolute inset-0 h-full w-full" style={{ overflow: 'visible' }}>
      <defs>
        <marker
          id="arrow-neon"
          markerWidth="10"
          markerHeight="10"
          refX="7"
          refY="3"
          orient="auto"
          markerUnits="userSpaceOnUse"
        >
          <path d="M0,0 L7,3 L0,6 Z" fill={accent} />
        </marker>
      </defs>

      {edges.map((edge) => {
        const a = nodes.find((n) => n.id === edge.from);
        const b = nodes.find((n) => n.id === edge.to);
        if (!a || !b) return null;
        const pa = anchorPointOf(a, edge.fromAnchor);
        const pb = anchorPointOf(b, edge.toAnchor);
        const d = bezier(pa, pb);
        const isSel = edge.id === selectedEdgeId;
        return (
          <g
            key={edge.id}
            className="pointer-events-auto cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              onSelectEdge(isSel ? null : edge.id);
            }}
          >
            {/* wider invisible hit area */}
            <path d={d} fill="none" stroke="transparent" strokeWidth="14" />
            {/* base */}
            <path
              d={d}
              fill="none"
              stroke={muted}
              strokeWidth="2"
              opacity={fatigue ? 0.25 : 0.32}
            />
            {/* animated flow */}
            <path
              d={d}
              fill="none"
              stroke={accent}
              strokeWidth={isSel ? 3 : 2}
              markerEnd="url(#arrow-neon)"
              className={fatigue ? '' : 'flow-line'}
              opacity={isSel ? 1 : fatigue ? 0.5 : 0.95}
              style={fatigue ? undefined : { filter: 'drop-shadow(0 0 4px rgba(57,255,20,0.8))' }}
            />
            {isSel && (
              <g
                className="pointer-events-auto"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteEdge(edge.id);
                }}
              >
                <circle cx={pa.x} cy={pa.y} r="4" fill={accent} />
                <circle cx={pb.x} cy={pb.y} r="4" fill={accent} />
                <text
                  x={(pa.x + pb.x) / 2}
                  y={(pa.y + pb.y) / 2 - 8}
                  textAnchor="middle"
                  className="fill-red-400 font-mono text-[10px]"
                >
                  click again to delete
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Live pending connector while dragging from an anchor */}
      {pending && (
        <path
          d={bezier(pending.from, pending.to)}
          fill="none"
          stroke="#39ff14"
          strokeWidth="2"
          strokeDasharray="5 5"
          opacity="0.8"
          style={{ filter: 'drop-shadow(0 0 5px rgba(57,255,20,0.9))' }}
        />
      )}
    </svg>
  );
}
