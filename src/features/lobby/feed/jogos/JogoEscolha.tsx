import { useCallback, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import type { CartaoEscolha } from '../../../../domain/cartoes';
import { useFeed } from '../../../../store/feed';
import { useStudy } from '../../../../store/study';
import { cn } from '../../../../lib/utils';
import { JogoIACard } from './JogoIACard';
import { CartaoEscolhaView } from '../CartaoEscolhaView';
import { BotaoProximo, type PropsCartao } from '../comum';
import { semMovimento, useQuadros, useTeclas } from './ascii';
import { quadroBatalha, quadroChuva, quadroComilao, type Estado } from './quadros';
import { hashTexto, temaDoJogo } from './tema';

// Cada cartão de múltipla escolha vira um minijogo em ASCII. Qual jogo? Sai do próprio cartão
// (sempre o mesmo pro mesmo cartão). A pontuação, o combo e o diário de erro continuam sendo
// os de sempre: o jogo só muda COMO você responde.

export type Jogo = 'chuva' | 'comilao' | 'batalha' | 'quiz';
const JOGOS: Jogo[] = ['chuva', 'comilao', 'batalha', 'quiz'];

export const jogoDoCartao = (c: CartaoEscolha): Jogo => JOGOS[hashTexto(c.id) % JOGOS.length];

export const CLASSE_ASCII = 'm-0 select-none whitespace-pre font-mono text-[13px] leading-[1.1]';

export function JogoEscolha(props: PropsCartao<CartaoEscolha>) {
  // Jogo criado pela IA pra esta pergunta? Decide na hora que o cartão aparece (não troca no meio da partida).
  const [daIA] = useState(() => {
    const j = useFeed.getState().jogos[props.cartao.id];
    return j && !j.ruim ? j : undefined;
  });
  const [falhou, setFalhou] = useState(false);
  if (daIA && !falhou) {
    return (
      <JogoIACard
        {...props}
        jogo={daIA}
        onFalhou={() => {
          useFeed.getState().marcarJogoRuim(props.cartao.id);
          setFalhou(true);
        }}
      />
    );
  }
  const jogo = jogoDoCartao(props.cartao);
  // O quiz clássico (com fogos por cima) é o próprio cartão de sempre.
  if (jogo === 'quiz') return <CartaoEscolhaView {...props} />;
  return <JogoAscii {...props} jogo={jogo} />;
}

function JogoAscii({ cartao, onResponder, onProximo, jogo }: PropsCartao<CartaoEscolha> & { jogo: Exclude<Jogo, 'quiz'> }) {
  const topico = useStudy((s) => s.topics.find((t) => t.id === cartao.topicId));
  const materia = useStudy((s) => s.subjects.find((x) => x.id === topico?.subjectId));
  const tema = temaDoJogo(materia?.name, materia?.language, topico?.title);
  const n = Math.min(cartao.opcoes.length, 5);

  const parado = semMovimento();
  const [escolha, setEscolha] = useState<number | null>(null);
  const [pos, setPos] = useState(Math.floor(n / 2));
  const tick = useQuadros(true);
  const t = parado ? 60 : tick;
  const ancora = useRef(0);

  const escolher = useCallback(
    (i: number) => {
      if (escolha !== null || i < 0 || i >= n) return;
      ancora.current = t;
      setEscolha(i);
      onResponder(i === cartao.certa, cartao.opcoes[i]);
    },
    [escolha, n, t, onResponder, cartao],
  );

  useTeclas(
    useCallback(
      (k) => {
        if (escolha !== null) return;
        if (jogo === 'comilao') {
          if (k === 'arrowleft') setPos((p) => Math.max(0, p - 1));
          else if (k === 'arrowright') setPos((p) => Math.min(n - 1, p + 1));
          else if (k === ' ' || k === 'enter' || k === 'arrowup') escolher(pos);
        }
        const i = k.charCodeAt(0) - 97;
        if (k.length === 1 && i >= 0 && i < n && jogo !== 'comilao') escolher(i);
      },
      [escolha, jogo, n, pos, escolher],
    ),
  );

  const respondeu = escolha !== null;
  const dt = !respondeu ? -1 : parado ? 99 : t - ancora.current;
  const base: Estado = { t, dt, n, certa: cartao.certa, escolha, tema };
  const quadro = jogo === 'chuva' ? quadroChuva(base) : jogo === 'comilao' ? quadroComilao({ ...base, pos }) : quadroBatalha(base);
  const acertou = escolha === cartao.certa;

  const dica = jogo === 'chuva' ? 'Atire na alternativa certa: toque na letra ou tecle A–' + String.fromCharCode(64 + n) + '.' : jogo === 'comilao' ? 'Mova o C com ◀ ▶ (ou as setas) e aperte COMER (espaço).' : 'Escolha o ataque certo: toque na letra ou tecle A–' + String.fromCharCode(64 + n) + '.';

  return (
    <div className="space-y-3">
      <p className="text-base font-bold text-fg">{cartao.pergunta}</p>
      {cartao.codigo && <pre className="overflow-x-auto rounded border border-line bg-bg p-3 text-xs text-accent">{cartao.codigo}</pre>}

      <div className="flex justify-center rounded border border-line bg-bg p-2">
        <pre className={cn(CLASSE_ASCII, !respondeu ? 'text-accent' : acertou ? 'text-accent' : 'text-danger')} aria-label={`Minijogo: ${jogo}`}>
          {quadro}
        </pre>
      </div>

      {!respondeu && <p className="text-[11px] text-muted">{dica}</p>}

      {jogo === 'comilao' && !respondeu && (
        <div className="flex gap-2">
          <button type="button" onClick={() => setPos((p) => Math.max(0, p - 1))} className="rounded border border-line px-3 py-1.5 hover:border-accent" aria-label="Mover pra esquerda">
            <ArrowLeft size={14} />
          </button>
          <button type="button" onClick={() => setPos((p) => Math.min(n - 1, p + 1))} className="rounded border border-line px-3 py-1.5 hover:border-accent" aria-label="Mover pra direita">
            <ArrowRight size={14} />
          </button>
          <button type="button" onClick={() => escolher(pos)} className="rounded border border-accent px-3 py-1.5 text-xs font-bold uppercase text-accent hover:bg-accent/10">
            Comer {String.fromCharCode(65 + pos)}
          </button>
        </div>
      )}

      {/* Legenda: o que cada letra do jogo significa. Também é o jeito acessível de responder. */}
      <div className="grid gap-1.5">
        {cartao.opcoes.slice(0, n).map((op, i) => (
          <button
            key={i}
            type="button"
            onClick={() => (jogo === 'comilao' ? !respondeu && setPos(i) : escolher(i))}
            disabled={respondeu}
            className={cn(
              'rounded border px-3 py-1.5 text-left text-sm transition',
              !respondeu && (jogo === 'comilao' && pos === i ? 'border-accent text-accent' : 'border-line hover:border-accent hover:text-accent'),
              respondeu && i === cartao.certa && 'border-accent bg-accent/15 text-accent',
              respondeu && i === escolha && i !== cartao.certa && 'border-danger bg-danger/15 text-danger',
              respondeu && i !== escolha && i !== cartao.certa && 'border-line text-muted',
            )}
          >
            <span className="mr-2 text-muted">{String.fromCharCode(65 + i)}.</span>
            {op}
          </button>
        ))}
      </div>

      {respondeu && (
        <div className="flex flex-wrap items-end gap-3">
          <p className="min-w-0 flex-1 text-sm text-muted">
            <b className={acertou ? 'text-accent' : 'text-danger'}>{acertou ? 'Isso! ' : 'Quase. '}</b>
            {cartao.explicacao}
          </p>
          <BotaoProximo onClick={onProximo} />
        </div>
      )}
    </div>
  );
}
