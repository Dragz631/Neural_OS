// XP só existe pra dar sensação de progresso. Regra simples e previsível:
// cada nível custa um pouco mais que o anterior (100, 150, 200, ...).

export function levelFromXp(xp: number): { level: number; into: number; needed: number } {
  let level = 1;
  let remaining = xp;
  let needed = 100;
  while (remaining >= needed) {
    remaining -= needed;
    level += 1;
    needed += 50;
  }
  return { level, into: remaining, needed };
}

/** XP por minuto estudado, com bônus quando há avaliação boa. */
export function xpForSession(minutes: number, score?: number): number {
  const base = Math.max(5, Math.round(minutes * 2));
  const bonus = score !== undefined && score >= 70 ? 20 : 0;
  return base + bonus;
}
