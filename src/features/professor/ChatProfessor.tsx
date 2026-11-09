import { useEffect, useMemo, useRef, useState, type PointerEvent as PE } from 'react';
import { BookPlus, MessageCircle, NotebookPen, PanelRightClose, PanelRightOpen, Send, Shapes, Trash2, X } from 'lucide-react';
import { guardarNasAnotacoes, porNaAula } from '../../store/aulaJunto';
import { treinar } from '../../store/musculos';
import { desistir, NOME_DEGRAU, novaEscada, pedeResposta, podeLiberar, subir, TENTATIVAS_PRA_LIBERAR, type Escada } from '../../domain/ajuda';
import type { Topic } from '../../domain/types';
import { useStudy } from '../../store/study';
import { toast } from '../../store/toast';
import { useAI } from '../../hooks/useAI';
import { useCelular } from '../../hooks/useCelular';
import { cn } from '../../lib/utils';
import { perguntarAoProfessor } from '../../services/ai/chatProfessor';
import type { TopicContext } from '../../services/ai/professor';
import { useAprendiz } from '../../store/aprendiz';
import { useIALigada } from '../../store/conexoes';
import { useRascunhos, type MensagemChat } from '../../store/rascunhos';
import { useSelecaoQuadro } from '../../store/selecaoQuadro';
import { useBoards } from '../lousa/boardsStore';
import { Orbe } from '../../components/Orbe';
import { useGavetaBase } from '../../store/gavetaBase';

// Mini chat do professor, ao lado do quadro: pra ajustes rápidos ("mais fácil",
// "desenha isso"), não pra aula inteira. Arrasta pra qualquer canto, prende na
// lateral, e no celular vira uma gaveta embaixo. Selecionar uma parte do quadro
// diz ao professor de QUAL parte você está falando.

const ATALHOS: { tipo: string; rotulo: string; pedido: string }[] = [
  { tipo: 'mais-facil', rotulo: 'Mais fácil', pedido: 'Explica essa parte de um jeito mais fácil, como se eu nunca tivesse visto.' },
  { tipo: 'desenho', rotulo: 'Desenha isso', pedido: 'Desenha isso pra mim, com o diagrama que mais ajuda a enxergar.' },
  { tipo: 'exemplo', rotulo: 'Um exemplo', pedido: 'Me dá um exemplo concreto do dia a dia.' },
  { tipo: 'analogia', rotulo: 'Analogia + emoji', pedido: 'Explica com uma analogia e uns emojis pra eu enxergar.' },
  { tipo: 'resumo', rotulo: 'Resume em 1 frase', pedido: 'Resume em uma frase só.' },
  { tipo: 'discordo', rotulo: 'Discordo', pedido: 'Discordo disso. Me convence com um argumento ou um exemplo, ou admite se estiver errado.' },
];

/** O pedido do aluno que gerou a resposta `i` do professor (pro bloco "Montado junto"). */
const pedidoAntes = (msgs: MensagemChat[], i: number) => {
  for (let k = i - 1; k >= 0; k--) if (msgs[k].de === 'aluno') return msgs[k].texto.slice(0, 120);
  return 'pergunta ao professor';
};

/** Título do desenho no quadro: o nome do 1º bloco (ex.: "Dois dados: soma 7"), não a fala do chat. */
const tituloDoDesenho = (m: MensagemChat) => (m.cena?.elementos.find((e) => e.tipo !== 'nota' && e.tipo !== 'texto')?.texto ?? m.cena?.elementos[0]?.texto ?? m.texto).slice(0, 60);

const L = 360;
const A = 500;

