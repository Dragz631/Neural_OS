import React, { useState } from 'react';
import {
  Terminal,
  Clock,
  Zap,
  AlertTriangle,
  ChevronRight,
  Activity,
  Cpu,
  Radio,
  CheckCircle,
  XCircle,
  Layers,
  SkipForward,
  Coffee,
  Moon,
  Send,
  Sparkles,
  Calendar
} from 'lucide-react';
import { useNeural } from '../context/NeuralContext';
import type { TrackId } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type EnergyLevel = 'high' | 'medium' | 'low';
type DayStatus = 'completed' | 'lost' | 'compressed' | 'active' | 'pending' | 'rest';

interface Task {
  time: string;
  label: string;
  tag: string;
  type: 'missed' | 'normal' | 'compressed' | 'pause' | 'practice' | 'done' | 'rest';
  duration?: string;
  note?: string;
}

interface DayState {
  status: DayStatus;
  reason?: string;
  arrivalTime: string;
  energyLevel: EnergyLevel;
  isCompressed: boolean;
  tasks: Task[];
  xp?: number;
  log?: string[];
}

type DayKey = 'SEG' | 'TER' | 'QUA' | 'QUI' | 'SEX' | 'SAB' | 'DOM';

type WeekData = Record<DayKey, DayState>;

// ─── Track-specific weekly schedules ─────────────────────────────────────────

