import { create } from 'zustand';
import { persist } from '../lib/persistir';
import { addDays, toLocalDate } from '../domain/dates';
import { maisParada, semana, SOBRE, type Habilidade, type Treino } from '../domain/musculos';

// O que você treinou, por dia (60 dias). Salvo e sincronizado.

interface MusculosState {
  registro: Treino[];
}

export const useMusculos = create<MusculosState>()(persist(() => ({ registro: [] as Treino[] }), { name: 'neural-os.musculos', version: 1 }));

/** Marca um treino. Chamado de onde a coisa acontece (prova, chat, tabuada...). Nunca lança. */
export function treinar(h: Habilidade, n = 1) {
  const hoje = toLocalDate();
  const desde = addDays(hoje, -60);
  useMusculos.setState((s) => {
    const registro = s.registro.filter((t) => t.data >= desde);
    const i = registro.findIndex((t) => t.data === hoje && t.h === h);
    if (i >= 0) registro[i] = { ...registro[i], n: Math.round((registro[i].n + n) * 100) / 100 };
    else registro.push({ data: hoje, h, n });
    return { registro };
  });
}

/** Pro professor: a habilidade que ficou parada na semana (vazio se nada a dizer). */
export function musculosParaIA(): string {
  const parada = maisParada(semana(useMusculos.getState().registro, toLocalDate()));
  if (!parada) return '';
  return `MÚSCULOS DO CÉREBRO: esta semana o aluno treinou pouco ${SOBRE[parada].nome.toLowerCase()}. Quando couber na aula ou no chat, puxe por isso (sem forçar).`;
}
