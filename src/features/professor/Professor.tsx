import { Orbe } from '../../components/Orbe';
import { useEffect, useMemo, useState } from 'react';
import { FileDown, PenLine, Shapes, Sparkles, Trash2 } from 'lucide-react';
import { formatShort } from '../../domain/dates';
import { isDue } from '../../domain/srs';
import type { Id, Lesson, Topic } from '../../domain/types';
import { toast } from '../../store/toast';
import { gerarCena } from '../../services/ai/cena';
import { generateLesson, type TopicContext } from '../../services/ai/professor';
import { exportTopic } from '../../services/vault';
import { useNav } from '../../store/nav';
import { rodarTarefa, useTarefa } from '../../store/tarefas';
import { useIALigada } from '../../store/conexoes';
import { topicPath, useStudy } from '../../store/study';
import { TopicModal, TopicSelect } from '../../components/TopicPicker';
import { Badge, Button, Empty, ErrorNote, Label, Modal, Panel, Textarea } from '../../components/ui';
import { cn } from '../../lib/utils';
import { QuadroProfessor } from './QuadroProfessor';
import { QuadroLivre } from './QuadroLivre';
import { ProgressoAula } from './ProgressoAula';
import { useRascunhos } from '../../store/rascunhos';
import { RevisaoGuiada } from '../revisao/RevisaoGuiada';
import { RoadmapPanel } from './RoadmapPanel';
import { ChatProfessor } from './ChatProfessor';
import { TermometroAula } from './TermometroAula';
import { ProvaPanel } from './ProvaPanel';
import { ComecarFoco } from '../../components/Foco';
import { NovidadesNotebook } from '../../components/NovidadesNotebook';
import { BotaoTraveiBase } from '../../components/GavetaBase';
import { useGavetaBase } from '../../store/gavetaBase';
import { useBases } from '../../store/bases';
import { tirarDaAula } from '../../store/aulaJunto';
import { apagarMateria, resumoDaMateria } from '../../store/apagarMateria';
import { Select } from '../../components/ui';

/** Junta tudo que a IA precisa saber sobre você neste tópico. */
function useTopicContext(topic?: Topic): TopicContext | undefined {
  const subjects = useStudy((s) => s.subjects);
  const topics = useStudy((s) => s.topics);
  const sessions = useStudy((s) => s.sessions);
  return useMemo(() => {
    if (!topic) return undefined;
    const parents: Topic[] = [];
    let p = topics.find((t) => t.id === topic.parentId);
    while (p && parents.length < 5) {
      parents.push(p);
      p = topics.find((t) => t.id === p!.parentId);
    }
    return { topic, subject: subjects.find((s) => s.id === topic.subjectId), parents, sessions: sessions.filter((s) => s.topicId === topic.id) };
  }, [topic, subjects, topics, sessions]);
}

