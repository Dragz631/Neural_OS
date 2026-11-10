import { useState, type FormEvent } from 'react';
import { Sparkles, Wand2 } from 'lucide-react';
import { acharMapaPronto } from '../../data/mapas';
import { LANGUAGES } from '../../domain/catalog';
import type { MapaMateria, OrigemMapa } from '../../domain/mapa';
import { useAI } from '../../hooks/useAI';
import { gerarMapa } from '../../services/ai/mapa';
import { mapaManual, mapaSemIA } from '../../services/fontesMapa';
import { aplicarMapa } from '../../store/aplicarMapa';
import { montarTrilha } from '../../lib/trilha';
import { useImportacao } from '../../store/importacao';
import { useNav } from '../../store/nav';
import { useIALigada } from '../../store/conexoes';
import { useStudy } from '../../store/study';
import { toast } from '../../store/toast';
import { Badge, Button, ErrorNote, Input, Label, Modal, Select, Textarea } from '../../components/ui';
import { PreviaMapa } from './PreviaMapa';

const ROTULO_ORIGEM: Record<OrigemMapa, string> = {
  ia: 'montado pelo Prof. (IA)',
  pronto: 'mapa pronto do Neural-OS',
  importado: 'mapa que o Claude gerou',
  manual: 'começando do zero',
};

/** "Matéria em 1 frase": nome → mapa completo → você revisa → vira galho, Target e semana. */
export function NovaMateriaModal({
  open,
  onClose,
  nomeInicial = '',
  contextoInicial = '',
  onCriada,
}: {
  open: boolean;
  onClose: () => void;
  nomeInicial?: string;
  contextoInicial?: string;
  /** Avisa quem abriu (ex.: importação do Notion marca a disciplina como tratada). */
  onCriada?: (subjectId: string) => void;
}) {
  const aiOn = useIALigada();
  const { run, loading, error } = useAI();
  const [nome, setNome] = useState(nomeInicial);
  const [objetivo, setObjetivo] = useState('');
  const [contexto, setContexto] = useState(contextoInicial);
  const [mapa, setMapa] = useState<MapaMateria | null>(null);
  const [origem, setOrigem] = useState<OrigemMapa>('manual');
  const go = useNav((s) => s.go);

  const comIA = () =>
    run(async (signal) => {
      const { subjects, profile } = useStudy.getState();
      const m = await gerarMapa({ materia: nome, objetivo, contexto, materiasAtuais: subjects.map((s) => s.name), bio: profile.bio }, signal);
      setMapa(m);
      setOrigem('ia');
    });

  const semIA = async () => {
    const achado = await mapaSemIA(nome);
    setMapa(achado ? { ...achado.mapa, materia: nome, objetivo } : { ...mapaManual(nome), objetivo });
    setOrigem(achado?.origem ?? 'manual');
  };

  const montar = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    if (aiOn) await comIA();
    else await semIA();
  };

  const confirmar = () => {
    if (!mapa) return;
    const { subjectId, topicIds } = aplicarMapa({ ...mapa, materia: mapa.materia || nome, objetivo });
    // O material colado (ou vindo do Notion/NotebookLM) continua servindo: alimenta os cartões da matéria.
    if (contexto.trim()) useImportacao.getState().juntarContexto(subjectId, contexto.trim());
    // O que você acabou de dizer que quer aprender vira o Target, e o professor já monta a trilha (roadmap).
    if (topicIds[0]) useStudy.getState().setTarget({ ...useStudy.getState().target, topicId: topicIds[0] });
    if (aiOn) montarTrilha(subjectId);
    onCriada?.(subjectId);
    toast({ title: `${mapa.materia} criada`, description: `${topicIds.length} tópicos na Árvore. Próximo passo: ${mapa.topicos[0].titulo}`, variant: 'success' });
    setMapa(null);
    setNome('');
    setObjetivo('');
    setContexto('');
    onClose();
    go('arvore');
  };

  const temPronto = !!acharMapaPronto(nome);

  return (
    <Modal open={open} onClose={onClose} title="Nova matéria // o Prof. monta o caminho" wide>
      {!mapa ? (
        <form onSubmit={montar} className="space-y-3">
          <label className="block">
            <Label>O que você quer aprender?</Label>
            <Input autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: SQL, Cybersecurity, Estrutura de Dados" />
          </label>
          <label className="block">
            <Label>Pra quê? (opcional — ajuda a escolher o caminho)</Label>
            <Input value={objetivo} onChange={(e) => setObjetivo(e.target.value)} placeholder="Ex.: estágio em backend, prova da faculdade, curiosidade" />
          </label>
          <label className="block">
            <Label>Material de base (opcional): ementa, anotações do Notion, resumo do NotebookLM</Label>
            <Textarea rows={3} value={contexto} onChange={(e) => setContexto(e.target.value)} placeholder="Cole aqui e o professor segue a sua ordem." />
          </label>
          <ErrorNote error={error} />
          {error && (
            <Button onClick={semIA}>Usar mapa pronto ou começar do zero</Button>
          )}
          <Button type="submit" variant="primary" className="w-full" disabled={!nome.trim() || loading}>
            {aiOn ? <Sparkles size={14} /> : <Wand2 size={14} />} {loading ? 'O professor está montando o mapa…' : 'Montar o mapa'}
          </Button>
          {!aiOn && <p className="text-[11px] text-muted">Sem IA: uso um mapa pronto se existir ({temPronto ? 'tem pra essa' : 'não tem pra essa ainda'}), um que o Claude gerou pra você, ou começo do zero pra você editar.</p>}
        </form>
      ) : (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input value={mapa.materia} onChange={(e) => setMapa({ ...mapa, materia: e.target.value })} className="max-w-xs font-bold" />
            <Badge color="var(--color-info)">{ROTULO_ORIGEM[origem]}</Badge>
            <Select value={mapa.linguagem} onChange={(e) => setMapa({ ...mapa, linguagem: e.target.value })} className="w-auto">
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </Select>
          </div>
          <p className="text-xs text-muted">Revise o caminho: renomeie, mova ou tire o que não quiser. Os tópicos aparecem trancados na Árvore até chegar a vez.</p>
          <PreviaMapa mapa={mapa} onChange={setMapa} />
          <ErrorNote error={error} />
          <div className="flex flex-wrap gap-2">
            {aiOn && origem !== 'ia' && (
              <Button onClick={comIA} disabled={loading}>
                <Sparkles size={13} /> {loading ? 'Montando…' : 'Montar com IA'}
              </Button>
            )}
            {origem === 'ia' && temPronto && <Button onClick={semIA}>Ver o mapa pronto</Button>}
            <Button onClick={() => setMapa(null)}>Voltar</Button>
            <Button variant="primary" className="ml-auto" onClick={confirmar} disabled={mapa.topicos.length < 2 || !mapa.materia.trim()}>
              Criar matéria ({mapa.topicos.length} tópicos)
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
