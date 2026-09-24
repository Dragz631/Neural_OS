import React, { useState, useEffect } from 'react';
import { Cpu, Zap, Activity, Clock } from 'lucide-react';
import { useNeural } from '../../context/NeuralContext';
import { OllamaSettingsModal } from './OllamaSettingsModal';
import type { TrackId } from '../../types';

export type TabId = 'lobby' | 'lousa' | 'sandbox' | 'professor' | 'dungeon' | 'molda';

const TABS: { id: TabId; label: string; shortcut: string; icon?: string }[] = [
  { id: 'lobby', label: 'LOBBY', shortcut: '1' },
  { id: 'lousa', label: 'LOUSA MENTAL', shortcut: '2' },
  { id: 'sandbox', label: 'SANDBOX', shortcut: '3' },
  { id: 'professor', label: 'PROF. A.ILSON', shortcut: '4' },
  { id: 'dungeon', label: 'DUNGEON PROTOCOL', shortcut: '5' },
  { id: 'molda', label: 'MOLDA-HORARIO', shortcut: '6' },
];

interface NavbarProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, onSelectTab }) => {
  const { profile, aiConfig, fatigue, activeTrack, setActiveTrack } = useNeural();
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [utcTime, setUtcTime] = useState('');

  useEffect(() => {
    const update = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC');
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, []);

  const xpPercent = Math.min(100, Math.round((profile.xp / profile.xpToNextLevel) * 100));

  const trackLabels: Record<TrackId, string> = {
    csharp: 'C# OOP',
    c_bases: 'C BASES',
    lfa: 'LFA & AUTÔMATOS',
  };

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-[#1b3327] bg-[#0a0f0d]/95 backdrop-blur-md font-mono">
        <div className="mx-auto flex max-w-[1700px] items-center justify-between px-4 py-2 flex-wrap gap-2">
          {/* Logo & System Tag */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => onSelectTab('lobby')}
              className="flex items-center gap-2 text-[#00ff66] text-left transition hover:opacity-80"
            >
              <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-[#00ff66] shadow-[0_0_10px_rgba(0,255,102,0.9)]" />
              <span className="text-xs font-bold uppercase tracking-[0.3em]">NEURAL_OS</span>
              <span className="hidden text-[10px] tracking-[0.2em] text-[#1b3327] md:inline">// MATRIZ v4.0</span>
            </button>

            {/* Active Track Switcher Pill */}
            <div className="hidden sm:flex items-center gap-1 border border-[#1b3327] bg-[#050807] p-0.5 text-[9px] font-bold uppercase">
              {(['c_bases', 'lfa', 'csharp'] as TrackId[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveTrack(t)}
                  className={`px-2 py-0.5 transition ${
                    activeTrack === t
                      ? 'bg-[#00ff66] text-black shadow-[0_0_6px_rgba(0,255,102,0.6)]'
                      : 'text-[#9dc197]/70 hover:text-[#00ff66]'
                  }`}
                >
                  {trackLabels[t]}
                </button>
              ))}
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  className={`relative px-2.5 sm:px-3 py-1.5 text-[10px] sm:text-[11px] uppercase tracking-[0.2em] transition-all duration-200 ${
                    isActive
                      ? 'text-[#00ff66] font-bold after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-[#00ff66] after:shadow-[0_0_8px_rgba(0,255,102,0.9)]'
                      : 'text-[#9dc197]/70 hover:text-[#00ff66] hover:bg-[#00ff66]/5'
                  }`}
                >
                  <span className="text-[10px] text-[#1b3327] font-bold">[</span>
                  {tab.label}
                  <span className="text-[10px] text-[#1b3327] font-bold">]</span>
                </button>
              );
            })}
          </div>

          {/* Right Status / Level / AI Indicator / UTC Clock */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* UTC Clock */}
            <div className="hidden xl:flex items-center gap-1 text-[10px] text-[#9dc197]/70 border border-[#1b3327] bg-[#050807] px-2 py-1">
              <Clock size={11} className="text-[#00ff66]" />
              <span>{utcTime}</span>
            </div>

            {/* Level & XP HUD */}
            <div className="hidden lg:flex items-center gap-2 border border-[#1b3327] bg-[#0d1612] px-2.5 py-1 text-[10px] uppercase tracking-widest">
              <span className="flex items-center gap-1 text-[#00ff66] font-bold">
                <Zap size={11} className="text-[#00ff66]" /> LVL {profile.level}
              </span>
              <div className="h-2 w-16 border border-[#1b3327] bg-[#050807] overflow-hidden">
                <div
                  className="h-full bg-[#00ff66] transition-all duration-500 shadow-[0_0_6px_rgba(0,255,102,0.7)]"
                  style={{ width: `${xpPercent}%` }}
                />
              </div>
              <span className="text-[#9dc197]/70">
                {profile.xp}/{profile.xpToNextLevel} XP
              </span>
            </div>

            {/* Fatigue Warning if active */}
            {fatigue && (
              <div className="hidden sm:flex items-center gap-1 border border-red-500/50 bg-red-950/30 px-2 py-1 text-[10px] font-bold text-red-400 animate-pulse">
                <Activity size={12} /> FADIGA
              </div>
            )}

            {/* AI Status / Button to Open Settings */}
            <button
              type="button"
              onClick={() => setAiModalOpen(true)}
              className={`flex items-center gap-1.5 border px-2.5 py-1 text-[10px] uppercase tracking-widest transition ${
                aiConfig.isOnline
                  ? 'border-[#00ff66] bg-[#00ff66]/10 text-[#00ff66] hover:bg-[#00ff66] hover:text-black shadow-[0_0_10px_rgba(0,255,102,0.4)]'
                  : 'border-[#1b3327] bg-[#0d1612] text-[#9dc197]/70 hover:border-[#00ff66] hover:text-[#00ff66]'
              }`}
              title="Configurar IA Local / Ollama"
            >
              <Cpu size={12} className={aiConfig.isOnline ? 'text-[#00ff66]' : 'text-[#9dc197]'} />
              <span className="hidden sm:inline font-bold">
                {aiConfig.isOnline ? `OLLAMA: ${aiConfig.selectedModel}` : 'IA: MODO HEURÍSTICO'}
              </span>
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  aiConfig.isOnline ? 'bg-[#00ff66] shadow-[0_0_6px_rgba(0,255,102,0.9)]' : 'bg-yellow-400'
                }`}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Ollama Settings Modal */}
      <OllamaSettingsModal isOpen={aiModalOpen} onClose={() => setAiModalOpen(false)} />
    </>
  );
};
