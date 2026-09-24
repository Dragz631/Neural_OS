import type { DrawPath } from '../types';
import { smoothPath } from './geometry';

interface SketchLayerProps {
  paths: DrawPath[];
  pending: DrawPath | null;
  fatigue: boolean;
}

// Purely visual SVG layer for freehand pencil strokes. Non-interactive:
// eraser hit-testing is handled in App via geometry.distToPath2 so drawing
// strokes never block node drag/select.
export default function SketchLayer({ paths, pending, fatigue }: SketchLayerProps) {
  const stroke = fatigue ? '#3e5c38' : '#39ff14';
  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full"
      style={{ overflow: 'visible' }}
    >
      {paths.map((p) => (
        <path
          key={p.id}
          d={smoothPath(p.points)}
          fill="none"
          stroke={stroke}
          strokeWidth={fatigue ? 1.5 : 2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={fatigue ? 0.25 : 0.9}
          style={
            fatigue
              ? undefined
              : { filter: 'drop-shadow(0 0 4px rgba(57,255,20,0.85))' }
          }
        />
      ))}
      {pending && (
        <path
          d={smoothPath(pending.points)}
          fill="none"
          stroke="#39ff14"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.9}
          style={{ filter: 'drop-shadow(0 0 5px rgba(57,255,20,0.9))' }}
        />
      )}
    </svg>
  );
}
