import { useEffect, useRef, useState } from 'react';
import { Bell, Coffee, Play, Square, Timer } from 'lucide-react';
import { dicaDoBloco, RESPIRACAO, restante, RITMOS, type IdRitmo } from '../domain/foco';
import { toLocalDate } from '../domain/dates';
import { sons } from '../services/sons';
import { ritmoDeHoje, useFoco } from '../store/foco';
import { useNav } from '../store/nav';
import { useStudy } from '../store/study';
import { cn } from '../lib/utils';
import { Button, Select, Textarea } from './ui';

// Estudo guiado com pomodoro: o professor conduz o tempo. A faixa fica no topo em qualquer
// aba; acabou o foco, a tela de descanso cobre o app (dá pra pular, mas segurando 3 s);
// acabou a pausa, a volta pergunta "o que vimos?"; no fim, "chega por hoje".

const mmss = (ms: number) => {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

function avisarNoNavegador(titulo: string, corpo: string) {
  try {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.hidden) new Notification(titulo, { body: corpo, silent: false });
  } catch {
    // iPhone fora do modo app, ou bloqueado: fica o som e a tela
  }
}

/** Liga o relógio (montado uma vez no App). Vira a fase quando o tempo acaba e mostra a tela certa. */
export function FocoMotor() {
  const sessao = useFoco((s) => s.sessao);
  const [agora, setAgora] = useState(() => Date.now());
  const ativo = !!sessao && sessao.duracao > 0;

  useEffect(() => {
    if (!ativo) return;
    const id = setInterval(() => setAgora(Date.now()), 1000);
    return () => clearInterval(id);
  }, [ativo]);

  useEffect(() => {
    if (!sessao || sessao.duracao === 0 || restante(sessao, agora) > 0) return;
    if (sessao.fase === 'foco') {
      sons.pausa();
      avisarNoNavegador('Hora de descansar', 'O bloco de foco acabou. Levanta, olha longe, bebe água.');
    } else {
      sons.voltar();
      avisarNoNavegador('Hora de voltar', 'A pausa acabou. Uma frase sobre o que você viu e bora pro próximo bloco.');
    }
    useFoco.getState().virar();
  }, [agora, sessao]);

  if (!sessao) return null;
  if (sessao.fase === 'foco') return <FaixaFoco agora={agora} />;
  if (sessao.fase === 'pausa' || sessao.fase === 'longa') return <TelaDescanso agora={agora} />;
  if (sessao.fase === 'retorno') return <TelaVolta />;
  return <TelaFim />;
}

function FaixaFoco({ agora }: { agora: number }) {
  const s = useFoco((x) => x.sessao)!;
  const topico = useStudy((x) => x.topics.find((t) => t.id === s.topicId)?.title);
  const r = RITMOS[s.ritmo];
  const pct = 100 - (restante(s, agora) / s.duracao) * 100;
  return (
    <div className="border-b border-accent/30 bg-accent/5" role="timer" aria-live="off">
      <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-1 text-[11px]">
        <Timer size={13} className="shrink-0 text-accent" />
        <button type="button" onClick={() => useNav.getState().go('professor', s.topicId)} className="min-w-0 flex-1 truncate text-left text-fg hover:text-accent" title="Abrir a aula">
          <b className="text-accent">Foco</b> · bloco {s.bloco}/{s.total} · <b className="tabular-nums">{mmss(restante(s, agora))}</b>
          {topico && <span className="text-muted"> · {topico}</span>}
          <span className="hidden text-muted sm:inline"> · {r.foco} min, depois {s.bloco % r.aCada === 0 ? r.longa : r.pausa} de pausa</span>
        </button>
        <div className="hidden h-1 w-24 overflow-hidden rounded bg-line sm:block">
          <div className="h-full bg-accent" style={{ width: `${pct}%` }} />
        </div>
        <button type="button" onClick={() => confirm('Parar o estudo guiado agora?') && useFoco.getState().parar()} className="shrink-0 rounded border border-line px-1.5 py-0.5 text-[10px] text-muted hover:border-danger hover:text-danger" title="Parar o estudo guiado">
          <Square size={10} />
        </button>
      </div>
    </div>
  );
}

