import React from 'react';
import { BookOpen, ShieldAlert, Code2, Sword, ArrowRight, Lightbulb, AlertTriangle } from 'lucide-react';
import type { DungeonStage } from '../../types';

interface CodexViewProps {
  stage: DungeonStage;
  onEnterArena: () => void;
  shockHighlight?: boolean;
  lastFailureExplanation?: string;
  onExportToSandbox?: (code: string) => void;
}

export const CodexView: React.FC<CodexViewProps> = ({
  stage,
  onEnterArena,
  shockHighlight,
  lastFailureExplanation,
  onExportToSandbox,
}) => {
  const { codex } = stage;

  return (
    <div className="space-y-6 font-mono text-[#9dc197] animate-fade-in">
      {/* Shock Warning Banner if redirected from failure */}
      {shockHighlight && (
        <div className="border-2 border-[#ff3366] bg-[#ff3366]/10 p-4 shadow-[0_0_25px_rgba(255,51,102,0.3)] animate-pulse">
          <div className="flex items-start gap-3 text-[#ff3366]">
            <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.25em]">
                [ALERTA DE CHOQUE NEURAL // RETORNO AO CODEX]
              </h4>
              <p className="mt-1 text-xs text-[#9dc197] leading-relaxed">
                Você sofreu uma descarga elétrica na Cadeira de Aprendizado por erro na Arena. Revise com atenção o ponto abaixo antes de tentar novamente!
              </p>
              {lastFailureExplanation && (
                <div className="mt-2 border border-[#ff3366]/40 bg-black/60 p-2 text-xs font-mono text-[#ff3366]">
                  <strong>Motivo da Falha:</strong> {lastFailureExplanation}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Codex Card */}
      <div className="border-2 border-[#00ff66] bg-[#0d1612] p-6 sm:p-8 shadow-[0_0_30px_rgba(0,255,102,0.15)] relative">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1b3327] pb-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-[#00ff66]" />
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-[#00ff66]">
              CODEX // TOMO DE CONHECIMENTO FORMAL • FASE {stage.number}
            </span>
          </div>
          <span className="border border-[#00ff66]/40 bg-[#00ff66]/10 px-2.5 py-1 text-[10px] font-bold text-[#00ff66]">
            REGRA DA MATRIZ: NENHUMA PERGUNTA SEM ESTAR AQUI
          </span>
        </div>

        {/* Title & Core Essence */}
        <div className="mt-6 space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-[#00ff66] leading-snug">
            {codex.topic}
          </h2>

          <div className="border-l-2 border-[#00ff66] bg-[#050807] p-4 text-xs sm:text-sm text-[#9dc197] leading-relaxed">
            <strong className="text-[#33ff77] block text-[10px] uppercase tracking-widest mb-1">
              CONCEITO ESSENCIAL (SEM JARGÕES COMPLEXOS):
            </strong>
            {codex.essence}
          </div>
        </div>

        {/* Syntax Breakdown Grid */}
        <div className="mt-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#00ff66] flex items-center gap-1.5">
            <Lightbulb size={14} /> DESMEMBRAMENTO DE SINTAXE &amp; ELEMENTOS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {codex.syntaxBreakdown.map((item, idx) => (
              <div
                key={idx}
                className="border border-[#1b3327] bg-[#050807] p-3 text-xs space-y-1.5"
              >
                <code className="text-[#00ff66] font-bold text-[11px] block border-b border-[#1b3327] pb-1 select-all">
                  {item.term}
                </code>
                <p className="text-[11px] text-[#9dc197]/80 leading-relaxed">
                  {item.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Code Example Snippet */}
        <div className="mt-6 border border-[#1b3327] bg-[#050807] p-4 text-xs">
          <div className="flex items-center justify-between border-b border-[#1b3327] pb-2 mb-3 text-[10px] text-[#00ff66] uppercase tracking-widest font-bold">
            <span className="flex items-center gap-1.5">
              <Code2 size={13} /> EXEMPLO PRÁTICO CANÔNICO
            </span>
            {onExportToSandbox && (
              <button
                type="button"
                onClick={() => onExportToSandbox(codex.codeExample)}
                className="text-[#00ff66] hover:underline"
              >
                [ EXPORTAR PARA SANDBOX &gt; ]
              </button>
            )}
          </div>
          <pre className="overflow-x-auto font-mono text-[11px] text-[#00ff66] leading-relaxed select-all">
            {codex.codeExample}
          </pre>
        </div>

        {/* Common Pitfalls / Armadilhas */}
        <div className="mt-6 border border-[#1b3327] bg-[#0d1612] p-4 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-widest text-[#ffaa00] flex items-center gap-1.5">
            <ShieldAlert size={14} /> ARMADILHAS FREQUENTES &amp; PONTOS DE FALHA
          </h4>
          <ul className="space-y-1.5 text-xs text-[#9dc197]/90 pl-4 list-disc">
            {codex.pitfalls.map((pitfall, idx) => (
              <li key={idx} className="leading-relaxed">
                {pitfall}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#1b3327] pt-6">
          <span className="text-[10px] text-[#9dc197]/60 uppercase tracking-widest">
            // Você possui 3 Vidas na Cadeira Neural. Estude antes de avançar.
          </span>

          <button
            type="button"
            onClick={onEnterArena}
            className="group flex items-center gap-3 border-2 border-[#00ff66] bg-[#00ff66] px-8 py-3.5 font-bold uppercase tracking-widest text-black shadow-[0_0_20px_rgba(0,255,102,0.6)] hover:bg-[#33ff77] hover:shadow-[0_0_30px_rgba(0,255,102,0.9)] transition"
          >
            <Sword className="h-5 w-5" />
            <span>ENTRAR NA ARENA DE BATALHA</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
