import { useEffect, useMemo, useRef, useState } from 'react';
import { EyeOff, GraduationCap, MessageCircleQuestion, RotateCcw, Send, Sparkles } from 'lucide-react';
import { useAI } from '../../hooks/useAI';
import { treinar } from '../../store/musculos';
import { conversaParaCorrigir, falaDoZe, NOME_ZE, primeiraFalaDoZe, RODADAS_ENSINO, type FalaEnsino } from '../../services/ai/ensinaDeVolta';
import { toLocalDate, formatShort } from '../../domain/dates';
import { aprovou, NOTA_MINIMA, parecidoDemais } from '../../domain/prova';
import { GRADE_LABEL, gradeFromScore, isDue, type Grade } from '../../domain/srs';
import type { Lesson, StudySession, Topic } from '../../domain/types';
import { xpDeAprendizado } from '../../domain/xp';
import { resumirAprendizado } from '../../services/ai/memoria';
import { evaluateExplanation, type TopicContext } from '../../services/ai/professor';
import { useAprendiz } from '../../store/aprendiz';
import { useIALigada } from '../../store/conexoes';
import { useRascunhos } from '../../store/rascunhos';
import { useStudy } from '../../store/study';
import { rodarTarefa, useTarefa } from '../../store/tarefas';
import { toast } from '../../store/toast';
import { Badge, Button, ErrorNote, Panel, Textarea } from '../../components/ui';
import { cn } from '../../lib/utils';

// A prova do tópico (antes "Prove que entendeu"). Regras do Hugo (08/11/2026):
// - explicar com as SUAS palavras, sem olhar: a aula, as anotações e o chat somem enquanto escreve;
// - colar não vale, e texto quase igual ao da aula é recusado;
// - nota mínima 70. Passou: XP + o professor guarda como você aprendeu (a "mente").
//   Não passou: o que faltou vira dúvida no diário e o próximo passo é rever só aquilo.

const ehProva = (s: StudySession) => (s.kind === 'explicacao' || s.kind === 'revisao') && s.score !== undefined;

/** Tudo que está escrito na aula, pra comparar com a explicação do aluno. */
function textoDaAula(l?: Lesson): string {
  if (!l) return '';
  return [l.explanation, ...l.keyPoints, ...l.tips, ...(l.cena?.elementos.map((e) => e.texto) ?? []), ...(l.minis?.map((m) => m.referencia) ?? [])].join('\n');
}

/** Depois de passar: o professor escreve, em segundo plano, como você aprendeu este tópico. */
function guardarNaMente(topic: Topic, materia: string, nota: number, explicacao: string) {
  const rasc = useRascunhos.getState();
  const pedidos = (rasc.chat[topic.id] ?? []).filter((m) => m.de === 'aluno').slice(-10).map((m) => m.texto.slice(0, 160));
  const termo = rasc.termometro[topic.id];
  const confusas = termo ? Object.entries(termo.marcas).filter(([, m]) => m === 'confuso').map(([p]) => p) : [];
  const lacunasAntes = useStudy
    .getState()
    .sessions.filter((s) => s.topicId === topic.id && ehProva(s) && !aprovou(s.score ?? 0))
    .flatMap((s) => s.lacunas ?? [])
    .slice(-8);
  void rodarTarefa(`memoria:${topic.id}`, { rotulo: `Professor anotando como você aprendeu ${topic.title}`, aba: 'professor', topicId: topic.id }, async (signal) => {
    const r = await resumirAprendizado({ materia, topico: topic.title, nota, pedidos, confusas, lacunasAntes, explicacao, notas: topic.notes }, signal);
    useAprendiz.getState().guardarMemoria({ topicId: topic.id, topico: topic.title, materia, quando: new Date().toISOString(), nota, ...r });
  });
}

