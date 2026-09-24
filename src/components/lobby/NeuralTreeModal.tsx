import React, { useState, useMemo } from 'react';
import {
  X,
  Brain,
  Zap,
  CheckCircle2,
  Lock,
  Clock,
  Sparkles,
  Terminal,
  Cpu,
  Box,
  Hammer,
  Shield,
  GitBranch,
  Shuffle,
  FileCode,
  Hexagon,
  Layers,
  Database,
  Globe,
  HardDrive,
  ExternalLink,
} from 'lucide-react';
import { useNeural } from '../../context/NeuralContext';
import type { SkillNode, SkillStatus } from '../../types';

interface NeuralTreeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tabId: 'sandbox' | 'professor' | 'lousa') => void;
}

const ICON_MAP: Record<string, React.ReactNode> = {
  Terminal: <Terminal size={18} />,
  Cpu: <Cpu size={18} />,
  GitCommit: <GitBranch size={18} />,
  Box: <Box size={18} />,
  Hammer: <Hammer size={18} />,
  Shield: <Shield size={18} />,
  GitBranch: <GitBranch size={18} />,
  Shuffle: <Shuffle size={18} />,
  FileCode: <FileCode size={18} />,
  Hexagon: <Hexagon size={18} />,
  Zap: <Zap size={18} />,
  Layers: <Layers size={18} />,
  Database: <Database size={18} />,
  Globe: <Globe size={18} />,
  HardDrive: <HardDrive size={18} />,
};

const BRANCH_CONFIG: Record<
  SkillNode['branch'],
  { label: string; color: string; bgGlow: string; description: string }
> = {
  fundamentos: {
    label: '1. FUNDAMENTOS CORE',
    color: '#7cf0ff',
    bgGlow: 'rgba(124, 240, 255, 0.15)',
    description: 'Sintaxe básica, modelo de memória Stack/Heap e controle de fluxo.',
  },
  poo: {
    label: '2. PARADIGMA POO',
    color: '#39ff14',
    bgGlow: 'rgba(57, 255, 20, 0.15)',
    description: 'Classes, Construtores, Encapsulamento, Herança, Polimorfismo e Interfaces.',
  },
  arquitetura: {
    label: '3. ARQUITETURA & SOLID',
    color: '#ffb347',
    bgGlow: 'rgba(255, 179, 71, 0.15)',
    description: 'Princípios SOLID, Injeção de Dependência e Clean Architecture.',
  },
  backend: {
    label: '4. BACKEND & APIS',
    color: '#c084fc',
    bgGlow: 'rgba(192, 132, 252, 0.15)',
    description: 'LINQ, coleções eficientes, APIs RESTful e persistência com ORMs.',
  },
};