const WEEK_DATA_BY_TRACK: Record<TrackId, WeekData> = {
  c_bases: {
    SEG: {
      status: 'completed',
      arrivalTime: '17:30',
      energyLevel: 'high',
      isCompressed: false,
      xp: 300,
      log: [
        '17:30 → Sessão iniciada.',
        '17:30–19:00 → Fundamentos de C: stdio.h, printf e scanf ✓',
        '19:00–19:30 → Exercícios de Tipos Primitivos (int, float, char) ✓',
        '19:30–20:00 → Sandbox: Programa de I/O formatado ✓',
        '20:00 → Sessão encerrada. Meta diária atingida.',
      ],
      tasks: [
        { time: '17:30', label: 'Fundamentos de C: Entrada/Saída e Tipos', tag: '[DONE] Concluído', type: 'done', duration: '90 min' },
        { time: '19:00', label: 'Exercícios: Modificadores %d, %f, %c e Buffer', tag: '[DONE] Concluído', type: 'done', duration: '30 min' },
        { time: '19:30', label: 'Sandbox C Bases: Mini Desafio I/O', tag: '[DONE] Concluído', type: 'done', duration: '30 min' },
      ],
    },
    TER: {
      status: 'lost',
      reason: 'Turno extra no trabalho. Chegada tardia com energia zero.',
      arrivalTime: '22:15',
      energyLevel: 'low',
      isCompressed: false,
      xp: 0,
      log: [
        '22:15 → Chegada registrada.',
        '// Dia classificado como LOST pelo protocolo de fadiga.',
      ],
      tasks: [
        { time: '14:00', label: 'Estruturas Condicionais: if/else e switch', tag: '[!] PERDIDO — Turno de Trabalho', type: 'missed', duration: '14:00–16:00' },
        { time: '18:00', label: 'Operadores Bitwise e Lógicos em C', tag: '[!] PERDIDO — Fadiga', type: 'missed', duration: '18:00–19:30' },
      ],
    },
    QUA: {
      status: 'compressed',
      reason: 'Cheguei às 19:40. Compressão inteligente ativada.',
      arrivalTime: '19:40',
      energyLevel: 'medium',
      isCompressed: true,
      xp: 160,
      log: [
        '19:40 → COMPRESSÃO AUTO ativada.',
        '19:40–20:00 → Laços de Repetição: for, while e do-while ✓',
        '20:00–20:15 → Exercício de Acumuladores e Contadores ✓',
        '20:15–20:35 → Pausa autorizada.',
        '20:35–20:50 → Revisão de Laços Aninhados ✓',
      ],
      tasks: [
        { time: '19:40', label: 'Laços de Repetição: for, while e do-while', tag: '[Compressed] Alta Prioridade', type: 'compressed', duration: '20 min' },
        { time: '20:00', label: 'Mini Desafio C: Acumuladores e Somatórios', tag: '[Compressed] Execução', type: 'compressed', duration: '15 min' },
        { time: '20:15', label: 'Pausa Tática de Oxigenação', tag: '[Pausa Autorizada]', type: 'pause', duration: '20 min' },
        { time: '20:35', label: 'Lousa Mental: Laços Aninhados e Matrizes', tag: '[Prática] Consolidação', type: 'practice', duration: '15 min' },
      ],
    },
    QUI: {
      status: 'active',
      arrivalTime: '18:00',
      energyLevel: 'low',
      isCompressed: false,
      tasks: [
        { time: '14:00', label: 'Arrays Unidimensionais e Vetores em C', tag: '[!] AULA PERDIDA — Trabalhando', type: 'missed', duration: '14:00–16:00' },
        { time: '18:00', label: 'Manipulação de Strings e string.h (strlen, strcpy)', tag: '[OK] Agendado', type: 'normal', duration: '18:00–19:30' },
      ],
    },
    SEX: {
      status: 'pending',
      arrivalTime: '17:00',
      energyLevel: 'high',
      isCompressed: false,
      tasks: [
        { time: '17:00', label: 'Funções em C: Escopo, Parâmetros e Retorno', tag: '[Pendente] Planejado', type: 'normal', duration: '60 min' },
        { time: '18:00', label: 'Ponteiros: Aritmética de Endereços (& e *)', tag: '[Pendente] Planejado', type: 'normal', duration: '90 min' },
      ],
    },
    SAB: {
      status: 'rest',
      arrivalTime: '10:00',
      energyLevel: 'high',
      isCompressed: false,
      tasks: [
        { time: '10:00', label: 'Structs e Alocação Dinâmica (malloc/free)', tag: '[Prática Livre]', type: 'practice', duration: '60 min' },
        { time: '—', label: 'Descanso Ativo e Recuperação Sináptica', tag: '[Rest] Autorizado', type: 'rest', note: 'Descanso é chave para absorção de ponteiros.' },
      ],
    },
    DOM: {
      status: 'pending',
      arrivalTime: '15:00',
      energyLevel: 'medium',
      isCompressed: false,
      tasks: [
        { time: '15:00', label: 'Revisão Semanal: Ponteiros e Structs', tag: '[Planejado]', type: 'normal', duration: '60 min' },
        { time: '16:00', label: 'Prova da Matriz C Bases // Prof. A.Ilson', tag: '[Simulado]', type: 'practice', duration: '60 min' },
      ],
    },
  },
  lfa: {
    SEG: {
      status: 'completed',
      arrivalTime: '17:30',
      energyLevel: 'high',
      isCompressed: false,
      xp: 280,
      log: [
        '17:30 → Sessão iniciada.',
        '17:30–19:00 → Alfabetos, Símbolos e Cadeias Formais ✓',
        '19:00–19:30 → Fechamento de Kleene e Concatenação ✓',
        '19:30–20:00 → Simulador de Linguagens Formais ✓',
        '20:00 → Sessão encerrada.',
      ],
      tasks: [
        { time: '17:30', label: 'Teoria dos Alfabetos e Cadeias Formais', tag: '[DONE] Concluído', type: 'done', duration: '90 min' },
        { time: '19:00', label: 'Operações em Linguagens: Kleene (*, +)', tag: '[DONE] Concluído', type: 'done', duration: '30 min' },
        { time: '19:30', label: 'Sandbox LFA: Verificação de Cadeias', tag: '[DONE] Concluído', type: 'done', duration: '30 min' },
      ],
    },
    TER: {
      status: 'lost',
      reason: 'Reunião de emergência com cliente.',
      arrivalTime: '22:30',
      energyLevel: 'low',
      isCompressed: false,
      xp: 0,
      log: ['22:30 → Chegada. Dia LOST autorizado.'],
      tasks: [
        { time: '14:00', label: 'Autômatos Finitos Determinísticos (AFD)', tag: '[!] PERDIDO — Trabalho', type: 'missed', duration: '14:00–16:00' },
        { time: '18:00', label: 'Desenho de Grafos de Transição e Tabela delta', tag: '[!] PERDIDO — Fadiga', type: 'missed', duration: '18:00–19:30' },
      ],
    },
    QUA: {
      status: 'compressed',
      reason: 'Chegada às 19:45. Compressão ativada.',
      arrivalTime: '19:45',
      energyLevel: 'medium',
      isCompressed: true,
      xp: 150,
      log: [
        '19:45 → COMPRESSÃO AUTO.',
        '19:45–20:05 → AFN: Não-Determinismo e Múltiplos Estados ✓',
        '20:05–20:20 → Transições-Epsilon e Fecho-Eps ✓',
        '20:20–20:40 → Pausa.',
        '20:40–20:55 → Revisão de Equivalência AFN/AFD ✓',
      ],
      tasks: [
        { time: '19:45', label: 'AFN: Transições Múltiplas e delta estendida', tag: '[Compressed] Alta Prioridade', type: 'compressed', duration: '20 min' },
        { time: '20:05', label: 'Mini Desafio LFA: Fecho-Epsilon', tag: '[Compressed] Execução', type: 'compressed', duration: '15 min' },
        { time: '20:20', label: 'Pausa', tag: '[Pausa Autorizada]', type: 'pause', duration: '20 min' },
        { time: '20:40', label: 'Lousa Mental: Comparativo AFN vs AFD', tag: '[Prática] Consolidação', type: 'practice', duration: '15 min' },
      ],
    },
    QUI: {
      status: 'active',
      arrivalTime: '18:00',
      energyLevel: 'low',
      isCompressed: false,
      tasks: [
        { time: '14:00', label: 'Algoritmo de Conversão AFN para AFD', tag: '[!] AULA PERDIDA — Trabalhando', type: 'missed', duration: '14:00–16:00' },
        { time: '18:00', label: 'Construção de Subconjuntos na Lousa', tag: '[OK] Agendado', type: 'normal', duration: '18:00–19:30' },
      ],
    },
    SEX: {
      status: 'pending',
      arrivalTime: '17:00',
      energyLevel: 'high',
      isCompressed: false,
      tasks: [
        { time: '17:00', label: 'Expressões Regulares e Teorema de Kleene', tag: '[Pendente] Planejado', type: 'normal', duration: '60 min' },
        { time: '18:00', label: 'Minimização de Estados de AFD (Hopcroft)', tag: '[Pendente] Planejado', type: 'normal', duration: '90 min' },
      ],
    },
    SAB: {
      status: 'rest',
      arrivalTime: '10:00',
      energyLevel: 'high',
      isCompressed: false,
      tasks: [
        { time: '10:00', label: 'Dungeons de LFA: Batalhas contra Guardiões', tag: '[Prática Livre]', type: 'practice', duration: '60 min' },
        { time: '—', label: 'Descanso e Processamento Lógico', tag: '[Rest] Autorizado', type: 'rest', note: 'Descanso de autômatos.' },
      ],
    },
    DOM: {
      status: 'pending',
      arrivalTime: '15:00',
      energyLevel: 'medium',
      isCompressed: false,
      tasks: [
        { time: '15:00', label: 'Gramáticas Regulares e Hierarquia de Chomsky', tag: '[Planejado]', type: 'normal', duration: '60 min' },
        { time: '16:00', label: 'Simulado de Prova LFA // Prof. A.Ilson', tag: '[Simulado]', type: 'practice', duration: '60 min' },
      ],
    },
  },
  csharp: {
    SEG: {
      status: 'completed',
      arrivalTime: '17:30',
      energyLevel: 'high',
      isCompressed: false,
      xp: 320,
      log: [
        '17:30 → Sessão iniciada.',
        '17:30–19:00 → Fundamentos de POO: Encapsulamento ✓',
        '19:00–19:30 → Exercícios de fixação: Herança ✓',
        '19:30–20:00 → Projeto pessoal: refactor módulo auth ✓',
        '20:00 → Sessão encerrada. Meta diária atingida.',
      ],
      tasks: [
        { time: '17:30', label: 'Fundamentos de POO: Encapsulamento', tag: '[DONE] Concluído', type: 'done', duration: '90 min' },
        { time: '19:00', label: 'Exercícios: Herança e Polimorfismo', tag: '[DONE] Concluído', type: 'done', duration: '30 min' },
        { time: '19:30', label: 'Projeto: Refactor Módulo Auth', tag: '[DONE] Concluído', type: 'done', duration: '30 min' },
      ],
    },
    TER: {
      status: 'lost',
      reason: 'Fiquei até as 22:30 no escritório. Reunião de emergência com cliente. Zero energia ao chegar.',
      arrivalTime: '22:30',
      energyLevel: 'low',
      isCompressed: false,
      xp: 0,
      log: [
        '22:30 → Chegada registrada. Nível energético: CRÍTICO.',
        '22:35 → Tentativa de iniciar sessão cancelada pelo sistema.',
        '22:36 → Decisão correta: descanso autorizado.',
        '// Dia classificado como LOST. Sem penalidade aplicada.',
      ],
      tasks: [
        { time: '14:00', label: 'Estudo Profundo: Interfaces e Abstrações', tag: '[!] PERDIDO — Turno de Trabalho', type: 'missed', duration: '14:00–16:00', note: 'Reunião de cliente bloqueou o período.' },
        { time: '18:00', label: 'Prática de C# na Lousa', tag: '[!] PERDIDO — Fadiga Extrema', type: 'missed', duration: '18:00–19:30', note: 'Chegada às 22:30. Inviável.' },
      ],
    },
    QUA: {
      status: 'compressed',
      reason: 'Cheguei às 19:45. Compressão aplicada automaticamente.',
      arrivalTime: '19:45',
      energyLevel: 'medium',
      isCompressed: true,
      xp: 140,
      log: [
        '19:45 → Chegada registrada.',
        '19:45 → COMPRESSÃO AUTO ativada (energia=médio, chegada=19:45).',
        '19:45–20:00 → Fluxo Rápido: Interfaces ✓',
        '20:00–20:15 → Mini Desafio implementação ✓',
        '20:15–20:35 → Pausa autorizada.',
        '20:35–20:50 → Lousa Mental: Revisão ✓',
      ],
      tasks: [
        { time: '19:45', label: 'Fluxo Rápido: Interfaces e Contratos', tag: '[Compressed] Alta Prioridade', type: 'compressed', duration: '15 min' },
        { time: '20:00', label: 'Mini Desafio: Implementação de Interface', tag: '[Compressed] Execução', type: 'compressed', duration: '15 min' },
        { time: '20:15', label: 'Descanso / Respiração', tag: '[Pausa Autorizada]', type: 'pause', duration: '20 min' },
        { time: '20:35', label: 'Lousa Mental: Revisão do Dia', tag: '[Prática] Consolidação', type: 'practice', duration: '15 min' },
      ],
    },
    QUI: {
      status: 'active',
      arrivalTime: '18:00',
      energyLevel: 'low',
      isCompressed: false,
      tasks: [
        { time: '14:00', label: 'Estudo Profundo: Classes e Objetos', tag: '[!] AULA PERDIDA — Trabalhando', type: 'missed', duration: '14:00–16:00' },
        { time: '18:00', label: 'Prática de C# na Lousa', tag: '[OK] Agendado', type: 'normal', duration: '18:00–19:30' },
      ],
    },
    SEX: {
      status: 'pending',
      arrivalTime: '17:00',
      energyLevel: 'high',
      isCompressed: false,
      tasks: [
        { time: '17:00', label: 'Revisão Semanal: Consolidação de POO', tag: '[Pendente] Planejado', type: 'normal', duration: '60 min' },
        { time: '18:00', label: 'Projeto Prático: Mini Sistema C#', tag: '[Pendente] Planejado', type: 'normal', duration: '90 min' },
      ],
    },
    SAB: {
      status: 'rest',
      arrivalTime: '10:00',
      energyLevel: 'high',
      isCompressed: false,
      tasks: [
        { time: '10:00', label: 'Leitura Técnica — Opcional', tag: '[Descanso] Sem Obrigação', type: 'rest', duration: '30 min' },
        { time: '—', label: 'Dia de Recarga do Sistema', tag: '[Rest] Autorizado pelo Protocolo', type: 'rest', note: 'Descanso ativo é parte do sistema.' },
      ],
    },
    DOM: {
      status: 'pending',
      arrivalTime: '15:00',
      energyLevel: 'medium',
      isCompressed: false,
      tasks: [
        { time: '15:00', label: 'Planejamento da Próxima Semana', tag: '[Setup Semanal]', type: 'normal', duration: '30 min' },
        { time: '15:30', label: 'Simulado de Prova POO // Prof. A.Ilson', tag: '[Simulado]', type: 'practice', duration: '60 min' },
      ],
    },
  },
};