export function ProvaPanel({ topic, ctx }: { topic: Topic; ctx?: TopicContext }) {
  const aiOn = useIALigada();
  const aberta = useRascunhos((s) => s.provaAberta === topic.id);
  const text = useRascunhos((s) => s.feynman[topic.id] ?? '');
  const setText = (t: string) => useRascunhos.getState().escreverFeynman(topic.id, t);
  const chave = `prova:${topic.id}`;
  const { rodando, erro } = useTarefa(chave);
  const [aviso, setAviso] = useState<string>();
  const sessions = useStudy((s) => s.sessions);
  const ultima = useMemo(() => [...sessions].reverse().find((s) => s.topicId === topic.id && ehProva(s) && (s.pontosFortes || s.lacunas)), [sessions, topic.id]);
  const due = !!topic.lastStudiedAt && isDue(topic.review);

  const abrir = () => {
    setAviso(undefined);
    useRascunhos.getState().abrirProva(topic.id);
  };
  const fechar = () => useRascunhos.getState().abrirProva(undefined);

  const bloquearColar = (e: React.ClipboardEvent | React.DragEvent) => {
    e.preventDefault();
    setAviso('Colar não vale na prova: escreva com as suas palavras. Travar é normal, é ali que está a lacuna.');
  };

  const [formato, setFormato] = useState<'explicar' | 'ensinar'>('explicar');
  const [conversa, setConversa] = useState<FalaEnsino[]>(() => [{ de: 'ze', texto: primeiraFalaDoZe(topic.title) }]);
  const minhas = conversa.filter((f) => f.de === 'eu');

  /** Entrega pra correção: a explicação, ou a conversa inteira com o Zé ("ensina de volta"). */
  const entregar = () => {
    if (!ctx) return;
    const ensinar = formato === 'ensinar';
    const meu = ensinar ? minhas.map((f) => f.texto).join('\n') : text;
    if (parecidoDemais(meu, textoDaAula(topic.lesson))) {
      setAviso('Ficou quase igual ao texto da aula. Isso é decorar, não explicar: reescreva como você contaria pra um amigo, com um exemplo seu.');
      return;
    }
    setAviso(undefined);
    const c = ctx;
    const texto = ensinar ? conversaParaCorrigir(conversa) : text;
    const vencida = due;
    const materia = ctx.subject?.name ?? '';
    void rodarTarefa(chave, { rotulo: `Professor corrigindo a sua prova de ${topic.title}`, aba: 'professor', topicId: topic.id, avisarPronto: `Prova de ${topic.title} corrigida` }, async (signal) => {
      const r = await evaluateExplanation(c, texto, signal, ensinar ? 'ensinar' : 'explicar');
      const st = useStudy.getState();
      const hoje = toLocalDate();
      const aprovadas = st.sessions.filter((s) => s.topicId === topic.id && ehProva(s) && s.avaliadoPor !== 'eu' && aprovou(s.score ?? 0));
      const xp = xpDeAprendizado({ tipo: 'prova', nota: r.score, porIA: true, revisaoVencida: vencida, jaAprovadoAntes: aprovadas.length > 0, jaAprovadoHoje: aprovadas.some((s) => s.date === hoje) });
      st.gradeTopic(topic.id, gradeFromScore(r.score));
      st.logSession({ topicId: topic.id, minutes: 5, kind: vencida ? 'revisao' : 'explicacao', score: r.score, note: texto.slice(0, 500), avaliadoPor: 'ia', xp, lacunas: r.gaps, pontosFortes: r.strengths, correcao: r.correction });
      useRascunhos.getState().abrirProva(undefined);
      // Músculos: explicar do seu jeito é abstração; corrigir o Zé é julgamento; revisão vencida é memória.
      treinar('abstracao', 2);
      if (ensinar) treinar('julgamento', 1);
      if (vencida) treinar('memoria', 1);
      if (ensinar) setConversa([{ de: 'ze', texto: primeiraFalaDoZe(topic.title) }]);
      if (aprovou(r.score)) {
        useRascunhos.getState().escreverFeynman(topic.id, '');
        toast({ title: `Passou: ${r.score}${xp ? ` · +${xp} XP` : ''}`, description: xp ? 'O professor vai lembrar de como você aprendeu.' : 'Sem XP: você já tinha passado hoje (ou a revisão não estava vencida).', variant: 'success' });
        guardarNaMente(topic, materia, r.score, texto);
      } else {
        for (const g of r.gaps.slice(0, 5)) st.addDiario(topic.id, { tipo: 'duvida', original: `[prova ${r.score}] faltou: ${g}` });
        toast({ title: `Nota ${r.score}: ainda não`, description: `Precisa de ${NOTA_MINIMA}. O que faltou foi pro seu diário; reveja e tente de novo.` });
      }
    });
  };

  /** Sem IA ninguém confere: registra a revisão, mas não aprova nem paga XP. */
  const autoavaliar = (g: Grade) => {
    useStudy.getState().gradeTopic(topic.id, g);
    useStudy.getState().logSession({ topicId: topic.id, minutes: 5, kind: due ? 'revisao' : 'explicacao', note: text.slice(0, 500) || undefined, avaliadoPor: 'eu' });
    fechar();
    toast({ title: `${GRADE_LABEL[g]} · revisão agendada`, description: 'Sem XP: só a prova corrigida pelo professor vale XP.' });
  };

  const reverFaltou = (s: StudySession) => {
    useRascunhos.getState().pedirAoChat({
      topicId: topic.id,
      tipo: 'mais-facil',
      pedido: `Na prova faltou isto: ${(s.lacunas ?? []).join('; ')}. Me explica essas partes de outro jeito, desenhando. Não me dá a resposta da prova pronta: me faz pensar.`,
    });
  };

  const titulo = due ? 'Prova de revisão (sem olhar)' : 'Prova do tópico (sem olhar)';

  return (
    <Panel title={titulo}>
      {!aberta && !rodando && (
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-muted">
            Explique <b className="text-fg">com as suas palavras</b>, como pra alguém que nunca viu o assunto. Durante a prova a aula, as anotações e o chat ficam escondidos, e colar não vale. Nota mínima <b className="text-accent">{NOTA_MINIMA}</b>: passou, ganha XP e o professor guarda como você aprendeu.
          </p>
          <Button variant="primary" onClick={abrir}>
            <GraduationCap size={14} /> {ultima && !aprovou(ultima.score ?? 0) ? 'Tentar a prova de novo' : 'Começar a prova'}
          </Button>
        </div>
      )}

      {(aberta || rodando) && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {([['explicar', 'Explicar por escrito'], ['ensinar', `Ensinar o ${NOME_ZE} (colega confuso)`]] as const).map(([id, rotulo]) => (
              <button
                key={id}
                type="button"
                disabled={rodando}
                onClick={() => setFormato(id)}
                className={cn('rounded border px-2.5 py-1 text-[11px]', formato === id ? 'border-accent bg-accent/10 text-accent' : 'border-line text-muted hover:text-fg')}
              >
                {rotulo}
              </button>
            ))}
          </div>
          <p className="flex items-center gap-2 text-[11px] text-warn">
            <EyeOff size={13} /> {formato === 'ensinar' ? `A aula está escondida. O ${NOME_ZE} não entendeu nada: ensine ele. Cuidado, às vezes ele afirma uma coisa errada pra ver se você corrige.` : 'A aula está escondida. Escreva o que você lembra: o que é, pra que serve e um exemplo seu.'}
          </p>
          {formato === 'ensinar' ? (
            <EnsinarZe ctx={ctx} conversa={conversa} setConversa={setConversa} bloqueado={rodando} onColar={bloquearColar} />
          ) : (
          <Textarea
            rows={7}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={bloquearColar}
            onDrop={bloquearColar}
            placeholder={`O que é ${topic.title}, pra que serve, e um exemplo seu…`}
            disabled={rodando}
            autoFocus
          />
          )}
          {aviso &&<p className="rounded border border-warn/60 bg-warn/10 p-2 text-xs text-warn">{aviso}</p>}
          <ErrorNote error={erro ?? null} />
          <div className="flex flex-wrap items-center gap-2">
            {aiOn ? (
              <Button
                variant="primary"
                onClick={entregar}
                disabled={rodando || (formato === 'ensinar' ? minhas.length < 2 : text.trim().length < 40)}
                title={formato === 'ensinar' ? (minhas.length < 2 ? `Responda o ${NOME_ZE} pelo menos 2 vezes` : '') : text.trim().length < 40 ? 'Escreva pelo menos umas 2 frases' : ''}
              >
                <Sparkles size={14} /> {rodando ? 'Professor corrigindo… (pode sair da aba)' : 'Entregar pro professor corrigir'}
              </Button>
            ) : (
              <>
                <span className="text-[10px] uppercase tracking-widest text-muted">Sem IA, compare você mesmo (sem XP):</span>
                {(Object.keys(GRADE_LABEL) as Grade[]).map((g) => (
                  <Button key={g} onClick={() => autoavaliar(g)} className={cn('px-2 py-1 text-[10px]', g === 'errei' && 'text-danger')}>
                    {GRADE_LABEL[g]}
                  </Button>
                ))}
              </>
            )}
            {!rodando && (
              <Button className="ml-auto px-2 py-1 text-[10px]" onClick={fechar} title="O que você escreveu fica guardado">
                Voltar pra aula
              </Button>
            )}
          </div>
        </div>
      )}

      {ultima && !aberta && !rodando && <ResultadoProva s={ultima} onRever={() => reverFaltou(ultima)} />}
    </Panel>
  );
}

