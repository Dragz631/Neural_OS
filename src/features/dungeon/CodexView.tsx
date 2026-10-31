import React from 'react';
import { BookOpen, ShieldAlert, Code2, Sword, ArrowRight, Lightbulb, AlertTriangle } from 'lucide-react';
import type { DungeonStage } from './types';

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
    <div className="space-y-6 font-mono text-fg animate-fade-in">
      {/* Shock Warning Banner if redirected from failure */}
      {shockHighlight && (
        <div className="border-2 border-danger bg-danger/10 p-4 shadow-[0_0_25px_color-mix(in_srgb,var(--color-danger)_30%,transparent)] animate-pulse">
          <div className="flex items-start gap-3 text-danger">
            <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold uppercase tracking-[0.25em]">
                [ALERTA DE CHOQUE NEURAL // RETORNO AO CODEX]
              </h4>
              <p className="mt-1 text-xs text-fg leading-relaxed">
                Você sofreu uma descarga elétrica na Cadeira de Aprendizado por erro na Arena. Revise com atenção o ponto abaixo antes de tentar novamente!
              </p>
              {lastFailureExplanation && (
                <div className="mt-2 border border-danger/40 bg-black/60 p-2 text-xs font-mono text-danger">
                  <strong>Motivo da Falha:</strong> {lastFailureExplanation}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Codex Card */}
      <div className="border-2 border-accent bg-panel p-6 sm:p-8 shadow-[0_0_30px_color-mix(in_srgb,var(--color-accent)_15%,transparent)] relative">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
          <div className="flex items-center gap-2.5">
            <BookOpen className="h-5 w-5 text-accent" />
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-accent">
              CODEX // TOMO DE CONHECIMENTO FORMAL • FASE {stage.number}
            </span>
          </div>
          <span className="border border-accent/40 bg-accent/10 px-2.5 py-1 text-[10px] font-bold text-accent">
            REGRA DA MATRIZ: NENHUMA PERGUNTA SEM ESTAR AQUI
          </span>
        </div>

        {/* Title & Core Essence */}
        <div className="mt-6 space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-accent leading-snug">
            {codex.topic}
          </h2>

          <div className="border-l-2 border-accent bg-bg p-4 text-xs sm:text-sm text-fg leading-relaxed">
            <strong className="text-accent block text-[10px] uppercase tracking-widest mb-1">
              CONCEITO ESSENCIAL (SEM JARGÕES COMPLEXOS):
            </strong>
            {codex.essence}
          </div>
        </div>

        {/* Syntax Breakdown Grid */}
        <div className="mt-6 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-accent flex items-center gap-1.5">
            <Lightbulb size={14} /> DESMEMBRAMENTO DE SINTAXE &amp; ELEMENTOS
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {codex.syntaxBreakdown.map((item, idx) => (
              <div
                key={idx}
                className="border border-line bg-bg p-3 text-xs space-y-1.5"
              >
                <code className="text-accent font-bold text-[11px] block border-b border-line pb-1 select-all">
                  {item.term}
                </code>
                <p className="text-[11px] text-fg/80 leading-relaxed">
                  {item.explanation}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Code Example Snippet */}
        <div className="mt-6 border border-line bg-bg p-4 text-xs">
          <div className="flex items-center justify-between border-b border-line pb-2 mb-3 text-[10px] text-accent uppercase tracking-widest font-bold">
            <span className="flex items-center gap-1.5">
              <Code2 size={13} /> EXEMPLO PRÁTICO CANÔNICO
            </span>
            {onExportToSandbox && (
              <button
                type="button"
                onClick={() => onExportToSandbox(codex.codeExample)}
                className="text-accent hover:underline"
              >
                [ EXPORTAR PARA SANDBOX &gt; ]
              </button>
            )}
          </div>
          <pre className="overflow-x-auto font-mono text-[11px] text-accent leading-relaxed select-all">
            {codex.codeExample}
          </pre>
        </div>

        {/* Common Pitfalls / Armadilhas */}
        <div className="mt-6 border border-line bg-panel p-4 space-y-2">
          <h4 className="text-xs font-bold uppercase tracking-widest text-warn flex items-center gap-1.5">
            <ShieldAlert size={14} /> ARMADILHAS FREQUENTES &amp; PONTOS DE FALHA
          </h4>
          <ul className="space-y-1.5 text-xs text-fg/90 pl-4 list-disc">
            {codex.pitfalls.map((pitfall, idx) => (
              <li key={idx} className="leading-relaxed">
                {pitfall}
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-6">
          <span className="text-[10px] text-fg/60 uppercase tracking-widest">
            // Você possui 3 Vidas na Cadeira Neural. Estude antes de avançar.
          </span>

          <button
            type="button"
            onClick={onEnterArena}
            className="group flex items-center gap-3 border-2 border-accent bg-accent px-8 py-3.5 font-bold uppercase tracking-widest text-on-accent shadow-[0_0_20px_color-mix(in_srgb,var(--color-accent)_60%,transparent)] hover:bg-accent/80 hover:shadow-[0_0_30px_color-mix(in_srgb,var(--color-accent)_90%,transparent)] transition"
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
