import { useState } from 'react';
import { Panel } from '../../components/ui';
import { cn } from '../../lib/utils';
import { AbaFoco, AbaRevisoes, AbaSync } from './AbasConteudo';
import { AbaTrofeus } from './AbaTrofeus';

const ABAS = [
  { id: 'trofeus', rotulo: 'Troféus' },
  { id: 'foco', rotulo: 'Foco semanal' },
  { id: 'sync', rotulo: 'Sync' },
  { id: 'revisoes', rotulo: 'Revisões' },
] as const;
type AbaId = (typeof ABAS)[number]['id'];

const CHAVE = 'neural-os.lobby.aba';
function lerAba(): AbaId {
  try {
    const v = localStorage.getItem(CHAVE);
    return ABAS.some((a) => a.id === v) ? (v as AbaId) : 'trofeus';
  } catch {
    return 'trofeus';
  }
}

/** O que é bom ter à mão, mas não precisa ocupar a tela: fica em abas. */
export function AbasLobby() {
  const [aba, setAba] = useState<AbaId>(lerAba);
  const escolher = (id: AbaId) => {
    setAba(id);
    try {
      localStorage.setItem(CHAVE, id);
    } catch {
      /* sem armazenamento: só não lembra a aba */
    }
  };

  return (
    <Panel>
      <div className="mb-3 flex gap-1 overflow-x-auto border-b border-line">
        {ABAS.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => escolher(a.id)}
            className={cn('whitespace-nowrap border-b-2 px-3 py-1.5 text-[11px] uppercase tracking-wider', aba === a.id ? 'border-accent font-bold text-accent' : 'border-transparent text-muted hover:text-fg')}
          >
            {a.rotulo}
          </button>
        ))}
      </div>
      {aba === 'trofeus' && <AbaTrofeus />}
      {aba === 'foco' && <AbaFoco />}
      {aba === 'sync' && <AbaSync />}
      {aba === 'revisoes' && <AbaRevisoes />}
    </Panel>
  );
}
