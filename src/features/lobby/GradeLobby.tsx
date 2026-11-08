import { useEffect, useRef, useState, type CSSProperties, type PointerEvent as PE } from 'react';
import { GripVertical, LayoutGrid, Plus, RotateCcw, X } from 'lucide-react';
import { ALTURA_LINHA, COLUNAS, emOrdem, encaixar, ESPACO, LINHAS, type Retangulo } from '../../domain/lobbyGrade';
import { useCelular } from '../../hooks/useCelular';
import { useGradeLobby } from '../../store/lobbyGrade';
import { toast } from '../../store/toast';
import { Button } from '../../components/ui';
import { cn } from '../../lib/utils';
import { padraoDoLobby, WIDGETS, type DefWidget } from './widgets';

// Os widgets do Lobby numa grade, como a tela inicial do celular. "Organizar" liga o modo de
// edição: arraste pelo cabeçalho do widget, redimensione pelo canto. Nada empurra nada:
// se o lugar está ocupado, o widget volta pra onde estava.

const DEF = new Map<string, DefWidget>(WIDGETS.map((w) => [w.id, w]));

type Modo = 'mover' | 'redimensionar';
interface Arrasto {
  id: string;
  modo: Modo;
  base: Retangulo;
  /** Deslocamento do ponteiro em pixels desde o começo do arrasto. */
  dx: number;
  dy: number;
}

