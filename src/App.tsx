import { lazy, Suspense, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { NextStepBar } from './components/NextStepBar';
import { Toaster } from './components/Toaster';
import { TarefasBar } from './components/TarefasBar';
import { FocoMotor } from './components/Foco';
import { useBackupAutomatico } from './hooks/useBackupAutomatico';
import { TABS, useNav, type TabId } from './store/nav';

// Cada aba é carregada só quando você abre (code-splitting): o app abre mais rápido.
const PAGES: Record<TabId, React.LazyExoticComponent<() => React.JSX.Element>> = {
  lobby: lazy(() => import('./features/lobby/Lobby')),
  arvore: lazy(() => import('./features/tree/NeuralTree')),
  professor: lazy(() => import('./features/professor/Professor')),
  sandbox: lazy(() => import('./features/sandbox/Sandbox')),
  horario: lazy(() => import('./features/planner/Planner')),
  lousa: lazy(() => import('./features/lousa')),
  dungeon: lazy(() => import('./features/dungeon/DungeonProtocol')),
};

export default function App() {
  const tab = useNav((s) => s.tab);
  const go = useNav((s) => s.go);
  const Page = PAGES[tab];
  useBackupAutomatico(); // cópia diária no cofre de estudos (os dados só vivem no navegador)

  // Atalhos 1..7 trocam de aba (menos quando você está digitando, e nunca na Lousa:
  // lá os números são as ferramentas do Excalidraw).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (useNav.getState().tab === 'lousa') return;
      const el = document.activeElement as HTMLElement | null;
      if (el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const idx = Number(e.key) - 1;
      if (idx >= 0 && idx < TABS.length) go(TABS[idx].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <TarefasBar />
      <FocoMotor />
      {tab !== 'lobby' && <NextStepBar />}
      <main>
        <Suspense fallback={<div className="p-8 text-center text-xs text-muted">carregando…</div>}>
          <Page />
        </Suspense>
      </main>
      <Toaster />
    </div>
  );
}