export default function Professor() {
  const navTopicId = useNav((s) => s.topicId);
  const targetTopicId = useStudy((s) => s.target.topicId);
  // Abre sempre no último tópico em que a pessoa estava (mesmo depois de sair da aba ou recarregar).
  const [topicId, setTopicId] = useState<Id | undefined>(() => navTopicId ?? useRascunhos.getState().ultimoTopico ?? targetTopicId);
  const topic = useStudy((s) => s.topics.find((t) => t.id === topicId));
  const subjects = useStudy((s) => s.subjects);
  const [newTopicOpen, setNewTopicOpen] = useState(false);
  const [fechando, setFechando] = useState(false);
  /** Tópico em que ele escolheu "reler mesmo assim" (vale só pra esse tópico, nesta visita). */
  const [releu, setReleu] = useState<Id | undefined>();
  const [visao, setVisao] = useState<'aula' | 'roadmap'>('aula');
  const ctxChat = useTopicContext(topic);
  const emProva = useRascunhos((s) => !!topic && s.provaAberta === topic.id);
  const [materiaRM, setMateriaRM] = useState<Id | undefined>();
  // Matéria em foco: a escolhida no roadmap, senão a do tópico aberto, senão a primeira.
  const materiaId = materiaRM ?? topic?.subjectId ?? subjects[0]?.id;
  const materia = subjects.find((s) => s.id === materiaId);
  // Revisão vencida volta como PERGUNTA, não como releitura: o quadro espera até ele tentar lembrar.
  const revisaoPrimeiro = !!topic?.lastStudiedAt && !!topic.lesson && isDue(topic.review) && releu !== topic.id;

  const apagar = () => {
    if (!materia) return;
    const r = resumoDaMateria(materia.id);
    const o = `Apagar a matéria "${materia.name}"?

Vai junto: ${r.topicos} tópico(s) com aulas e anotações, ${r.lousas} lousa(s)${r.temRoadmap ? ' e o roadmap' : ''}.
Não dá pra desfazer (faça um backup em Configurações se tiver dúvida).`;
    if (!confirm(o)) return;
    apagarMateria(materia.id);
    setTopicId(undefined);
    setMateriaRM(undefined);
    toast({ title: `Matéria "${materia.name}" apagada.` });
  };

  const escolher = (id?: Id) => {
    setTopicId(id);
    setMateriaRM(undefined);
    if (id) {
      useRascunhos.getState().lembrarTopico(id);
      useNav.setState({ topicId: id });
    }
  };

  // Se outra aba mandou abrir um tópico específico, segue ela.
  useEffect(() => {
    if (navTopicId) {
      setTopicId(navTopicId);
      useRascunhos.getState().lembrarTopico(navTopicId);
    }
  }, [navTopicId]);

  return (
    <div className="mx-auto max-w-[1500px] space-y-4 p-4">
      <Panel>
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-[240px] flex-1">
            <Label>Aula de hoje</Label>
            <TopicSelect value={topicId} onChange={escolher} />
          </label>
          <Button onClick={() => setNewTopicOpen(true)}>+ Novo tópico</Button>
          {topic && <ComecarFoco topicId={topic.id} />}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {([['aula', 'Aula'], ['roadmap', 'Roadmap']] as const).map(([id, rotulo]) => (
            <button
              key={id}
              type="button"
              onClick={() => setVisao(id)}
              className={cn('fonte-titulo rounded border px-3 py-1 text-[10px] uppercase tracking-widest', visao === id ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:text-fg')}
            >
              {rotulo}
            </button>
          ))}
          {visao === 'roadmap' && subjects.length > 1 && (
            <Select value={materiaId ?? ''} onChange={(e) => setMateriaRM(e.target.value || undefined)} className="max-w-[220px]">
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          )}
          {materia && (
            <Button variant="danger" className="ml-auto px-2 py-1 text-[10px]" onClick={apagar} title="Apaga a matéria inteira: tópicos, lousas e roadmap">
              <Trash2 size={12} /> Apagar matéria
            </Button>
          )}
        </div>
        {topic && (
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted">
            <span>{topicPath(subjects, topic)}</span>
            <Badge>domínio {topic.mastery}%</Badge>
            {topic.lastStudiedAt && (isDue(topic.review) ? <Badge color="var(--color-warn)">revisão vencida</Badge> : <Badge>próxima revisão {formatShort(topic.review.due)}</Badge>)}
          </div>
        )}
      </Panel>

      <NovidadesNotebook subjectId={materia?.id} />

      {visao === 'roadmap' ? (
        materia ? (
          <RoadmapPanel
            key={materia.id}
            subjectId={materia.id}
            onEstudar={(id) => {
              escolher(id);
              setVisao('aula');
            }}
          />
        ) : (
          <Empty>Crie uma matéria primeiro (botão "+ Novo tópico") pra o professor montar o roadmap dela.</Empty>
        )
      ) : !topic ? (
        <Empty>Escolha um tópico (ou crie um) pra o Prof. A.Ilson preparar o quadro.</Empty>
      ) : emProva ? (
        <>
          {/* Prova "sem olhar": a aula, as anotações e o chat somem até entregar ou desistir. */}
          <Panel>
            <p className="text-sm text-muted">
              A aula, as suas anotações e o chat estão escondidos durante a prova. Ninguém aprende copiando: escreva o que <b className="text-fg">você</b> lembra.
            </p>
          </Panel>
          <ProvaPanel key={`prova-${topic.id}`} topic={topic} ctx={ctxChat} />
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
            {revisaoPrimeiro ? (
              <section className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded border-4 border-warn/50 bg-panel-2 p-6 text-center">
                <p className="fonte-titulo text-[10px] uppercase tracking-[0.3em] text-warn">Revisão vencida</p>
                <h2 className="text-xl font-bold text-fg">{topic.title}</h2>
                <p className="max-w-md text-sm text-muted">
                  Antes de reler, <b className="text-fg">tenta lembrar</b>. Puxar da memória sozinho é o que fixa; reler dá a sensação de que sabe, mas não treina. São 3 perguntas, uns 5 min.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Button
                    variant="primary"
                    onClick={() => {
                      setFechando(true);
                      setTimeout(() => document.getElementById('revisao-relampago')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
                    }}
                  >
                    Começar pela revisão
                  </Button>
                  <Button onClick={() => setReleu(topic.id)}>Reler a aula mesmo assim</Button>
                </div>
              </section>
            ) : (
              <Blackboard key={topic.id} topic={topic} />
            )}
            <div className="space-y-4">
              {!revisaoPrimeiro && <NotesPanel topic={topic} />}
              {/* O último passo: fechar a aula com uma revisão curta. Fica recolhido até a pessoa chamar. */}
              <div id="revisao-relampago" className={cn('rounded border bg-panel', revisaoPrimeiro ? 'border-warn' : 'border-line')}>
                <button type="button" onClick={() => setFechando((v) => !v)} className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left" aria-expanded={fechando}>
                  <span>
                    <span className="fonte-titulo block text-[10px] uppercase tracking-[0.25em] text-accent">Fechar a aula</span>
                    <span className="text-xs text-muted">Revisão relâmpago: 3 perguntas, uns 5 min. Fixa o que você acabou de ver.</span>
                  </span>
                  <span className="text-accent">{fechando ? '−' : '+'}</span>
                </button>
                {/* Mantém montado (escondido) pra revisão em andamento não se perder ao recolher. */}
                <div className={fechando ? 'border-t border-line p-2' : 'hidden'}>
                  <RevisaoGuiada key={`revisao-${topic.id}`} topic={topic} compacto />
                </div>
              </div>
            </div>
          </div>
          <ProvaPanel key={`prova-${topic.id}`} topic={topic} ctx={ctxChat} />
        </>
      )}

      {visao === 'aula' && topic && !emProva && !revisaoPrimeiro && <ChatProfessor key={topic.id} topic={topic} ctx={ctxChat} />}
      <TopicModal open={newTopicOpen} onClose={() => setNewTopicOpen(false)} onCreated={escolher} />
    </div>
  );
}

/**
 * Desenha a aula salva do tópico (segunda chamada). Lê a aula mais nova do store na hora de gravar,
 * pra não atropelar o que você editou enquanto ele desenhava. Falha do desenho não derruba a aula.
 */
async function desenharNaAula(ctx: TopicContext, topicId: Id, signal: AbortSignal): Promise<boolean> {
  const atual = () => useStudy.getState().topics.find((t) => t.id === topicId)?.lesson;
  const l = atual();
  if (!l) return false;
  let cena: Lesson['cena'];
  try {
    cena = await gerarCena(ctx, l, signal);
  } catch (e) {
    if (signal.aborted) throw e;
    return false;
  }
  const agora = atual();
  if (!cena || !agora) return false;
  useStudy.getState().setLesson(topicId, { ...agora, cena, generatedAt: new Date().toISOString() });
  return true;
}

function Blackboard({ topic }: { topic: Topic }) {
  const ctx = useTopicContext(topic);
  const aiOn = useIALigada();
  // A aula roda como tarefa: trocar de aba não cancela, o resultado é gravado quando chega.
  const chave = `aula:${topic.id}`;
  const { rodando: loading, erro: error } = useTarefa(chave);
  const [editing, setEditing] = useState(false);
  const lesson = topic.lesson;
  const baseGuardada = useBases((s) => s.bases.find((b) => b.topicId === topic.id));

  const [aba, setAba] = useState<'prof' | 'livre'>('prof');
  const emAndamento = !!lesson && !lesson.concluidaEm && (Object.values(lesson.progresso ?? {}).some(Boolean) || !!lesson.minis?.some((m) => m.ok));
  const [pedindo, setPedindo] = useState(false);
  const [pedido, setPedido] = useState('');
  /**
   * Sem pedido: aula do zero (progresso dos passos recomeça). Com pedido ("mais curto", "foca em X"):
   * a aula atual é a base, e o progresso fica. O que foi montado junto no chat sempre fica.
   */
  const [chute, setChute] = useState('');
  const generate = (comPedido?: string, comChute?: string) => {
    const p = comPedido?.trim();
    const ch = comChute?.trim();
    // O chute fica no diário: dá pra comparar depois com o que a aula ensinou.
    if (ch) useStudy.getState().addDiario(topic.id, { tipo: 'conceito', original: `Chute antes da aula: ${ch}` });
    setChute('');
    if (!p && emAndamento && !window.confirm('Você está no meio desta aula. Reescrever do zero apaga o progresso dos passos e dos minidesafios (as suas anotações e o que vocês montaram junto ficam). Continuar?')) return;
    const c = ctx!;
    setPedindo(false);
    setPedido('');
    void rodarTarefa(chave, { rotulo: p ? `Professor reescrevendo ${topic.title}: ${p.slice(0, 30)}` : `Professor preparando a aula de ${topic.title}`, aba: 'professor', topicId: topic.id, avisarPronto: `Aula de ${topic.title} pronta` }, async (signal) => {
      const antes = useStudy.getState().topics.find((t) => t.id === topic.id)?.lesson;
      const nova = await generateLesson(c, signal, p && antes ? { pedido: p, aulaAtual: antes } : undefined, ch);
      const agora = useStudy.getState().topics.find((t) => t.id === topic.id)?.lesson;
      const l = { ...nova, ...(agora?.extras?.length ? { extras: agora.extras } : {}), ...(p && agora ? { progresso: agora.progresso, minis: agora.minis?.length ? agora.minis : nova.minis } : {}) };
      // O texto entra já: se o desenho falhar ou for cancelado, a aula não se perde.
      useStudy.getState().setLesson(topic.id, l);
      // A aula nova já usa os slides novos: o selo "material novo" sai.
      useStudy.getState().updateTopic(topic.id, { materialNovo: undefined });
      await desenharNaAula(c, topic.id, signal);
    });
  };
  /** Mesmo conteúdo, outro jeito de desenhar: entra ao lado, sem apagar o que já está no quadro. */
  const redesenhar = () => {
    const c = ctx!;
    void rodarTarefa(chave, { rotulo: `Professor redesenhando ${topic.title}`, aba: 'professor', topicId: topic.id }, async (signal) => {
      const ok = await desenharNaAula(c, topic.id, signal);
      if (!ok) throw new Error('o professor não conseguiu desenhar de outro jeito agora, tente de novo');
    });
  };

  return (
    <section className="min-w-0 rounded border-4 border-line bg-panel-2 p-3 shadow-[inset_0_0_60px_rgba(0,0,0,0.6)] md:p-5">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
        <div className="flex items-center gap-3">
          <Orbe estado={loading ? 'thinking' : 'idle'} tamanho={64} />
          <div>
            <p className="fonte-titulo text-[10px] uppercase tracking-[0.3em] text-muted">Quadro do Prof. A.Ilson</p>
            <h2 className="text-xl font-bold text-fg">{topic.title}</h2>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setPedindo((v) => !v)} disabled={!aiOn || loading} title={aiOn ? '' : 'Ative a IA nas configurações'}>
            <Sparkles size={14} /> {loading ? 'Escrevendo…' : lesson ? 'Reescrever com IA' : 'Gerar aula com IA'}
          </Button>
          {lesson && (
            <Button onClick={redesenhar} disabled={!aiOn || loading} title="Mesmo conteúdo, desenhado de outro jeito">
              <Shapes size={14} /> Desenhar de outro jeito
            </Button>
          )}
          <Button onClick={() => setEditing(true)}>
            <PenLine size={14} /> {lesson ? 'Editar' : 'Escrever eu mesmo'}
          </Button>
          {aiOn && <BotaoTraveiBase topicId={topic.id} />}
        </div>
      </header>

      <ErrorNote error={error} />

      {pedindo && !lesson && !loading && (
        <form
          className="mb-3 space-y-2 rounded border border-info/50 bg-info/5 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            generate(undefined, chute);
          }}
        >
          <p className="text-sm text-fg">
            Antes da aula, um chute: <b>o que você acha que é {topic.title}?</b>
          </p>
          <p className="text-[11px] text-muted">1 frase, do seu jeito. Errar aqui é ótimo: o professor começa a aula pelo seu chute, e ver onde errou fixa mais do que só ler.</p>
          <input value={chute} onChange={(e) => setChute(e.target.value)} autoFocus placeholder="acho que é…" className="w-full rounded border border-line bg-bg px-2 py-1.5 text-sm text-fg" />
          <div className="flex gap-2">
            <Button variant="primary" type="submit" disabled={!chute.trim()}>
              <Sparkles size={14} /> Chutei, gera a aula
            </Button>
            <Button onClick={() => generate()}>Pular o chute</Button>
          </div>
        </form>
      )}

      {pedindo && lesson && !loading && (
        <form
          className="mb-3 space-y-2 rounded border border-accent/50 bg-accent/5 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            if (pedido.trim()) generate(pedido);
          }}
        >
          <p className="text-xs text-fg">O que mudar na aula? O professor parte desta aula e mexe só no que você pedir (o seu progresso fica).</p>
          <div className="flex flex-wrap gap-1.5">
            {['Mais fácil', 'Mais curta', 'Com mais exemplos', 'Mais desenho, menos texto'].map((a) => (
              <button key={a} type="button" onClick={() => generate(a)} className="rounded border border-line px-2 py-1 text-[11px] hover:border-accent hover:text-accent">
                {a}
              </button>
            ))}
          </div>
          <div className="flex gap-1.5">
            <input value={pedido} onChange={(e) => setPedido(e.target.value)} placeholder='ex.: "foca em probabilidade condicional"' className="min-w-0 flex-1 rounded border border-line bg-bg px-2 py-1.5 text-sm text-fg" />
            <Button variant="primary" type="submit" disabled={!pedido.trim()}>
              Reescrever
            </Button>
          </div>
          <button type="button" onClick={() => generate()} className="text-[11px] text-muted underline hover:text-fg">
            ou reescrever do zero
          </button>
        </form>
      )}

      {lesson && !!topic.materialNovo?.length && !loading && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-info/60 bg-info/5 p-2 text-xs">
          <span className="rounded bg-info/20 px-1.5 py-0.5 text-[9px] uppercase tracking-wider text-info">material novo</span>
          <span className="min-w-0 flex-1 text-muted">Chegou slide sobre isto: {topic.materialNovo.join(', ')}.</span>
          <Button className="px-2 py-1 text-[10px]" onClick={() => generate(`Acrescente o que o slide novo traz (${topic.materialNovo!.join(', ')}), usando ele como fonte`)} disabled={!aiOn}>
            <Sparkles size={12} /> Atualizar a aula com ele
          </Button>
        </div>
      )}

      {baseGuardada && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded border border-info/60 bg-info/5 p-2 text-xs">
          <span className="min-w-0 flex-1 text-muted">
            Você travou nesta base em {new Date(baseGuardada.criadaEm).toLocaleDateString('pt-BR')}
            {baseGuardada.deTopico ? ` (na aula de ${baseGuardada.deTopico})` : ''}. A explicação desenhada ficou guardada.
          </span>
          <Button className="px-2 py-1 text-[10px]" onClick={() => useGavetaBase.getState().abrir({ baseId: baseGuardada.id })}>
            Rever desenhado
          </Button>
        </div>
      )}

      {!lesson && (
        <p className="mb-3 text-sm text-muted">
          {aiOn ? 'Peça a aula: o professor desenha no quadro (e lê suas anotações e seu histórico). O quadro já é seu pra anotar.' : 'Sem IA: escreva a aula você mesmo, ou conecte um modelo. O quadro já é seu pra anotar.'}
        </p>
      )}
      {lesson && ctx && <ProgressoAula topic={topic} lesson={lesson} ctx={ctx} />}

      <div className="mb-2 flex gap-1.5">
        {([['prof', 'Quadro do professor'], ['livre', 'Meu quadro livre']] as const).map(([id, rotulo]) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            className={cn('fonte-titulo rounded border px-3 py-1 text-[10px] uppercase tracking-widest', aba === id ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:text-fg')}
          >
            {rotulo}
          </button>
        ))}
      </div>
      {/* Só o quadro ativo monta (Excalidraw escondido abre em branco). O desenho de cada um fica salvo. */}
      {aba === 'prof' ? <QuadroProfessor topic={topic} lesson={lesson} /> : <QuadroLivre topic={topic} />}
      {aba === 'prof' && lesson && <TermometroAula topic={topic} lesson={lesson} />}
      {lesson && !!lesson.extras?.length && <MontadoJunto topic={topic} lesson={lesson} />}

      <LessonEditor key={lesson?.generatedAt ?? 'new'} open={editing} onClose={() => setEditing(false)} topic={topic} />
    </section>
  );
}

