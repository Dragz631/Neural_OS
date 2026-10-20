import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { resumirMaterias } from '../../domain/materias';
import { useNav } from '../../store/nav';
import { useStudy } from '../../store/study';
import { SubjectModal } from '../../components/TopicPicker';
import { ProgressBar } from '../../components/ui';

/** Um cartão por matéria: progresso, nível e o próximo tópico (clique leva direto). */
export function FaixaMaterias() {
  const subjects = useStudy((s) => s.subjects);
  const topics = useStudy((s) => s.topics);
  const sessions = useStudy((s) => s.sessions);
  const go = useNav((s) => s.go);
  const [nova, setNova] = useState(false);
  const resumos = useMemo(() => resumirMaterias(subjects, topics, sessions), [subjects, topics, sessions]);

  return (
    <div className="flex gap-3 overflow-x-auto pb-1">
      {resumos.map(({ subject, total, dominados, nivel, proximo }) => (
        <button
          key={subject.id}
          type="button"
          onClick={() => (proximo ? go('professor', proximo.id) : go('arvore'))}
          className="w-56 shrink-0 rounded border border-line bg-panel p-3 text-left hover:border-accent"
          style={{ borderLeft: `3px solid ${subject.color}` }}
        >
          <div className="flex items-baseline justify-between">
            <span className="truncate font-bold" style={{ color: subject.color }}>
              {subject.name}
            </span>
            <span className="text-[10px] text-muted">nv {nivel}</span>
          </div>
          <p className="my-1 text-[11px] text-muted">
            {dominados}/{total} tópicos dominados
          </p>
          <ProgressBar value={total ? (dominados / total) * 100 : 0} color={subject.color} />
          <p className="mt-1.5 truncate text-[11px]">{proximo ? `▸ próximo: ${proximo.title}` : total ? 'matéria dominada ✓' : 'sem tópicos ainda'}</p>
        </button>
      ))}
      <button
        type="button"
        onClick={() => setNova(true)}
        className="flex w-40 shrink-0 flex-col items-center justify-center gap-1 rounded border border-dashed border-line p-3 text-xs text-muted hover:border-accent hover:text-accent"
      >
        <Plus size={18} /> Nova matéria
      </button>
      <SubjectModal open={nova} onClose={() => setNova(false)} />
    </div>
  );
}
