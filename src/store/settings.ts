import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Preferências do app. Qual modelo responde (os motores) NÃO fica aqui: fica no
// servidor (conexoes.local.json), ver store/conexoes.ts.

interface SettingsState {
  temperature: number;
  setTemperature: (t: number) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set) => ({
      temperature: 0.4,
      setTemperature: (temperature) => set({ temperature }),
    }),
    { name: 'neural-os.settings', version: 2, migrate: (antigo) => ({ temperature: (antigo as { temperature?: number })?.temperature ?? 0.4 }) as SettingsState },
  ),
);