/** A conversa do "ensina de volta": você explica, o Zé pergunta (ou solta um erro pra você corrigir). */
function EnsinarZe({
  ctx,
  conversa,
  setConversa,
  bloqueado,
  onColar,
}: {
  ctx?: TopicContext;
  conversa: FalaEnsino[];
  setConversa: (c: FalaEnsino[]) => void;
  bloqueado: boolean;
  onColar: (e: React.ClipboardEvent | React.DragEvent) => void;
}) {
  const { run, loading, error } = useAI();
  const [texto, setTexto] = useState('');
  const fim = useRef<HTMLDivElement>(null);
  const minhas = conversa.filter((f) => f.de === 'eu').length;
  const acabou = minhas >= RODADAS_ENSINO && conversa.at(-1)?.de === 'ze';
  useEffect(() => {
    void fim.current?.scrollIntoView({ block: 'nearest' });
  }, [conversa.length, loading]);

  const responder = () => {
    const t = texto.trim();
    if (!t || !ctx || loading) return;
    const nova = [...conversa, { de: 'eu' as const, texto: t }];
    setConversa(nova);
    setTexto('');
    void run(async (signal) => {
      const fala = await falaDoZe(ctx, nova, signal);
      setConversa([...nova, { de: 'ze', texto: fala }]);
    });
  };

  return (
    <div className="space-y-2">
      <div className="max-h-72 space-y-2 overflow-y-auto rounded border border-line bg-bg p-2 text-sm">
        {conversa.map((f, i) => (
          <div key={i} className={cn('max-w-[88%] rounded px-2.5 py-1.5', f.de === 'eu' ? 'ml-auto bg-accent/15' : 'bg-panel-2')}>
            <p className="text-[10px] uppercase tracking-wider text-muted">{f.de === 'eu' ? 'você' : `${NOME_ZE} 🤔`}</p>
            <p className="whitespace-pre-wrap leading-snug">{f.texto}</p>
          </div>
        ))}
        {loading && <p className="text-xs text-muted">{NOME_ZE} está pensando…</p>}
        <div ref={fim} />
      </div>
      {error && <p className="text-xs text-warn">{error}</p>}
      {acabou ? (
        <p className="text-xs text-info">O {NOME_ZE} disse o que entendeu. Se ele entendeu errado, a sua explicação deixou um buraco. Entregue pro professor corrigir.</p>
      ) : (
        <div className="flex gap-1.5">
          <Textarea
            rows={3}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onPaste={onColar}
            onDrop={onColar}
            disabled={bloqueado || loading}
            placeholder={`Explique pro ${NOME_ZE} com as suas palavras…`}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) responder();
            }}
          />
          <Button onClick={responder} disabled={!texto.trim() || loading || bloqueado} title="Ctrl+Enter também manda">
            <Send size={14} /> Responder
          </Button>
        </div>
      )}
      <p className="text-[10px] text-muted">
        {minhas}/{RODADAS_ENSINO} explicações. Com 2 já dá pra entregar.
      </p>
    </div>
  );
}