/** O que o aluno montou junto com o professor no chat ("Pôr na aula"): parte da aula, embaixo do quadro. */
function MontadoJunto({ topic, lesson }: { topic: Topic; lesson: Lesson }) {
  return (
    <div className="mt-4 space-y-2">
      <p className="fonte-titulo text-[10px] uppercase tracking-[0.25em] text-accent">Montado junto ({lesson.extras!.length})</p>
      {lesson.extras!.map((e) => (
        <div key={e.id} className="rounded border border-line bg-panel p-3 text-sm">
          <div className="mb-1 flex items-start gap-2">
            <p className="min-w-0 flex-1 text-[11px] text-muted">
              você pediu: <span className="text-fg">{e.de}</span>
            </p>
            {e.cena && (
              <button type="button" onClick={() => useRascunhos.getState().porNoQuadro(topic.id, e.de.slice(0, 60), e.cena!)} className="flex shrink-0 items-center gap-1 text-[10px] text-accent hover:underline" title="Desenhar no quadro do professor">
                <Shapes size={11} /> Pôr no quadro
              </button>
            )}
            <button type="button" onClick={() => confirm('Tirar este pedaço da aula?') && tirarDaAula(topic.id, e.id)} className="shrink-0 text-muted hover:text-danger" title="Tirar da aula">
              <Trash2 size={12} />
            </button>
          </div>
          <p className="whitespace-pre-wrap leading-relaxed text-fg">{e.texto}</p>
        </div>
      ))}
    </div>
  );
}

