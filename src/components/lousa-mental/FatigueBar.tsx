import { AlertTriangle, ShieldCheck } from 'lucide-react';

interface FatigueBarProps {
  fatigue: boolean;
  onToggle: () => void;
}

export default function FatigueBar({ fatigue, onToggle }: FatigueBarProps) {
  if (fatigue) {
    return (
      <div className="absolute bottom-6 left-1/2 z-40 w-[min(680px,92%)] -translate-x-1/2 animate-toast-in">
        <div className="flex items-center gap-3 rounded-xl border border-red-500/70 bg-red-950/80 px-4 py-3 backdrop-blur-md">
          <AlertTriangle size={18} className="shrink-0 text-red-400" />
          <div className="flex-1">
            <p className="text-[10px] tracking-[0.2em] text-red-400/80">
              SYSTEM_MSG · DAMAGE REDUCTION ON
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-red-200">
              Sem novos sistemas complexos por hoje. Foco apenas em revisar o fluxo existente.
            </p>
          </div>
          <button
            onClick={onToggle}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-red-500/60 bg-red-900/40 px-3 py-1.5 text-[10px] tracking-widest text-red-200 transition-colors hover:bg-red-900/70"
          >
            <span className="h-2 w-2 animate-pulse-neon rounded-full bg-red-400" />
            DESATIVAR
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute bottom-6 left-1/2 z-40 -translate-x-1/2">
      <button
        onClick={onToggle}
        className="flex items-center gap-2 rounded-full border border-neural-olive/40 bg-neural-panel/70 px-4 py-2 text-[10px] tracking-widest text-neural-green backdrop-blur-md transition-all hover:border-neural-neon/50 hover:text-neural-neon hover:[box-shadow:0_0_12px_rgba(57,255,20,0.3)]"
      >
        <ShieldCheck size={14} className="text-neural-neon" />
        DAMAGE REDUCTION: OFF
        <span className="text-neural-olive">· CLIQUE PARA ATIVAR</span>
      </button>
    </div>
  );
}
