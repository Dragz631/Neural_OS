import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { create } from 'zustand';
import { ArrowLeft, ArrowRight, Compass, X } from 'lucide-react';
import { persist } from '../lib/persistir';
import { useNav, type TabId } from '../store/nav';
import { useStudy } from '../store/study';
import { Orbe } from './Orbe';
import { Button } from './ui';

// Tour guiado (Hugo, 09/11/2026): no primeiro acesso o app leva pelas telas principais,
// passo a passo, mostrando o que o professor pode dizer em cada uma. Abre sozinho só no
// primeiro acesso de verdade (app vazio). O botão pra rever só aparece com
// VITE_TOUR_BOTAO=1 no .env.local (fica no PC do Hugo, não vai pro GitHub).

interface Passo {
  aba?: TabId;
  /** data-tour do elemento a destacar (sem: cartão no meio da tela). */
  alvo?: string;
  titulo: string;
  texto: string;
  /** O que o professor pode te dizer ali. */
  fala: string;
}

const PASSOS: Passo[] = [
  {
    titulo: 'Bem-vindo ao Neural-OS',
    texto: 'Um lugar só pra aprender de verdade: aula, anotações, prática e revisão. Em 1 minuto eu te mostro as telas principais.',
    fala: 'Eu sou o Prof. A.Ilson. Aqui eu não te entrego a resposta pronta: eu te faço pensar até você chegar nela. É assim que fica na cabeça.',
  },
  {
    aba: 'lobby',
    alvo: 'proximo-passo',
    titulo: 'Próximo passo',
    texto: 'Sempre tem uma coisa só pra fazer agora. Abriu o app sem saber por onde começar? Olha aqui.',
    fala: 'Hoje tem revisão de Probabilidade vencida: começa por ela, 10 minutos.',
  },
  {
    aba: 'lobby',
    alvo: 'widget-feed',
    titulo: 'Feed',
    texto: 'Uma rodada surpresa de minijogos com o que você já estudou. Você não sabe quantas perguntas vêm.',
    fala: 'Errou? Tudo bem: vai pro seu diário e eu explico de outro jeito depois.',
  },
  {
    aba: 'lobby',
    alvo: 'widget-foco',
    titulo: 'Estudo guiado (pomodoro)',
    texto: 'Eu cuido do tempo: blocos de foco e pausa de verdade. Dá pra pausar, montar o seu ritmo e, se parar, dizer por quê.',
    fala: 'Hora de descansar 5 min. Não pegue no celular: olhe pela janela. Pensar é igual treinar bíceps, o músculo precisa de descanso.',
  },
  {
    aba: 'lobby',
    alvo: 'widget-tabuada',
    titulo: 'Tabuada',
    texto: 'Partidas rápidas de 60 s, sem IA. A conta que você erra volta mais vezes até grudar.',
    fala: '7 × 8 = 56: são 7 fileiras de 8. Ela volta daqui a pouco nesta partida.',
  },
  {
    aba: 'lobby',
    alvo: 'widget-musculos',
    titulo: 'Músculos do cérebro',
    texto: 'O que você treinou do pensamento na semana: raciocínio, resolver problemas, planejamento, abstração, julgamento e memória.',
    fala: 'Essa semana você treinou pouco planejamento. Que tal planejar a semana no domingo?',
  },
  {
    aba: 'professor',
    alvo: 'quadro',
    titulo: 'A aula, no quadro',
    texto: 'Escolha um tópico e peça a aula: eu desenho no quadro (fluxo, árvore, conjuntos, gráfico). Antes da 1ª aula, eu peço um chute seu.',
    fala: 'Antes da aula: o que você acha que é probabilidade? Pode ser "não faço ideia", eu começo do zero.',
  },
  {
    aba: 'professor',
    alvo: 'base',
    titulo: 'Travei numa base',
    texto: 'Não sabe uma conta que a aula usa (dividir, fração, regra de três)? Eu abro um parêntese desenhado, sem parar a aula.',
    fala: 'Dividir é repartir igual: 12 bolinhas em 3 grupos, 4 em cada. Agora você: 18 em 6?',
  },
  {
    aba: 'professor',
    alvo: 'chat',
    titulo: 'Converse comigo',
    texto: 'Peça "mais fácil", "desenha isso", um exemplo, ou aperte "Discordo". O que ajudar, você põe na aula ou nas anotações.',
    fala: 'Discordou? Ótimo, discordar é pensar. Me mostra um caso em que isso falha: se eu errei, eu admito.',
  },
  {
    aba: 'professor',
    alvo: 'prova',
    titulo: 'Prova: aprendeu de verdade?',
    texto: 'Explique com as suas palavras, sem olhar (ou ensine o Zé, um colega confuso). Nota mínima 70. XP só vem quando você aprende.',
    fala: 'Passou! Vou lembrar que com você funciona exemplo do dia a dia antes da fórmula.',
  },
  {
    aba: 'horario',
    alvo: 'aba-horario',
    titulo: 'Molda-Horário',
    texto: 'No domingo, planeje a semana. Todo dia, diga a sua energia e quanto tempo tem: o dia se ajusta.',
    fala: 'Energia baixa hoje? Então blocos de 15 minutos e só uma coisa nova.',
  },
  {
    titulo: 'Pronto pra começar',
    texto: 'Crie a sua primeira matéria e um tópico. Se tiver slides no NotebookLM ou notas no Obsidian, conecte em "Fontes" (topo): eu leio e uso nas aulas.',
    fala: 'Bora? Me diz o que você quer aprender, e o resto a gente constrói junto.',
  },
];