/** Segurar 3 s pra pular a pausa: dá pra pular, mas não sem querer. */
function SegurarPraPular() {
  const [progresso, setProgresso] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const parar = () => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    setProgresso(0);
  };
  const comecar = () => {
    if (timer.current) return;
    const t0 = Date.now();
    timer.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - t0) / 3000);
      setProgresso(p);
      if (p >= 1) {
        parar();
        useFoco.getState().pularPausa();
      }
    }, 50);
  };
  useEffect(() => parar, []);
  return (
    <button
      type="button"
      onPointerDown={comecar}
      onPointerUp={parar}
      onPointerLeave={parar}
      onPointerCancel={parar}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), comecar())}
      onKeyUp={parar}
      onContextMenu={(e) => e.preventDefault()}
      className="relative mt-6 select-none overflow-hidden rounded border border-line px-4 py-2 text-[11px] text-muted"
      style={{ touchAction: 'none' }}
    >
      <span className="absolute inset-y-0 left-0 bg-warn/25" style={{ width: `${progresso * 100}%` }} aria-hidden />
      <span className="relative">{progresso > 0 ? 'Segurando… solta pra desistir' : 'Segure 3 s pra pular a pausa'}</span>
    </button>
  );
}

function TelaDescanso({ agora }: { agora: number }) {
  const s = useFoco((x) => x.sessao)!;
  const longa = s.fase === 'longa';
  const passo = RESPIRACAO[Math.floor(agora / 1000) % RESPIRACAO.length];
  return (
    <div className="fixed inset-0 z-[60] flex flex-col items-center justify-center bg-bg/95 p-6 text-center backdrop-blur" role="dialog" aria-modal="true" aria-label="Hora de descansar">
      <Coffee size={28} className="text-accent" />
      <p className="fonte-titulo mt-3 text-[11px] uppercase tracking-[0.3em] text-accent">{longa ? 'Pausa longa' : 'Hora de descansar'}</p>
      <p className="mt-1 text-5xl font-bold tabular-nums text-fg">{mmss(restante(s, agora))}</p>
      <pre className="mt-6 font-mono text-2xl leading-tight text-accent/80" aria-hidden>
        {passo[0]}
      </pre>
      <p className="font-mono text-xs text-muted">{passo[1]}</p>
      <p className="mt-6 max-w-md text-sm leading-relaxed text-fg">{dicaDoBloco(s.bloco)}</p>
      <p className="mt-2 text-[11px] text-muted">
        Bloco {s.bloco} de {s.total} feito. A aula fica parada te esperando.
      </p>
      <SegurarPraPular />
    </div>
  );
}

function TelaVolta() {
  const s = useFoco((x) => x.sessao)!;
  const [texto, setTexto] = useState('');
  const pulou = s.pulos > 0;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/90 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label="Voltando da pausa">
      <div className="w-full max-w-md space-y-3 rounded border border-accent/60 bg-panel p-5">
        <p className="fonte-titulo text-[11px] uppercase tracking-[0.3em] text-accent">Voltou?</p>
        <p className="text-sm text-fg">Em 1 frase, sem olhar: o que a gente viu no bloco anterior?</p>
        <Textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Do jeito que lembrar, mesmo incompleto…" autoFocus />
        <p className="text-[10px] text-muted">Lembrar sem olhar é o que fixa. Vai pro diário do tópico.{pulou ? ' (Pausa pulada fica anotada: o descanso também faz parte do aprender.)' : ''}</p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => useFoco.getState().voltei(texto)}>
            <Play size={13} /> Bloco {s.bloco + 1} de {s.total}
          </Button>
          <Button onClick={() => useFoco.getState().voltei()}>Pular a frase</Button>
          <Button className="ml-auto" onClick={() => useFoco.getState().parar()}>
            Parar por hoje
          </Button>
        </div>
      </div>
    </div>
  );
}

