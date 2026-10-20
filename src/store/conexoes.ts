import { create } from 'zustand';
import type { ConexaoPublica, Motor } from '../domain/conexoes';

// Espelho do que o servidor sabe das conexões (sem chave nenhuma). Não fica
// salvo no navegador: a fonte é o conexoes.local.json do PC.

interface ConexoesState {
  conexoes: ConexaoPublica[];
  motores: Partial<Record<Motor, string>>;
  temChaveBrazuka: boolean;
  carregado: boolean;
  recarregar: () => Promise<void>;
}

export const useConexoes = create<ConexoesState>()((set) => ({
  conexoes: [],
  motores: {},
  temChaveBrazuka: false,
  carregado: false,
  recarregar: async () => {
    try {
      const r = await fetch('/api/conexoes');
      if (!r.ok) throw new Error(String(r.status));
      const d = await r.json();
      set({ conexoes: d.conexoes ?? [], motores: d.motores ?? {}, temChaveBrazuka: !!d.temChaveBrazuka, carregado: true });
    } catch {
      set({ carregado: true }); // sem servidor de dev: app segue sem IA
    }
  },
}));

/** Tem algum motor ligado? (o professor sempre pode pedir: o servidor reveza entre os que existem) */
export const iaLigada = (m: Partial<Record<Motor, string>>) => !!(m.professor || m.dificil || m.leve);

export function useIALigada(): boolean {
  return useConexoes((s) => iaLigada(s.motores));
}

/** POST pras rotas de conexão; devolve o JSON ou lança com a mensagem do servidor. */
export async function postConexoes<T = unknown>(rota: string, corpo: unknown): Promise<T> {
  const r = await fetch(`/api/conexoes/${rota}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.erro ?? `Erro ${r.status}`);
  return d as T;
}
