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
        <div className="relative w-full max-w-lg border-2 border-[#00ff66] bg-[#0a0f0d] p-6 text-center shadow-[0_0_50px_rgba(0,255,102,0.4)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#00ff66] bg-[#00ff66]/10 text-[#00ff66] shadow-[0_0_20px_rgba(0,255,102,0.8)]">
            <Zap className="h-8 w-8 animate-bounce" />
          </div>

          <div className="mt-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#00ff66]">
              // COMPILAÇÃO EFETUADA COM SUCESSO //
            </span>
            <h3 className="mt-1 text-xl font-bold text-[#00ff66]">
              CONTRA-ATAQUE SINÁPTICO CONECTADO!
            </h3>
          </div>

          <p className="mt-3 text-xs text-[#9dc197] leading-relaxed border-y border-[#1b3327] py-3">
            {explanation}
          </p>

          <div className="mt-4 border border-[#00ff66]/40 bg-[#00ff66]/10 p-2.5 text-xs text-[#00ff66] font-bold">
            + {stage.xpReward} XP GANHO NA MATRIZ // DANO APLICADO NO GUARDIÃO
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onContinue}
              className="flex items-center gap-2 border-2 border-[#00ff66] bg-[#00ff66] px-8 py-3 text-xs font-bold uppercase tracking-widest text-black shadow-[0_0_15px_rgba(0,255,102,0.6)] hover:bg-[#33ff77] transition"
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-red-950/80 p-4 backdrop-blur-md animate-pulse font-mono">
        <div className="relative w-full max-w-lg border-2 border-[#ff3366] bg-[#140508] p-6 text-center shadow-[0_0_60px_rgba(255,51,102,0.6)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-[#ff3366] bg-[#ff3366]/20 text-[#ff3366] shadow-[0_0_30px_rgba(255,51,102,0.9)]">
            <AlertTriangle className="h-8 w-8 animate-ping" />
          </div>

          <div className="mt-4">
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-[#ff3366]">
              [ALERTA CRÍTICO: CHOQUE NEURAL // -1 HP]
            </span>
            <h3 className="mt-1 text-xl font-bold text-[#ff3366]">
              DESCARGA ELÉTRICA NA CADEIRA!
            </h3>
          </div>

          <p className="mt-3 text-xs text-[#ff99aa] leading-relaxed border-y border-[#ff3366]/40 py-3">
            {explanation}
          </p>

          <div className="mt-4 border border-[#ff3366]/40 bg-[#ff3366]/10 p-2.5 text-xs text-[#ff3366]">
            Você perdeu 1 Vida. O sistema está redirecionando sua mente de volta ao Codex para revisão do ponto de falha.
          </div>

          <div className="mt-6 flex justify-center">
            <button
              type="button"
              onClick={onContinue}
              className="flex items-center gap-2 border-2 border-[#ff3366] bg-[#ff3366] px-8 py-3 text-xs font-bold uppercase tracking-widest text-white shadow-[0_0_20px_rgba(255,51,102,0.8)] hover:bg-[#ff1744] transition"
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
        <div className="relative w-full max-w-xl border-2 border-[#00ff66] bg-[#0a0f0d] p-8 text-center shadow-[0_0_60px_rgba(0,255,102,0.5)]">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#00ff66] bg-[#00ff66]/15 text-[#00ff66] shadow-[0_0_30px_rgba(0,255,102,0.9)]">
            {stage.isBoss ? <Crown className="h-10 w-10 animate-bounce" /> : <Trophy className="h-10 w-10 animate-bounce" />}
          </div>

          <div className="mt-5">
            <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#00ff66]">
              {stage.isBoss ? '👑 CHEFE DE FASE NEUTRALIZADO!' : '⚡ GUARDIÃO DERROTADO COM SUCESSO!'}
            </span>
            <h2 className="mt-2 text-2xl font-bold text-[#00ff66]">
              {stage.isBoss ? 'NÓ CENTRAL CONQUISTADO!' : `FASE ${stage.number} CONCLUÍDA!`}
            </h2>
          </div>

          <div className="mt-4 border border-[#1b3327] bg-[#050807] p-4 text-xs text-[#9dc197] space-y-2">
            <p className="text-sm font-bold text-[#33ff77]">{stage.synapticReward}</p>
            <p className="text-[#9dc197]/70">
              O conhecimento deste nó foi gravado permanentemente na sua Árvore Neural.
            </p>
          </div>

          <div className="mt-4 flex items-center justify-center gap-4 text-xs font-bold text-[#00ff66]">
            <span>+ {stage.xpReward} XP DE RECOMPENSA</span>
            <span>•</span>
            <span>NÓ DESBLOQUEADO</span>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {onExportToSandbox && (
              <button
                type="button"
                onClick={onExportToSandbox}
                className="flex items-center gap-1.5 border border-[#1b3327] bg-[#0d1612] px-4 py-2.5 text-xs text-[#9dc197] hover:border-[#00ff66] hover:text-[#00ff66] transition"
              >
                <Code2 size={14} />
                <span>EXPERIMENTAR NA SANDBOX</span>
              </button>
            )}

            <button
              type="button"
              onClick={onContinue}
              className="flex items-center gap-2 border-2 border-[#00ff66] bg-[#00ff66] px-8 py-3 text-xs font-bold uppercase tracking-widest text-black shadow-[0_0_20px_rgba(0,255,102,0.6)] hover:bg-[#33ff77] transition"
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
      <div className="relative w-full max-w-lg border-2 border-[#ff3366] bg-[#0a0507] p-8 text-center shadow-[0_0_60px_rgba(255,51,102,0.6)]">
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#ff3366] bg-[#ff3366]/20 text-[#ff3366] shadow-[0_0_30px_rgba(255,51,102,0.9)]">
          <Flame className="h-10 w-10 animate-pulse" />
        </div>

        <div className="mt-5">
          <span className="text-xs font-bold uppercase tracking-[0.3em] text-[#ff3366]">
            [SOBRECARGA NEURAL // GAME OVER]
          </span>
          <h2 className="mt-2 text-2xl font-bold text-[#ff3366]">
            SUAS VIDAS FORAM ESGOTADAS
          </h2>
        </div>

        <p className="mt-3 text-xs text-[#9dc197] leading-relaxed border-y border-[#ff3366]/30 py-3">
          A Cadeira de Aprendizado atingiu a temperatura crítica. O Guardião resistiu ao ataque. Recalibre suas sinapses no Tomo de Conhecimento e reinicie o desafio.
        </p>

        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-2 border-2 border-[#00ff66] bg-[#00ff66] px-8 py-3 text-xs font-bold uppercase tracking-widest text-black shadow-[0_0_20px_rgba(0,255,102,0.6)] hover:bg-[#33ff77] transition"
          >
            <RotateCcw size={14} />
            <span>REINICIAR DESAFIO DA FASE</span>
          </button>
        </div>
      </div>
    </div>
  );
};