const useTourVisto = create<{ visto: boolean }>()(persist(() => ({ visto: false as boolean }),{ name: 'neural-os.tour', version: 1 }));
const useTour = create<{ passo: number | null }>()(() => ({ passo: null }));

const abrirTour = () => useTour.setState({ passo: 0 });
const fechar = () => {
  useTour.setState({ passo: null });
  useTourVisto.setState({ visto: true });
};

/** O botão de rever o tour: só no PC de quem liga VITE_TOUR_BOTAO=1 (fora do git). */
export function BotaoTour() {
  if (import.meta.env.VITE_TOUR_BOTAO !== '1') return null;
  return (
    <button type="button" onClick={abrirTour} className="flex items-center gap-1 rounded border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-muted hover:border-accent hover:text-accent" title="Ver o tour guiado de novo">
      <Compass size={13} /> <span className="hidden sm:inline">Tour</span>
    </button>
  );
}

/** O tour em si (montado uma vez no App). */
export function Tour() {
  const passo = useTour((s) => s.passo);
  const visto = useTourVisto((s) => s.visto);
  const semMaterias = useStudy((s) => s.subjects.length === 0);

  // Primeiro acesso de verdade (app vazio e nunca viu): abre sozinho.
  useEffect(() => {
    if (visto || !semMaterias || passo !== null) return;
    const t = setTimeout(abrirTour, 900);
    return () => clearTimeout(t);
  }, [visto, semMaterias, passo]);

  if (passo === null) return null;
  return <PassoTour key={passo} i={passo} />;
}