/** Edição manual: cada lista é uma linha por item. */
function LessonEditor({ open, onClose, topic }: { open: boolean; onClose: () => void; topic: Topic }) {
  const setLesson = useStudy((s) => s.setLesson);
  const l = topic.lesson;
  const [explanation, setExplanation] = useState(l?.explanation ?? '');
  const [keyPoints, setKeyPoints] = useState(l?.keyPoints.join('\n') ?? '');
  const [videos, setVideos] = useState(l?.videoSearches.join('\n') ?? topic.title);
  const [where, setWhere] = useState(l?.whereToResearch.join('\n') ?? '');
  const [tips, setTips] = useState(l?.tips.join('\n') ?? '');
  const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);

  const save = () => {
    setLesson(topic.id, {
      ...(l ? { progresso: l.progresso, minis: l.minis, extras: l.extras } : {}),
      explanation,
      keyPoints: lines(keyPoints),
      videoSearches: lines(videos),
      whereToResearch: lines(where),
      tips: lines(tips),
      generatedAt: new Date().toISOString(),
      source: 'manual',
    });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Escrever no quadro" wide>
      <div className="space-y-3">
        <label className="block">
          <Label>Explicação</Label>
          <Textarea rows={6} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
        </label>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <Label>Pontos-chave (um por linha)</Label>
            <Textarea rows={4} value={keyPoints} onChange={(e) => setKeyPoints(e.target.value)} />
          </label>
          <label className="block">
            <Label>Buscas no YouTube (uma por linha)</Label>
            <Textarea rows={4} value={videos} onChange={(e) => setVideos(e.target.value)} />
          </label>
          <label className="block">
            <Label>Onde pesquisar</Label>
            <Textarea rows={4} value={where} onChange={(e) => setWhere(e.target.value)} />
          </label>
          <label className="block">
            <Label>Dicas</Label>
            <Textarea rows={4} value={tips} onChange={(e) => setTips(e.target.value)} />
          </label>
        </div>
        <Button variant="primary" className="w-full" onClick={save}>
          Salvar no quadro
        </Button>
      </div>
    </Modal>
  );
}

