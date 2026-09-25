import type { LocalDate } from './types';

// Datas "de calendário" sempre no fuso local. O código antigo usava
// new Date().toISOString().slice(0, 10), que depois das 21h (UTC-3) já devolve o dia seguinte.

const pad = (n: number) => String(n).padStart(2, '0');

export function toLocalDate(d: Date = new Date()): LocalDate {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseLocalDate(s: LocalDate): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: LocalDate, days: number): LocalDate {
  const d = parseLocalDate(s);
  d.setDate(d.getDate() + days);
  return toLocalDate(d);
}

export function diffDays(a: LocalDate, b: LocalDate): number {
  return Math.round((parseLocalDate(a).getTime() - parseLocalDate(b).getTime()) / 86_400_000);
}

/** Segunda-feira da semana que contém a data. */
export function weekStartOf(s: LocalDate): LocalDate {
  const d = parseLocalDate(s);
  const dow = (d.getDay() + 6) % 7; // 0 = segunda
  return addDays(s, -dow);
}

/** Índice do dia na semana: 0 = segunda ... 6 = domingo. */
export function weekdayIndex(s: LocalDate): number {
  return (parseLocalDate(s).getDay() + 6) % 7;
}

export const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'] as const;

export function formatShort(s: LocalDate): string {
  const d = parseLocalDate(s);
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
}
