import { useState } from 'react';
import { 
  Sword, 
  Crown, 
  Lock, 
  CheckCircle2, 
  Zap
} from 'lucide-react';
import { useDungeon } from './store';
import { useStudy } from '../../store/study';
import { useNav } from '../../store/nav';
import { DUNGEON_STAGES_BY_TRACK } from './dungeonData';
import { CodexView } from './CodexView';
import { BattleArena } from './BattleArena';
import { ResolutionEffects } from './ResolutionEffects';
import type { TrackId, DungeonStage, BattleOption } from './types';

type DungeonFlowStep = 'codex' | 'arena';

export default function DungeonProtocol() {
  const activeTrack = useDungeon((s) => s.track);
  const setActiveTrack = useDungeon((s) => s.setTrack);
  const dungeonProgress = useDungeon((s) => s.progress);
  const recordWin = useDungeon((s) => s.recordWin);
  // XP do Dungeon entra no mesmo nível do perfil.
  const addXP = (amount: number) => useStudy.setState((s) => ({ profile: { ...s.profile, xp: s.profile.xp + amount } }));

  const stages = DUNGEON_STAGES_BY_TRACK[activeTrack] || [];
  const trackProgress = dungeonProgress[activeTrack] || {
    currentStageNumber: 1,
    completedStageIds: [],
    defeatedBossIds: [],
    highScores: {},
  };

  // Active stage index
  const [activeStageIndex, setActiveStageIndex] = useState<number>(() => {
    const currentNum = trackProgress.currentStageNumber;
    return Math.min(Math.max(0, currentNum - 1), stages.length - 1);
  });

  const activeStage: DungeonStage = stages[activeStageIndex] || stages[0];

  // Game flow states
  const [currentStep, setCurrentStep] = useState<DungeonFlowStep>('codex');
  const [playerLives, setPlayerLives] = useState<number>(3);
  const [monsterHp, setMonsterHp] = useState<number>(5);
  const maxMonsterHp = 5;

  // Resolution modal state
  const [resolutionStatus, setResolutionStatus] = useState<'hit' | 'miss' | 'victory' | 'game_over' | null>(null);
  const [lastExplanation, setLastExplanation] = useState<string>('');
  const [hasShockPenalty, setHasShockPenalty] = useState<boolean>(false);

  const trackLabels: Record<TrackId, string> = {
    csharp: 'C# OOP',
    c_bases: 'C BASES',
    lfa: 'LFA & AUTÔMATOS',
  };

  const handleSelectTrack = (track: TrackId) => {
    setActiveTrack(track);
    const newTrackStages = DUNGEON_STAGES_BY_TRACK[track] || [];
    const newProgress = dungeonProgress[track] || { currentStageNumber: 1, completedStageIds: [], defeatedBossIds: [], highScores: {} };
    const safeIdx = Math.min(Math.max(0, newProgress.currentStageNumber - 1), newTrackStages.length - 1);
    setActiveStageIndex(safeIdx);
    setCurrentStep('codex');
    setPlayerLives(3);
    setMonsterHp(5);
    setResolutionStatus(null);
    setHasShockPenalty(false);
  };

  const handleSelectStage = (index: number) => {
    // Check if stage is unlocked
    const isUnlocked = index + 1 <= trackProgress.currentStageNumber || trackProgress.completedStageIds.includes(stages[index].id);
    if (!isUnlocked) return;

    setActiveStageIndex(index);
    setCurrentStep('codex');
    setMonsterHp(5);
    setPlayerLives(3);
    setResolutionStatus(null);
    setHasShockPenalty(false);
  };

  const handleAttack = (chosenOption: BattleOption) => {
    if (chosenOption.correct) {
      // Hit on monster
      const newHp = Math.max(0, monsterHp - 5); // 1-shot per challenge or progressive
      setMonsterHp(newHp);
      addXP(activeStage.xpReward);

      if (newHp === 0) {
        // Stage victory!
        recordWin(activeTrack, activeStage.id, activeStage.number, 100, activeStage.isBoss);
        setLastExplanation(chosenOption.explanation);
        setResolutionStatus('victory');
      } else {
        setLastExplanation(chosenOption.explanation);
        setResolutionStatus('hit');
      }
    } else {
      // Miss -> Electric Shock penalty
      const newLives = playerLives - 1;
      setPlayerLives(newLives);
      setLastExplanation(chosenOption.explanation);

      if (newLives <= 0) {
        setResolutionStatus('game_over');
      } else {
        setResolutionStatus('miss');
      }
    }
  };

  const handleResolutionContinue = () => {
    if (resolutionStatus === 'hit') {
      setResolutionStatus(null);
    } else if (resolutionStatus === 'miss') {
      setResolutionStatus(null);
      setHasShockPenalty(true);
      setCurrentStep('codex'); // Return to codex with shock highlight!
    } else if (resolutionStatus === 'victory') {
      setResolutionStatus(null);
      // Advance to next stage if available
      if (activeStageIndex < stages.length - 1) {
        setActiveStageIndex((prev) => prev + 1);
        setCurrentStep('codex');
        setMonsterHp(5);
        setPlayerLives(3);
        setHasShockPenalty(false);
      }
    }
  };

  const handleRetry = () => {
    setPlayerLives(3);
    setMonsterHp(5);
    setResolutionStatus(null);
    setHasShockPenalty(false);
    setCurrentStep('codex');
  };

  const handleExportToSandbox = (code?: string) => {
    const snippetToExport = code || activeStage.codex.codeExample || activeStage.battle.codeSnippet;
    // Vai direto pro Sandbox como desafio "leia, preveja e melhore".
    const linguagem = { csharp: 'csharp', c_bases: 'c', lfa: 'automato' }[activeTrack];
    useNav.getState().mandarProSandbox({ texto: snippetToExport, origem: `Dungeon (${activeStage.codex.topic})`, linguagem });
  };

  return (
    <div className="min-h-screen bg-[#0a0f0d] font-mono text-[#9dc197]">
      {/* Top Header & Track Selector */}
      <header className="flex flex-wrap items-center justify-between border-b border-[#1b3327] bg-[#0d1612] px-4 sm:px-8 py-3 gap-4">
        <div className="flex items-center gap-3">
          <Sword className="h-6 w-6 text-[#00ff66]" />
          <div>
            <h1 className="text-sm font-bold uppercase tracking-[0.3em] text-[#00ff66]">
              DUNGEON PROTOCOL // FASES &amp; CHEFES
            </h1>
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#9dc197]/60">
              Estudo Ativo, Batalhas de Código e Desbloqueio Sináptico
            </p>
          </div>
        </div>

        {/* Track Selector Buttons */}
        <div className="flex items-center gap-1.5 border border-[#1b3327] bg-[#050807] p-1">
          {(['csharp', 'c_bases', 'lfa'] as TrackId[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleSelectTrack(t)}
              className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition ${
                activeTrack === t
                  ? 'bg-[#00ff66] text-black shadow-[0_0_12px_rgba(0,255,102,0.6)]'
                  : 'text-[#9dc197]/70 hover:text-[#00ff66]'
              }`}
            >
              [{trackLabels[t]}]
            </button>
          ))}
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <span className="border border-[#00ff66]/30 bg-[#00ff66]/10 px-3 py-1 text-xs text-[#00ff66] font-bold">
            {trackProgress.completedStageIds.length}/{stages.length} NÓS CONQUISTADOS
          </span>
        </div>
      </header>

      {/* Stage Progression Map / Synaptic Ladder */}
      <div className="border-b border-[#1b3327] bg-[#050807] px-4 sm:px-8 py-3">
        <div className="flex items-center gap-2 overflow-x-auto">
          {stages.map((st, idx) => {
            const isCompleted = trackProgress.completedStageIds.includes(st.id);
            const isUnlocked = idx + 1 <= trackProgress.currentStageNumber || isCompleted;
            const isSelected = activeStageIndex === idx;

            return (
              <button
                key={st.id}
                type="button"
                disabled={!isUnlocked}
                onClick={() => handleSelectStage(idx)}
                className={`flex items-center gap-2 border px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition shrink-0 ${
                  isSelected
                    ? 'border-[#00ff66] bg-[#00ff66] text-black shadow-[0_0_12px_rgba(0,255,102,0.6)]'
                    : isCompleted
                    ? 'border-[#00ff66]/60 bg-[#00ff66]/10 text-[#00ff66]'
                    : isUnlocked
                    ? 'border-[#1b3327] bg-[#0d1612] text-[#9dc197] hover:border-[#00ff66]'
                    : 'border-[#1b3327]/40 bg-black/40 text-[#9dc197]/30 cursor-not-allowed'
                }`}
              >
                {st.isBoss ? (
                  <Crown size={14} className={isSelected ? 'text-black' : isUnlocked ? 'text-[#ff3366]' : ''} />
                ) : isCompleted ? (
                  <CheckCircle2 size={14} className={isSelected ? 'text-black' : 'text-[#00ff66]'} />
                ) : !isUnlocked ? (
                  <Lock size={12} />
                ) : (
                  <Zap size={12} />
                )}
                <span>
                  {st.isBoss ? `CHEFE: ${st.guardianName}` : `FASE ${st.number}`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content: Step 1 (Codex) or Step 2 (Arena) */}
      <main className="p-4 sm:p-8 max-w-[1400px] mx-auto">
        {currentStep === 'codex' && (
          <CodexView
            stage={activeStage}
            onEnterArena={() => setCurrentStep('arena')}
            shockHighlight={hasShockPenalty}
            lastFailureExplanation={lastExplanation}
            onExportToSandbox={handleExportToSandbox}
          />
        )}

        {currentStep === 'arena' && (
          <BattleArena
            stage={activeStage}
            playerLives={playerLives}
            monsterHp={monsterHp}
            maxMonsterHp={maxMonsterHp}
            onAttack={handleAttack}
            onConsultCodex={() => setCurrentStep('codex')}
            onExportToSandbox={handleExportToSandbox}
          />
        )}
      </main>

      {/* Step 3: Resolution & Feedback Effects Modal */}
      {resolutionStatus && (
        <ResolutionEffects
          status={resolutionStatus}
          stage={activeStage}
          explanation={lastExplanation}
          onContinue={handleResolutionContinue}
          onRetry={handleRetry}
          onExportToSandbox={() => handleExportToSandbox()}
        />
      )}
    </div>
  );
}
