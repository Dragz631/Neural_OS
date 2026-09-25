import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type AIProvider = 'off' | 'hermes' | 'nvidia' | 'ollama';

export const PROVIDER_LABEL: Record<AIProvider, string> = {
  off: 'Sem IA (modo manual)',
  hermes: 'Hermes Agent',
  nvidia: 'NVIDIA NIM (direto)',
  ollama: 'Ollama local',
};

interface SettingsState {
  provider: AIProvider;
  /** Modelo por provedor (cada um tem sua lista). */
  models: Partial<Record<AIProvider, string>>;
  temperature: number;
  setProvider: (p: AIProvider) => void;
  setModel: (p: AIProvider, model: string) => void;
  setTemperature: (t: number) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      provider: 'off',
      models: { hermes: 'hermes-agent' },
      temperature: 0.4,
      setProvider: (provider) => set({ provider }),
      setModel: (p, model) => set((s) => ({ models: { ...s.models, [p]: model } })),
      setTemperature: (temperature) => set({ temperature }),
    }),
    { name: 'neural-os.settings', version: 1 },
  ),
);