const FRASES_DIARIO = ['Assisti e entendi que', 'Não estava entendendo', 'Tentei ler, mas', 'Acho que consegui pegar'];

function NotesPanel({ topic }: { topic: Topic }) {
  const updateTopic = useStudy((s) => s.updateTopic);
  const subject = useStudy((s) => s.subjects.find((x) => x.id === topic.subjectId));
  const parent = useStudy((s) => s.topics.find((x) => x.id === topic.parentId));
  const [saving, setSaving] = useState(false);

  const toObsidian = async () => {
    setSaving(true);
    try {
      const path = await exportTopic(topic, subject, parent);
      toast({ title: 'Salvo no Obsidian', description: path, variant: 'success' });
    } catch (e) {
      toast({ title: 'Não salvou no Obsidian', description: e instanceof Error ? e.message : String(e), variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel
      title="Minhas anotações (diário)"
      actions={
        <Button className="px-2 py-1 text-[10px]" onClick={toObsidian} disabled={saving}>
          <FileDown size={12} /> Obsidian
        </Button>
      }
      className="flex flex-col"
    >
      <p className="mb-2 text-xs leading-relaxed text-muted">
        Este é o seu diário de estudo: escreva <b className="text-fg">o que está fazendo e como está pensando</b>. O professor lê pra te conhecer e te ajudar. Não é a matéria: ele não aprende nem ensina a partir daqui.
      </p>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {FRASES_DIARIO.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => updateTopic(topic.id, { notes: `${topic.notes.trim() ? `${topic.notes.trimEnd()}\n\n` : ''}${f} ` })}
            className="rounded border border-line px-2 py-1 text-[10px] text-muted hover:border-accent hover:text-fg"
          >
            {f}…
          </button>
        ))}
      </div>
      <Textarea
        value={topic.notes}
        onChange={(e) => updateTopic(topic.id, { notes: e.target.value })}
        placeholder={
          'Assisti o vídeo no YouTube e entendi que o x do plano cartesiano é a linha deitada e o y a em pé.\n\nNão estava entendendo como uso número negativo.\n\nTentei ler o artigo, mas não está entrando na cabeça.\n\nAcho que consegui pegar o conceito: posso trocar o x por qualquer número (só os do enunciado).'
        }
        className="min-h-[280px] flex-1 font-mono text-[13px]"
      />
      <p className="mt-2 text-[10px] text-muted">Salva sozinho. Pelo menos umas 2 linhas completam o passo "escrever" da aula.</p>
    </Panel>
  );
}
