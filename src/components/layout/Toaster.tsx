import React from 'react';
import { useToast } from '../../hooks/use-toast';
import { Zap, CheckCircle2, AlertTriangle, X } from 'lucide-react';

export const Toaster: React.FC = () => {
  const { toasts, dismiss } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none font-mono">
      {toasts.map((t) => {
        const isNeon = t.variant === 'neon';
        const isDestructive = t.variant === 'destructive';
        const isSuccess = t.variant === 'success';

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 border p-3 shadow-2xl transition-all duration-300 max-w-sm ${
              isNeon
                ? 'border-[#39ff14] bg-[#0a0b0d] text-[#39ff14] shadow-[0_0_20px_rgba(57,255,20,0.6)]'
                : isDestructive
                ? 'border-red-500 bg-[#0a0b0d] text-red-400 shadow-[0_0_20px_rgba(239,68,68,0.4)]'
                : isSuccess
                ? 'border-[#39ff14]/80 bg-[#0a0b0d] text-[#39ff14] shadow-[0_0_15px_rgba(57,255,20,0.3)]'
                : 'border-[#3e5c38] bg-[#0d0e12] text-[#9dc197]'
            }`}
          >
            <div className="mt-0.5 shrink-0">
              {isNeon ? (
                <Zap size={16} className="text-[#39ff14] animate-bounce" />
              ) : isDestructive ? (
                <AlertTriangle size={16} className="text-red-400" />
              ) : (
                <CheckCircle2 size={16} className="text-[#39ff14]" />
              )}
            </div>

            <div className="flex-1 min-w-0">
              {t.title && (
                <div className="text-xs font-bold uppercase tracking-wider">{t.title}</div>
              )}
              {t.description && (
                <div className="mt-0.5 text-[11px] leading-relaxed text-[#9dc197]/80">
                  {t.description}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 p-1 text-[#9dc197]/60 hover:text-white transition"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