export function GradeLobby() {
  const itens = useGradeLobby((s) => s.itens);
  const iniciado = useGradeLobby((s) => s.iniciado);
  const celular = useCelular();
  const [editando, setEditando] = useState(false);
  const [arrasto, setArrasto] = useState<Arrasto | null>(null);
  const gradeRef = useRef<HTMLDivElement>(null);
  const inicio = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!iniciado) useGradeLobby.getState().restaurar(padraoDoLobby());
  }, [iniciado]);

  const passo = () => {
    const largura = gradeRef.current?.clientWidth ?? 1200;
    return { x: (largura - ESPACO * (COLUNAS - 1)) / COLUNAS + ESPACO, y: ALTURA_LINHA + ESPACO };
  };

  /** Onde o item cairia se o arrasto terminasse agora (em células). */
  const candidato = (a: Arrasto): Retangulo => {
    const p = passo();
    const cx = Math.round(a.dx / p.x);
    const cy = Math.round(a.dy / p.y);
    if (a.modo === 'mover') return { ...a.base, x: a.base.x + cx, y: a.base.y + cy };
    const min = DEF.get(a.id)?.min ?? { w: 1, h: 1 };
    return { ...a.base, w: Math.max(min.w, a.base.w + cx), h: Math.max(min.h, a.base.h + cy) };
  };

  const comecar = (e: PE, id: string, modo: Modo) => {
    const item = itens.find((i) => i.id === id);
    if (!item) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    inicio.current = { x: e.clientX, y: e.clientY };
    setArrasto({ id, modo, base: { x: item.x, y: item.y, w: item.w, h: item.h }, dx: 0, dy: 0 });
  };

  const mover = (e: PE) => arrasto && setArrasto({ ...arrasto, dx: e.clientX - inicio.current.x, dy: e.clientY - inicio.current.y });

  const soltar = () => {
    if (!arrasto) return;
    const alvo = candidato(arrasto);
    const mudou = alvo.x !== arrasto.base.x || alvo.y !== arrasto.base.y || alvo.w !== arrasto.base.w || alvo.h !== arrasto.base.h;
    if (mudou && !useGradeLobby.getState().ajustar(arrasto.id, alvo)) {
      toast({ title: 'Sem espaço aí', description: 'Os widgets que estão no caminho não têm pra onde ir. Reduza ou tire algum antes.', variant: 'destructive' });
    }
    setArrasto(null);
  };

  const ocultos = WIDGETS.filter((w) => !itens.some((i) => i.id === w.id));

  const trazer = (w: DefWidget) => {
    if (!useGradeLobby.getState().mostrar(w.id, w.padrao.w, w.padrao.h)) {
      toast({ title: 'Grade cheia', description: `Não há espaço pra ${w.titulo}. Reduza ou tire outro widget.`, variant: 'destructive' });
    }
  };

  if (celular) {
    return (
      <div className="space-y-4">
        {emOrdem(itens).map((i) => {
          const def = DEF.get(i.id);
          return def ? <def.Componente key={i.id} /> : null;
        })}
      </div>
    );
  }

  const alvo = arrasto ? candidato(arrasto) : null;
  const alvoValido = arrasto && alvo ? !!encaixar(itens, arrasto.id, alvo) : false;
  const p = { x: `calc((100% + ${ESPACO}px) / ${COLUNAS})`, y: `${ALTURA_LINHA + ESPACO}px` };

  const estiloGrade: CSSProperties = {
    display: 'grid',
    gridTemplateColumns: `repeat(${COLUNAS}, minmax(0, 1fr))`,
    // Arrumando: a grade inteira (pra ter onde soltar). Usando: só até o último widget, sem vazio embaixo.
    gridTemplateRows: `repeat(${editando ? LINHAS : Math.max(1, ...itens.map((i) => i.y + i.h))}, ${ALTURA_LINHA}px)`,
    gap: ESPACO,
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant={editando ? 'primary' : 'ghost'} className="px-2 py-1 text-[10px]" onClick={() => setEditando((v) => !v)} aria-pressed={editando}>
          <LayoutGrid size={12} /> {editando ? 'Pronto' : 'Organizar widgets'}
        </Button>
        {editando && (
          <>
            <Button className="px-2 py-1 text-[10px]" onClick={() => useGradeLobby.getState().restaurar(padraoDoLobby())}>
              <RotateCcw size={12} /> Restaurar padrão
            </Button>
            <span className="text-[11px] text-muted">Arraste pelo cabeçalho, redimensione pelo canto. Os outros se afastam se tiverem espaço; se não, o widget volta.</span>
          </>
        )}
      </div>

      {editando && ocultos.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <span className="text-muted">Fora da tela:</span>
          {ocultos.map((w) => (
            <button key={w.id} type="button" onClick={() => trazer(w)} className="inline-flex items-center gap-1 rounded border border-line px-2 py-0.5 hover:border-accent hover:text-accent">
              <Plus size={11} /> {w.titulo}
            </button>
          ))}
        </div>
      )}

      <div className="relative">
        {editando && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{ backgroundImage: 'radial-gradient(circle, var(--color-line) 1px, transparent 1.5px)', backgroundSize: `${p.x} ${p.y}`, backgroundPosition: `${ESPACO / 2}px ${ESPACO / 2}px`, opacity: 0.7 }}
          />
        )}
        <div ref={gradeRef} style={estiloGrade} className="relative">
          {itens.map((i) => {
            const def = DEF.get(i.id);
            if (!def) return null;
            const ativo = arrasto?.id === i.id;
            const style: CSSProperties = { gridColumn: `${i.x + 1} / span ${i.w}`, gridRow: `${i.y + 1} / span ${i.h}` };
            if (ativo && arrasto.modo === 'mover') style.transform = `translate(${arrasto.dx}px, ${arrasto.dy}px)`;
            return (
              <div key={i.id} style={style} className={cn('relative min-h-0 min-w-0', ativo && 'z-20 opacity-80', editando && 'rounded ring-1 ring-accent/40')}>
                <div className={cn('h-full overflow-auto [&>*]:min-h-full', editando && 'pointer-events-none select-none')}>
                  <def.Componente />
                </div>
                {editando && (
                  <>
                    <div
                      onPointerDown={(e) => comecar(e, i.id, 'mover')}
                      onPointerMove={mover}
                      onPointerUp={soltar}
                      onPointerCancel={() => setArrasto(null)}
                      className="absolute inset-x-0 top-0 z-10 flex h-7 cursor-grab touch-none items-center gap-1 rounded-t bg-bg/90 px-1.5 text-[10px] uppercase tracking-widest text-accent active:cursor-grabbing"
                    >
                      <GripVertical size={12} />
                      <span className="flex-1 truncate">{def.titulo}</span>
                      <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={() => useGradeLobby.getState().ocultar(i.id)} className="hover:text-danger" aria-label={`Tirar ${def.titulo} da tela`}>
                        <X size={12} />
                      </button>
                    </div>
                    <div
                      onPointerDown={(e) => comecar(e, i.id, 'redimensionar')}
                      onPointerMove={mover}
                      onPointerUp={soltar}
                      onPointerCancel={() => setArrasto(null)}
                      className="absolute bottom-0 right-0 z-10 h-5 w-5 cursor-nwse-resize touch-none rounded-tl border-l border-t border-accent bg-accent/30"
                      aria-label={`Redimensionar ${def.titulo}`}
                    />
                  </>
                )}
              </div>
            );
          })}

          {arrasto && alvo && (
            <div
              aria-hidden
              style={{ gridColumn: `${Math.max(1, alvo.x + 1)} / span ${Math.max(1, alvo.w)}`, gridRow: `${Math.max(1, alvo.y + 1)} / span ${Math.max(1, alvo.h)}` }}
              className={cn('pointer-events-none z-10 rounded border-2 border-dashed', alvoValido ? 'border-accent bg-accent/10' : 'border-danger bg-danger/10')}
            />
          )}
        </div>
      </div>
    </div>
  );
}
