import React, { useEffect } from 'react';
import { 
  AlertTriangle, 
  Zap, 
  Trophy, 
  RotateCcw, 
  ArrowRight, 
  Code2, 
  Flame, 
  Crown
} from 'lucide-react';
import type { DungeonStage } from './types';

interface ResolutionEffectsProps {
  status: 'hit' | 'miss' | 'victory' | 'game_over';
  stage: DungeonStage;
  explanation: string;
  onContinue: () => void;
  onRetry: () => void;
  onExportToSandbox?: () => void;
}

export const ResolutionEffects: React.FC<ResolutionEffectsProps> = ({
  status,
  stage,
  explanation,
  onContinue,
  onRetry,
  onExportToSandbox,
}) => {
  // Electric shock audio-visual simulation
  useEffect(() => {
    if (status === 'miss' || status === 'game_over') {
      const audioCtx = typeof window !== 'undefined' && (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
      if (audioCtx) {
        try {
          const ctx = new audioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(150, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.3);
          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          osc.stop(ctx.currentTime + 0.35);
        } catch {
          /* ignore audio */
        }
      }
    }
  }, [status]);

  if (status === 'hit') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in font-mono">
        <div className="relative w-full max-w-lg border-2 border-accent bg-bg p-6 text-center shadow-[0_0_50px_color-mix(in_srgb,var(--color-accent)_40%,transparent)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-accent bg-accent/10 text-accent shadow-[0_0_20px_color-mix(in_srgb,var(--color-accent)_80%,transparent)]">
            <Zap className="h-8 w-8 animate-bounce" />
          </div>

          <div className="mt-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent">
              // COMPILAÇÃO EFETUADA COM SUCESSO //
            </span>
            <h3 className="mt-1 text-xl font-bold text-accent">
              CONTRA-ATAQUE SINÁPTICO CONECTADO!
            </h3>
          </div>

          <p className="mt-3 text-xs text-fg leading-relaxed border-y border-line py-3">
            {explanation}
          </p>

          <div className="mt-4 border border-accent/40 bg-accent/10 p-2.5 text-xs text-accent font-bold">
            + {stage.xpReward} XP GANHO NA MATRIZ // DANO APLICADO NO GUARDIÃO
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onContinue}
              className="flex items-center gap-2 border-2 border-accent bg-accent px-8 py-3 text-xs font-bold uppercase tracking-widest text-on-accent shadow-[0_0_15px_color-mix(in_srgb,var(--color-accent)_60%,transparent)] hover:bg-accent/80 transition"
            >
              <span>AVANÇAR NA ARENA</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'miss') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-danger/20 p-4 backdrop-blur-md animate-pulse font-mono">
        <div className="relative w-full max-w-lg border-2 border-danger bg-danger/10 p-6 text-center shadow-[0_0_60px_color-mix(in_srgb,var(--color-danger)_60%,transparent)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-danger bg-danger/20 text-danger shadow-[0_0_30px_color-mix(in_srgb,var(--color-danger)_90%,transparent)]">
            <AlertTriangle className="h-8 w-8 animate-ping" />
          </div>

          <div className="mt-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-danger">
              [ALERTA CRÍTICO: CHOQUE NEURAL // -1 HP]
            </span>
            <h3 className="mt-1 text-xl font-bold text-danger">
              DESCARGA ELÉTRICA NA CADEIRA!
            </h3>
          </div>

          <p className="mt-3 text-xs text-danger leading-relaxed border-y border-danger/40 py-3">
            {explanation}
          </p>

          <div className="mt-4 border border-danger/40 bg-danger/10 p-2.5 text-xs text-danger">
            Você perdeu 1 Vida. O sistema está redirecionando sua mente de volta ao Codex para revisão do ponto de falha.
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onContinue}
              className="flex items-center gap-2 border-2 border-danger bg-danger px-8 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-[0_0_20px_color-mix(in_srgb,var(--color-danger)_80%,transparent)] hover:bg-danger transition"
            >
              <span>RETORNAR AO CODEX (REVISAR)</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'victory') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fade-in font-mono">
        <div className="relative w-full max-w-xl border-2 border-accent bg-bg p-8 text-center shadow-[0_0_60px_color-mix(in_srgb,var(--color-accent)_50%,transparent)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-accent bg-accent/15 text-accent shadow-[0_0_30px_color-mix(in_srgb,var(--color-accent)_90%,transparent)]">
            {stage.isBoss ? <Crown className="h-10 w-10 animate-bounce" /> : <Trophy className="h-10 w-10 animate-bounce" />}
          </div>

          <div className="mt-5">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-accent">
              {stage.isBoss ? '👑 CHEFE DE FASE NEUTRALIZADO!' : '⚡ GUARDIÃO DERROTADO COM SUCESSO!'}
            </span>
            <h2 className="mt-2 text-2xl font-bold text-accent">
              {stage.isBoss ? 'NÓ CENTRAL CONQUISTADO!' : `FASE ${stage.number} CONCLUÍDA!`}
            </h2>
          </div>

          <div className="mt-4 border border-line bg-bg p-4 text-xs text-fg space-y-2">
            <p className="text-sm font-bold text-accent">{stage.synapticReward}</p>
            <p className="text-fg/70">
              O conhecimento deste nó foi gravado permanentemente na sua Árvore Neural.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4 text-xs font-bold text-accent">
            <span>+ {stage.xpReward} XP DE RECOMPENSA</span>
            <span>•</span>
            <span>NÓ DESBLOQUEADO</span>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {onExportToSandbox && (
              <button
                type="button"
                onClick={onExportToSandbox}
                className="flex items-center gap-1.5 border border-line bg-panel px-4 py-2.5 text-xs text-fg hover:border-accent hover:text-accent transition"
              >
                <Code2 size={14} />
                <span>EXPERIMENTAR NA SANDBOX</span>
              </button>
            )}

            <button
              type="button"
              onClick={onContinue}
              className="flex items-center gap-2 border-2 border-accent bg-accent px-8 py-3 text-xs font-bold uppercase tracking-widest text-on-accent shadow-[0_0_20px_color-mix(in_srgb,var(--color-accent)_60%,transparent)] hover:bg-accent/80 transition"
            >
              <span>AVANÇAR PARA A PRÓXIMA FASE</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Game Over
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-fade-in font-mono">
      <div className="relative w-full max-w-lg border-2 border-danger bg-danger/10 p-8 text-center shadow-[0_0_60px_color-mix(in_srgb,var(--color-danger)_60%,transparent)]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-danger bg-danger/20 text-danger shadow-[0_0_30px_color-mix(in_srgb,var(--color-danger)_90%,transparent)]">
          <Flame className="h-10 w-10 animate-pulse" />
        </div>

        <div className="mt-5">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-danger">
            [SOBRECARGA NEURAL // GAME OVER]
          </span>
          <h2 className="mt-2 text-2xl font-bold text-danger">
            SUAS VIDAS FORAM ESGOTADAS
          </h2>
        </div>

        <p className="mt-3 text-xs text-fg leading-relaxed border-y border-danger/30 py-3">
          A Cadeira de Aprendizado atingiu a temperatura crítica. O Guardião resistiu ao ataque. Recalibre suas sinapses no Tomo de Conhecimento e reinicie o desafio.
        </p>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-2 border-2 border-accent bg-accent px-8 py-3 text-xs font-bold uppercase tracking-widest text-on-accent shadow-[0_0_20px_color-mix(in_srgb,var(--color-accent)_60%,transparent)] hover:bg-accent/80 transition"
          >
            <RotateCcw size={14} />
            <span>REINICIAR DESAFIO DA FASE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