export const NeuralTreeModal: React.FC<NeuralTreeModalProps> = ({ isOpen, onClose, onNavigateTab }) => {
  const { skills, updateSkillStatus } = useNeural();
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>('encapsulation');
  const [filterBranch, setFilterBranch] = useState<SkillNode['branch'] | 'all'>('all');

  const selectedSkill = useMemo(
    () => skills.find((s) => s.id === selectedSkillId) ?? skills[0],
    [skills, selectedSkillId]
  );

  const skillsById = useMemo(() => {
    const map = new Map<string, SkillNode>();
    skills.forEach((s) => map.set(s.id, s));
    return map;
  }, [skills]);

  // Compute branches for layout
  const branches = useMemo(() => {
    return {
      fundamentos: skills.filter((s) => s.branch === 'fundamentos'),
      poo: skills.filter((s) => s.branch === 'poo'),
      arquitetura: skills.filter((s) => s.branch === 'arquitetura'),
      backend: skills.filter((s) => s.branch === 'backend'),
    };
  }, [skills]);

  const masteredCount = skills.filter((s) => s.status === 'mastered').length;
  const inProgressCount = skills.filter((s) => s.status === 'in_progress').length;
  const totalCount = skills.length;
  const progressPercent = Math.round((masteredCount / totalCount) * 100);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-3 md:p-6 backdrop-blur-md font-mono"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex h-full max-h-[92vh] w-full max-w-[1500px] flex-col border-2 border-[#39ff14] bg-[#0a0b0d] shadow-[0_0_40px_rgba(57,255,20,0.35)]"
      >
        {/* Top Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-[#3e5c38] bg-[#0d0e12] px-6 py-3">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-[#39ff14] animate-pulse" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-[0.25em] text-[#39ff14]">
                  NEURAL_TREE // ÁRVORE DE HABILIDADES RPG
                </span>
                <span className="border border-[#39ff14]/60 bg-[#39ff14]/10 px-1.5 py-0.2 text-[10px] text-[#39ff14]">
                  {progressPercent}% SINAPSE
                </span>
              </div>
              <p className="text-[10px] uppercase tracking-widest text-[#9dc197]/70">
                MAPA EVOLUTIVO DE COMPETÊNCIAS TÉCNICAS EM C# & ARQUITETURA
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Quick Stats */}
            <div className="hidden sm:flex items-center gap-3 text-[10px] uppercase tracking-widest">
              <span className="text-[#39ff14]">● {masteredCount} DOMINADAS</span>
              <span className="text-yellow-400">● {inProgressCount} EM ANDAMENTO</span>
              <span className="text-[#9dc197]/50">● {totalCount - masteredCount - inProgressCount} BLOQUEADAS</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="border border-[#3e5c38] p-1.5 text-[#9dc197] transition hover:border-red-500 hover:text-red-500"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap items-center justify-between border-b border-[#3e5c38]/60 bg-[#0a0b0d] px-6 py-2 text-[10px] uppercase tracking-widest">
          <div className="flex items-center gap-1 overflow-x-auto py-1">
            <span className="text-[#9dc197]/50 mr-2">RAMO:</span>
            <button
              type="button"
              onClick={() => setFilterBranch('all')}
              className={`border px-2.5 py-1 transition ${
                filterBranch === 'all'
                  ? 'border-[#39ff14] bg-[#39ff14]/10 text-[#39ff14] font-bold shadow-[0_0_8px_rgba(57,255,20,0.3)]'
                  : 'border-[#3e5c38] text-[#9dc197]/60 hover:text-[#39ff14]'
              }`}
            >
              TODOS OS RAMOS
            </button>
            {(Object.keys(BRANCH_CONFIG) as SkillNode['branch'][]).map((bKey) => {
              const b = BRANCH_CONFIG[bKey];
              const active = filterBranch === bKey;
              return (
                <button
                  key={bKey}
                  type="button"
                  onClick={() => setFilterBranch(bKey)}
                  className="border px-2.5 py-1 transition"
                  style={{
                    borderColor: active ? b.color : '#3e5c38',
                    color: active ? b.color : '#9dc197',
                    backgroundColor: active ? `${b.color}15` : 'transparent',
                    boxShadow: active ? `0 0 8px ${b.color}40` : 'none',
                  }}
                >
                  {b.label}
                </button>
              );
            })}
          </div>

          <span className="text-[#9dc197]/50 hidden lg:inline">
            // Clique em um nó para inspecionar requisitos e dominar o conceito
          </span>
        </div>

        {/* Tree Body & Inspector Drawer */}
        <div className="grid flex-1 grid-cols-12 overflow-hidden">
          {/* Main Tree Canvas / Columns */}
          <div className="col-span-12 lg:col-span-8 overflow-y-auto p-6 space-y-8 bg-[#090e0a] neural-scroll">
            {(Object.keys(BRANCH_CONFIG) as SkillNode['branch'][]).map((bKey) => {
              if (filterBranch !== 'all' && filterBranch !== bKey) return null;
              const branchInfo = BRANCH_CONFIG[bKey];
              const branchSkills = branches[bKey];

              return (
                <div key={bKey} className="relative rounded-sm border p-4" style={{ borderColor: `${branchInfo.color}40` }}>
                  {/* Branch Label */}
                  <div className="mb-4 flex items-center justify-between border-b pb-2" style={{ borderColor: `${branchInfo.color}30` }}>
                    <div>
                      <h3 className="text-xs font-bold tracking-[0.2em]" style={{ color: branchInfo.color }}>
                        {branchInfo.label}
                      </h3>
                      <p className="text-[10px] text-[#9dc197]/60">{branchInfo.description}</p>
                    </div>
                    <span className="text-[10px] tracking-widest text-[#9dc197]/60">
                      {branchSkills.filter((s) => s.status === 'mastered').length}/{branchSkills.length} DOMINADOS
                    </span>
                  </div>

                  {/* Nodes Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                    {branchSkills.map((node) => {
                      const isSelected = selectedSkillId === node.id;
                      const statusMap: Record<SkillStatus, { border: string; bg: string; text: string; label: string; icon: React.ReactNode }> = {
                        mastered: {
                          border: '#39ff14',
                          bg: 'rgba(57, 255, 20, 0.08)',
                          text: '#39ff14',
                          label: 'DOMINADO',
                          icon: <CheckCircle2 size={12} className="text-[#39ff14]" />,
                        },
                        in_progress: {
                          border: '#eab308',
                          bg: 'rgba(234, 179, 8, 0.08)',
                          text: '#eab308',
                          label: 'EM ANDAMENTO',
                          icon: <Clock size={12} className="text-yellow-400" />,
                        },
                        unlocked: {
                          border: '#9dc197',
                          bg: 'rgba(157, 193, 151, 0.04)',
                          text: '#9dc197',
                          label: 'DISPONÍVEL',
                          icon: <Sparkles size={12} className="text-[#9dc197]" />,
                        },
                        locked: {
                          border: '#3e5c38',
                          bg: 'rgba(10, 11, 13, 0.6)',
                          text: '#9dc197/40',
                          label: 'BLOQUEADO',
                          icon: <Lock size={12} className="text-[#9dc197]/40" />,
                        },
                      };

                      const currentStatus = statusMap[node.status];

                      return (
                        <button
                          key={node.id}
                          type="button"
                          onClick={() => setSelectedSkillId(node.id)}
                          className={`relative flex flex-col items-start border p-3 text-left transition-all ${
                            isSelected
                              ? 'ring-2 ring-[#39ff14] shadow-[0_0_16px_rgba(57,255,20,0.4)] z-10'
                              : 'hover:border-[#39ff14]/80'
                          }`}
                          style={{
                            borderColor: isSelected ? '#39ff14' : currentStatus.border,
                            backgroundColor: currentStatus.bg,
                          }}
                        >
                          <div className="flex w-full items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="p-1 border border-[#3e5c38] bg-[#0a0b0d]" style={{ color: branchInfo.color }}>
                                {ICON_MAP[node.iconName] || <Brain size={16} />}
                              </span>
                              <span className="text-xs font-bold tracking-wider" style={{ color: isSelected ? '#39ff14' : '#9dc197' }}>
                                {node.label}
                              </span>
                            </div>
                            <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest" style={{ color: currentStatus.text }}>
                              {currentStatus.icon}
                              {currentStatus.label}
                            </span>
                          </div>

                          <p className="mt-2 text-[10px] line-clamp-2 leading-relaxed text-[#9dc197]/70">
                            {node.description}
                          </p>

                          {/* Prerequisites badge */}
                          {node.prerequisites.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1 text-[8px] uppercase tracking-widest text-[#9dc197]/50">
                              <span>REQUER:</span>
                              {node.prerequisites.map((pId) => {
                                const prereqNode = skillsById.get(pId);
                                const isPrereqMastered = prereqNode?.status === 'mastered';
                                return (
                                  <span
                                    key={pId}
                                    className={`border px-1 py-[1px] ${
                                      isPrereqMastered
                                        ? 'border-[#39ff14]/60 text-[#39ff14]'
                                        : 'border-[#3e5c38] text-[#9dc197]/40'
                                    }`}
                                  >
                                    {prereqNode?.label || pId}
                                  </span>
                                );
                              })}
                            </div>
                          )}

                          {/* AI Generated Badge */}
                          {node.isAiGenerated && (
                            <div className="mt-1.5 flex items-center gap-1 border border-[#39ff14]/60 bg-[#39ff14]/15 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-widest text-[#39ff14]">
                              <Sparkles size={9} /> SINTETIZADO PELA IA (LOUSA)
                            </div>
                          )}

                          {/* XP Badge */}
                          <div className="mt-3 flex w-full items-center justify-between border-t border-[#3e5c38]/40 pt-1.5 text-[9px] uppercase tracking-widest">
                            <span className="text-[#39ff14]">+{node.xpReward} XP</span>
                            <span className="text-[#9dc197]/40">TIER {node.tier}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Inspector Panel */}
          <div className="col-span-12 lg:col-span-4 border-l border-[#3e5c38] bg-[#0d0e12] p-6 overflow-y-auto flex flex-col justify-between">
            {selectedSkill ? (
              <div className="space-y-5">
                {/* Node Title & Branch */}
                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className="border px-2 py-0.5 text-[9px] uppercase tracking-widest font-bold"
                      style={{
                        borderColor: BRANCH_CONFIG[selectedSkill.branch].color,
                        color: BRANCH_CONFIG[selectedSkill.branch].color,
                      }}
                    >
                      {BRANCH_CONFIG[selectedSkill.branch].label}
                    </span>
                    <span className="text-xs text-[#39ff14] font-bold">+{selectedSkill.xpReward} XP</span>
                  </div>

                  <h2 className="mt-2 text-lg font-bold tracking-wide text-[#39ff14] flex items-center gap-2">
                    {ICON_MAP[selectedSkill.iconName]}
                    {selectedSkill.label}
                  </h2>
                  <p className="mt-1 text-xs leading-relaxed text-[#9dc197]">
                    {selectedSkill.description}
                  </p>
                </div>

                {/* Formal Summary */}
                <div className="border border-[#3e5c38] bg-[#0a0b0d] p-3">
                  <div className="text-[9px] uppercase tracking-[0.25em] text-[#39ff14] font-bold mb-1">
                    &gt;_ DEFINIÇÃO TÉCNICA FORMAL
                  </div>
                  <p className="text-[11px] leading-relaxed text-[#9dc197]">
                    {selectedSkill.formalSummary}
                  </p>
                </div>

                {/* Keywords */}
                <div>
                  <div className="text-[9px] uppercase tracking-widest text-[#9dc197]/70 mb-1.5">
                    PALAVRAS-CHAVE & SINTAXE C#
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSkill.keywords.map((kw) => (
                      <span
                        key={kw}
                        className="border border-[#3e5c38] bg-[#0a0b0d] px-2 py-1 text-[10px] text-[#39ff14]"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Prerequisites status */}
                {selectedSkill.prerequisites.length > 0 && (
                  <div>
                    <div className="text-[9px] uppercase tracking-widest text-[#9dc197]/70 mb-1.5">
                      PRÉ-REQUISITOS SINÁPTICOS
                    </div>
                    <div className="space-y-1">
                      {selectedSkill.prerequisites.map((pId) => {
                        const pNode = skillsById.get(pId);
                        const isDone = pNode?.status === 'mastered';
                        return (
                          <div
                            key={pId}
                            className={`flex items-center justify-between border px-2.5 py-1.5 text-[10px] ${
                              isDone
                                ? 'border-[#39ff14]/50 bg-[#39ff14]/5 text-[#39ff14]'
                                : 'border-red-500/40 bg-red-950/20 text-red-400'
                            }`}
                          >
                            <span>{pNode?.label || pId}</span>
                            <span className="font-bold">{isDone ? '✓ CONCLUÍDO' : 'PENDENTE'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Status Toggle Buttons */}
                <div className="border-t border-[#3e5c38] pt-4 space-y-2">
                  <div className="text-[9px] uppercase tracking-widest text-[#9dc197]/70">
                    ATUALIZAR STATUS DE DOMÍNIO
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateSkillStatus(selectedSkill.id, 'unlocked')}
                      className={`border py-1.5 text-[9px] uppercase tracking-widest transition ${
                        selectedSkill.status === 'unlocked'
                          ? 'border-[#9dc197] bg-[#9dc197]/20 text-[#9dc197] font-bold'
                          : 'border-[#3e5c38] text-[#9dc197]/60 hover:border-[#9dc197]'
                      }`}
                    >
                      DISPONÍVEL
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSkillStatus(selectedSkill.id, 'in_progress')}
                      className={`border py-1.5 text-[9px] uppercase tracking-widest transition ${
                        selectedSkill.status === 'in_progress'
                          ? 'border-yellow-400 bg-yellow-400/20 text-yellow-400 font-bold'
                          : 'border-[#3e5c38] text-[#9dc197]/60 hover:border-yellow-400'
                      }`}
                    >
                      PRATICANDO
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSkillStatus(selectedSkill.id, 'mastered')}
                      className={`border py-1.5 text-[9px] uppercase tracking-widest transition ${
                        selectedSkill.status === 'mastered'
                          ? 'border-[#39ff14] bg-[#39ff14]/20 text-[#39ff14] font-bold shadow-[0_0_8px_rgba(57,255,20,0.4)]'
                          : 'border-[#3e5c38] text-[#9dc197]/60 hover:border-[#39ff14] hover:text-[#39ff14]'
                      }`}
                    >
                      DOMINADO ✓
                    </button>
                  </div>
                </div>

                {/* Action CTA: Practice in Sandbox / Classroom */}
                {onNavigateTab && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateTab('sandbox');
                      }}
                      className="flex w-full items-center justify-center gap-2 border border-[#39ff14] bg-[#39ff14]/10 py-2.5 text-xs font-bold uppercase tracking-widest text-[#39ff14] transition hover:bg-[#39ff14] hover:text-black shadow-[0_0_12px_rgba(57,255,20,0.3)]"
                    >
                      <ExternalLink size={14} /> PRATICAR NO SANDBOX C#
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center text-[11px] text-[#9dc197]/50">
                Selecione um nó da Árvore Neural para inspecionar.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
