import { useMemo, useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import type { Id } from '../domain/types';
import { useStudy } from '../store/study';
import { LANGUAGES, SUBJECT_COLORS } from '../domain/catalog';
import { Button, Input, Label, Modal, Select } from './ui';

/** Select de tópico agrupado por matéria. */
export function TopicSelect({ value, onChange, allowEmpty }: { value?: Id; onChange: (id: Id | undefined) => void; allowEmpty?: string }) {
  const subjects = useStudy((s) => s.subjects);
  const topics = useStudy((s) => s.topics);
  return (
    <Select value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)}>
      <option value="">{allowEmpty ?? '— escolha um tópico —'}</option>
      {subjects.map((sub) => (
        <optgroup key={sub.id} label={sub.name}>
          {topics
            .filter((t) => t.subjectId === sub.id)
            .map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
        </optgroup>
      ))}
    </Select>
  );
}

export function SubjectModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const addSubject = useStudy((s) => s.addSubject);
  const count = useStudy((s) => s.subjects.length);
  const [name, setName] = useState('');
  const [language, setLanguage] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    addSubject({ name: name.trim(), language, color: SUBJECT_COLORS[count % SUBJECT_COLORS.length] });
    setName('');
    setLanguage('');
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Nova matéria">
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <Label>Nome</Label>
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: C#, Cálculo II, Linguagens Formais" />
        </label>
        <label className="block">
          <Label>Linguagem dos desafios no Sandbox</Label>
          <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </Select>
        </label>
        <Button type="submit" variant="primary" className="w-full">
          Criar matéria
        </Button>
      </form>
    </Modal>
  );
}

/** Formulário pra criar tópico. Devolve o id criado. */
export function TopicModal({
  open,
  onClose,
  onCreated,
  defaultSubjectId,
  defaultParentId,
}: {
  open: boolean;
  onClose: () => void;
  onCreated?: (id: Id) => void;
  defaultSubjectId?: Id;
  defaultParentId?: Id;
}) {
  const subjects = useStudy((s) => s.subjects);
  const topics = useStudy((s) => s.topics);
  const addTopic = useStudy((s) => s.addTopic);
  const [subjectId, setSubjectId] = useState<Id>(defaultSubjectId ?? '');
  const [parentId, setParentId] = useState<Id>(defaultParentId ?? '');
  const [title, setTitle] = useState('');
  const [subjectModal, setSubjectModal] = useState(false);

  const effectiveSubject = subjectId || defaultSubjectId || subjects[0]?.id || '';
  const parents = useMemo(() => topics.filter((t) => t.subjectId === effectiveSubject), [topics, effectiveSubject]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !effectiveSubject) return;
    const id = addTopic({ subjectId: effectiveSubject, title, parentId: parentId || undefined });
    setTitle('');
    onCreated?.(id);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Novo tópico">
      {subjects.length === 0 ? (
        <div className="space-y-3 text-sm">
          <p>Primeiro crie uma matéria. Os tópicos ficam dentro dela.</p>
          <Button variant="primary" onClick={() => setSubjectModal(true)}>
            <Plus size={14} /> Criar matéria
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <Label>Matéria</Label>
            <div className="flex gap-2">
              <Select value={effectiveSubject} onChange={(e) => { setSubjectId(e.target.value); setParentId(''); }}>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
              <Button onClick={() => setSubjectModal(true)} title="Nova matéria">
                <Plus size={14} />
              </Button>
            </div>
          </label>
          <label className="block">
            <Label>O que você vai aprender</Label>
            <Input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex.: Encapsulamento, Derivadas parciais, AFD" />
          </label>
          <label className="block">
            <Label>Depende de (pré-requisito na árvore)</Label>
            <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
              <option value="">— nenhum (sai direto da matéria) —</option>
              {parents.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </Select>
          </label>
          <Button type="submit" variant="primary" className="w-full">
            Criar tópico
          </Button>
        </form>
      )}
      <SubjectModal open={subjectModal} onClose={() => setSubjectModal(false)} />
    </Modal>
  );
}
