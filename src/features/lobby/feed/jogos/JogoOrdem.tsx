import { useCallback, useRef, useState } from 'react';
import { Undo2 } from 'lucide-react';
import type { CartaoOrdem } from '../../../../domain/cartoes';
import { Button } from '../../../../components/ui';
import { cn } from '../../../../lib/utils';
import { BotaoProximo, type PropsCartao } from '../comum';
import { useTeclas } from './ascii';
import { embaralharPassos } from './regras';

// "Monte em ordem": os passos chegam embaralhados na "caixa" e você empilha na esteira,
// do 1º ao último. Dá pra desfazer antes de conferir; conferiu, vale a ordem montada.
// Teclado: 1–6 pega o bloco da caixa, Backspace desfaz, Enter confere.

export function JogoOrdem({ cartao, onResponder, onProximo }: PropsCartao<CartaoOrdem>) {
  const [caixa] = useState(() => embaralharPassos(cartao.id, cartao.passos.length));
  const [montado, setMontado] = useState<number[]>([]);
  const [conferido, setConferido] = useState(false);
  const n = cartao.passos.length;
  const sobra = caixa.filter((i) => !montado.includes(i));
  const acertou = conferido && montado.every((v, i) => v === i);

  // Teclas rápidas chegam antes da tela atualizar: as ações leem o estado da ref, nunca uma cópia velha.
  // A ref é a fonte da verdade: só as ações abaixo mexem nela (o desenho da tela pode estar uma tecla atrás).
  const atual = useRef<{ montado: number[]; conferido: boolean }>({ montado: [], conferido: false });
  const mudar = (novo: number[]) => {
    atual.current = { ...atual.current, montado: novo };
    setMontado(novo);
  };

  const pegar = (i: number) => {
    const { montado: m, conferido: c } = atual.current;
    if (!c && !m.includes(i)) mudar([...m, i]);
  };
  const desfazer = () => {
    const { montado: m, conferido: c } = atual.current;
    if (!c && m.length) mudar(m.slice(0, -1));
  };
  const conferir = () => {
    const { montado: m, conferido: c } = atual.current;
    if (c || m.length !== n) return;
    atual.current = { montado: m, conferido: true };
    setConferido(true);
    onResponder(m.every((v, i) => v === i), m.map((i) => cartao.passos[i]).join(' → '));
  };
  const acoes = useRef({ pegar, desfazer, conferir });
  acoes.current = { pegar, desfazer, conferir };

  useTeclas(
    useCallback(
      (k: string) => {
        const { montado: m, conferido: c } = atual.current;
        if (c) return;
        const d = Number(k);
        const resta = caixa.filter((i) => !m.includes(i));
        if (Number.isInteger(d) && d >= 1 && d <= resta.length) acoes.current.pegar(resta[d - 1]);
        else if (k === 'backspace') acoes.current.desfazer();
        else if (k === 'enter') acoes.current.conferir();
      },
      [caixa],
    ),
  );

  return (
    <div className="space-y-3">
      <p className="text-base font-bold text-fg">{cartao.pergunta}</p>

      {/* A esteira: o que você já montou, de cima pra baixo, ligado por setas ASCII. */}
      <div className="rounded border border-line bg-bg p-2 font-mono text-[13px]" aria-label="Sua ordem">
        {Array.from({ length: n }, (_, pos) => {
          const i = montado[pos];
          const certo = conferido && i === pos;
          return (
            <div key={pos}>
              {pos > 0 && <div className="whitespace-pre pl-3 leading-none text-muted">│{'\n'}▼</div>}
              <button
                type="button"
                disabled={conferido || i === undefined || pos !== montado.length - 1}
                onClick={desfazer}
                title={i !== undefined && pos === montado.length - 1 && !conferido ? 'Tirar este (desfazer)' : undefined}
                className={cn(
                  'flex w-full items-start gap-2 rounded border px-2 py-1 text-left whitespace-pre-wrap',
                  i === undefined ? 'border-dashed border-line text-muted/60' : 'border-accent/60 text-fg',
                  conferido && (certo ? 'border-accent bg-accent/15 text-accent' : 'border-danger bg-danger/10 text-danger'),
                )}
              >
                <span className="shrink-0 text-muted">[{pos + 1}]</span>
                <span className="min-w-0">{i === undefined ? '· · ·' : cartao.passos[i]}</span>
              </button>
            </div>
          );
        })}
      </div>

      {!conferido && (
        <>
          <p className="text-[11px] text-muted">
            {sobra.length ? `Toque nos blocos na ordem certa (ou tecle 1–${sobra.length}). Errou? Desfaça antes de conferir.` : 'Pronto. Confira (Enter) ou desfaça o último.'}
          </p>
          <div className="grid gap-1.5" aria-label="Blocos embaralhados">
            {sobra.map((i, k) => (
              <button key={i} type="button" onClick={() => pegar(i)} className="rounded border border-line px-3 py-1.5 text-left text-sm hover:border-accent hover:text-accent">
                <span className="mr-2 font-mono text-muted">{k + 1}.</span>
                {cartao.passos[i]}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={desfazer} disabled={montado.length === 0}>
              <Undo2 size={13} /> Desfazer
            </Button>
            <Button variant="primary" onClick={conferir} disabled={montado.length !== n}>
              Conferir
            </Button>
          </div>
        </>
      )}

      {conferido && (
        <div className="space-y-2">
          {!acertou && (
            <div className="rounded border border-accent/40 bg-accent/5 p-2 text-sm">
              <p className="mb-1 text-[11px] uppercase tracking-wider text-accent">A ordem certa</p>
              <ol className="list-decimal space-y-0.5 pl-5 text-fg">
                {cartao.passos.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ol>
            </div>
          )}
          <div className="flex flex-wrap items-end gap-3">
            <p className="min-w-0 flex-1 text-sm text-muted">
              <b className={acertou ? 'text-accent' : 'text-danger'}>{acertou ? 'Isso! ' : 'Quase. '}</b>
              {cartao.explicacao}
            </p>
            <BotaoProximo onClick={onProximo} />
          </div>
        </div>
      )}
    </div>
  );
}