// ─── Week days config ─────────────────────────────────────────────────────────

const WEEK_DAYS: { key: DayKey; short: string; full: string; isToday: boolean }[] = [
  { key: 'SEG', short: 'SEG', full: 'Segunda', isToday: false },
  { key: 'TER', short: 'TER', full: 'Terça',   isToday: false },
  { key: 'QUA', short: 'QUA', full: 'Quarta',  isToday: false },
  { key: 'QUI', short: 'QUI', full: 'Quinta',  isToday: true  },
  { key: 'SEX', short: 'SEX', full: 'Sexta',   isToday: false },
  { key: 'SAB', short: 'SAB', full: 'Sábado',  isToday: false },
  { key: 'DOM', short: 'DOM', full: 'Domingo', isToday: false },
];

// ─── Status metadata ──────────────────────────────────────────────────────────

const STATUS_META: Record<DayStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  completed: {
    label: 'CONCLUÍDO',
    color: '#39ff14',
    bg: 'rgba(57, 255, 20, 0.06)',
    icon: <CheckCircle size={10} />,
  },
  lost: {
    label: 'DIA PERDIDO',
    color: '#ff5500',
    bg: 'rgba(255, 85, 0, 0.06)',
    icon: <XCircle size={10} />,
  },
  compressed: {
    label: 'COMPRIMIDO',
    color: '#9dc197',
    bg: 'rgba(157, 193, 151, 0.05)',
    icon: <Layers size={10} />,
  },
  active: {
    label: 'ATIVO',
    color: '#39ff14',
    bg: 'rgba(57, 255, 20, 0.04)',
    icon: <Radio size={10} />,
  },
  pending: {
    label: 'PENDENTE',
    color: '#3e5c38',
    bg: 'rgba(62, 92, 56, 0.04)',
    icon: <SkipForward size={10} />,
  },
  rest: {
    label: 'DESCANSO',
    color: '#3e5c38',
    bg: 'rgba(62, 92, 56, 0.04)',
    icon: <Moon size={10} />,
  },
};

// ─── Compressed block builder ─────────────────────────────────────────────────

function buildCompressedBlocks(arrivalTime: string): Task[] {
  const [hStr, mStr] = arrivalTime.split(':');
  const baseH = parseInt(hStr ?? '18', 10);
  const baseM = parseInt(mStr ?? '00', 10);

  function addMinutes(h: number, m: number, delta: number): string {
    const total = h * 60 + m + delta;
    const rh = Math.floor(total / 60) % 24;
    const rm = total % 60;
    return `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`;
  }

  return [
    { time: addMinutes(baseH, baseM, 0),  label: 'Fluxo Rápido: Classes e Objetos (Síntese Neural)', tag: '[Compressed] Alta Prioridade', type: 'compressed', duration: '15 min' },
    { time: addMinutes(baseH, baseM, 15), label: 'Mini Desafio A.Ilson — Instanciação ao Vivo',       tag: '[Compressed] Execução Ativa',  type: 'compressed', duration: '10 min' },
    { time: addMinutes(baseH, baseM, 25), label: 'Violão / Descanso — Zona de Recarga',               tag: '[Pausa Autorizada] Sem Culpa', type: 'pause',      duration: '30 min' },
    { time: addMinutes(baseH, baseM, 55), label: 'Lousa Mental: Mapeando Conexões (C# + OOP)',        tag: '[Prática] Consolidação',       type: 'practice',   duration: '15 min' },
  ];
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ScanlineOverlay() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-50 opacity-[0.025]"
      style={{ backgroundImage: 'repeating-linear-gradient(0deg,transparent,transparent 2px,#39ff14 2px,#39ff14 3px)' }}
    />
  );
}

