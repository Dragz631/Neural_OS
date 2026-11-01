import { useEffect, useState } from 'react';
import { Cpu, Link2, Palette, Settings, Smartphone, Zap } from 'lucide-react';
import { levelFromXp } from '../domain/xp';
import { TABS, useNav } from '../store/nav';
import { useConexoes } from '../store/conexoes';
import { useStudy } from '../store/study';
import { useUI } from '../store/ui';
import { cn } from '../lib/utils';
import { ConexoesModal } from './conexoes/ConexoesModal';
import { ConectarFontes } from './fontes/ConectarFontes';
import { AcessoCelular } from './AcessoCelular';
import { SettingsModal } from './SettingsModal';
import { TemaModal } from './TemaModal';

export function Navbar() {
  const { tab, go } = useNav();
  const xp = useStudy((s) => s.profile.xp);
  const professor = useConexoes((s) => s.conexoes.find((c) => c.id === (s.motores.professor ?? s.motores.dificil ?? s.motores.leve)));
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [conexoesOpen, setConexoesOpen] = useState(false);
  const painel = useUI((s) => s.painel);
  const abrirPainel = useUI((s) => s.abrir);
  const fecharPainel = useUI((s) => s.fechar);
  const temaOpen = painel === 'tema';

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
          <span className="titulo-cromo fonte-titulo text-xs font-bold tracking-[0.3em]">NEURAL_OS</span>
        </button>

        <div className="order-3 flex w-full gap-1 overflow-x-auto md:order-none md:w-auto md:flex-1">
          {TABS.map((t, i) => (
            <button
              key={t.id}
              type="button"
              onClick={() => go(t.id)}
              title={`Atalho: ${i + 1}`}
              className={cn(
                'fonte-titulo whitespace-nowrap border-b-2 px-2.5 py-1.5 text-[11px] uppercase tracking-wider transition',
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
          <button
            type="button"
            onClick={() => abrirPainel('fontes')}
            aria-label="Conectar fontes"
            title="Conectar fontes: Obsidian, Notion, NotebookLM e outras pastas"
            className="flex items-center gap-1.5 rounded border border-line px-2 py-1 text-muted hover:border-accent hover:text-accent"
          >
            <Link2 size={12} />
            <span className="hidden sm:inline">Fontes</span>
          </button>
          <button type="button" onClick={() => abrirPainel('celular')} aria-label="Usar no celular" title="Usar no celular, de qualquer rede, com PIN" className="rounded border border-line p-1.5 text-muted hover:border-accent hover:text-accent">
            <Smartphone size={12} />
          </button>
          <button type="button" onClick={() => abrirPainel('tema')} aria-label="Aparência" title="Aparência: cores, letras e efeitos" className="rounded border border-line p-1.5 text-muted hover:border-accent hover:text-accent">
            <Palette size={12} />
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
      <TemaModal open={temaOpen} onClose={fecharPainel} />
      <ConectarFontes open={painel === 'fontes'} onClose={fecharPainel} />
      <AcessoCelular open={painel === 'celular'} onClose={fecharPainel} />
    </nav>
  );
}
