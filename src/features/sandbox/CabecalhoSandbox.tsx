import { Clock, Cpu, History } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Select } from '../../components/ui';
import { CANAL_COMPILADOR } from '../../domain/sandbox';
import type { Id, Subject } from '../../domain/types';

/** Cronômetro do desafio aberto (zera quando troca de desafio). */
function Cronometro({ chave }: { chave?: string }) {
  const [inicio, setInicio] = useState(() => Date.now());
  const [, tique] = useState(0);
  useEffect(() => setInicio(Date.now()), [chave]);
  useEffect(() => {
    const t = setInterval(() => tique((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  const s = Math.floor((Date.now() - inicio) / 1000);
  return (
    <span className="flex items-center gap-1.5 rounded border border-line bg-bg px-2.5 py-1 text-[11px] tabular-nums">
      <Clock size={12} className="text-accent" />
      {String(Math.floor(s / 60)).padStart(2, '0')}:{String(s % 60).padStart(2, '0')}
    </span>
  );
}

export function CabecalhoSandbox({
  subjects,
  subjectId,
  onMateria,
  linguagem,
  desafioId,
  onHistorico,
}: {
  subjects: Subject[];
  subjectId?: Id;
  onMateria: (id: Id) => void;
  linguagem: string;
  desafioId?: string;
  onHistorico: () => void;
}) {
  return (
    <header className="flex flex-wrap items-center gap-3 rounded border border-line bg-panel px-4 py-2.5">
      <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-accent">
        <span className="pulse-dot" aria-hidden /> Sandbox
      </span>
      <Select value={subjectId ?? ''} onChange={(e) => onMateria(e.target.value)} className="w-auto min-w-40" aria-label="Matéria">
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <span className="flex items-center gap-1.5 rounded border border-line bg-bg px-2.5 py-1 text-[11px] text-accent" title="O código não roda: a correção imita este compilador lendo o código">
        <Cpu size={12} /> {CANAL_COMPILADOR[linguagem] ?? CANAL_COMPILADOR['']}
      </span>
      <div className="ml-auto flex items-center gap-2">
        {desafioId && <Cronometro chave={desafioId} />}
        <Button onClick={onHistorico}>
          <History size={13} /> Histórico
        </Button>
      </div>
    </header>
  );
}
