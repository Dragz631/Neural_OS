import React, { useState } from 'react';
import { 
  GraduationCap, 
  ArrowLeft, 
  Database, 
  Calendar, 
  BookOpen, 
  FileCheck
} from 'lucide-react';
import { CognitiveDial } from './cognitive-dial';
import { Blackboard } from './blackboard';
import { ExamTerminal } from './exam-terminal';
import { KnowledgeVault } from './KnowledgeVault';
import { WeeklyPlanner } from './WeeklyPlanner';
import { useNeural } from '../../context/NeuralContext';
import type { TrackId } from '../../types';

interface ClassroomProps {
  onNavigateTab?: (tabId: 'lobby' | 'lousa' | 'sandbox' | 'dungeon') => void;
}

type ClassroomSubTab = 'planner' | 'vault' | 'blackboard' | 'exam';

export const Classroom: React.FC<ClassroomProps> = ({ onNavigateTab }) => {
  const { fatigue, toggleFatigue, activeTrack, setActiveTrack, sources } = useNeural();
  const [activeSubTab, setActiveSubTab] = useState<ClassroomSubTab>('planner');
  const [focusIndex, setFocusIndex] = useState(fatigue ? 40 : 85);
  const [examStep, setExamStep] = useState(0);
  const [isExamActive, setIsExamActive] = useState(false);

  const activeSourcesCount = sources.filter((s) => s.track === activeTrack && s.active).length;

  const trackLabels: Record<TrackId, string> = {
    csharp: 'C# OOP',
    c_bases: 'C BASES',
    lfa: 'LFA & AUTÔMATOS',
  };

  const startExam = () => {
    setExamStep(0);
    setIsExamActive(true);
  };

  const abortExam = () => {
    setIsExamActive(false);
    setExamStep(0);
  };

  const finishExam = () => {
    setIsExamActive(false);
    setExamStep(0);
    setFocusIndex((f) => Math.min(f + 15, 100));
  };

  return (
    <div className="min-h-screen bg-[#0a0f0d] font-mono text-[#9dc197]">
      {/* Top bar */}
      <header className="flex flex-wrap h-auto sm:h-[70px] items-center justify-between border-b border-[#1b3327] px-4 sm:px-8 bg-[#0d1612] gap-3 py-2 sm:py-0">
        <div className="flex items-center gap-3">
          {onNavigateTab && (
            <button
              type="button"
              onClick={() => onNavigateTab('lobby')}
              className="flex items-center gap-1 text-xs border border-[#1b3327] px-2.5 py-1 text-[#9dc197] hover:border-[#00ff66] hover:text-[#00ff66] transition mr-2"
            >
              <ArrowLeft size={14} /> VOLTAR AO LOBBY
            </button>
          )}
          <GraduationCap className="h-6 w-6 text-[#00ff66]" strokeWidth={1.5} />
          <div className="leading-tight">
            <p className="text-sm tracking-[0.3em] text-[#00ff66] font-bold">PROF. A.ILSON</p>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#9dc197]/60">
              Tutor Pessoal &amp; Motor de Fontes (RAG)
            </p>
          </div>
        </div>

        {/* Track quick switcher */}
        <div className="flex items-center gap-1 border border-[#1b3327] bg-[#050807] p-1">
          {(['csharp', 'c_bases', 'lfa'] as TrackId[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setActiveTrack(t)}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest transition ${
                activeTrack === t
                  ? 'bg-[#00ff66] text-black shadow-[0_0_8px_rgba(0,255,102,0.5)]'
                  : 'text-[#9dc197]/70 hover:text-[#00ff66]'
              }`}
            >
              {trackLabels[t]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="hidden md:inline border border-[#1b3327] bg-[#050807] px-3 py-1 text-[11px] text-[#00ff66]">
            RAG ATIVO: {activeSourcesCount} FONTE(S) NO ESCOPO
          </span>
          <span className="font-mono text-xs text-[#00ff66] border border-[#00ff66]/30 px-2 py-0.5 bg-[#00ff66]/10">
            [ SESSÃO ATIVA ]
          </span>
        </div>
      </header>

      {/* Sub-Navigation Tabs inside Prof. A.Ilson */}
      <div className="border-b border-[#1b3327] bg-[#050807] px-4 sm:px-8">
        <div className="flex items-center gap-2 overflow-x-auto py-2">
          <button
            type="button"
            onClick={() => setActiveSubTab('planner')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest transition border ${
              activeSubTab === 'planner'
                ? 'border-[#00ff66] bg-[#00ff66]/15 text-[#00ff66] shadow-[0_0_10px_rgba(0,255,102,0.3)]'
                : 'border-transparent text-[#9dc197]/70 hover:text-[#00ff66] hover:bg-[#00ff66]/5'
            }`}
          >
            <Calendar size={14} />
            <span>[DIRETRIZ DO DIA &amp; PLANNER]</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('vault')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest transition border ${
              activeSubTab === 'vault'
                ? 'border-[#00ff66] bg-[#00ff66]/15 text-[#00ff66] shadow-[0_0_10px_rgba(0,255,102,0.3)]'
                : 'border-transparent text-[#9dc197]/70 hover:text-[#00ff66] hover:bg-[#00ff66]/5'
            }`}
          >
            <Database size={14} />
            <span>[KNOWLEDGE VAULT (FONTES RAG)]</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('blackboard')}
            className={`flex items-center gap-2 px-3 py-2 text-xs font-bold uppercase tracking-widest transition border ${
              activeSubTab === 'blackboard'
                ? 'border-[#00ff66] bg-[#00ff66]/15 text-[#00ff66] shadow-[0_0_10px_rgba(0,255,102,0.3)]'
                : 'border-transparent text-[#9dc197]/70 hover:text-[#00ff66] hover:bg-[#00ff66]/5'
            }`}
          >
            <BookOpen size={14} />
            <span>[HOLO-BOARD (QUADRO NEGRO)]</span>
          </button>

          <button
            type="button"
            onClick={startExam}
            className="flex items-center gap-2 border border-[#00ff66] bg-[#00ff66] px-4 py-2 text-xs font-bold uppercase tracking-widest text-black hover:bg-[#33ff77] transition shadow-[0_0_10px_rgba(0,255,102,0.4)] ml-auto"
          >
            <FileCheck size={14} />
            <span>[PROVA DA MATRIZ]</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <main
        className={`p-4 sm:p-8 max-w-[1600px] mx-auto transition-all duration-300 ${
          isExamActive ? 'pointer-events-none blur-sm brightness-50' : ''
        }`}
      >
        {activeSubTab === 'planner' && (
          <WeeklyPlanner
            onNavigateTab={onNavigateTab}
            onOpenExam={startExam}
          />
        )}

        {activeSubTab === 'vault' && <KnowledgeVault />}

        {activeSubTab === 'blackboard' && (
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-4">
              <CognitiveDial
                fatigue={fatigue}
                focusIndex={fatigue ? 40 : focusIndex}
                onToggleFatigue={toggleFatigue}
              />
            </div>
            <div className="col-span-12 lg:col-span-8">
              <Blackboard onStartExam={startExam} onNavigateTab={onNavigateTab} />
            </div>
          </div>
        )}
      </main>

      {/* Full Modal Exam Terminal */}
      {isExamActive && (
        <ExamTerminal
          examStep={examStep}
          setExamStep={setExamStep}
          onAbort={abortExam}
          onFinish={finishExam}
          onNavigateTab={onNavigateTab}
        />
      )}
    </div>
  );
};