function TelaFim() {
  const s = useFoco((x) => x.sessao)!;
  const topico = useStudy((x) => x.topics.find((t) => t.id === s.topicId));
  const r = RITMOS[s.ritmo];
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-bg/90 p-4 backdrop-blur" role="dialog" aria-modal="true" aria-label="Fim do estudo de hoje">
      <div className="w-full max-w-md space-y-3 rounded border border-accent/60 bg-panel p-5 text-center">
        <p className="fonte-titulo text-[11px] uppercase tracking-[0.3em] text-accent">Chega por hoje</p>
        <p className="text-2xl font-bold text-fg">
          {s.total} bloco{s.total > 1 ? 's' : ''} de {r.foco} min feito{s.total > 1 ? 's' : ''}
        </p>
        <p className="text-sm text-muted">Agora o cérebro guarda o que você viu. Descanse de verdade.</p>
        <p className="rounded border border-line bg-bg p-2 text-sm">
          <b className="text-accent">Amanhã:</b> {topico ? `revise "${topico.title}" (a prova curta, sem olhar).` : 'abra o próximo passo do Lobby.'}
        </p>
        <Button variant="primary" onClick={() => useFoco.getState().parar()}>
          Fechar
        </Button>
      </div>
    </div>
  );
}

const ROTULO_ENERGIA = { 1: 'energia baixa', 2: 'energia média', 3: 'energia alta' } as const;

/** Começar o estudo guiado (Professor e Lobby): o ritmo vem da energia de hoje, dá pra trocar. */
export function ComecarFoco({ topicId, compacto = false }: { topicId?: string; compacto?: boolean }) {
  const sessao = useFoco((s) => s.sessao);
  const ritmoFixo = useFoco((s) => s.ritmoFixo);
  const energia = useStudy((s) => s.checkins[toLocalDate()]?.energy);
  const hoje = ritmoDeHoje();
  const [ritmo, setRitmo] = useState<IdRitmo>(ritmoFixo ?? hoje.ritmo);
  const r = RITMOS[ritmo];
  const podeAvisar = typeof Notification !== 'undefined' && Notification.permission === 'default';

  if (sessao && sessao.fase !== 'fim') {
    return <p className="text-xs text-muted">Estudo guiado em andamento: bloco {sessao.bloco} de {sessao.total} (a faixa lá em cima mostra o tempo).</p>;
  }
  return (
    <div className={cn('flex flex-wrap items-center gap-2', compacto && 'text-xs')}>
      <Button variant="primary" onClick={() => useFoco.getState().comecar(topicId, ritmo, ritmo === hoje.ritmo ? hoje.blocos : undefined)}>
        <Play size={14} /> Começar estudo guiado
      </Button>
      <Select value={ritmo} onChange={(e) => setRitmo(e.target.value as IdRitmo)} className="w-auto py-1 text-xs" aria-label="Ritmo do estudo guiado">
        {(Object.keys(RITMOS) as IdRitmo[]).map((id) => (
          <option key={id} value={id}>
            {RITMOS[id].nome} · {RITMOS[id].quando}
          </option>
        ))}
      </Select>
      <span className="text-[10px] text-muted">
        {hoje.blocos} bloco{hoje.blocos > 1 ? 's' : ''} de {r.foco} min{energia ? ` (${ROTULO_ENERGIA[energia]} no check-in)` : ''}
      </span>
      {podeAvisar && (
        <button type="button" onClick={() => void Notification.requestPermission()} className="flex items-center gap-1 text-[10px] text-muted hover:text-accent" title="Avisar quando o bloco acabar, mesmo com o app em segundo plano">
          <Bell size={11} /> avisar no navegador
        </button>
      )}
    </div>
  );
}
