import { useEffect, useState } from 'react';
import { Cpu, Settings, Zap } from 'lucide-react';
import { levelFromXp } from '../domain/xp';
import { TABS, useNav } from '../store/nav';
import { useConexoes } from '../store/conexoes';
import { useStudy } from '../store/study';
import { cn } from '../lib/utils';
import { ConexoesModal } from './conexoes/ConexoesModal';
import { SettingsModal } from './SettingsModal';

export function Navbar() {
  const { tab, go } = useNav();
  const xp = useStudy((s) => s.profile.xp);
  const professor = useConexoes((s) => s.conexoes.find((c) => c.id === (s.motores.professor ?? s.motores.dificil ?? s.motores.leve)));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [conexoesOpen, setConexoesOpen] = useState(false);

  // Lê do servidor quais motores estão ligados (uma vez, ao abrir o app).
  useEffect(() => {
    void useConexoes.getState().recarregar();
  }, []);
  const { level, into, needed } = levelFromXp(xp);

  return (
    <nav className="sticky top-0 z-40 border-b border-line bg-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
        <button type="button" onClick={() => go('lobby')} className="flex items-center gap-2 text-accent">
          <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)]" />
          <span className="text-xs font-bold tracking-[0.3em]">NEURAL_OS</span>
        </button>

        <div className="order-3 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto md:flex-1">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => go(t.id)}
              title={`Atalho: ${i + 1}`}
              className={cn(
                'whitespace-nowrap border-b-2 px-2.5 py-1.5 text-[11px] uppercase tracking-wider transition',
                tab === t.id ? 'border-accent font-bold text-accent' : 'border-transparent text-muted hover:text-fg',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 text-[11px]">
          <div className="hidden items-center gap-2 sm:flex" title={`${into}/${needed} XP para o próximo nível`}>
            <Zap size={12} className="text-accent" />
            <span className="font-bold text-accent">NV {level}</span>
            <div className="h-1.5 w-16 overflow-hidden rounded bg-panel-2">
              <div className="h-full bg-accent" style={{ width: `${(into / needed) * 100}%` }} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => setConexoesOpen(true)}
            title="Conexões: quais modelos fazem o trabalho do professor"
            className="flex items-center gap-1.5 rounded border border-line px-2 py-1 text-muted hover:border-accent hover:text-accent"
          >
            <Cpu size={12} className={professor ? 'text-accent' : ''} />
            <span className="hidden sm:inline">{professor?.nome ?? 'Conectar modelo'}</span>
          </button>
          <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Configurações" className="rounded border border-line p-1.5 text-muted hover:border-accent hover:text-accent">
            <Settings size={12} />
          </button>
        </div>
      </div>
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onConexoes={() => {
          setSettingsOpen(false);
          setConexoesOpen(true);
        }}
      />
      <ConexoesModal open={conexoesOpen} onClose={() => setConexoesOpen(false)} />
    </nav>
  );
}
