import React, { useState, useEffect, useMemo } from 'react';
import { 
  Terminal, 
  Play, 
  Lock, 
  Check, 
  HelpCircle, 
  Cpu, 
  Layers, 
  Code2, 
  ShieldAlert, 
  Info, 
  Clock, 
  Sparkles, 
  BookOpen, 
  Zap, 
  FileCode,
  History,
  RotateCcw,
  CheckCircle,
  Copy,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNeural } from '../context/NeuralContext';
import { 
  SANDBOX_SKILLS_BY_TRACK, 
  STANDARD_CHALLENGES, 
  MINI_CHALLENGES, 
  TRACK_METADATA, 
  BOILERPLATES_BY_TRACK 
} from '../data/sandboxChallenges';
import type { TrackId, SandboxChallenge, SandboxSkill, SolvedSolution } from '../types';
import { toast } from '../hooks/use-toast';

export default function Sandbox() {
  const { 
    activeTrack, 
    setActiveTrack, 
    trackProgress, 
    setTrackEditorDraft, 
    toggleTrackSkill, 
    sandboxExportPayload, 
    clearSandboxExport,
    recordSolutionSuccess,
    getTrackSolutions
  } = useNeural();

  const currentTrackState = trackProgress[activeTrack] || {
    level: 1,
    xp: 0,
    xpToNextLevel: 200,
    unlockedSkillIds: [],
    checkedSkillIds: [],
    editorDraft: BOILERPLATES_BY_TRACK[activeTrack],
    completedChallengeIds: [],
    solutionsHistory: [],
  };

  const currentLevel = currentTrackState.level;
  const checkedSkillIds = currentTrackState.checkedSkillIds || [];
  const completedChallengeIds = currentTrackState.completedChallengeIds || [];
  const skillsForTrack: SandboxSkill[] = SANDBOX_SKILLS_BY_TRACK[activeTrack] || [];
  const trackMeta = TRACK_METADATA[activeTrack] || TRACK_METADATA.csharp;

  // Mode state
  const [isMiniMode, setIsMiniMode] = useState<boolean>(false);
  const [challengeIndex, setChallengeIndex] = useState<number>(0);

  // History Drawer state
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const trackSolutions = getTrackSolutions(activeTrack);

  // Filter available challenges for current track & active skills
  const availableChallenges = useMemo(() => {
    const list = isMiniMode ? MINI_CHALLENGES : STANDARD_CHALLENGES;
    const trackFiltered = list.filter((c) => c.track === activeTrack);
    
    // Filter by checked skills if any checked, else return all track challenges
    const skillFiltered = trackFiltered.filter((c) =>
      c.requiredSkills.every((skillId) => checkedSkillIds.includes(skillId))
    );

    if (skillFiltered.length > 0) return skillFiltered;
    return trackFiltered.length > 0 ? trackFiltered : list;
  }, [activeTrack, isMiniMode, checkedSkillIds]);

  const activeChallenge: SandboxChallenge = useMemo(() => {
    if (availableChallenges.length === 0) {
      return {
        id: 'fallback',
        track: activeTrack,
        title: `Desafio Contextual [${trackMeta.label}]`,
        description: 'Pratique seu código no editor abaixo e experimente a sintaxe.',
        boilerplate: BOILERPLATES_BY_TRACK[activeTrack],
        hints: ['Selecione habilidades na matriz ao lado para desbloquear desafios específicos.'],
        validationKeywords: [],
        expectedOutput: '>> Execução concluída.',
        successMessage: 'Código validado na Matriz!',
        requiredSkills: [],
      };
    }
    return availableChallenges[challengeIndex % availableChallenges.length];
  }, [availableChallenges, challengeIndex, activeTrack, trackMeta.label]);

  const isCurrentChallengeSolved = completedChallengeIds.includes(activeChallenge.id);

  // Editor content state
  const [editorCode, setEditorCode] = useState<string>(() => {
    return currentTrackState.editorDraft || activeChallenge.boilerplate || BOILERPLATES_BY_TRACK[activeTrack];
  });

  // Keep editor state synced with track switches & drafts
  useEffect(() => {
    if (sandboxExportPayload) {
      setEditorCode(sandboxExportPayload.code);
    } else {
      const draft = currentTrackState.editorDraft || activeChallenge.boilerplate || BOILERPLATES_BY_TRACK[activeTrack];
      setEditorCode(draft);
    }
  }, [activeTrack, activeChallenge.id]);

  // Save changes to track editor draft on edit
  const handleCodeChange = (newCode: string) => {
    setEditorCode(newCode);
    setTrackEditorDraft(activeTrack, newCode);
  };

  // Reset editor boilerplate to clean state
  const handleResetBoilerplate = () => {
    const clean = activeChallenge.boilerplate || BOILERPLATES_BY_TRACK[activeTrack];
    setEditorCode(clean);
    setTrackEditorDraft(activeTrack, clean);
    toast({
      title: 'BOILERPLATE RESTAURADO',
      description: `Código do editor resetado para o modelo limpo de ${trackMeta.label}.`,
      variant: 'default',
    });
  };

  // Restore previous solution
  const handleRestoreSolution = (solution: SolvedSolution) => {
    setEditorCode(solution.codeSnippet);
    setTrackEditorDraft(activeTrack, solution.codeSnippet);
    setShowHistoryDrawer(false);
    toast({
      title: 'SOLUÇÃO RESTAURADA NO EDITOR',
      description: `Código do desafio "${solution.challengeTitle}" carregado.`,
      variant: 'neon',
    });
  };

  // Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState<boolean>(false);

  // Failure preparatory overlay State
  const [showPreparatoryOverlay, setShowPreparatoryOverlay] = useState<boolean>(false);
  const [lastErrorMsg, setLastErrorMsg] = useState<string>('');
  const [preparatoryTip, setPreparatoryTip] = useState<string>('');
  const [nextChallengeName, setNextChallengeName] = useState<string>('');

  // Socratic System State
  const [socraticHintIndex, setSocraticHintIndex] = useState<number>(-1);
  const [showSocraticTerminal, setShowSocraticTerminal] = useState<boolean>(false);

  // Compiler state
  const [compiling, setCompiling] = useState<boolean>(false);
  const [compileLog, setCompileLog] = useState<string[]>([]);
  const [compileStatus, setCompileStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showCompileTerminal, setShowCompileTerminal] = useState<boolean>(false);

  // System time state
  const [systemTime, setSystemTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setSystemTime(now.toLocaleTimeString('pt-BR', { hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Calculate line numbers based on text content
  const lineNumbers = editorCode.split('\n').map((_, index) => index + 1);

  // Editor keyboard events (Tab indentation & Ctrl+Enter validator)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const val = e.currentTarget.value;
      const newValue = val.substring(0, start) + '  ' + val.substring(end);
      handleCodeChange(newValue);
      
      setTimeout(() => {
        const textarea = document.getElementById('sandbox-code-editor') as HTMLTextAreaElement;
        if (textarea) {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        }
      }, 0);
    }
    
    if (e.ctrlKey && e.key === 'Enter') {
      e.preventDefault();
      handleCompileAndRun();
    }
  };

  // Toggle Socratic hint
  const handleAskSocraticHint = () => {
    setShowSocraticTerminal(true);
    if (activeChallenge.hints && activeChallenge.hints.length > 0) {
      setSocraticHintIndex((prev) => (prev + 1) % activeChallenge.hints.length);
    }
  };

  // Switch challenge button
  const handleGenerateChallenge = () => {
    setIsMiniMode(false);
    setChallengeIndex((prev) => prev + 1);
  };

  const handleToggleMiniMode = () => {
    setIsMiniMode((prev) => !prev);
    setChallengeIndex(0);
  };

  // Compiler simulation based on active track
  const handleCompileAndRun = () => {
    if (compiling) return;
    
    setCompiling(true);
    setShowCompileTerminal(true);
    setCompileLog([]);
    setCompileStatus('idle');

    let logs: string[] = [];
    if (activeTrack === 'c_bases') {
      logs = [
        `[GCC] Invocando compilador gcc -Wall -Wextra -O2 main.c -o main.out...`,
        `[GCC] Pré-processador: expandindo headers e diretivas #include <stdio.h>...`,
        `[GCC] Análise léxica e sintática concluída. Gerando código objeto ELF x86_64...`,
        `[GCC] Linker: vinculando glibc e runtime symbols...`,
        `[GCC] Compilação finalizada com 0 avisos.`,
      ];
    } else if (activeTrack === 'lfa') {
      logs = [
        `[LFA_ENGINE] Validando gramática e especificação da 5-tupla formal...`,
        `[LFA_ENGINE] Verificando fechamento do alfabeto Σ e estados Q...`,
        `[LFA_ENGINE] Testando função de transição delta δ: Q × Σ → Q...`,
        `[LFA_ENGINE] Simulador de Autômatos: processando conjunto de testes...`,
        `[LFA_ENGINE] Reconhecimento estrutural concluído.`,
      ];
    } else {
      logs = [
        `[ROSLYN] Inicializando compilador C# Roslyn .NET 9.0 (Language Version: 13.0)...`,
        `[ROSLYN] Parsing de código: verificando tokens e namespaces...`,
        `[ROSLYN] Binding semântico: resolvendo tipos e verificando encapsulamento...`,
        `[ROSLYN] Emitindo assembly CIL (Common Intermediate Language) em memória...`,
        `[CORECLR] JIT Compilation: Compilando para instruções nativas x64...`,
      ];
    }

    let currentLogIndex = 0;
    const interval = setInterval(() => {
      if (currentLogIndex < logs.length) {
        const currentLog = logs[currentLogIndex];
        setCompileLog((prev) => [...prev, currentLog]);
        currentLogIndex++;
      } else {
        clearInterval(interval);
        
        // Analyze code syntax structure
        const codeClean = editorCode.replace(/\s+/g, ' ');
        const missingKeywords = activeChallenge.validationKeywords.filter(
          (kw) => !codeClean.toLowerCase().includes(kw.toLowerCase())
        );

        let customError = '';

        if (activeTrack === 'c_bases') {
          const openBrackets = (editorCode.match(/{/g) || []).length;
          const closeBrackets = (editorCode.match(/}/g) || []).length;
          if (openBrackets !== closeBrackets) {
            customError = `[GCC_ERROR] main.c: Chaves desbalanceadas. Abertas: ${openBrackets}, Fechadas: ${closeBrackets}.`;
          } else if (!editorCode.includes('main')) {
            customError = `[GCC_ERROR] main.c: Função main() não encontrada. Ponto de entrada indefinido.`;
          } else if (!editorCode.includes(';')) {
            customError = `[GCC_ERROR] main.c: Ponto e vírgula ';' esperado no final das instruções.`;
          } else if (missingKeywords.length > 0) {
            customError = `[GCC_ERROR] Símbolos obrigatórios ausentes: [${missingKeywords.join(', ')}].`;
          }
        } else if (activeTrack === 'lfa') {
          try {
            JSON.parse(editorCode);
          } catch {
            customError = `[LFA_PARSE_ERROR] Sintaxe JSON inválida na definição da 5-tupla formal.`;
          }
          if (!customError && missingKeywords.length > 0) {
            customError = `[LFA_SPEC_ERROR] Campos ou estados obrigatórios ausentes: [${missingKeywords.join(', ')}].`;
          }
        } else {
          const openBrackets = (editorCode.match(/{/g) || []).length;
          const closeBrackets = (editorCode.match(/}/g) || []).length;
          if (openBrackets !== closeBrackets) {
            customError = `[CSHARP_ERROR] CS1513: Chaves desbalanceadas. Abertas: ${openBrackets}, Fechadas: ${closeBrackets}.`;
          } else if (!editorCode.includes(';')) {
            customError = `[CSHARP_ERROR] CS1002: ';' esperado.`;
          } else if (missingKeywords.length > 0) {
            customError = `[CSHARP_ERROR] Código incompleto: Faltam referências a [${missingKeywords.join(', ')}].`;
          }
        }

        setTimeout(() => {
          if (customError) {
            setCompileLog((prev) => [
              ...prev,
              `\x1b[31m${customError}\x1b[0m`,
              `[SYSTEM] DIAGNÓSTICO: Correção de sintaxe ou lógica necessária.`
            ]);
            setCompileStatus('error');
            setCompiling(false);

            const nextIndex = (challengeIndex + 1) % Math.max(1, availableChallenges.length);
            const nextChall = availableChallenges[nextIndex] || activeChallenge;

            setTimeout(() => {
              setLastErrorMsg(customError);
              setNextChallengeName(nextChall.title);
              setPreparatoryTip(nextChall.hints[0] || 'Observe com atenção a sintaxe e os tipos da linguagem.');
              setShowPreparatoryOverlay(true);
            }, 1200);
          } else {
            setCompileLog((prev) => [
              ...prev,
              `[STDOUT] Executando programa / simulação...`,
              `----------------------------------------------`,
              activeChallenge.expectedOutput,
              `----------------------------------------------`,
              `[SYSTEM] STATUS (0) - ${activeChallenge.successMessage}`
            ]);
            setCompileStatus('success');
            setCompiling(false);

            // Record solution in history & telemetry
            recordSolutionSuccess({
              challengeId: activeChallenge.id,
              challengeTitle: activeChallenge.title,
              track: activeTrack,
              skills: activeChallenge.requiredSkills,
              codeSnippet: editorCode,
              xpEarned: 80,
            });
            
            setTimeout(() => {
              setShowSuccessModal(true);
            }, 600);
          }
        }, 800);
      }
    }, 250);
  };

  // Next challenge after success: advances index and resets editor with clean boilerplate
  const handleNextChallengeSuccess = () => {
    setShowSuccessModal(false);
    setCompileStatus('idle');
    setShowCompileTerminal(false);
    
    const nextIdx = challengeIndex + 1;
    setChallengeIndex(nextIdx);

    const nextChall = availableChallenges[nextIdx % availableChallenges.length];
    const nextBoilerplate = nextChall?.boilerplate || BOILERPLATES_BY_TRACK[activeTrack];

    setEditorCode(nextBoilerplate);
    setTrackEditorDraft(activeTrack, nextBoilerplate);
  };

  const handleDismissOverlayAndProceed = () => {
    setShowPreparatoryOverlay(false);
    setChallengeIndex((prev) => prev + 1);
  };

  return (
    <div id="neural-os-sandbox" className="min-h-screen bg-[#0a0f0d] text-[#9dc197] font-mono antialiased flex flex-col scanlines relative">
      {/* Top Background Matrix Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0d150b_1px,transparent_1px),linear-gradient(to_bottom,#0d150b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      {/* TOP DESKTOP HEADER BAR & TRACK SELECTOR */}
      <header className="border-b border-[#1b3327] bg-[#0d1612] px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between text-xs z-20 shrink-0 gap-3">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center">
            <span className="animate-ping absolute inline-flex h-2.5 w-2.5 rounded-full bg-[#00ff66] opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff66]" />
          </div>
          <span className="text-[#00ff66] tracking-widest font-bold">NEURAL_OS // SANDBOX</span>
          <span className="text-[#1b3327]">|</span>

          {/* Quick Track Switcher */}
          <div className="flex items-center gap-1 border border-[#1b3327] bg-[#050807] p-0.5">
            {(['c_bases', 'lfa', 'csharp'] as TrackId[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTrack(t)}
                className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition ${
                  activeTrack === t
                    ? 'bg-[#00ff66] text-black shadow-[0_0_8px_rgba(0,255,102,0.6)]'
                    : 'text-[#9dc197]/70 hover:text-[#00ff66]'
                }`}
              >
                {TRACK_METADATA[t].label}
              </button>
            ))}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Solutions History Button */}
          <button
            type="button"
            onClick={() => setShowHistoryDrawer(true)}
            className="flex items-center gap-1.5 px-3 py-1 border border-[#00ff66]/40 bg-[#00ff66]/10 text-[10px] font-bold text-[#00ff66] hover:bg-[#00ff66] hover:text-black transition"
          >
            <History className="w-3.5 h-3.5" />
            <span>SOLUÇÕES ANTERIORES ({trackSolutions.length})</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1 border border-[#1b3327] bg-[#050807] text-[10px] text-[#00ff66]">
            <Cpu className="w-3.5 h-3.5 animate-pulse text-[#00ff66]" />
            <span className="tracking-wide hidden sm:inline">{trackMeta.compilerChannel}</span>
          </div>

          <div className="flex items-center gap-1.5 text-[#9dc197] font-medium bg-[#050807] px-2.5 py-1 border border-[#1b3327]">
            <Clock className="w-3.5 h-3.5 text-[#00ff66]" />
            <span>{systemTime || '13:57:40'}</span>
          </div>
        </div>
      </header>

      {/* MAIN SANDBOX LAYOUT */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto p-4 md:p-6 grid grid-cols-12 gap-5 z-10 min-h-0">
        
        {/* 1. LEFT PANEL: ACTIVE_KNOWLEDGE_MATRIX (Dynamic by Track) */}
        <section id="left-panel-knowledge-matrix" className="col-span-12 lg:col-span-4 flex flex-col bg-[#0d1612] border border-[#1b3327] shadow-2xl relative overflow-hidden h-auto lg:h-[calc(100vh-140px)] min-h-[550px]">
          {/* Header */}
          <div className="border-b border-[#1b3327] bg-[#050807] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#00ff66]" />
              <h2 className="text-xs font-bold text-[#00ff66] tracking-widest uppercase">
                &gt;_ ACTIVE_KNOWLEDGE_MATRIX // {trackMeta.label}
              </h2>
            </div>
            <span className="text-[10px] text-[#9dc197]/60">LVL {currentLevel}</span>
          </div>

          {/* Panel content scrollable */}
          <div className="flex-1 p-4 overflow-y-auto space-y-4">
            
            {/* System welcome and brief instructions */}
            <div className="p-3 border border-[#1b3327] bg-[#050807] text-xs leading-relaxed space-y-1.5">
              <div className="flex items-center gap-2 text-[#00ff66] font-bold">
                <Info className="w-4 h-4" />
                <span>NÚCLEO DINÂMICO DE HABILIDADES</span>
              </div>
              <p className="text-[11px] text-[#9dc197]/80 leading-relaxed">
                Marque as habilidades ativas para calibrar os desafios. Habilidades bloqueadas requerem nível superior na matéria ativa.
              </p>
            </div>

            {/* Dynamic Checklist of skills */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-[#9dc197]/70 font-bold border-b border-[#1b3327] pb-1">
                <span>HABILIDADES SINÁPTICAS DISPONÍVEIS</span>
                <span>{checkedSkillIds.length}/{skillsForTrack.length} ATIVAS</span>
              </div>
              
              <div className="space-y-2">
                {skillsForTrack.map((s) => {
                  const isUnlocked = s.requiresLevel <= currentLevel;
                  const isChecked = checkedSkillIds.includes(s.id);

                  return (
                    <div
                      key={s.id}
                      onClick={() => {
                        if (isUnlocked) toggleTrackSkill(activeTrack, s.id);
                      }}
                      className={`p-3 border transition-all duration-200 ${
                        !isUnlocked
                          ? 'border-[#1b3327]/40 bg-[#050807]/50 opacity-50 cursor-not-allowed'
                          : isChecked
                          ? 'border-[#00ff66] bg-[#00ff66]/10 cursor-pointer shadow-[0_0_10px_rgba(0,255,102,0.15)]'
                          : 'border-[#1b3327] bg-[#050807] hover:border-[#00ff66]/60 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-4 h-4 border flex items-center justify-center transition-colors ${
                              !isUnlocked
                                ? 'border-gray-700 bg-black/40'
                                : isChecked
                                ? 'border-[#00ff66] bg-[#00ff66] text-black shadow-[0_0_6px_#00ff66]'
                                : 'border-[#1b3327] bg-[#0a0f0d]'
                            }`}
                          >
                            {!isUnlocked ? (
                              <Lock className="w-2.5 h-2.5 text-gray-500" />
                            ) : isChecked ? (
                              <Check className="w-3 h-3 text-black stroke-[3]" />
                            ) : null}
                          </div>
                          
                          <span className={`text-xs font-bold ${
                            !isUnlocked ? 'text-gray-500' : isChecked ? 'text-[#00ff66]' : 'text-[#9dc197]'
                          }`}>
                            {s.name}
                          </span>
                        </div>

                        {!isUnlocked ? (
                          <span className="text-[9px] border border-gray-700 bg-gray-900/50 px-2 py-0.5 text-gray-400 font-bold">
                            REQUER LVL {s.requiresLevel}
                          </span>
                        ) : (
                          <span className="text-[9px] border border-[#00ff66]/30 px-1.5 py-0.5 text-[#00ff66]">
                            REQ LVL {s.requiresLevel}
                          </span>
                        )}
                      </div>

                      <p className="mt-1.5 text-[10px] text-[#9dc197]/70 pl-6 leading-relaxed">
                        {s.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status overview */}
            <div className="p-3 border border-[#1b3327] bg-[#050807] space-y-2">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-[#00ff66] font-bold">
                <span>ESTATÍSTICAS DA TRILHA</span>
                <span>{trackMeta.languageBadge}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] text-[#9dc197]/70">
                <div>Nível: <span className="text-[#00ff66] font-bold">LVL {currentLevel}</span></div>
                <div>XP da Trilha: <span className="text-[#00ff66] font-bold">{currentTrackState.xp} XP</span></div>
                <div>Resolvidos: <span className="text-[#00ff66] font-bold">{completedChallengeIds.length}</span></div>
                <div>Desafios na Matriz: <span className="text-[#00ff66] font-bold">{availableChallenges.length}</span></div>
              </div>
            </div>

          </div>

          {/* Action buttons at bottom */}
          <div className="p-4 border-t border-[#1b3327] bg-[#050807] z-10 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleToggleMiniMode}
                className={`py-2.5 px-2 border transition-all font-bold text-[10px] tracking-wider uppercase flex items-center justify-center gap-1.5 ${
                  isMiniMode 
                    ? 'bg-[#ffaa00] border-[#ffaa00] text-black shadow-[0_0_10px_rgba(255,170,0,0.4)]' 
                    : 'border-[#ffaa00]/60 text-[#ffaa00] hover:bg-[#ffaa00] hover:text-black'
                }`}
                title="Desafio curto e rápido para quando você está cansado"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>⚡ MINI DESAFIO</span>
              </button>

              <button
                type="button"
                onClick={handleGenerateChallenge}
                className="py-2.5 px-2 border border-[#00ff66] bg-[#00ff66] text-black font-bold text-[10px] tracking-wider uppercase flex items-center justify-center gap-1.5 hover:bg-[#33ff77] transition shadow-[0_0_10px_rgba(0,255,102,0.4)]"
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>+ GERAR PADRÃO</span>
              </button>
            </div>
            
            {isMiniMode && (
              <div className="text-[10px] text-center text-[#ffaa00] font-mono animate-pulse bg-[#ffaa00]/10 py-1 px-2 border border-[#ffaa00]/30">
                ⚡ MODO MINI ATIVO: Desafios curtos de fixação rápida.
              </div>
            )}
          </div>
        </section>

        {/* 2. RIGHT PANEL: ARENA & EDITOR (Dynamic by Track) */}
        <section id="right-panel-arena" className="col-span-12 lg:col-span-8 flex flex-col gap-4 h-auto lg:h-[calc(100vh-140px)] min-h-[550px]">
          
          {/* A. TOP BLOCK: Generated Challenge Output */}
          <div 
            id="challenge-output-window" 
            className={`min-h-[160px] max-h-[220px] flex flex-col bg-[#0d1612] border shadow-lg overflow-hidden relative transition-all duration-300 ${
              isMiniMode ? 'border-[#ffaa00]/80' : 'border-[#1b3327]'
            }`}
          >
            {/* Window control Header */}
            <div className={`border-b bg-[#050807] px-4 py-2 flex items-center justify-between ${
              isMiniMode ? 'border-[#ffaa00]/40' : 'border-[#1b3327]'
            }`}>
              <div className="flex items-center gap-2">
                <Terminal className={`w-4 h-4 ${isMiniMode ? 'text-[#ffaa00]' : 'text-[#00ff66]'}`} />
                <span className={`text-xs font-bold tracking-widest uppercase ${
                  isMiniMode ? 'text-[#ffaa00]' : 'text-[#00ff66]'
                }`}>
                  &gt;_ GENERATED_DESAFIO_OUTPUT // {trackMeta.label}
                </span>
                
                {/* Solved Badge */}
                {isCurrentChallengeSolved && (
                  <span className="flex items-center gap-1 border border-[#00ff66] bg-[#00ff66]/15 text-[#00ff66] px-2 py-0.5 text-[9px] font-bold animate-pulse shadow-[0_0_8px_rgba(0,255,102,0.4)]">
                    <CheckCircle size={10} />
                    <span>[RESOLVIDO // SALVO NO LOG]</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] border border-[#1b3327] bg-[#0a0f0d] px-2 py-0.5 text-[#00ff66]">
                  {isMiniMode ? 'TIPO: MINI FIXAÇÃO' : 'TIPO: PADRÃO TÁTICO'}
                </span>
                <span className="text-[10px] text-[#9dc197]/60">
                  ID: {activeChallenge.id.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Prompt description */}
            <div className="p-4 overflow-y-auto flex-1 bg-[#0a0f0d]/80 space-y-2">
              <h3 className="text-sm font-bold text-[#00ff66]">
                {activeChallenge.title}
              </h3>
              <p className="text-xs text-[#9dc197] leading-relaxed whitespace-pre-line">
                {activeChallenge.description}
              </p>
            </div>
          </div>

          {/* B. BOTTOM BLOCK: Code Submission Terminal & Editor */}
          <div className="flex-1 flex flex-col bg-[#0d1612] border border-[#1b3327] shadow-xl overflow-hidden relative min-h-[350px]">
            
            {/* Editor Header Bar with Dynamic Language Tab */}
            <div className="border-b border-[#1b3327] bg-[#050807] px-4 py-2 flex flex-wrap items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 border border-[#00ff66]/40 bg-[#00ff66]/10 px-2.5 py-1 text-[#00ff66] font-bold text-[11px]">
                  <FileCode size={13} />
                  <span>{trackMeta.fileTab}</span>
                </div>
                <span className="text-[10px] text-[#9dc197]/60 hidden sm:inline">
                  [{trackMeta.compilerChannel}]
                </span>

                <button
                  type="button"
                  onClick={handleResetBoilerplate}
                  className="flex items-center gap-1 border border-[#1b3327] bg-[#0a0f0d] px-2 py-1 text-[10px] text-[#9dc197]/70 hover:text-[#00ff66] hover:border-[#00ff66] transition ml-2"
                  title="Restaurar código boilerplate limpo"
                >
                  <RotateCcw size={11} />
                  <span className="hidden sm:inline">RESETAR BOILERPLATE</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleAskSocraticHint}
                  className="flex items-center gap-1.5 border border-[#ffaa00]/60 bg-[#ffaa00]/10 px-3 py-1 text-[10px] font-bold text-[#ffaa00] hover:bg-[#ffaa00] hover:text-black transition"
                >
                  <HelpCircle size={13} />
                  <span>PISTA SOCRÁTICA</span>
                </button>

                <button
                  type="button"
                  disabled={compiling}
                  onClick={handleCompileAndRun}
                  className="flex items-center gap-1.5 border-2 border-[#00ff66] bg-[#00ff66] px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-black hover:bg-[#33ff77] disabled:opacity-40 transition shadow-[0_0_12px_rgba(0,255,102,0.6)]"
                >
                  <Play size={13} className={compiling ? 'animate-spin' : ''} />
                  <span>{compiling ? 'COMPILANDO...' : 'COMPILAR & EXECUTAR (Ctrl+Enter)'}</span>
                </button>
              </div>
            </div>

            {/* Ingested Snippet Banner if exported from Dungeon or Professor */}
            {sandboxExportPayload && (
              <div className="border-b border-[#00ff66]/40 bg-[#00ff66]/10 px-4 py-2 flex items-center justify-between text-xs text-[#00ff66]">
                <span>[SNIPPET IMPORTADO // {sandboxExportPayload.title?.toUpperCase() || 'EXTERNAL'}]</span>
                <button
                  type="button"
                  onClick={clearSandboxExport}
                  className="text-[10px] text-[#00ff66] border border-[#00ff66]/40 px-2 py-0.5 hover:bg-[#00ff66] hover:text-black transition"
                >
                  FECHAR AVISO
                </button>
              </div>
            )}

            {/* Code Editor UI Grid */}
            <div className="flex-1 flex bg-[#050807] overflow-hidden relative min-h-0">
              
              {/* Left Column: Line Numbers */}
              <div className="w-10 border-r border-[#1b3327] bg-[#0a0f0d] py-3 select-none text-right pr-2 text-xs text-[#1b3327] space-y-[2px] leading-6">
                {lineNumbers.map((num) => (
                  <div key={num} className="h-6 flex items-center justify-end pr-1">
                    {num}
                  </div>
                ))}
              </div>

              {/* Right Column: Code Textarea */}
              <div className="flex-1 relative overflow-hidden flex">
                <textarea
                  id="sandbox-code-editor"
                  value={editorCode}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent border-0 outline-none p-3 font-mono text-xs sm:text-sm text-[#00ff66] focus:ring-0 leading-6 resize-none overflow-y-auto whitespace-pre placeholder-[#1b3327]"
                  spellCheck={false}
                  autoComplete="off"
                  autoCapitalize="off"
                  placeholder={`// Escreva sua solução para ${trackMeta.label} aqui...`}
                />

                {/* Socratic Hint sliding Overlay */}
                <AnimatePresence>
                  {showSocraticTerminal && socraticHintIndex !== -1 && (
                    <motion.div
                      initial={{ opacity: 0, x: 200 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 200 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className="absolute right-0 top-0 bottom-0 w-80 max-w-full bg-[#0a0f0d] border-l border-[#1b3327] shadow-2xl p-4 flex flex-col justify-between z-10"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between border-b border-[#1b3327] pb-2">
                          <div className="flex items-center gap-2 text-[#00ff66]">
                            <BookOpen className="w-4 h-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">PISTA SOCRÁTICA</span>
                          </div>
                          <button 
                            type="button"
                            onClick={() => setShowSocraticTerminal(false)}
                            className="text-[#9dc197]/70 hover:text-red-400 text-xs font-bold"
                          >
                            [FECHAR]
                          </button>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-[10px] text-[#9dc197]/60">
                            <span>PROF. A.ILSON // MENTOR</span>
                            <span>•</span>
                            <span>{socraticHintIndex + 1}/{activeChallenge.hints.length}</span>
                          </div>
                          <div className="p-3 bg-[#050807] border border-[#1b3327] text-xs text-[#9dc197] leading-relaxed">
                            {activeChallenge.hints[socraticHintIndex]}
                          </div>
                        </div>

                        <div className="text-[10px] text-[#9dc197]/70 leading-relaxed bg-[#050807] p-2.5 border border-[#00ff66]/20">
                          <span className="text-[#00ff66] font-bold block mb-1">MÉTODO SOCRÁTICO:</span>
                          Em vez de dar o código pronto, guio você com analogias e regras canônicas da linguagem.
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-[#1b3327]">
                        <button
                          type="button"
                          onClick={handleAskSocraticHint}
                          className="px-3 py-1.5 bg-[#050807] border border-[#00ff66] text-[#00ff66] hover:bg-[#00ff66] hover:text-black text-[10px] font-bold uppercase transition"
                        >
                          Próxima Pista
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Compilation Console Drawer */}
            {showCompileTerminal && (
              <div className="border-t border-[#1b3327] bg-[#050807] p-3 max-h-40 overflow-y-auto font-mono text-xs space-y-1">
                <div className="flex items-center justify-between border-b border-[#1b3327] pb-1 text-[10px] uppercase text-[#00ff66] font-bold">
                  <div className="flex items-center gap-2">
                    <span>TERMINAL DE SAÍDA // COMPILADOR</span>
                    <span className={`px-1.5 py-0.2 border text-[9px] ${
                      compileStatus === 'success' ? 'border-[#00ff66] text-[#00ff66]' : compileStatus === 'error' ? 'border-[#ff3366] text-[#ff3366]' : 'border-gray-600 text-gray-400'
                    }`}>
                      {compileStatus.toUpperCase()}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowCompileTerminal(false)}
                    className="text-[#9dc197]/60 hover:text-white"
                  >
                    [OCULTAR]
                  </button>
                </div>
                {compileLog.map((log, idx) => (
                  <div key={idx} className={log.includes('ERROR') ? 'text-[#ff3366]' : 'text-[#9dc197]'}>
                    {log}
                  </div>
                ))}
              </div>
            )}

          </div>
        </section>
      </main>

      {/* Solutions History Drawer */}
      <AnimatePresence>
        {showHistoryDrawer && (
          <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-xl h-full bg-[#0a0f0d] border-l border-[#1b3327] p-6 flex flex-col shadow-2xl overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-[#1b3327] pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <History className="w-5 h-5 text-[#00ff66]" />
                  <h3 className="text-sm font-bold text-[#00ff66] uppercase tracking-widest">
                    HISTÓRICO DE SOLUÇÕES // {trackMeta.label}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowHistoryDrawer(false)}
                  className="p-1 border border-[#1b3327] text-[#9dc197] hover:text-red-400 hover:border-red-400 transition"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Solutions List */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {trackSolutions.length === 0 ? (
                  <div className="text-center py-12 text-xs text-[#9dc197]/60 border border-dashed border-[#1b3327] p-8">
                    Nenhuma solução registrada ainda para a trilha {trackMeta.label}. Complete desafios para popular seu log.
                  </div>
                ) : (
                  trackSolutions.map((sol) => (
                    <div key={sol.id} className="border border-[#1b3327] bg-[#050807] p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#00ff66]">{sol.challengeTitle}</span>
                        <span className="text-[10px] text-[#9dc197]/60">
                          {new Date(sol.completedAt).toLocaleString('pt-BR')}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 flex-wrap">
                        {sol.skills.map((sk) => (
                          <span key={sk} className="text-[9px] border border-[#00ff66]/30 bg-[#00ff66]/10 px-1.5 py-0.5 text-[#00ff66]">
                            {sk}
                          </span>
                        ))}
                        <span className="text-[9px] text-[#ffaa00] ml-auto">+{sol.xpEarned} XP</span>
                      </div>

                      {/* Code preview */}
                      <pre className="bg-[#0a0f0d] border border-[#1b3327] p-2.5 text-[10px] text-[#9dc197] max-h-36 overflow-y-auto whitespace-pre font-mono">
                        {sol.codeSnippet}
                      </pre>

                      <div className="flex justify-end pt-1">
                        <button
                          type="button"
                          onClick={() => handleRestoreSolution(sol)}
                          className="flex items-center gap-1.5 border border-[#00ff66] bg-[#00ff66] px-3 py-1 text-[10px] font-bold text-black hover:bg-[#33ff77] transition"
                        >
                          <Copy size={12} />
                          <span>RESTAURAR NO EDITOR</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="max-w-md w-full border-2 border-[#00ff66] bg-[#0a0f0d] p-6 text-center shadow-[0_0_50px_rgba(0,255,102,0.4)] space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#00ff66] bg-[#00ff66]/20 text-[#00ff66]">
              <Zap className="h-7 w-7 animate-bounce" />
            </div>
            <h3 className="text-xl font-bold text-[#00ff66]">
              EXECUÇÃO EFETUADA COM SUCESSO!
            </h3>
            <p className="text-xs text-[#9dc197] leading-relaxed">
              {activeChallenge.successMessage}
            </p>
            <div className="border border-[#00ff66]/40 bg-[#00ff66]/10 p-2.5 text-xs text-[#00ff66] font-bold flex items-center justify-between">
              <span>+80 XP // TRILHA {trackMeta.label}</span>
              <span className="text-[10px] text-[#00ff66]">SALVO NO LOG DE CONQUISTAS</span>
            </div>
            <button
              type="button"
              onClick={handleNextChallengeSuccess}
              className="w-full border-2 border-[#00ff66] bg-[#00ff66] py-2.5 text-xs font-bold uppercase tracking-widest text-black hover:bg-[#33ff77] transition shadow-[0_0_15px_rgba(0,255,102,0.6)]"
            >
              PRÓXIMO DESAFIO (LIMPAR EDITOR)
            </button>
          </div>
        </div>
      )}

      {/* Failure Preparatory Overlay */}
      {showPreparatoryOverlay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="max-w-md w-full border-2 border-[#ffaa00] bg-[#0a0f0d] p-6 text-center shadow-[0_0_40px_rgba(255,170,0,0.3)] space-y-3">
            <ShieldAlert className="mx-auto h-12 w-12 text-[#ffaa00]" />
            <h4 className="text-base font-bold text-[#ffaa00]">
              DIAGNÓSTICO TÁTICO &amp; CORREÇÃO
            </h4>
            <p className="text-xs text-[#ff3366] font-bold">{lastErrorMsg}</p>
            <div className="border border-[#1b3327] bg-[#050807] p-3 text-xs text-[#9dc197] text-left space-y-1">
              <div><strong>Alvo:</strong> {nextChallengeName}</div>
              <div><strong>Dica de Superação:</strong> {preparatoryTip}</div>
            </div>
            <div className="flex gap-2 justify-center pt-2">
              <button
                type="button"
                onClick={() => setShowPreparatoryOverlay(false)}
                className="border border-[#1b3327] bg-[#050807] px-4 py-2 text-xs text-[#9dc197] hover:border-[#00ff66]"
              >
                TENTAR NOVAMENTE
              </button>
              <button
                type="button"
                onClick={handleDismissOverlayAndProceed}
                className="border border-[#ffaa00] bg-[#ffaa00] px-4 py-2 text-xs font-bold text-black hover:bg-[#ffbb33]"
              >
                AVANÇAR DESAFIO
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