function WeekHeader({
  selectedDay,
  weekData,
  onSelectDay,
}: {
  selectedDay: DayKey;
  weekData: WeekData;
  onSelectDay: (d: DayKey) => void;
}) {
  return (
    <header className="border-b font-mono flex-shrink-0" style={{ borderColor: '#1a2e18', backgroundColor: '#060709' }}>
      {/* Meta bar */}
      <div
        className="flex items-center justify-between px-6 py-1 text-[10px] tracking-widest"
        style={{ borderBottom: '1px solid #0d1a0c', color: '#2a3d28' }}
      >
        <span className="flex items-center gap-2">
          <Activity size={10} style={{ color: '#39ff14' }} />
          <span style={{ color: '#3e5c38' }}>NEURAL_OS v2.4.1 — MÓDULO: MOLDA-HORÁRIO</span>
        </span>
        <span className="flex items-center gap-3">
          <span style={{ color: '#39ff14' }}>● SISTEMA ATIVO</span>
          <span style={{ color: '#3e5c38' }}>SEM 29 / 2026</span>
          <span style={{ color: '#39ff14' }}>QUI 22.07</span>
        </span>
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {WEEK_DAYS.map((day) => {
          const dayStatus = weekData[day.key].status;
          const meta = STATUS_META[dayStatus];
          const isSelected = selectedDay === day.key;
          const isToday = day.isToday;

          return (
            <button
              key={day.key}
              onClick={() => onSelectDay(day.key)}
              className="flex flex-col items-center py-3 gap-1 relative transition-all duration-100 cursor-pointer group"
              style={{
                borderRight: '1px solid #0d1a0c',
                backgroundColor: isSelected ? 'rgba(57,255,20,0.04)' : 'transparent',
              }}
            >
              {/* Top accent line */}
              <span
                className="absolute top-0 left-0 right-0 h-[2px] transition-all duration-150"
                style={{ backgroundColor: isSelected ? meta.color : 'transparent' }}
              />

              {/* Day label */}
              <span
                className="text-[11px] font-bold tracking-[0.2em]"
                style={{
                  color: isSelected
                    ? meta.color
                    : isToday
                    ? '#9dc197'
                    : '#2a3d28',
                }}
              >
                {day.short}
              </span>

              {/* Status badge */}
              <span
                className="text-[8px] tracking-widest px-1 py-0.5 flex items-center gap-1"
                style={{
                  color: isSelected ? meta.color : '#2a3d28',
                  border: isSelected ? `1px solid ${meta.color}` : '1px solid #0d1a0c',
                  backgroundColor: isSelected ? meta.bg : 'transparent',
                }}
              >
                {meta.icon}
                {isToday ? 'HOJE' : meta.label.split(' ')[0]}
              </span>

              {/* XP indicator for completed/compressed */}
              {(dayStatus === 'completed' || dayStatus === 'compressed') && weekData[day.key].xp && (
                <span
                  className="text-[8px] tracking-wider"
                  style={{ color: isSelected ? meta.color : '#1a2e18' }}
                >
                  +{weekData[day.key].xp}xp
                </span>
              )}

              {/* Bottom accent line */}
              <span
                className="absolute bottom-0 left-0 right-0 h-[2px] transition-all duration-150"
                style={{ backgroundColor: isSelected ? meta.color : 'transparent' }}
              />
            </button>
          );
        })}
      </div>
    </header>
  );
}

function EnergyRadio({ value, current, onChange }: { value: EnergyLevel; current: EnergyLevel; onChange: (v: EnergyLevel) => void }) {
  const isSelected = value === current;
  const isLow = value === 'low';
  const labels: Record<EnergyLevel, string> = {
    high: 'Alto — Foco 100%',
    medium: 'Médio — Capacidade Parcial',
    low: 'Baixo — Fadiga Ativa ⚠',
  };
  const selColor = isLow ? '#ff5500' : '#39ff14';

  return (
    <button
      onClick={() => onChange(value)}
      className="flex items-center gap-3 w-full text-left py-2 px-3 font-mono text-xs transition-all duration-100"
      style={{
        backgroundColor: isSelected ? (isLow ? 'rgba(255,85,0,0.08)' : 'rgba(57,255,20,0.06)') : 'transparent',
        borderLeft: isSelected ? `2px solid ${selColor}` : '2px solid transparent',
        color: isSelected ? selColor : '#3e5c38',
      }}
    >
      <span
        className="w-3 h-3 rounded-full border flex-shrink-0 flex items-center justify-center"
        style={{ borderColor: isSelected ? selColor : '#3e5c38' }}
      >
        {isSelected && (
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: selColor, boxShadow: `0 0 4px ${selColor}` }} />
        )}
      </span>
      <span className="leading-tight">{labels[value]}</span>
    </button>
  );
}

