import React, { useState } from 'react';
import { 
  Heart, 
  BookOpen, 
  Sword, 
  HelpCircle, 
  Terminal, 
  Skull, 
  Crown
} from 'lucide-react';
import type { DungeonStage, BattleOption } from './types';

interface BattleArenaProps {
  stage: DungeonStage;
  playerLives: number;
  monsterHp: number;
  maxMonsterHp: number;
  onAttack: (option: BattleOption) => void;
  onConsultCodex: () => void;
  onExportToSandbox: (code: string) => void;
  isSubmitting?: boolean;
}

export const BattleArena: React.FC<BattleArenaProps> = ({
  stage,
  playerLives,
  monsterHp,
  maxMonsterHp,
  onAttack,
  onConsultCodex,
  onExportToSandbox,
  isSubmitting = false,
}) => {
  const { battle, isBoss, guardianName, bossName, bossTitle } = stage;
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [showHint, setShowHint] = useState(false);

  const handleExecuteAttack = () => {
    if (!selectedOptionId || isSubmitting) return;
    const chosen = battle.options.find((opt) => opt.id === selectedOptionId);
    if (chosen) {
      onAttack(chosen);
    }
  };

  const monsterHpPercent = Math.max(0, Math.round((monsterHp / maxMonsterHp) * 100));

  return (
    <div className="space-y-6 font-mono text-fg animate-fade-in">
      {/* Upper Arena Battleground (Player vs Monster HUD) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: Player on the Learning Chair */}
        <div className="border-2 border-accent bg-panel p-5 shadow-[0_0_20px_color-mix(in_srgb,var(--color-accent)_15%,transparent)] relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-accent animate-ping" />
              <span className="text-xs font-bold uppercase tracking-widest text-accent">
                OPERADOR // CADEIRA DE APRENDIZADO
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-widest text-fg/60">STATUS: CONECTADO</span>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-fg/70 uppercase tracking-widest block">INTEGRIDADE NEURAL</span>
              <span className="text-base font-bold text-accent">3 / {playerLives} VIDAS RESTANTES</span>
            </div>

            {/* Lives Visual Hearts */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className={`border p-2 transition-all duration-300 ${
                    i < playerLives
                      ? 'border-accent bg-accent/20 text-accent shadow-[0_0_10px_color-mix(in_srgb,var(--color-accent)_60%,transparent)]'
                      : 'border-danger/40 bg-danger/10 text-danger opacity-40'
                  }`}
                >
                  <Heart size={18} className={i < playerLives ? 'fill-current animate-pulse' : ''} />
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 border border-line bg-bg p-2.5 text-[10px] text-fg/70">
            ⚠ <em>Aviso de Choque:</em> Cada erro causa uma descarga elétrica de -1 Vida e redirecionamento de volta ao Tomo de Conhecimento.
          </div>
        </div>

        {/* Right: Monster / Guardian / Stage Boss */}
        <div
          className={`border-2 p-5 relative overflow-hidden shadow-xl transition-all ${
            isBoss
              ? 'border-danger bg-danger/10 shadow-[0_0_30px_color-mix(in_srgb,var(--color-danger)_25%,transparent)]'
              : 'border-info bg-info/10 shadow-[0_0_20px_color-mix(in_srgb,var(--color-info)_15%,transparent)]'
          }`}
        >
          <div className="flex items-center justify-between border-b border-current/30 pb-3">
            <div className="flex items-center gap-2">
              {isBoss ? (
                <Crown className="h-4 w-4 text-danger animate-bounce" />
              ) : (
                <Skull className="h-4 w-4 text-info" />
              )}
              <span className={`text-xs font-bold uppercase tracking-widest ${isBoss ? 'text-danger' : 'text-info'}`}>
                {isBoss ? 'CHEFE DE FASE // GUARDIÃO ALFA' : 'GUARDIÃO DA SINAPSE'}
              </span>
            </div>
            <span className="text-[10px] uppercase tracking-widest opacity-70">
              FASE {stage.number}
            </span>
          </div>

          <div className="mt-3">
            <h3 className={`text-base sm:text-lg font-bold ${isBoss ? 'text-danger' : 'text-info'}`}>
              {isBoss ? bossName || guardianName : guardianName}
            </h3>
            {bossTitle && (
              <span className="text-[10px] uppercase tracking-widest opacity-80 block">{bossTitle}</span>
            )}
          </div>

          {/* Monster HP Bar divided in segments */}
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-[10px] uppercase tracking-widest">
              <span>HP DO GUARDIÃO</span>
              <span className="font-bold">{monsterHp} / {maxMonsterHp} HP ({monsterHpPercent}%)</span>
            </div>
            <div className="grid grid-cols-5 gap-1 h-3 border border-current/30 p-0.5 bg-black/60">
              {Array.from({ length: maxMonsterHp }).map((_, i) => (
                <div
                  key={i}
                  className={`h-full transition-all duration-300 ${
                    i < monsterHp
                      ? isBoss
                        ? 'bg-danger shadow-[0_0_8px_var(--color-danger)]'
                        : 'bg-info shadow-[0_0_8px_var(--color-info)]'
                      : 'bg-black/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Center: Active Battle Challenge Area */}
      <div className="border-2 border-line bg-panel p-6 shadow-2xl space-y-5">
        {/* Challenge prompt */}
        <div className="border-b border-line pb-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-accent">
            <Terminal size={14} />
            <span>DESAFIO TÁTICO DA ARENA // {battle.type.toUpperCase().replace('_', ' ')}</span>
          </div>
          <h3 className="mt-2 text-sm sm:text-base font-bold text-accent leading-relaxed">
            {battle.questionPrompt}
          </h3>
        </div>

        {/* Code Snippet Box */}
        {battle.codeSnippet && (
          <div className="border border-line bg-bg p-4 text-xs font-mono relative">
            <div className="flex items-center justify-between border-b border-line pb-2 mb-2 text-[10px] text-accent uppercase tracking-widest font-bold">
              <span>// CÓDIGO DO DESAFIO</span>
              <button
                type="button"
                onClick={() => onExportToSandbox(battle.codeSnippet)}
                className="text-accent hover:underline"
              >
                [ EXPORTAR PARA SANDBOX &gt; ]
              </button>
            </div>
            <pre className="overflow-x-auto text-accent text-[11px] sm:text-xs leading-relaxed select-all">
              {battle.codeSnippet}
            </pre>
          </div>
        )}

        {/* Expected Output if present */}
        {battle.expectedOutput && (
          <div className="border border-line bg-bg px-3 py-2 text-xs">
            <span className="text-[10px] text-fg/60 uppercase tracking-widest block">SAÍDA ESPERADA:</span>
            <code className="text-accent font-bold">{battle.expectedOutput}</code>
          </div>
        )}

        {/* Tactical Options for the Attack */}
        <div className="space-y-3 pt-2">
          <span className="text-xs font-bold uppercase tracking-widest text-accent block">
            SELECIONE SEU CONTRA-ATAQUE (RESPOSTA OU CORREÇÃO):
          </span>

          <div className="grid grid-cols-1 gap-2.5">
            {battle.options.map((opt, idx) => {
              const isSelected = selectedOptionId === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSelectedOptionId(opt.id)}
                  className={`w-full flex items-start gap-3 p-3.5 text-left border transition-all ${
                    isSelected
                      ? 'border-accent bg-accent/15 text-accent shadow-[0_0_15px_color-mix(in_srgb,var(--color-accent)_30%,transparent)] font-bold'
                      : 'border-line bg-bg text-fg hover:border-accent/60 hover:bg-accent/5'
                  }`}
                >
                  <span className="shrink-0 mt-0.5 font-bold">
                    [{String.fromCharCode(65 + idx)}] &gt;
                  </span>
                  <span className="flex-1 text-xs sm:text-sm font-mono whitespace-pre-wrap leading-relaxed">
                    {opt.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Tactical Hint Banner if requested */}
        {showHint && (
          <div className="border border-warn/40 bg-warn/10 p-3 text-xs text-warn flex items-start gap-2 animate-fade-in">
            <HelpCircle size={15} className="shrink-0 mt-0.5" />
            <div>
              <strong>DICA TÁTICA DO PROF. A.ILSON:</strong> {battle.hint}
            </div>
          </div>
        )}

        {/* Action Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHint((h) => !h)}
              className="flex items-center gap-1.5 border border-line bg-bg px-3 py-2 text-xs text-fg hover:border-warn hover:text-warn transition"
            >
              <HelpCircle size={13} />
              <span>{showHint ? 'OCULTAR DICA' : 'SOLICITAR DICA'}</span>
            </button>

            <button
              type="button"
              onClick={onConsultCodex}
              className="flex items-center gap-1.5 border border-line bg-bg px-3 py-2 text-xs text-fg hover:border-accent hover:text-accent transition"
            >
              <BookOpen size={13} />
              <span>CONSULTAR TOMO</span>
            </button>
          </div>

          <button
            type="button"
            disabled={!selectedOptionId || isSubmitting}
            onClick={handleExecuteAttack}
            className="flex items-center gap-3 border-2 border-accent bg-accent px-8 py-3 text-xs sm:text-sm font-bold uppercase tracking-widest text-on-accent shadow-[0_0_20px_color-mix(in_srgb,var(--color-accent)_60%,transparent)] hover:bg-accent/80 hover:shadow-[0_0_30px_color-mix(in_srgb,var(--color-accent)_90%,transparent)] disabled:opacity-40 transition"
          >
            <Sword size={16} />
            <span>{isSubmitting ? 'COMPILANDO CONTRA-ATAQUE...' : 'EXECUTAR CONTRA-ATAQUE'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
