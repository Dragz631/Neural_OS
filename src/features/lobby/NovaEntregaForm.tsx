import { useState, type FormEvent } from 'react';
import { Plus } from 'lucide-react';
import { addDays, toLocalDate } from '../../domain/dates';
import { CATEGORIA, XP_POR_TIPO, type CategoriaEntrega, type TipoEntrega } from '../../domain/entregas';
import { useEntregas } from '../../store/entregas';
import { useStudy } from '../../store/study';
import { Button, Input, Select } from '../../components/ui';


export function NovaEntregaForm() {
  const criar = useEntregas((s) => s.criar);
  const subjects = useStudy((s) => s.subjects);
  const [titulo, setTitulo] = useState('');
  const [tipo, setTipo] = useState<TipoEntrega>('trabalho');
  const [categoria, setCategoria] = useState<CategoriaEntrega>('estudos');
  const [prazo, setPrazo] = useState(addDays(toLocalDate(), 7));
  const [subjectId, setSubjectId] = useState('');
  const [tags, setTags] = useState('');

  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!titulo.trim()) return;
    criar({
      titulo: titulo.trim(),
      tipo,
      categoria,
      prazo: prazo || undefined,
      subjectId: subjectId || undefined,
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      xp: XP_POR_TIPO[tipo],
    });
    setTitulo('');
    setTags('');
  };

  return (
    <form onSubmit={enviar} className="grid gap-2 rounded border border-line bg-bg p-3 sm:grid-cols-6">
      <Input className="sm:col-span-6" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex.: Trabalho de POO — herança e polimorfismo" />
      <Select value={tipo} onChange={(e) => setTipo(e.target.value as TipoEntrega)}>
        <option value="trabalho">Trabalho</option>
        <option value="prova">Prova</option>
        <option value="exercicio">Exercícios</option>
        <option value="outro">Outro</option>
      </Select>
      <Select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaEntrega)}>
        {(Object.keys(CATEGORIA) as CategoriaEntrega[]).map((c) => (
          <option key={c} value={c}>
            {CATEGORIA[c].rotulo}
          </option>
        ))}
      </Select>
      <Select value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
        <option value="">— matéria —</option>
        {subjects.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </Select>
      <Input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
      <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="tags, separadas, por vírgula" />
      <Button type="submit" variant="primary" disabled={!titulo.trim()}>
        <Plus size={14} /> +{XP_POR_TIPO[tipo]} XP
      </Button>
    </form>
  );
}