function PassoTour({ i }: { i: number }) {
  const p = PASSOS[i];
  const [rect, setRect] = useState<DOMRect | null>(null);
  const cartao = useRef<HTMLDivElement>(null);
  const [alturaCartao, setAlturaCartao] = useState(0);
  useLayoutEffect(() => {
    if (cartao.current) setAlturaCartao(cartao.current.offsetHeight);
  }, [i]);

  useEffect(() => {
    if (p.aba) useNav.getState().go(p.aba);
  }, [p.aba]);

  // Acha o elemento (a aba pode demorar a montar) e acompanha se a tela mexer.
  useLayoutEffect(() => {
    let rolou = false;
    const medir = () => {
      const el = p.alvo ? document.querySelector<HTMLElement>(`[data-tour="${p.alvo}"]`) : null;
      if (el && !rolou) {
        // Deixa espaço em cima pro cartão (uns 360 px); elemento alto demais vai centralizado.
        const r = el.getBoundingClientRect();
        if (r.height < window.innerHeight - 400) window.scrollBy({ top: r.top - 370, behavior: 'smooth' });
        else el.scrollIntoView({ block: 'center', behavior: 'smooth' });
        rolou = true;
      }
      setRect(el ? el.getBoundingClientRect() : null);
      if (cartao.current) setAlturaCartao(cartao.current.offsetHeight);
    };
    medir();
    const id = setInterval(medir, 250);
    return () => clearInterval(id);
  }, [p.alvo]);

  const ultimo = i === PASSOS.length - 1;
  const ir = (n: number) => useTour.setState({ passo: n });
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar();
      else if (e.key === 'ArrowRight') {
        if (ultimo) fechar();
        else ir(i + 1);
      }
      else if (e.key === 'ArrowLeft' && i > 0) ir(i - 1);
    };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [i, ultimo]);

  // O cartão vai onde couber sem tapar o destaque: embaixo, em cima, à direita, à esquerda.
  const vh = window.innerHeight;
  const vw = window.innerWidth;
  const largura = Math.min(400, vw - 24);
  const altura = alturaCartao || 320;
  const M = 14;
  const pos: React.CSSProperties = !rect
    ? { left: '50%', top: '50%', transform: 'translate(-50%, -50%)', width: largura }
    : (() => {
        const centroX = Math.max(12, Math.min(vw - largura - 12, rect.left + rect.width / 2 - largura / 2));
        const centroY = Math.max(12, Math.min(vh - altura - 12, rect.top + rect.height / 2 - altura / 2));
        if (rect.bottom + M + altura < vh) return { left: centroX, top: rect.bottom + M, width: largura };
        if (rect.top - M - altura > 0) return { left: centroX, top: rect.top - M - altura, width: largura };
        if (rect.right + M + largura < vw) return { left: rect.right + M, top: centroY, width: largura };
        if (rect.left - M - largura > 0) return { left: rect.left - M - largura, top: centroY, width: largura };
        // Não cabe em lugar nenhum (painel grande): fica um pouco abaixo do topo dele, o título continua à vista.
        return { left: vw - largura - 16, top: Math.max(12, Math.min(vh - altura - 12, rect.top + 56)), width: largura };
      })();
  if (typeof pos.top === 'number') pos.top = Math.max(12, Math.min(vh - altura - 12, pos.top));

  // Escurece tudo em volta do destaque (4 faixas: funciona em qualquer navegador).
  const pad = 6;
  const r = rect && { x: rect.left - pad, y: rect.top - pad, w: rect.width + 2 * pad, h: rect.height + 2 * pad };
  const sombra = 'fixed bg-black/70';

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-label={`Tour: ${p.titulo}`}>
      {r ? (
        <>
          <div className={sombra} style={{ left: 0, top: 0, width: '100%', height: Math.max(0, r.y) }} />
          <div className={sombra} style={{ left: 0, top: r.y + r.h, width: '100%', bottom: 0 }} />
          <div className={sombra} style={{ left: 0, top: r.y, width: Math.max(0, r.x), height: r.h }} />
          <div className={sombra} style={{ left: r.x + r.w, top: r.y, right: 0, height: r.h }} />
          <div className="pointer-events-none fixed rounded-lg border-2 border-accent shadow-[0_0_24px_var(--color-accent)]" style={{ left: r.x, top: r.y, width: r.w, height: r.h }} />
        </>
      ) : (
        <div className="fixed inset-0 bg-black/70" />
      )}
      <div ref={cartao} className="fixed space-y-3 rounded-lg border border-accent/70 bg-panel p-4 shadow-2xl" style={pos}>
        <div className="flex items-start gap-2">
          <p className="fonte-titulo flex-1 text-[10px] uppercase tracking-[0.25em] text-accent">
            Tour · {i + 1}/{PASSOS.length}
          </p>
          <button type="button" onClick={fechar} className="text-muted hover:text-fg" title="Pular o tour (Esc)">
            <X size={15} />
          </button>
        </div>
        <h3 className="text-lg font-bold text-fg">{p.titulo}</h3>
        <p className="text-sm leading-relaxed text-muted">{p.texto}</p>
        <div className="flex items-start gap-2 rounded border border-line bg-bg p-2">
          <Orbe estado="idle" tamanho={32} />
          <p className="text-xs leading-snug text-fg">
            <span className="block text-[10px] uppercase tracking-wider text-muted">o professor pode dizer</span>"{p.fala}"
          </p>
        </div>
        <div className="flex items-center gap-2">
          {i > 0 && (
            <Button onClick={() => ir(i - 1)}>
              <ArrowLeft size={13} /> Voltar
            </Button>
          )}
          <button type="button" onClick={fechar} className="text-[11px] text-muted underline hover:text-fg">
            pular
          </button>
          <Button variant="primary" className="ml-auto" onClick={() => (ultimo ? fechar() : ir(i + 1))}>
            {ultimo ? 'Começar' : 'Próximo'} {!ultimo && <ArrowRight size={13} />}
          </Button>
        </div>
      </div>
    </div>
  );
}