function ResultadoProva({ s, onRever }: { s: StudySession; onRever: () => void }) {
  const nota = s.score ?? 0;
  const passou = aprovou(nota);
  return (
    <div className="mt-4 space-y-3 border-t border-line pt-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
        Última prova · {formatShort(s.date)} {passou ? <Badge color="var(--color-accent)">passou</Badge> : <Badge color="var(--color-warn)">ainda não</Badge>}
        {s.xp ? <Badge>+{s.xp} XP</Badge> : null}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded border border-line bg-bg p-3 text-center">
          <div className={cn('text-3xl font-bold', passou ? 'text-accent' : nota >= 50 ? 'text-warn' : 'text-danger')}>{nota}</div>
          <div className="text-[10px] uppercase text-muted">nota (mínimo {NOTA_MINIMA})</div>
        </div>
        <Lista titulo="Acertou" itens={s.pontosFortes ?? []} cor="text-accent" />
        <Lista titulo="Faltou" itens={s.lacunas ?? []} cor="text-warn" />
      </div>
      {passou && s.correcao && (
        <p className="rounded border border-line bg-bg p-3 text-sm leading-relaxed">
          <b className="text-info">Resumo do professor:</b> {s.correcao}
        </p>
      )}
      {!passou && (
        <div className="rounded border border-warn/50 bg-warn/5 p-3 text-xs">
          <p className="mb-2">
            <b className="text-warn">Próximo passo:</b> rever só o que faltou. O professor explica de outro jeito no chat, desenhando, e depois você tenta a prova de novo.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" className="px-2 py-1 text-[10px]" onClick={onRever}>
              <MessageCircleQuestion size={12} /> Rever o que faltou com o professor
            </Button>
            <span className="flex items-center gap-1 text-[10px] text-muted">
              <RotateCcw size={11} /> A resposta certa só aparece quando você passar.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function Lista({ titulo, itens, cor }: { titulo: string; itens: string[]; cor: string }) {
  return (
    <div className="rounded border border-line bg-bg p-3">
      <p className={cn('mb-1 text-[10px] font-bold uppercase tracking-widest', cor)}>{titulo}</p>
      {itens.length ? (
        <ul className="list-disc space-y-0.5 pl-4 text-xs leading-relaxed">
          {itens.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-muted">—</p>
      )}
    </div>
  );
}
