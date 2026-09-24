import React, { useState } from 'react';
import { 
  Calendar, 
  CheckSquare, 
  Square, 
  Sword, 
  Code2, 
  FileCheck, 
  Clock, 
  Target, 
  ArrowRight
} from 'lucide-react';
import { useNeural } from '../../context/NeuralContext';
import type { TrackId, DailyGuideline } from '../../types';

interface WeeklyPlannerProps {
  onNavigateTab?: (tab: 'sandbox' | 'dungeon' | 'lousa') => void;
  onOpenExam?: () => void;
}

export const WeeklyPlanner: React.FC<WeeklyPlannerProps> = ({ onNavigateTab, onOpenExam }) => {
  const { activeTrack, setActiveTrack, addXP } = useNeural();

  // Guidelines per track
  const GUIDELINES_BY_TRACK: Record<TrackId, DailyGuideline> = {
    csharp: {
      id: 'dg_cs',
      track: 'csharp',
      dayTitle: 'Hoje: Encapsulamento, Modificadores de Acesso & Auto-Properties',
      objective: 'Blindar campos internos de classes contra injeções espúrias usando "private" e expor leitura controlada com "public double Saldo { get; private set; }".',
      checkpoints: [
        { text: 'Compreender por que campos públicos expostos geram falhas de segurança em sistemas corporativos.', completed: true },
        { text: 'Ler e fixar o conceito no Codex da Fase 2 do Dungeon Protocol.', completed: false },
        { text: 'Vencer o guardião na Arena de Batalha sem sofrer Choque Neural.', completed: false },
        { text: 'Realizar a Prova da Matriz com o Prof. A.Ilson obtendo nota >= 80 na questão discursiva.', completed: false },
      ],
      recommendedAction: { label: 'ENFRENTAR FASE 2 NO DUNGEON', tab: 'dungeon' },
      estimatedMinutes: 45,
    },
    c_bases: {
      id: 'dg_c',
      track: 'c_bases',
      dayTitle: 'Hoje: Ponteiros, Operador & e Desreferenciação com *',
      objective: 'Dominar o endereçamento de memória física, alteração de variáveis através de ponteiros e passagem de parâmetros por referência.',
      checkpoints: [
        { text: 'Entender a diferença entre o endereço de memória (&var) e o conteúdo gravado (*ptr).', completed: true },
        { text: 'Estudar o Tomo do Nó 02 na trilha C Bases.', completed: false },
        { text: 'Corrigir o bug de cópia de parâmetros na Arena de Combate.', completed: false },
        { text: 'Submeter resposta discursiva ao Prof. A.Ilson sobre alocação de ponteiros.', completed: false },
      ],
      recommendedAction: { label: 'ENFRENTAR NÓ 02 EM C BASES', tab: 'dungeon' },
      estimatedMinutes: 40,
    },
    lfa: {
      id: 'dg_lfa',
      track: 'lfa',
      dayTitle: 'Hoje: Autômatos Finitos Determinísticos (AFD) e Transições δ',
      objective: 'Mapear a 5-upla formal M = (Q, Σ, δ, q0, F) e rastrear o processamento determinístico de cadeias em grafos de estados.',
      checkpoints: [
        { text: 'Diferenciar a palavra vazia (ε) da linguagem vazia (∅).', completed: true },
        { text: 'Traçar a tabela de transição do AFD para cadeias que terminam com "1".', completed: false },
        { text: 'Derrotar a Gárgula dos Estados Deterministas no Dungeon Protocol.', completed: false },
        { text: 'Validar a questão discursiva sobre o Teorema de Rabin-Scott na Prova da Matriz.', completed: false },
      ],
      recommendedAction: { label: 'ENFRENTAR FASE AFD NO DUNGEON', tab: 'dungeon' },
      estimatedMinutes: 50,
    },
  };

  const currentGuideline = GUIDELINES_BY_TRACK[activeTrack];
  const [checkpoints, setCheckpoints] = useState(currentGuideline.checkpoints);

  const toggleCheckpoint = (index: number) => {
    setCheckpoints((prev) => {
      const next = [...prev];
      const nextState = !next[index].completed;
      next[index] = { ...next[index], completed: nextState };
      if (nextState) {
        addXP(40, 'Checkpoint da Diretriz do Dia');
      }
      return next;
    });
  };

  const completedCount = checkpoints.filter((c) => c.completed).length;
  const progressPercent = Math.round((completedCount / checkpoints.length) * 100);

  const trackNames: Record<TrackId, string> = {
    csharp: 'C# OOP',
    c_bases: 'C BASES',
    lfa: 'LFA & AUTÔMATOS',
  };

  return (
    <div className="space-y-6 font-mono text-[#9dc197]">
      {/* Header with Track Quick Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#1b3327] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-[#00ff66]" />
            <h3 className="text-sm font-bold uppercase tracking-[0.25em] text-[#00ff66]">
              DIRETRIZ DO DIA // PLANNER SEMANAL DO PROF. A.ILSON
            </h3>
          </div>
          <p className="mt-1 text-xs text-[#9dc197]/70">
            Plano tático gerado com base nas fontes ativas do Knowledge Vault para a matéria selecionada.
          </p>
        </div>

        {/* Track selector */}
        <div className="flex items-center gap-1">
          {(['csharp', 'c_bases', 'lfa'] as TrackId[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setActiveTrack(t);
                setCheckpoints(GUIDELINES_BY_TRACK[t].checkpoints);
              }}
              className={`border px-3 py-1.5 text-xs font-bold uppercase tracking-widest transition ${
                activeTrack === t
                  ? 'border-[#00ff66] bg-[#00ff66]/15 text-[#00ff66] shadow-[0_0_10px_rgba(0,255,102,0.4)]'
                  : 'border-[#1b3327] bg-[#0d1612] text-[#9dc197]/60 hover:text-[#00ff66]'
              }`}
            >
              [{trackNames[t]}]
            </button>
          ))}
        </div>
      </div>

      {/* Main Directive Hero Card */}
      <div className="border-2 border-[#00ff66] bg-[#0d1612] p-6 shadow-[0_0_30px_rgba(0,255,102,0.15)] relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none text-[#00ff66]">
          <Target size={120} />
        </div>

        <div className="relative z-10 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="border border-[#00ff66]/40 bg-[#00ff66]/10 px-2.5 py-1 text-[10px] font-bold tracking-widest text-[#00ff66]">
              TRILHA ATIVA: {trackNames[activeTrack]}
            </span>
            <div className="flex items-center gap-1 text-[10px] text-[#9dc197]/70">
              <Clock size={12} />
              <span>TEMPO ESTIMADO: {currentGuideline.estimatedMinutes} MINUTOS</span>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-bold text-[#00ff66] leading-snug">
            {currentGuideline.dayTitle}
          </h2>

          <div className="border-l-2 border-[#00ff66] pl-4 py-1 text-xs sm:text-sm text-[#9dc197] leading-relaxed">
            <strong className="text-[#33ff77]">OBJETIVO TÁTICO:</strong> {currentGuideline.objective}
          </div>

          {/* Progress bar */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-[10px] uppercase tracking-widest text-[#9dc197]/80">
              <span>PROGRESSO DA DIRETRIZ DO DIA</span>
              <span className="font-bold text-[#00ff66]">{progressPercent}% CONCLUÍDO ({completedCount}/{checkpoints.length})</span>
            </div>
            <div className="h-2 w-full border border-[#1b3327] bg-[#050807] overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#00ff66] to-[#33ff77] transition-all duration-500 shadow-[0_0_8px_rgba(0,255,102,0.8)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Checkpoints List */}
      <div className="border border-[#1b3327] bg-[#0d1612] p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#1b3327] pb-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#00ff66]">
            // CHECKPOINTS DA EMENTA & METAS
          </span>
          <span className="text-[10px] text-[#9dc197]/50 uppercase tracking-widest">
            +40 XP POR CHECKPOINT
          </span>
        </div>

        <div className="space-y-2">
          {checkpoints.map((cp, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => toggleCheckpoint(idx)}
              className={`w-full flex items-start gap-3 p-3 text-left border transition ${
                cp.completed
                  ? 'border-[#00ff66]/50 bg-[#00ff66]/5 text-[#00ff66]'
                  : 'border-[#1b3327] bg-[#050807] text-[#9dc197]/80 hover:border-[#00ff66]/40 hover:text-[#00ff66]'
              }`}
            >
              <div className="mt-0.5 shrink-0 text-[#00ff66]">
                {cp.completed ? <CheckSquare size={16} /> : <Square size={16} />}
              </div>
              <span className={`text-xs leading-relaxed ${cp.completed ? 'line-through opacity-80' : ''}`}>
                {cp.text}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Fast Action Launchers */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Launcher 1: Dungeon Protocol */}
        <button
          type="button"
          onClick={() => onNavigateTab?.('dungeon')}
          className="group flex flex-col justify-between border border-[#1b3327] bg-[#0d1612] p-4 text-left transition hover:border-[#00ff66] hover:shadow-[0_0_20px_rgba(0,255,102,0.2)]"
        >
          <div>
            <div className="flex items-center justify-between text-[#00ff66]">
              <Sword size={20} />
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </div>
            <h4 className="mt-3 text-xs font-bold uppercase tracking-widest text-[#00ff66]">
              DUNGEON PROTOCOL
            </h4>
            <p className="mt-1 text-[11px] text-[#9dc197]/70 leading-relaxed">
              Consulte o Codex e enfrente os guardiões de código na Arena de Batalha.
            </p>
          </div>
          <span className="mt-4 inline-block text-[10px] font-bold text-[#00ff66]">
            [ ENTRAR NO DUNGEON &gt; ]
          </span>
        </button>

        {/* Launcher 2: Prova da Matriz */}
        <button
          type="button"
          onClick={onOpenExam}
          className="group flex flex-col justify-between border border-[#1b3327] bg-[#0d1612] p-4 text-left transition hover:border-[#00ff66] hover:shadow-[0_0_20px_rgba(0,255,102,0.2)]"
        >
          <div>
            <div className="flex items-center justify-between text-[#00ff66]">
              <FileCheck size={20} />
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </div>
            <h4 className="mt-3 text-xs font-bold uppercase tracking-widest text-[#00ff66]">
              PROVA DA MATRIZ
            </h4>
            <p className="mt-1 text-[11px] text-[#9dc197]/70 leading-relaxed">
              5 questões objetivas + 1 discursiva avaliada pelo Prof. A.Ilson.
            </p>
          </div>
          <span className="mt-4 inline-block text-[10px] font-bold text-[#00ff66]">
            [ GERAR AVALIAÇÃO &gt; ]
          </span>
        </button>

        {/* Launcher 3: Sandbox */}
        <button
          type="button"
          onClick={() => onNavigateTab?.('sandbox')}
          className="group flex flex-col justify-between border border-[#1b3327] bg-[#0d1612] p-4 text-left transition hover:border-[#00ff66] hover:shadow-[0_0_20px_rgba(0,255,102,0.2)]"
        >
          <div>
            <div className="flex items-center justify-between text-[#00ff66]">
              <Code2 size={20} />
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
            </div>
            <h4 className="mt-3 text-xs font-bold uppercase tracking-widest text-[#00ff66]">
              SANDBOX DE CÓDIGO
            </h4>
            <p className="mt-1 text-[11px] text-[#9dc197]/70 leading-relaxed">
              Compile e experimente trechos de código livremente no compilador simulado.
            </p>
          </div>
          <span className="mt-4 inline-block text-[10px] font-bold text-[#00ff66]">
            [ ABRIR SANDBOX &gt; ]
          </span>
        </button>
      </div>
    </div>
  );
};
