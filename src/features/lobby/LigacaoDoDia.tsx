import { BookmarkPlus, Check, GitMerge, GraduationCap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button, Input, Panel } from '../../components/ui';
import { toLocalDate } from '../../domain/dates';
import { escolherPar } from '../../domain/ligacao';
import type { Topic } from '../../domain/types';
import { gerarLigacao } from '../../services/ai/ligacao';
import { useFeed } from '../../store/feed';
import { useNav } from '../../store/nav';
import { useSettings } from '../../store/settings';
import { useStudy } from '../../store/study';

// Uma chamada por vez, fora do ciclo do componente: o StrictMode monta duas
// vezes e cancelaria a chamada no meio (aí o dia ficaria sem ligação).
let pedindo = false;

/** Ligação do dia: como dois tópicos de matérias diferentes conversam. */
export function LigacaoDoDia() {
  const hoje = toLocalDate();
  const aiOn = useSettings((s) => s.provider !== 'off');
  const ligacao = useFeed((s) => s.ligacao);
  const topics = useStudy((s) => s.topics);
  const subjects = useStudy((s) => s.subjects);
  const [, setPedindo] = useState(false);

  useEffect(() => {
    const ts = useStudy.getState().topics;
    let atual = useFeed.getState().ligacao;
    const valida = atual?.data === hoje && ts.some((t) => t.id === atual?.aId) && ts.some((t) => t.id === atual?.bId);
    if (!valida) {
      const par = escolherPar(ts, hoje);
      if (!par) return;
      atual = { data: hoje, aId: par.a.id, bId: par.b.id };
      useFeed.getState().setLigacao(atual);
    }
    if (!aiOn || atual?.texto || pedindo || !atual) return;
    const { aId, bId } = atual;
    const ponta = (id: string) => {
      const t = ts.find((x) => x.id === id)!;
      return { topico: t.title, materia: useStudy.getState().subjects.find((s) => s.id === t.subjectId)?.name ?? '' };
    };
    pedindo = true;
    setPedindo(true);
    gerarLigacao(ponta(aId), ponta(bId))
      .then((texto) => useFeed.getState().setLigacao({ data: hoje, aId, bId, texto }))
      .catch(() => undefined) // sem IA hoje: fica a pergunta "como X se liga a Y?"
      .finally(() => {
        pedindo = false;
        setPedindo(false);
      });
  }, [hoje, aiOn, topics.length]);

  const a = topics.find((t) => t.id === ligacao?.aId);
  const b = topics.find((t) => t.id === ligacao?.bId);
  const valida = ligacao?.data === hoje && a && b;

  return (
    <Panel title="Ligação do dia // conecta o que você sabe">
      {!valida ? (
        <p className="text-sm text-muted">Estude tópicos de duas matérias diferentes e aqui aparece, todo dia, como eles se ligam.</p>
      ) : (
        <Conteudo a={a} b={b} texto={ligacao.texto} materiaDe={(t) => subjects.find((s) => s.id === t.subjectId)?.name ?? ''} carregando={aiOn && !ligacao.texto && pedindo} />
      )}
    </Panel>
  );
}

function Conteudo({ a, b, texto, materiaDe, carregando }: { a: Topic; b: Topic; texto?: string; materiaDe: (t: Topic) => string; carregando: boolean }) {
  const go = useNav((s) => s.go);
  const [minha, setMinha] = useState('');
  const [salvo, setSalvo] = useState(false);

  const guardar = (frase: string) => {
    const { updateTopic, topics } = useStudy.getState();
    for (const [t, outro] of [
      [a, b],
      [b, a],
    ] as const) {
      const notas = topics.find((x) => x.id === t.id)?.notes ?? '';
      updateTopic(t.id, { notes: `${notas.trimEnd()}\n\n> Ligação com ${outro.title} (${materiaDe(outro)}): ${frase}\n` });
    }
    setSalvo(true);
  };

  return (
    <div className="space-y-3">
      <p className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
        <span className="text-accent">{a.title}</span>
        <span className="text-muted">({materiaDe(a)})</span>
        <GitMerge size={13} className="text-muted" />
        <span className="text-info">{b.title}</span>
        <span className="text-muted">({materiaDe(b)})</span>
      </p>
      {texto ? (
        <p className="text-sm leading-relaxed text-fg">{texto}</p>
      ) : (
        <p className="text-sm text-fg">{carregando ? 'O professor está ligando os pontos…' : `Como "${a.title}" se liga a "${b.title}"? Pense 1 minuto e escreva com as suas palavras.`}</p>
      )}
      {salvo ? (
        <p className="flex items-center gap-1 text-xs text-accent">
          <Check size={13} /> Guardado nas anotações dos dois tópicos.
        </p>
      ) : texto ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => go('professor', a.id)}>
            <GraduationCap size={13} /> Me explica
          </Button>
          <Button onClick={() => guardar(texto)}>
            <BookmarkPlus size={13} /> Guardar nas anotações
          </Button>
        </div>
      ) : (
        !carregando && (
          <div className="flex gap-2">
            <Input value={minha} onChange={(e) => setMinha(e.target.value)} placeholder="Os dois…" aria-label="Sua ligação" />
            <Button onClick={() => guardar(minha.trim())} disabled={minha.trim().length < 10}>
              Guardar
            </Button>
          </div>
        )
      )}
    </div>
  );
}
