import { BookOpenCheck, Sparkles } from 'lucide-react';
import { adaptarTrilha, useConferirNotebook } from '../lib/notebookVivo';
import { useIALigada } from '../store/conexoes';
import { useFaculdade } from '../store/faculdade';
import { useStudy } from '../store/study';
import { useTarefa } from '../store/tarefas';
import { Button } from './ui';

/** "Chegaram 2 slides novos em Estatística: … [Adaptar a trilha] [Depois]". Uma ação só. */
export function NovidadesNotebook({ subjectId }: { subjectId?: string }) {
  useConferirNotebook();
  const novas = useFaculdade((s) => s.fontesNovas);
  const adiado = useFaculdade((s) => s.adiadoAte);
  const subjects = useStudy((s) => s.subjects);
  const agora = Date.now();
  const lista = Object.entries(novas).filter(([id, f]) => f.length && (!subjectId || id === subjectId) && !((adiado[id] ?? 0) > agora) && subjects.some((s) => s.id === id));
  if (!lista.length) return null;
  return (
    <div className="space-y-2">
      {lista.map(([id, fontes]) => (
        <Aviso key={id} subjectId={id} nome={subjects.find((s) => s.id === id)?.name ?? ''} titulos={fontes.map((f) => f.titulo)} />
      ))}
    </div>
  );
}

function Aviso({ subjectId, nome, titulos }: { subjectId: string; nome: string; titulos: string[] }) {
  const aiOn = useIALigada();
  const { rodando, erro } = useTarefa(`adaptar:${subjectId}`);
  const n = titulos.length;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded border border-info/60 bg-info/5 p-3">
      <BookOpenCheck size={18} className="shrink-0 text-info" />
      <div className="min-w-0 flex-1 text-sm">
        <p>
          <b className="text-info">
            {n > 1 ? `Chegaram ${n} slides novos` : 'Chegou 1 slide novo'} em {nome}
          </b>
          : <span className="text-muted">{titulos.slice(0, 3).join(', ')}{n > 3 ? '…' : ''}</span>
        </p>
        <p className="text-[11px] text-muted">O professor acrescenta na trilha e cria os tópicos novos, sem apagar nada do que você já fez.</p>
        {erro && <p className="text-[11px] text-warn">{erro}</p>}
      </div>
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => adaptarTrilha(subjectId)} disabled={!aiOn || rodando} title={aiOn ? '' : 'Ative a IA nas configurações'}>
          <Sparkles size={14} /> {rodando ? 'Adaptando… (pode sair da aba)' : 'Adaptar a trilha'}
        </Button>
        {!rodando && <Button onClick={() => useFaculdade.getState().adiarAviso(subjectId)}>Depois</Button>}
      </div>
    </div>
  );
}
