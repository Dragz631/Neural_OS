import { useState, useEffect } from 'react';
import { NeuralProvider } from './context/NeuralContext';
import { Navbar, type TabId } from './components/layout/Navbar';
import { Toaster } from './components/layout/Toaster';
import Lobby from './components/Lobby';
import Sandbox from './components/Sandbox';
import { Classroom } from './components/classroom/classroom';
import { DungeonProtocol } from './components/dungeon/DungeonProtocol';
import LousaMental from './components/lousa-mental';
import MoldaHorario from './components/MoldaHorario';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('lobby');

  // Global hotkeys for tabs (1..6)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea' || (document.activeElement as HTMLElement)?.isContentEditable) {
        return;
      }
      if (e.key === '1') setActiveTab('lobby');
      if (e.key === '2') setActiveTab('lousa');
      if (e.key === '3') setActiveTab('sandbox');
      if (e.key === '4') setActiveTab('professor');
      if (e.key === '5') setActiveTab('dungeon');
      if (e.key === '6') setActiveTab('molda');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const renderTab = () => {
    switch (activeTab) {
      case 'lobby':
        return <Lobby onNavigateTab={(tab) => setActiveTab(tab as TabId)} />;
      case 'lousa':
        return <LousaMental onNavigateTab={(tab) => setActiveTab(tab as TabId)} />;
      case 'sandbox':
        return <Sandbox />;
      case 'professor':
        return <Classroom onNavigateTab={(tab) => setActiveTab(tab as TabId)} />;
      case 'dungeon':
        return <DungeonProtocol onNavigateTab={(tab) => setActiveTab(tab as TabId)} />;
      case 'molda':
        return <MoldaHorario />;
      default:
        return <Lobby onNavigateTab={(tab) => setActiveTab(tab as TabId)} />;
    }
  };

  return (
    <NeuralProvider>
      <div className="min-h-screen bg-[#0a0f0d] font-mono text-[#9dc197] selection:bg-[#00ff66] selection:text-black">
        <Navbar activeTab={activeTab} onSelectTab={setActiveTab} />
        <main>{renderTab()}</main>
        <Toaster />
      </div>
    </NeuralProvider>
  );
}