export function ChatProfessor({ topic, ctx }: { topic: Topic; ctx?: TopicContext }) {
  const janela = useRascunhos((s) => s.chatJanela);
  const mover = useRascunhos((s) => s.moverChat);
  const msgs = useRascunhos((s) => s.chat[topic.id]) ?? [];
  const celular = useCelular();
  const aiOn = useIALigada();
  const { run, loading, error } = useAI();
  const [texto, setTexto] = useState('');
  const quadroId = useBoards((s) => s.boards.find((b) => b.quadroDe === topic.id)?.id);
  const selecao = useSelecaoQuadro((s) => (s.boardId && s.boardId === quadroId ? s.texto : ''));
  const [usarSelecao, setUsarSelecao] = useState(true);
  const fim = useRef<HTMLDivElement>(null);
  const arrasto = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    setUsarSelecao(true);
  }, [selecao]);
  // Chaves de propósito: no Chrome novo scrollIntoView devolve uma Promise, e efeito não pode devolver nada além de função.
  useEffect(() => {
    void fim.current?.scrollIntoView({ block: 'end' });
  }, [msgs.length, loading, janela.aberto]);

  // "Ajustes nesta aula": pedidos feitos depois que a aula atual foi escrita.
  const desde = topic.lesson ? new Date(topic.lesson.generatedAt).getTime() : 0;
  const ajustesAula = msgs.filter((m) => m.de === 'aluno' && new Date(m.em).getTime() >= desde).length;

  // Escada de ajuda: pediu a resposta de um exercício? O professor faz pensar antes (domain/ajuda.ts).
  const escada = useRascunhos((s) => s.escada[topic.id]);
  const sessoes = useStudy((s) => s.sessions);
  // Travado de verdade: as 2 últimas provas deste tópico abaixo de 50. Aí a resposta pode vir antes.
  const travado = useMemo(() => {
    const provas = sessoes.filter((s) => s.topicId === topic.id && (s.kind === 'explicacao' || s.kind === 'revisao') && s.score !== undefined).slice(-2);
    return provas.length === 2 && provas.every((s) => (s.score ?? 0) < 50);
  }, [sessoes, topic.id]);

  const enviar = (pedido: string, tipo = 'pergunta', sobreFixo?: string) => {
    const p = pedido.trim();
    if (!p || loading || !ctx) return;
    const sobre = sobreFixo ?? (usarSelecao && selecao ? selecao : undefined);
    const historico = msgs;
    const atual = useRascunhos.getState().escada[topic.id];
    // Pergunta livre: continua a escada (cada resposta dele é uma tentativa) ou começa uma se pediu a resposta.
    let esc: Escada | undefined = atual;
    if (tipo === 'desisti' && atual) esc = desistir(atual, travado);
    else if (tipo === 'pergunta') esc = atual ? subir(atual, p, travado) : pedeResposta(p) ? novaEscada(p) : undefined;
    useRascunhos.getState().guardarEscada(topic.id, esc);
    const eu: MensagemChat = { de: 'aluno', texto: p, sobre, em: new Date().toISOString() };
    useRascunhos.getState().falarNoChat(topic.id, eu);
    useAprendiz.getState().registrarAjuste(tipo);
    // Discordar = julgamento; responder na escada com o que acha (tentativa) = raciocínio.
    if (tipo === 'discordo') treinar('julgamento');
    else if (tipo === 'pergunta' && atual) treinar('raciocinio');
    setTexto('');
    void run(async (signal) => {
      // A escada só vale pra pergunta de exercício. Pedido de ajuste ("mais fácil", "rever o que faltou")
      // é sobre entender o conceito: não mistura com a conta que estava na escada.
      const naEscada = tipo === 'pergunta' || tipo === 'desisti' ? esc : undefined;
      const r = await perguntarAoProfessor({ ctx, aula: topic.lesson, sobre, historico: naEscada ? historico : historico.slice(-2), pergunta: p, escada: naEscada }, signal);
      useRascunhos.getState().falarNoChat(topic.id, { de: 'prof', texto: r.texto, cena: r.cena, em: new Date().toISOString() });
      // Entregou a resposta explicada (degrau 5): a escada acaba, e o próximo é o exercício parecido dele.
      if (esc?.degrau === 5) useRascunhos.getState().guardarEscada(topic.id, undefined);
    });
  };

  /** Copiar a resposta do professor: tudo bem, mas anotar com as suas palavras fixa mais. */
  const aoCopiar = () => toast({ title: 'Anota com as suas palavras', description: 'Copiar e colar não fixa. Escreva nas suas anotações do seu jeito: é isso que faz lembrar depois.' });

  // Pedido que veio de fora (o 😕 do termômetro): abre o chat e manda, sobre aquela parte.
  const pedidoFora = useRascunhos((s) => (s.pedidoChat?.topicId === topic.id ? s.pedidoChat : undefined));
  useEffect(() => {
    if (!pedidoFora || loading || !ctx || !aiOn) return;
    useRascunhos.getState().limparPedidoChat();
    mover({ aberto: true });
    enviar(pedidoFora.pedido, pedidoFora.tipo, pedidoFora.sobre);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage a um pedido novo (ou ao fim do anterior)
  }, [pedidoFora?.chave, loading, ctx, aiOn]);

  // Posição da janela flutuante (padrão: canto de baixo à direita), sempre dentro da tela.
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const x = Math.max(8, Math.min(vw - L - 8, janela.x < 0 ? vw - L - 24 : janela.x));
  const y = Math.max(56, Math.min(vh - A - 8, janela.y < 0 ? vh - A - 24 : janela.y));

  const comecarArrasto = (e: PE) => {
    if (janela.preso || celular) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    arrasto.current = { dx: e.clientX - x, dy: e.clientY - y };
  };
  const arrastar = (e: PE) => {
    if (!arrasto.current) return;
    mover({ x: e.clientX - arrasto.current.dx, y: e.clientY - arrasto.current.dy });
  };
  const soltar = () => {
    arrasto.current = null;
  };

  if (!janela.aberto) {
    return (
      <button
        type="button"
        onClick={() => mover({ aberto: true })}
        data-tour="chat"
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-accent bg-panel px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-accent shadow-lg hover:bg-accent/10"
        title="Ajustes rápidos com o professor: mais fácil, desenha isso, um exemplo..."
      >
        <MessageCircle size={16} /> Perguntar ao professor
      </button>
    );
  }

  const posicao = celular
    ? 'fixed inset-x-0 bottom-0 h-[62dvh] rounded-t-lg border-t'
    : janela.preso
      ? 'fixed bottom-0 right-0 top-[52px] w-[360px] border-l'
      : 'fixed rounded-lg border';

  return (
    <aside
      className={cn('z-40 flex flex-col border-accent/50 bg-panel shadow-2xl', posicao)}
      style={!celular && !janela.preso ? { left: x, top: y, width: L, height: A } : undefined}
      aria-label="Chat com o professor"
    >
      <header
        onPointerDown={comecarArrasto}
        onPointerMove={arrastar}
        onPointerUp={soltar}
        className={cn('flex items-center gap-2 border-b border-line px-3 py-2', !janela.preso && !celular && 'cursor-move select-none')}
      >
        <Orbe estado={loading ? 'thinking' : 'idle'} tamanho={28} />
        <div className="min-w-0 flex-1">
          <p className="fonte-titulo truncate text-[10px] uppercase tracking-[0.2em] text-accent">Prof. A.Ilson</p>
          <p className="text-[10px] text-muted">{ajustesAula ? `${ajustesAula} ajuste${ajustesAula > 1 ? 's' : ''} nesta aula` : 'ajustes rápidos da aula'}</p>
        </div>
        {!celular && (
          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => mover({ preso: !janela.preso })} className="rounded p-1 text-muted hover:text-accent" title={janela.preso ? 'Soltar (janela flutuante)' : 'Prender na lateral'}>
            {janela.preso ? <PanelRightClose size={15} /> : <PanelRightOpen size={15} />}
          </button>
        )}
        {msgs.length > 0 && (
          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => confirm('Apagar a conversa deste tópico?') && useRascunhos.getState().limparChat(topic.id)} className="rounded p-1 text-muted hover:text-danger" title="Apagar a conversa">
            <Trash2 size={14} />
          </button>
        )}
        <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => mover({ aberto: false })} className="rounded p-1 text-muted hover:text-fg" title="Fechar">
          <X size={15} />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3 text-sm">
        {msgs.length === 0 && (
          <p className="text-xs leading-relaxed text-muted">
            Travou numa parte? <b className="text-fg">Selecione ela no quadro</b> e aperte um botão aqui embaixo, ou escreva. É pra ajuste rápido: o professor responde curto e, se ajudar, desenha.
          </p>
        )}
        {msgs.map((m, i) => (
          <div key={i} onCopy={m.de === 'prof' ? aoCopiar : undefined} className={cn('max-w-[92%] rounded px-2.5 py-1.5', m.de === 'aluno' ? 'ml-auto bg-accent/15 text-fg' : 'bg-panel-2 text-fg')}>
            {m.sobre && <p className="mb-1 line-clamp-2 border-l-2 border-accent/60 pl-1.5 text-[10px] text-muted">sobre: {m.sobre}</p>}
            <p className="whitespace-pre-wrap leading-snug">{m.texto}</p>
            {m.cena && (
              <button
                type="button"
                onClick={() => useRascunhos.getState().porNoQuadro(topic.id, tituloDoDesenho(m), m.cena!)}
                className="mt-1.5 flex items-center gap-1 rounded border border-accent/60 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-accent hover:bg-accent/10"
              >
                <Shapes size={12} /> Pôr no quadro ({m.cena.elementos.length} {m.cena.elementos.length === 1 ? 'desenho' : 'peças'})
              </button>
            )}
            {m.de === 'prof' && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                <button
                  type="button"
                  disabled={!topic.lesson || topic.lesson.extras?.some((e) => e.em === m.em)}
                  onClick={() => porNaAula(topic.id, { de: pedidoAntes(msgs, i), texto: m.texto, cena: m.cena, em: m.em })}
                  className="flex items-center gap-1 rounded border border-line px-1.5 py-0.5 text-[10px] text-muted hover:border-accent hover:text-accent disabled:opacity-40"
                  title={topic.lesson ? 'Esta resposta vira um pedaço da aula (embaixo do quadro)' : 'Gere a aula primeiro'}
                >
                  <BookPlus size={11} /> {topic.lesson?.extras?.some((e) => e.em === m.em) ? 'Já está na aula' : 'Pôr na aula'}
                </button>
                <button
                  type="button"
                  onClick={() => guardarNasAnotacoes(topic.id, m.texto, true)}
                  className="flex items-center gap-1 rounded border border-line px-1.5 py-0.5 text-[10px] text-muted hover:border-accent hover:text-accent"
                  title="Vai pras anotações citado, pra você completar com as suas palavras"
                >
                  <NotebookPen size={11} /> Guardar nas anotações
                </button>
              </div>
            )}
          </div>
        ))}
        {loading && <p className="text-xs text-muted">O professor está pensando…</p>}
        {error && <p className="text-xs text-warn">{error}</p>}
        <div ref={fim} />
      </div>

      <div className="space-y-2 border-t border-line p-2">
        {escada && (
          <div className="rounded border border-info/50 bg-info/5 p-2 text-[10px] leading-snug">
            <div className="flex items-center gap-1.5">
              <span className="font-bold uppercase tracking-widest text-info">Escada de ajuda {escada.degrau}/5</span>
              <span className="text-muted">· {NOME_DEGRAU[escada.degrau]}</span>
              <button type="button" onClick={() => useRascunhos.getState().guardarEscada(topic.id, undefined)} className="ml-auto text-muted hover:text-fg" title="Resolvi / encerrar a escada">
                <X size={11} />
              </button>
            </div>
            <p className="mt-1 text-muted">
              {podeLiberar(escada, travado)
                ? 'Você já tentou de verdade: se travou, pode pedir a resposta explicada.'
                : `Responda com o que você acha (mesmo errado): ${escada.tentativas}/${TENTATIVAS_PRA_LIBERAR} tentativas pra liberar a resposta.`}
            </p>
            {escada.degrau < 5 && (
              <button
                type="button"
                disabled={!aiOn || loading}
                onClick={() => enviar(podeLiberar(escada, travado) ? 'Tentei e travei. Me mostra a resolução explicada.' : 'Travei. Me dá mais uma ajuda, sem a resposta.', 'desisti')}
                className="mt-1.5 rounded border border-info/60 px-2 py-0.5 font-bold uppercase tracking-wider text-info hover:bg-info/10 disabled:opacity-50"
              >
                {podeLiberar(escada, travado) ? 'Desisti, me mostra' : 'Me ajuda mais um pouco'}
              </button>
            )}
          </div>
        )}
        {selecao && (
          <label className="flex items-start gap-1.5 text-[10px] text-muted">
            <input type="checkbox" checked={usarSelecao} onChange={(e) => setUsarSelecao(e.target.checked)} className="mt-0.5" />
            <span className="line-clamp-2">
              Sobre a parte selecionada: <span className="text-fg">{selecao}</span>
            </span>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                guardarNasAnotacoes(topic.id, selecao, true);
              }}
              className="ml-auto shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] text-muted hover:border-accent hover:text-accent"
              title="O trecho vai citado pras anotações, pra você completar com as suas palavras"
            >
              Anotar isto
            </button>
          </label>
        )}
        <div className="flex flex-wrap gap-1">
          {/* Travou numa conta que a aula supõe? Parêntese desenhado, sem parar a aula nem o chat. */}
          <button
            type="button"
            disabled={!aiOn}
            onClick={() => useGavetaBase.getState().abrir({ topicId: topic.id, duvida: usarSelecao && selecao ? `não sei isso: "${selecao.slice(0, 160)}"` : undefined })}
            className="rounded border border-info/60 px-2 py-1 text-[10px] text-info hover:bg-info/10 disabled:opacity-50"
            title="Não sabe a conta que a aula usa? O professor explica desenhando, num parêntese"
          >
            {selecao && usarSelecao ? 'Não sei isso (base)' : 'Travei numa base'}
          </button>
          {ATALHOS.map((a) => (
            <button key={a.tipo} type="button" disabled={!aiOn || loading} onClick={() => enviar(a.pedido, a.tipo)} className="rounded border border-line px-2 py-1 text-[10px] hover:border-accent hover:text-accent disabled:opacity-50">
              {a.rotulo}
            </button>
          ))}
        </div>
        <form
          className="flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            enviar(texto);
          }}
        >
          <input
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder={aiOn ? 'Pergunte ou peça um ajuste…' : 'Conecte um modelo pra usar o chat'}
            disabled={!aiOn}
            className="min-w-0 flex-1 rounded border border-line bg-bg px-2 py-1.5 text-sm text-fg"
          />
          <button type="submit" disabled={!aiOn || loading || !texto.trim()} className="rounded border border-accent px-2.5 text-accent hover:bg-accent/10 disabled:opacity-50" aria-label="Enviar">
            <Send size={14} />
          </button>
        </form>
      </div>
    </aside>
  );
}