function TimelineBlock({ block }: { block: Task; index?: number }) {
  const isMissed     = block.type === 'missed';
  const isPause      = block.type === 'pause';
  const isCompressed = block.type === 'compressed';
  const isDone       = block.type === 'done';
  const isRest       = block.type === 'rest';

  const borderColor = isMissed ? '#ff5500' : isPause || isRest ? '#3e5c38' : isDone ? '#39ff14' : isCompressed ? '#39ff14' : '#9dc197';
  const bgColor     = isMissed ? 'rgba(255,85,0,0.04)' : isPause || isRest ? 'rgba(62,92,56,0.08)' : isDone ? 'rgba(57,255,20,0.04)' : isCompressed ? 'rgba(57,255,20,0.04)' : 'rgba(157,193,151,0.04)';
  const tagColor    = isMissed ? '#ff5500' : isPause || isRest ? '#3e5c38' : '#39ff14';
  const dotFill     = isDone || isCompressed || block.type === 'practice';

  return (
    <div className="flex gap-4 items-start font-mono text-xs">
      <div className="flex-shrink-0 w-14 text-right pt-3" style={{ color: isMissed ? '#ff5500' : '#3e5c38' }}>
        <span className="text-[11px] tracking-wider">{block.time}</span>
      </div>

      <div className="flex flex-col items-center flex-shrink-0 pt-3">
        <div
          className="w-2 h-2 rounded-full border flex-shrink-0"
          style={{
            borderColor,
            backgroundColor: dotFill ? borderColor : 'transparent',
            boxShadow: dotFill && !isMissed ? `0 0 5px ${borderColor}` : 'none',
          }}
        />
        <div className="w-px flex-1 mt-1" style={{ backgroundColor: isMissed ? '#3a1500' : '#0d1a0c', minHeight: '36px' }} />
      </div>

      <div className="flex-1 mb-3 border-l-2 px-3 py-2.5" style={{ borderLeftColor: borderColor, backgroundColor: bgColor }}>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[9px] tracking-widest font-bold uppercase" style={{ color: tagColor }}>
            {block.tag}
          </span>
          {block.duration && (
            <span className="text-[9px] tracking-wider px-1.5 py-0.5" style={{ color: tagColor, border: `1px solid ${tagColor}`, opacity: 0.65 }}>
              {block.duration}
            </span>
          )}
        </div>

        <span
          className="text-sm leading-tight"
          style={{
            color: '#9dc197',
            textDecoration: isMissed ? 'line-through' : 'none',
            textDecorationColor: '#ff5500',
          }}
        >
          {block.label}
        </span>

        {block.note && (
          <div className="mt-1.5 text-[9px] tracking-wider italic" style={{ color: isMissed ? '#ff5500' : '#3e5c38' }}>
            // {block.note}
          </div>
        )}

        {isMissed && !block.note && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[9px] tracking-widest font-bold" style={{ color: '#ff5500' }}>
            <AlertTriangle size={9} />
            CONFLITO — Sobreposição com Turno de Trabalho
          </div>
        )}
        {isPause && (
          <div className="mt-1.5 text-[9px] tracking-wider italic" style={{ color: '#3e5c38' }}>
            // Recarga autorizada. Não requer justificativa.
          </div>
        )}
        {isRest && (
          <div className="mt-1.5 text-[9px] tracking-wider italic" style={{ color: '#3e5c38' }}>
            // Descanso é parte do protocolo. Zero culpa.
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Right panel variants ─────────────────────────────────────────────────────

function RightPanelActive({
  dayData,
  onCompress,
  onRestore,
  onArrivalChange,
  onEnergyChange,
}: {
  dayData: DayState;
  onCompress: () => void;
  onRestore: () => void;
  onArrivalChange: (t: string) => void;
  onEnergyChange: (e: EnergyLevel) => void;
}) {
  const { isCompressed, arrivalTime, energyLevel, tasks } = dayData;
  const activeBlocks = isCompressed ? buildCompressedBlocks(arrivalTime) : tasks;

  return (
    <div className="flex flex-1 min-h-0 overflow-hidden">
      {/* Left control panel */}
      <aside className="w-[38%] flex flex-col border-r overflow-y-auto flex-shrink-0" style={{ borderColor: '#0d1a0c', backgroundColor: '#060709' }}>
        <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: '#0d1a0c' }}>
          <Terminal size={14} style={{ color: '#39ff14' }} />
          <span className="text-xs font-bold tracking-[0.25em] uppercase" style={{ color: '#39ff14' }}>
            SYSTEM SHIFT OVERRIDE
          </span>
        </div>

        <div className="flex flex-col gap-5 p-5 flex-1">
          {/* Time input */}
          <section>
            <label className="flex items-center gap-2 text-[10px] tracking-widest uppercase mb-2" style={{ color: '#3e5c38' }}>
              <Clock size={10} /> Cheguei do Trabalho às:
            </label>
            <div className="flex items-center gap-2 px-3 py-2 border" style={{ borderColor: '#3e5c38', backgroundColor: '#090a0f' }}>
              <ChevronRight size={12} style={{ color: '#39ff14' }} />
              <input
                type="time"
                value={arrivalTime}
                onChange={(e) => { onArrivalChange(e.target.value); if (isCompressed) onRestore(); }}
                className="bg-transparent border-none outline-none text-sm w-full font-mono tracking-widest"
                style={{ color: '#39ff14', colorScheme: 'dark' }}
              />
            </div>
            <div className="text-[9px] mt-1.5 tracking-wider" style={{ color: '#1a2e18' }}>
              // input: hora_chegada → recalcula timeline comprimida
            </div>
          </section>

          {/* Energy */}
          <section>
            <div className="flex items-center gap-2 text-[10px] tracking-widest uppercase mb-3" style={{ color: '#3e5c38' }}>
              <Zap size={10} /> Nível de Energia Atual:
            </div>
            <div className="border flex flex-col overflow-hidden" style={{ borderColor: '#0d1a0c' }}>
              {(['high', 'medium', 'low'] as EnergyLevel[]).map((v) => (
                <div key={v} style={{ borderBottom: '1px solid #0d1a0c' }}>
                  <EnergyRadio value={v} current={energyLevel} onChange={onEnergyChange} />
                </div>
              ))}
            </div>
            {energyLevel === 'low' && (
              <div className="mt-2 flex items-start gap-2 text-[9px] tracking-wider px-2 py-1.5 border" style={{ color: '#ff5500', borderColor: '#3a1500', backgroundColor: 'rgba(255,85,0,0.05)' }}>
                <AlertTriangle size={9} className="flex-shrink-0 mt-0.5" />
                FADIGA ATIVA. Blocos de 10–15 min com pausa obrigatória recomendados.
              </div>
            )}
          </section>

          {/* Diagnostics */}
          <section className="border p-3 text-[9px] tracking-wider leading-relaxed" style={{ borderColor: '#0d1a0c', color: '#1a2e18' }}>
            <div className="mb-2 flex items-center gap-1.5" style={{ color: '#3e5c38' }}>
              <Cpu size={9} /> DIAGNÓSTICO DO SISTEMA
            </div>
            <div>→ hora_chegada: <span style={{ color: '#9dc197' }}>{arrivalTime}</span></div>
            <div>→ energia: <span style={{ color: energyLevel === 'low' ? '#ff5500' : '#9dc197' }}>{energyLevel}</span></div>
            <div>→ estado: <span style={{ color: isCompressed ? '#39ff14' : '#ff5500' }}>{isCompressed ? 'COMPRIMIDO' : 'PADRÃO [CONFLITO]'}</span></div>
            <div>→ blocos_ativos: <span style={{ color: '#9dc197' }}>{activeBlocks.length}</span></div>
          </section>

          {/* Action button */}
          <div className="mt-auto">
            <button
              onClick={onCompress}
              disabled={isCompressed}
              className="w-full py-4 border-2 text-sm font-bold tracking-[0.3em] uppercase transition-all duration-200 flex items-center justify-center gap-2"
              style={{
                borderColor: isCompressed ? '#0d1a0c' : '#39ff14',
                color: isCompressed ? '#3e5c38' : '#39ff14',
                backgroundColor: isCompressed ? '#060709' : 'rgba(57,255,20,0.03)',
                cursor: isCompressed ? 'not-allowed' : 'pointer',
                boxShadow: isCompressed ? 'none' : '0 0 12px rgba(57,255,20,0.15)',
              }}
              onMouseEnter={(e) => { if (!isCompressed) { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 24px rgba(57,255,20,0.4)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(57,255,20,0.08)'; } }}
              onMouseLeave={(e) => { if (!isCompressed) { (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(57,255,20,0.15)'; (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(57,255,20,0.03)'; } }}
            >
              {isCompressed ? <><Radio size={12} /> COMPRESSÃO APLICADA_</> : <><Zap size={14} /> [ APLICAR COMPRESSÃO_ ]</>}
            </button>
            {isCompressed && (
              <button
                onClick={onRestore}
                className="w-full mt-2 py-2 text-[10px] tracking-widest uppercase transition-colors duration-150"
                style={{ color: '#2a3d28', borderTop: '1px solid #0d1a0c' }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = '#3e5c38')}
                onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = '#2a3d28')}
              >
                ↩ Restaurar Timeline Padrão
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Right timeline */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <div
          className="px-6 py-4 border-b flex items-center justify-between sticky top-0 z-10"
          style={{ borderColor: '#0d1a0c', backgroundColor: '#090a0f' }}
        >
          <div className="flex items-center gap-3">
            <Activity size={14} style={{ color: isCompressed ? '#39ff14' : '#ff5500' }} />
            <span className="text-xs font-bold tracking-[0.2em] uppercase" style={{ color: isCompressed ? '#39ff14' : '#ff5500' }}>
              {isCompressed ? 'TIMELINE COMPRIMIDA — REDUÇÃO DE DANOS' : 'TIMELINE PADRÃO — CONFLITO DETECTADO'}
            </span>
          </div>
          <div
            className="text-[9px] tracking-widest px-2 py-1 border"
            style={{ color: isCompressed ? '#39ff14' : '#ff5500', borderColor: isCompressed ? '#1a3a10' : '#3a1500', backgroundColor: isCompressed ? 'rgba(57,255,20,0.05)' : 'rgba(255,85,0,0.05)' }}
          >
            {isCompressed ? `BASE: ${arrivalTime}` : '⚠ 1 CONFLITO'}
          </div>
        </div>

        <div className="p-6 flex-1">
          <div className="text-[9px] tracking-widest mb-5" style={{ color: '#2a3d28' }}>
            <span style={{ color: '#3e5c38' }}>
              {isCompressed ? '// timeline.state = COMPRESSED' : '// timeline.state = STANDARD [CONFLICT]'}
            </span>
            {' → '}{activeBlocks.length} blocos
          </div>

          {activeBlocks.map((block, i) => (
            <TimelineBlock key={`${block.time}-${i}`} block={block} index={i} />
          ))}

          <div className="mt-5 border-t pt-4 text-[9px] tracking-wider leading-relaxed" style={{ borderColor: '#0d1a0c', color: '#1a2e18' }}>
            {isCompressed ? (
              <><span style={{ color: '#3e5c38' }}>// COMPRESSÃO APLICADA: </span>energia={energyLevel}, chegada={arrivalTime}. Conteúdo redistribuído em micro-sessões.</>
            ) : (
              <><span style={{ color: '#ff5500' }}>// ALERTA: </span>Conflito de agendamento detectado. Execute APLICAR COMPRESSÃO_ para redistribuição automática.</>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function RightPanelCompleted({ dayData }: { dayData: DayState }) {
  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <CheckCircle size={16} style={{ color: '#39ff14' }} />
        <span className="text-sm font-bold tracking-[0.2em] uppercase" style={{ color: '#39ff14' }}>
          DIA CONCLUÍDO — META ATINGIDA
        </span>
        {dayData.xp && (
          <span
            className="text-[10px] px-2 py-0.5 font-bold tracking-widest border"
            style={{ color: '#39ff14', borderColor: '#1a3a10', backgroundColor: 'rgba(57,255,20,0.08)' }}
          >
            +{dayData.xp} XP
          </span>
        )}
      </div>

      {/* Session log */}
      {dayData.log && (
        <div className="border p-4 mb-6 font-mono text-[11px] leading-relaxed" style={{ borderColor: '#1a3a10', backgroundColor: 'rgba(57,255,20,0.03)' }}>
          <div className="flex items-center gap-2 mb-3 text-[10px] tracking-widest" style={{ color: '#3e5c38' }}>
            <Terminal size={10} /> SESSION LOG
          </div>
          {dayData.log.map((line, i) => (
            <div key={i} style={{ color: line.includes('✓') ? '#39ff14' : '#9dc197' }}>
              {line.includes('✓') ? <span style={{ color: '#39ff14' }}>{line}</span> : <span style={{ color: '#3e5c38' }}>{line}</span>}
            </div>
          ))}
        </div>
      )}

      {/* Tasks */}
      <div>
        {dayData.tasks.map((block, i) => (
          <TimelineBlock key={i} block={block} index={i} />
        ))}
      </div>
    </div>
  );
}

function RightPanelLost({ dayData }: { dayData: DayState }) {
  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6">
      <div className="flex items-center gap-3 mb-4">
        <XCircle size={16} style={{ color: '#ff5500' }} />
        <span className="text-sm font-bold tracking-[0.2em] uppercase" style={{ color: '#ff5500' }}>
          DIA PERDIDO — SISTEMA REGISTROU AUSÊNCIA
        </span>
      </div>

      {/* Reason block */}
      {dayData.reason && (
        <div className="border-l-2 px-4 py-3 mb-6 font-mono text-xs" style={{ borderLeftColor: '#ff5500', backgroundColor: 'rgba(255,85,0,0.04)' }}>
          <div className="text-[9px] tracking-widest mb-1 uppercase" style={{ color: '#ff5500' }}>
            // CAUSA REGISTRADA:
          </div>
          <div style={{ color: '#9dc197' }}>{dayData.reason}</div>
        </div>
      )}

      {/* Session log */}
      {dayData.log && (
        <div className="border p-4 mb-6 font-mono text-[11px] leading-relaxed" style={{ borderColor: '#3a1500', backgroundColor: 'rgba(255,85,0,0.02)' }}>
          <div className="flex items-center gap-2 mb-3 text-[10px] tracking-widest" style={{ color: '#ff5500' }}>
            <Terminal size={10} /> SYSTEM LOG — DIA PERDIDO
          </div>
          {dayData.log.map((line, i) => (
            <div key={i} style={{ color: line.startsWith('//') ? '#3e5c38' : '#9dc197' }}>{line}</div>
          ))}
        </div>
      )}

      {/* Protocol note */}
      <div className="border p-4 mb-6 text-xs font-mono" style={{ borderColor: '#1a2e18', backgroundColor: 'rgba(62,92,56,0.04)' }}>
        <div className="text-[9px] tracking-widest mb-2" style={{ color: '#3e5c38' }}>
          // PROTOCOLO: REDUÇÃO DE DANOS
        </div>
        <div style={{ color: '#9dc197' }}>
          Dias perdidos não são falhas — são dados. O sistema registra, não pune.
          Conteúdo perdido será redistribuído na próxima sessão disponível.
        </div>
      </div>

      {/* Lost tasks */}
      <div>
        {dayData.tasks.map((block, i) => (
          <TimelineBlock key={i} block={block} index={i} />
        ))}
      </div>
    </div>
  );
}

function RightPanelCompressed({ dayData }: { dayData: DayState }) {
  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6">
      <div className="flex items-center gap-3 mb-4">
        <Layers size={16} style={{ color: '#9dc197' }} />
        <span className="text-sm font-bold tracking-[0.2em] uppercase" style={{ color: '#9dc197' }}>
          SESSÃO COMPRIMIDA — REDUÇÃO DE DANOS APLICADA
        </span>
        {dayData.xp && (
          <span className="text-[10px] px-2 py-0.5 font-bold tracking-widest border" style={{ color: '#9dc197', borderColor: '#3e5c38', backgroundColor: 'rgba(157,193,151,0.06)' }}>
            +{dayData.xp} XP
          </span>
        )}
      </div>

      {dayData.reason && (
        <div className="border-l-2 px-4 py-3 mb-5 font-mono text-xs" style={{ borderLeftColor: '#3e5c38', backgroundColor: 'rgba(62,92,56,0.06)' }}>
          <div className="text-[9px] tracking-widest mb-1 uppercase" style={{ color: '#3e5c38' }}>// Contexto:</div>
          <div style={{ color: '#9dc197' }}>{dayData.reason}</div>
        </div>
      )}

      {dayData.log && (
        <div className="border p-4 mb-5 font-mono text-[11px] leading-relaxed" style={{ borderColor: '#1a2e18', backgroundColor: 'rgba(157,193,151,0.02)' }}>
          <div className="flex items-center gap-2 mb-3 text-[10px] tracking-widest" style={{ color: '#3e5c38' }}>
            <Terminal size={10} /> SESSION LOG
          </div>
          {dayData.log.map((line, i) => (
            <div key={i} style={{ color: line.includes('✓') ? '#9dc197' : '#3e5c38' }}>{line}</div>
          ))}
        </div>
      )}

      <div>{dayData.tasks.map((block, i) => <TimelineBlock key={i} block={block} index={i} />)}</div>
    </div>
  );
}

function RightPanelPending({ dayData }: { dayData: DayState }) {
  return (
    <div className="flex-1 flex flex-col overflow-y-auto p-6">
      <div className="flex items-center gap-3 mb-6">
        <SkipForward size={16} style={{ color: '#3e5c38' }} />
        <span className="text-sm font-bold tracking-[0.2em] uppercase" style={{ color: '#3e5c38' }}>
          DIA PENDENTE — SESSÃO NÃO INICIADA
        </span>
      </div>
      <div className="border-l-2 px-4 py-3 mb-6 font-mono text-xs" style={{ borderLeftColor: '#3e5c38', backgroundColor: 'rgba(62,92,56,0.04)' }}>
        <div className="text-[9px] tracking-widest mb-1" style={{ color: '#2a3d28' }}>// Plano programado:</div>
        <div style={{ color: '#9dc197' }}>Sessão ainda não iniciada. Conteúdo planejado aguardando execução.</div>
      </div>
      <div>{dayData.tasks.map((block, i) => <TimelineBlock key={i} block={block} index={i} />)}</div>
    </div>
  );
}

function RightPanelRest({ dayData }: { dayData: DayState }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-10 text-center">
      <Coffee size={32} className="mb-4" style={{ color: '#3e5c38' }} />
      <div className="text-sm font-bold tracking-[0.25em] uppercase mb-3" style={{ color: '#3e5c38' }}>DIA DE DESCANSO</div>
      <div className="text-xs font-mono leading-relaxed max-w-sm" style={{ color: '#2a3d28' }}>
        // Descanso ativo é parte do protocolo NEURAL_OS.
        <br />// Performance sustentável &gt; sprints insustentáveis.
        <br />// Nenhuma sessão obrigatória registrada.
      </div>
      <div className="mt-8">
        {dayData.tasks.map((block, i) => <TimelineBlock key={i} block={block} index={i} />)}
      </div>
    </div>
  );
}

// ─── Left panel for non-active days ──────────────────────────────────────────

function LeftPanelReadOnly({ dayData, dayKey }: { dayData: DayState; dayKey: DayKey }) {
  const meta = STATUS_META[dayData.status];
  const isLost = dayData.status === 'lost';

  return (
    <aside
      className="w-[36%] flex flex-col border-r overflow-y-auto flex-shrink-0"
      style={{ borderColor: '#0d1a0c', backgroundColor: '#060709' }}
    >
      <div className="px-5 py-4 border-b flex items-center gap-2" style={{ borderColor: '#0d1a0c' }}>
        <span style={{ color: meta.color }}>{meta.icon}</span>
        <span className="text-xs font-bold tracking-[0.25em] uppercase" style={{ color: meta.color }}>
          DIA {dayKey} — {meta.label}
        </span>
      </div>

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Stats */}
        <div className="border p-3 text-[9px] font-mono tracking-wider leading-relaxed" style={{ borderColor: '#0d1a0c', color: '#2a3d28' }}>
          <div className="flex items-center gap-1.5 mb-2" style={{ color: '#3e5c38' }}>
            <Cpu size={9} /> DADOS DO DIA
          </div>
          <div>→ chegada: <span style={{ color: '#9dc197' }}>{dayData.arrivalTime}</span></div>
          <div>→ energia: <span style={{ color: isLost ? '#ff5500' : '#9dc197' }}>{dayData.energyLevel}</span></div>
          <div>→ status: <span style={{ color: meta.color }}>{dayData.status}</span></div>
          {dayData.xp !== undefined && (
            <div>→ xp_ganho: <span style={{ color: meta.color }}>+{dayData.xp}</span></div>
          )}
          <div>→ blocos: <span style={{ color: '#9dc197' }}>{dayData.tasks.length}</span></div>
        </div>

        {/* Lost day reason */}
        {dayData.reason && (
          <div
            className="border-l-2 px-3 py-2 text-[10px] font-mono leading-relaxed"
            style={{ borderLeftColor: meta.color, backgroundColor: isLost ? 'rgba(255,85,0,0.04)' : 'rgba(62,92,56,0.05)' }}
          >
            <div className="text-[9px] tracking-widest mb-1 uppercase" style={{ color: meta.color }}>
              {isLost ? '// Causa:' : '// Contexto:'}
            </div>
            <div style={{ color: '#9dc197' }}>{dayData.reason}</div>
          </div>
        )}

        {/* Protocol note */}
        <div className="mt-auto border-t pt-4 font-mono text-[9px] tracking-wider leading-relaxed" style={{ borderColor: '#0d1a0c', color: '#1a2e18' }}>
          {dayData.status === 'completed' && '// Meta atingida. Dados sincronizados.'}
          {dayData.status === 'lost' && '// Dia registrado como LOST. Sem penalidade. Conteúdo redistribuído.'}
          {dayData.status === 'compressed' && '// Compressão bem-sucedida. Protocolo de danos aplicado.'}
          {dayData.status === 'pending' && '// Sessão futura. Dados aguardando execução.'}
          {dayData.status === 'rest' && '// Descanso autorizado pelo protocolo.'}
        </div>
      </div>
    </aside>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MoldaHorario() {
  const { activeTrack, setActiveTrack, trackProgress, addTask, updateTarget } = useNeural();
  const [selectedDay, setSelectedDay] = useState<DayKey>('QUI');
  const [weekData, setWeekData] = useState<WeekData>(() => WEEK_DATA_BY_TRACK[activeTrack] || WEEK_DATA_BY_TRACK.csharp);

  // Sync week data when active track changes
  React.useEffect(() => {
    setWeekData(WEEK_DATA_BY_TRACK[activeTrack] || WEEK_DATA_BY_TRACK.csharp);
  }, [activeTrack]);

  // Tactical Chat CLI state
  const [cliInput, setCliInput] = useState('');
  const [chatLog, setChatLog] = useState<Array<{ sender: 'ai' | 'user'; text: string }>>([
    {
      sender: 'ai',
      text: '>_ PROF. A.ILSON: "Olá operador! O modo continuidade inteligente está sincronizado com seu nível atual. Tem alguma prova, entrega ou evento na faculdade para esta semana?"',
    },
  ]);

  const currentTrackState = trackProgress[activeTrack] || {
    level: 1,
    xp: 0,
    xpToNextLevel: 200,
    unlockedSkillIds: [],
    checkedSkillIds: [],
    editorDraft: '',
    lastStudiedSkillId: 'c_io',
  };

  const trackLabels: Record<TrackId, string> = {
    csharp: 'C# OOP',
    c_bases: 'C BASES',
    lfa: 'LFA & AUTÔMATOS',
  };

  const continuityRecommendations: Record<TrackId, string> = {
    c_bases: 'Ponteiros, Passagem por Referência (& / *) e Alocação Dinâmica (malloc/free)',
    lfa: 'Algoritmo de Conversão AFN para AFD (Construção de Subconjuntos) e Expressões Regulares',
    csharp: 'Polimorfismo, Sobrecarga de Métodos e Contratos com Interfaces em .NET 9',
  };

  const dayData = weekData[selectedDay] || WEEK_DATA_BY_TRACK[activeTrack][selectedDay];

  function updateDay(key: DayKey, patch: Partial<DayState>) {
    setWeekData((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function handleCompress() { updateDay(selectedDay, { isCompressed: true }); }
  function handleRestore()  { updateDay(selectedDay, { isCompressed: false }); }
  function handleArrivalChange(t: string) { updateDay(selectedDay, { arrivalTime: t }); }
  function handleEnergyChange(e: EnergyLevel) { updateDay(selectedDay, { energyLevel: e }); }

  const handleSendCli = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliInput.trim()) return;

    const userInput = cliInput.trim();
    setCliInput('');
    setChatLog((prev) => [...prev, { sender: 'user', text: userInput }]);

    setTimeout(() => {
      // Parse task keywords
      const isExam = userInput.toLowerCase().includes('prova') || userInput.toLowerCase().includes('exame');
      const isDelivery = userInput.toLowerCase().includes('trabalho') || userInput.toLowerCase().includes('projeto') || userInput.toLowerCase().includes('entrega');
      
      const deadlineDate = new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10);

      if (isExam || isDelivery) {
        addTask({
          label: userInput,
          status: 'pending',
          category: activeTrack === 'csharp' ? 'paradigmas' : activeTrack === 'c_bases' ? 'estudos' : 'calculos',
          deadline: deadlineDate,
          customTags: [trackLabels[activeTrack], isExam ? 'PROVA' : 'ENTREGA'],
          description: `Meta inserida via CLI Molda-Horário para a trilha ${trackLabels[activeTrack]}.`,
          xpReward: isExam ? 200 : 150,
        });

        updateTarget({
          title: `Foco Semanal: ${userInput}`,
          description: `Meta prioritária agendada para ${deadlineDate} via Orquestrador Molda-Horário.`,
          priority: 'ALTA',
        });

        setChatLog((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `>_ PROF. A.ILSON: "Entendido! Registrei '${userInput}' no COLLEGE_TRACKER e atualizei o TARGET_ATUAL do Lobby com prazo para ${deadlineDate}. Suas missões de estudo foram calibradas."`,
          },
        ]);
      } else {
        setChatLog((prev) => [
          ...prev,
          {
            sender: 'ai',
            text: `>_ PROF. A.ILSON: "Anotado no log tático. Continuando fluxo da trilha ${trackLabels[activeTrack]} com foco em avanço de nível."`,
          },
        ]);
      }
    }, 400);
  };

  const isActive = dayData.status === 'active';

  return (
    <div className="min-h-screen flex flex-col font-mono overflow-hidden" style={{ backgroundColor: '#090a0f', color: '#9dc197' }}>
      <ScanlineOverlay />

      {/* Top Track & Continuity Header */}
      <div className="border-b border-[#1b3327] bg-[#0d1612] px-4 py-2 flex flex-wrap items-center justify-between text-xs gap-2">
        <div className="flex items-center gap-3">
          <Calendar className="w-4 h-4 text-[#00ff66]" />
          <span className="font-bold text-[#00ff66] uppercase tracking-widest">
            MOLDA-HORÁRIO // ORQUESTRADOR SEMANAL [{trackLabels[activeTrack]}]
          </span>

          {/* Quick Track Switcher */}
          <div className="flex items-center gap-1 border border-[#1b3327] bg-[#050807] p-0.5 ml-2">
            {(['c_bases', 'lfa', 'csharp'] as TrackId[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTrack(t)}
                className={`px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest transition ${
                  activeTrack === t
                    ? 'bg-[#00ff66] text-black shadow-[0_0_8px_rgba(0,255,102,0.6)]'
                    : 'text-[#9dc197]/70 hover:text-[#00ff66]'
                }`}
              >
                {trackLabels[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="border border-[#00ff66]/40 bg-[#00ff66]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#00ff66] flex items-center gap-1">
            <Sparkles size={12} />
            <span>MODO CONTINUIDADE INTELIGENTE: ATIVO (LVL {currentTrackState.level})</span>
          </span>
        </div>
      </div>

      {/* Continuity Recommendation Bar */}
      <div className="border-b border-[#1b3327] bg-[#050807] px-4 py-2 flex items-center justify-between text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[#00ff66] font-bold text-[11px]">&gt;_ PRÓXIMO BLOCO RECOMENDADO:</span>
          <span className="text-[#9dc197]">{continuityRecommendations[activeTrack]}</span>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-[#9dc197]/70">
          <span>Último Nó: <strong className="text-[#00ff66]">{currentTrackState.lastStudiedSkillId || 'Inicial'}</strong></span>
          <span>•</span>
          <span className="text-[#ffaa00] font-bold">+180 XP / SEMANA</span>
        </div>
      </div>

      {/* Week header */}
      <WeekHeader selectedDay={selectedDay} weekData={weekData} onSelectDay={setSelectedDay} />

      {/* Body */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {isActive ? (
          <RightPanelActive
            dayData={dayData}
            onCompress={handleCompress}
            onRestore={handleRestore}
            onArrivalChange={handleArrivalChange}
            onEnergyChange={handleEnergyChange}
          />
        ) : (
          <>
            <LeftPanelReadOnly dayData={dayData} dayKey={selectedDay} />
            <div className="flex-1 flex flex-col overflow-hidden">
              {dayData.status === 'completed'  && <RightPanelCompleted  dayData={dayData} />}
              {dayData.status === 'lost'        && <RightPanelLost       dayData={dayData} />}
              {dayData.status === 'compressed'  && <RightPanelCompressed dayData={dayData} />}
              {dayData.status === 'pending'     && <RightPanelPending    dayData={dayData} />}
              {dayData.status === 'rest'        && <RightPanelRest       dayData={dayData} />}
            </div>
          </>
        )}
      </div>

      {/* Integrated Tactical Chat CLI Drawer at Bottom */}
      <div className="border-t border-[#1b3327] bg-[#050807] p-2.5 max-h-36 overflow-hidden flex flex-col justify-between shrink-0">
        <div className="overflow-y-auto space-y-1 text-xs max-h-20 mb-1 pr-2">
          {chatLog.map((msg, i) => (
            <div key={i} className={msg.sender === 'ai' ? 'text-[#00ff66]' : 'text-[#9dc197] text-right font-bold'}>
              {msg.text}
            </div>
          ))}
        </div>

        <form onSubmit={handleSendCli} className="flex items-center gap-2">
          <Terminal size={14} className="text-[#00ff66] shrink-0" />
          <input
            type="text"
            value={cliInput}
            onChange={(e) => setCliInput(e.target.value)}
            placeholder="Digite alertas de provas, trabalhos ou ajustes na semana (ex: 'Trabalho de Ponteiros sexta')..."
            className="flex-1 bg-[#0d1612] border border-[#1b3327] px-3 py-1 text-xs text-[#00ff66] focus:outline-none focus:border-[#00ff66] placeholder-[#1b3327]"
          />
          <button
            type="submit"
            className="flex items-center gap-1 border border-[#00ff66] bg-[#00ff66] px-3 py-1 text-xs font-bold text-black hover:bg-[#33ff77] transition"
          >
            <Send size={12} />
            <span>ENVIAR</span>
          </button>
        </form>
      </div>
    </div>
  );
}
