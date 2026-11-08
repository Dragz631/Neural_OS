import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import type { CartaoEscolha } from '../../../../domain/cartoes';
import { cn } from '../../../../lib/utils';
import { BotaoProximo, type PropsCartao } from '../comum';
import { ALTURA, Grade, LARGURA, semMovimento, useQuadros, useTeclas } from './ascii';
import type { TemaJogo } from './tema';
import { semAcento } from './regras';

// Jogos de "fliperama" do Feed: cobrinha, invasores, corrida de faixas e forca.
// Diferente dos quadros de quadros.ts, estes têm estado próprio (posição, tiro, cobra),
// mas a regra é a mesma: o jogo só muda COMO você responde; acerto, combo e diário
// continuam com o Feed (onResponder).

export interface PropsArcade extends PropsCartao<CartaoEscolha> {
  tema: TemaJogo;
  /** Milissegundos por quadro: quem domina o tópico joga mais rápido. */
  ms: number;
}

const letra = (i: number) => String.fromCharCode(65 + i);
const colunaDe = (i: number, n: number) => 2 + Math.round(((i + 0.5) * (LARGURA - 4)) / n) - 1;
const CLASSE = 'm-0 select-none whitespace-pre font-mono text-[13px] leading-[1.1]';

/** Moldura comum: pergunta, tela ASCII, controles, legenda e o resultado. */
function Casca({
  cartao,
  quadro,
  respondeu,
  acertou,
  dica,
  controles,
  legenda = true,
  onProximo,
  nome,
}: {
  cartao: CartaoEscolha;
  quadro: string;
  respondeu: boolean;
  acertou: boolean;
  dica: string;
  controles?: ReactNode;
  legenda?: boolean;
  onProximo: () => void;
  nome: string;
}) {
  return (
    <div className="space-y-3">
      <p className="text-base font-bold text-fg">{cartao.pergunta}</p>
      {cartao.codigo && <pre className="overflow-x-auto rounded border border-line bg-bg p-3 text-xs text-accent">{cartao.codigo}</pre>}
      <div className="flex justify-center overflow-x-auto rounded border border-line bg-bg p-2">
        <pre className={cn(CLASSE, !respondeu || acertou ? 'text-accent' : 'text-danger')} aria-label={`Minijogo: ${nome}`}>
          {quadro}
        </pre>
      </div>
      {!respondeu && <p className="text-[11px] text-muted">{dica}</p>}
      {!respondeu && controles}
      {legenda && (
        <div className="grid gap-1.5">
          {cartao.opcoes.slice(0, 5).map((op, i) => (
            <div
              key={i}
              className={cn(
                'rounded border px-3 py-1.5 text-sm',
                !respondeu && 'border-line text-fg',
                respondeu && i === cartao.certa && 'border-accent bg-accent/15 text-accent',
                respondeu && i !== cartao.certa && 'border-line text-muted',
              )}
            >
              <span className="mr-2 text-muted">{letra(i)}.</span>
              {op}
            </div>
          ))}
        </div>
      )}
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

const Tecla = ({ onClick, rotulo, children, className }: { onClick: () => void; rotulo: string; children: ReactNode; className?: string }) => (
  <button
    type="button"
    // pointerdown: no celular o toque responde na hora (sem o atraso do click).
    onPointerDown={(e) => {
      e.preventDefault();
      onClick();
    }}
    aria-label={rotulo}
    className={cn('flex h-10 min-w-10 items-center justify-center rounded border border-line px-3 text-xs font-bold uppercase hover:border-accent hover:text-accent active:bg-accent/15', className)}
  >
    {children}
  </button>
);

/** Explosão (certa) ou X (errada) no lugar do alvo, alguns quadros depois da resposta. */
function marcarAlvo(g: Grade, x: number, y: number, certa: boolean, dt: number) {
  if (certa) {
    const FORMAS = [[' * ', '*+*', ' * '], ['\\|/', '-*-', '/|\\'], ['. .', ' * ', '. .']];
    FORMAS[dt % 3].forEach((l, r) => g.texto(x, y - 1 + r, l, true));
  } else {
    g.texto(x, y, 'X X', true);
    g.texto(x, y + 1, ' X ', true);
  }
}

// ── Cobrinha ────────────────────────────────────────────────────────────────

type Dir = 'cima' | 'baixo' | 'esq' | 'dir';
const PASSO: Record<Dir, [number, number]> = { cima: [0, -1], baixo: [0, 1], esq: [-1, 0], dir: [1, 0] };
const OPOSTA: Record<Dir, Dir> = { cima: 'baixo', baixo: 'cima', esq: 'dir', dir: 'esq' };

export function JogoCobra({ cartao, onResponder, onProximo, tema, ms }: PropsArcade) {
  const n = Math.min(cartao.opcoes.length, 5);
  // As letras ficam em duas fileiras, alternando; a cobra nasce embaixo, no meio, indo pra cima.
  const alvos = Array.from({ length: n }, (_, i) => ({ x: colunaDe(i, n) - 1, y: i % 2 ? 6 : 3 }));
  const [escolha, setEscolha] = useState<number | null>(null);
  const [comecou, setComecou] = useState(false);
  const corpo = useRef<[number, number][]>([
    [21, 10],
    [21, 11],
    [21, 12],
  ]);
  const dir = useRef<Dir>('cima');
  const proxima = useRef<Dir>('cima');
  const ancora = useRef(0);
  const t = useQuadros(true, ms);
  const parado = semMovimento();

  const virar = useCallback(
    (d: Dir) => {
      if (escolha !== null) return;
      setComecou(true);
      if (d !== OPOSTA[dir.current]) proxima.current = d;
    },
    [escolha],
  );

  // Anda um passo por quadro (atravessa as paredes: aqui ninguém morre, só escolhe).
  useEffect(() => {
    if (!comecou || escolha !== null) return;
    dir.current = proxima.current;
    const [dx, dy] = PASSO[dir.current];
    const [hx, hy] = corpo.current[0];
    const nx = (hx + dx + LARGURA) % LARGURA;
    const ny = 1 + ((hy + dy - 1 + (ALTURA - 1)) % (ALTURA - 1)); // linha 0 é o placar
    corpo.current = [[nx, ny], ...corpo.current.slice(0, 5)];
    const i = alvos.findIndex((a) => ny === a.y && nx >= a.x && nx <= a.x + 2);
    if (i >= 0) {
      ancora.current = t;
      setEscolha(i);
      onResponder(i === cartao.certa, cartao.opcoes[i]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  useTeclas(
    useCallback(
      (k) => {
        const mapa: Record<string, Dir> = { arrowup: 'cima', w: 'cima', arrowdown: 'baixo', s: 'baixo', arrowleft: 'esq', a: 'esq', arrowright: 'dir', d: 'dir' };
        if (mapa[k]) virar(mapa[k]);
      },
      [virar],
    ),
  );

  const dt = escolha === null ? -1 : t - ancora.current;
  const g = new Grade();
  g.texto(0, 0, ` ${tema.simbolos.join(' ')}  `.padEnd(LARGURA, '~').slice(0, LARGURA));
  alvos.forEach((a, i) => {
    if (escolha === i) marcarAlvo(g, a.x, a.y, i === cartao.certa, Math.max(0, dt));
    else if (escolha !== null && i === cartao.certa && dt > 3) g.texto(a.x, a.y, t % 2 ? `<${letra(i)}>` : `[${letra(i)}]`);
    else g.texto(a.x, a.y, `[${letra(i)}]`);
  });
  corpo.current.forEach(([x, y], k) => g.texto(x, y, k === 0 ? (escolha === null || escolha === cartao.certa ? '@' : 'x') : 'o', true));
  if (!comecou && !parado) g.texto(12, 9, 'aperte uma seta');

  return (
    <Casca
      cartao={cartao}
      quadro={g.toString()}
      respondeu={escolha !== null}
      acertou={escolha === cartao.certa}
      dica="Guie a cobrinha (@) com as setas até a letra certa. Ela atravessa as paredes."
      nome="cobrinha"
      onProximo={onProximo}
      controles={
        <div className="grid w-fit grid-cols-3 gap-1">
          <span />
          <Tecla rotulo="Cima" onClick={() => virar('cima')}>
            <ArrowUp size={14} />
          </Tecla>
          <span />
          <Tecla rotulo="Esquerda" onClick={() => virar('esq')}>
            <ArrowLeft size={14} />
          </Tecla>
          <Tecla rotulo="Baixo" onClick={() => virar('baixo')}>
            <ArrowDown size={14} />
          </Tecla>
          <Tecla rotulo="Direita" onClick={() => virar('dir')}>
            <ArrowRight size={14} />
          </Tecla>
        </div>
      }
    />
  );
}

// ── Invasores ───────────────────────────────────────────────────────────────

export function JogoInvasores({ cartao, onResponder, onProximo, tema, ms }: PropsArcade) {
  const n = Math.min(cartao.opcoes.length, 5);
  const [escolha, setEscolha] = useState<number | null>(null);
  const [nave, setNave] = useState(Math.floor(LARGURA / 2) - 1);
  const [tiro, setTiro] = useState<{ x: number; t0: number } | null>(null);
  const [errouTiro, setErrouTiro] = useState(0);
  const ancora = useRef(0);
  const t = useQuadros(true, ms);
  const parado = semMovimento();

  // As naves marcham pros lados, juntas, como no fliperama.
  const ESPACO = 8;
  const largura = (n - 1) * ESPACO + 3;
  const folga = LARGURA - largura - 2;
  const tt = escolha === null ? t : ancora.current;
  const ida = folga > 0 ? Math.floor(tt / 4) % (folga * 2) : 0;
  const desloc = parado ? Math.floor(folga / 2) : ida < folga ? ida : folga * 2 - ida;
  const xs = Array.from({ length: n }, (_, i) => 1 + desloc + i * ESPACO);
  const Y_NAVE = 2;
  const Y_CANHAO = ALTURA - 1;

  const tiroY = tiro ? Y_CANHAO - 1 - (t - tiro.t0) * 2 : null;
  useEffect(() => {
    if (!tiro || tiroY === null || escolha !== null || tiroY > Y_NAVE) return;
    const i = xs.findIndex((x) => tiro.x >= x && tiro.x <= x + 2);
    setTiro(null);
    if (i >= 0) {
      ancora.current = t;
      setEscolha(i);
      onResponder(i === cartao.certa, cartao.opcoes[i]);
    } else setErrouTiro(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiroY]);

  const mover = useCallback((d: number) => escolha === null && setNave((x) => Math.max(0, Math.min(LARGURA - 3, x + d))), [escolha]);
  const atirar = useCallback(() => {
    if (escolha !== null || tiro) return;
    setTiro({ x: nave + 1, t0: t });
  }, [escolha, tiro, nave, t]);

  useTeclas(
    useCallback(
      (k) => {
        if (k === 'arrowleft' || k === 'a') mover(-2);
        else if (k === 'arrowright' || k === 'd') mover(2);
        else if (k === ' ' || k === 'arrowup' || k === 'w' || k === 'enter') atirar();
      },
      [mover, atirar],
    ),
  );

  const dt = escolha === null ? -1 : t - ancora.current;
  const g = new Grade();
  g.texto(0, 0, `INVASORES: ${tema.chefe}`.slice(0, LARGURA));
  xs.forEach((x, i) => {
    if (escolha === i) marcarAlvo(g, x, Y_NAVE, i === cartao.certa, Math.max(0, dt));
    else if (escolha !== null && i === cartao.certa && dt > 3) g.texto(x, Y_NAVE, t % 2 ? `<${letra(i)}>` : `/${letra(i)}\\`);
    else {
      g.texto(x, Y_NAVE, `/${letra(i)}\\`);
      g.texto(x, Y_NAVE + 1, t % 2 ? '^ ^' : ' ^ ');
    }
  });
  if (tiro && tiroY !== null && tiroY > Y_NAVE) g.texto(tiro.x, tiroY, '|');
  if (errouTiro && t - errouTiro < 6 && escolha === null) g.texto(14, 6, 'passou longe!');
  g.texto(0, Y_CANHAO - 1, '_'.repeat(LARGURA));
  g.texto(nave, Y_CANHAO, '/^\\', true);

  return (
    <Casca
      cartao={cartao}
      quadro={g.toString()}
      respondeu={escolha !== null}
      acertou={escolha === cartao.certa}
      dica="Mova o canhão (◀ ▶) e atire (espaço) na nave da letra certa. Elas não param de andar!"
      nome="invasores"
      onProximo={onProximo}
      controles={
        <div className="flex gap-1">
          <Tecla rotulo="Esquerda" onClick={() => mover(-2)}>
            <ArrowLeft size={14} />
          </Tecla>
          <Tecla rotulo="Direita" onClick={() => mover(2)}>
            <ArrowRight size={14} />
          </Tecla>
          <Tecla rotulo="Atirar" onClick={atirar} className="border-accent text-accent">
            Atirar
          </Tecla>
        </div>
      }
    />
  );
}

// ── Corrida de faixas ──────────────────────────────────────────────────────

export function JogoCorrida({ cartao, onResponder, onProximo, tema, ms }: PropsArcade) {
  const n = Math.min(cartao.opcoes.length, 5);
  const [escolha, setEscolha] = useState<number | null>(null);
  const [faixa, setFaixa] = useState(Math.floor(n / 2));
  const [largada, setLargada] = useState<number | null>(null);
  const ancora = useRef(0);
  const t = useQuadros(true, ms);
  const Y_CARRO = ALTURA - 2;
  const LENTO = 4; // quadros por linha: dá tempo de ler as faixas

  const portaoY = largada === null ? 1 : 1 + Math.floor((t - largada) / LENTO);
  useEffect(() => {
    if (largada === null || escolha !== null || portaoY < Y_CARRO) return;
    ancora.current = t;
    setEscolha(faixa);
    onResponder(faixa === cartao.certa, cartao.opcoes[faixa]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portaoY]);

  const mover = useCallback(
    (d: number) => {
      if (escolha !== null) return;
      setLargada((l) => l ?? t);
      setFaixa((f) => Math.max(0, Math.min(n - 1, f + d)));
    },
    [escolha, n, t],
  );
  useTeclas(
    useCallback(
      (k) => {
        if (k === 'arrowleft' || k === 'a') mover(-1);
        else if (k === 'arrowright' || k === 'd') mover(1);
        else if (k === 'arrowup' || k === ' ' || k === 'w') mover(0);
      },
      [mover],
    ),
  );

  const dt = escolha === null ? -1 : t - ancora.current;
  const g = new Grade();
  g.texto(0, 0, `CORRIDA  ${tema.simbolos.slice(0, 3).join(' ')}`);
  // Bordas e as linhas tracejadas da pista andando.
  for (let y = 1; y < ALTURA; y++) {
    g.texto(0, y, '|');
    g.texto(LARGURA - 1, y, '|');
    for (let i = 1; i < n; i++) {
      const xDiv = Math.round((colunaDe(i - 1, n) + colunaDe(i, n)) / 2);
      if ((y + (largada === null ? 0 : t)) % 3 !== 0) g.texto(xDiv, y, ':');
    }
  }
  // O portão com as letras desce; quando chega no carro, vale a faixa em que você está.
  const yp = Math.min(portaoY, Y_CARRO - 1);
  for (let i = 0; i < n; i++) {
    const x = colunaDe(i, n) - 1;
    if (escolha === i) marcarAlvo(g, x, yp, i === cartao.certa, Math.max(0, dt));
    else if (escolha !== null && i === cartao.certa && dt > 3) g.texto(x, yp, t % 2 ? `<${letra(i)}>` : `=${letra(i)}=`);
    else g.texto(x, yp, `=${letra(i)}=`);
  }
  const cx = colunaDe(faixa, n) - 1;
  g.texto(cx, Y_CARRO, '[^]', true);
  g.texto(cx, Y_CARRO + 1, 'o o', true);
  if (largada === null) g.texto(10, 6, 'mova pra largar (◀ ▶ ▲)');

  return (
    <Casca
      cartao={cartao}
      quadro={g.toString()}
      respondeu={escolha !== null}
      acertou={escolha === cartao.certa}
      dica="Cada faixa é uma resposta. Fique na faixa certa quando o portão chegar no carro."
      nome="corrida"
      onProximo={onProximo}
      controles={
        <div className="flex gap-1">
          <Tecla rotulo="Faixa da esquerda" onClick={() => mover(-1)}>
            <ArrowLeft size={14} />
          </Tecla>
          <Tecla rotulo="Faixa da direita" onClick={() => mover(1)}>
            <ArrowRight size={14} />
          </Tecla>
          {largada === null && (
            <Tecla rotulo="Largar" onClick={() => mover(0)} className="border-accent text-accent">
              Largar
            </Tecla>
          )}
        </div>
      }
    />
  );
}

// ── Forca ───────────────────────────────────────────────────────────────────

const MAX_ERROS = 6;

const BONECO = [
  ['  +---+  ', '  |   |  ', '      |  ', '      |  ', '      |  ', ' ======  '],
  ['  +---+  ', '  |   |  ', '  O   |  ', '      |  ', '      |  ', ' ======  '],
  ['  +---+  ', '  |   |  ', '  O   |  ', '  |   |  ', '      |  ', ' ======  '],
  ['  +---+  ', '  |   |  ', '  O   |  ', ' /|   |  ', '      |  ', ' ======  '],
  ['  +---+  ', '  |   |  ', '  O   |  ', ' /|\\  |  ', '      |  ', ' ======  '],
  ['  +---+  ', '  |   |  ', '  O   |  ', ' /|\\  |  ', ' /    |  ', ' ======  '],
  ['  +---+  ', '  |   |  ', '  x   |  ', ' /|\\  |  ', ' / \\  |  ', ' ======  '],
];

export function JogoForca({ cartao, onResponder, onProximo, tema }: PropsArcade) {
  const palavra = (cartao.opcoes[cartao.certa] ?? '').trim();
  const alvo = semAcento(palavra);
  const [chutes, setChutes] = useState<string[]>([]);
  const [fim, setFim] = useState<null | boolean>(null);
  const erros = chutes.filter((c) => !alvo.includes(c)).length;
  const revelada = [...palavra].map((ch, i) => (/[A-Z]/.test(alvo[i] ?? '') ? (chutes.includes(alvo[i]) || fim !== null ? ch.toUpperCase() : '_') : ch)).join(' ');
  const t = useQuadros(fim !== null);

  const chutar = useCallback(
    (l: string) => {
      if (fim !== null || chutes.includes(l)) return;
      const novos = [...chutes, l];
      setChutes(novos);
      const ganhou = [...alvo].every((ch) => !/[A-Z]/.test(ch) || novos.includes(ch));
      const perdeu = novos.filter((c) => !alvo.includes(c)).length >= MAX_ERROS;
      if (ganhou || perdeu) {
        setFim(ganhou);
        onResponder(ganhou, ganhou ? palavra : `(forca) ${novos.join('')}`);
      }
    },
    [fim, chutes, alvo, palavra, onResponder],
  );
  useTeclas(useCallback((k) => /^[a-z]$/.test(k) && chutar(k.toUpperCase()), [chutar]));

  const g = new Grade();
  g.texto(0, 0, `FORCA  ${tema.simbolos.slice(0, 3).join(' ')}`);
  BONECO[Math.min(erros, MAX_ERROS)].forEach((l, r) => g.texto(1, 2 + r, l));
  g.texto(13, 3, revelada.slice(0, LARGURA - 13));
  g.texto(13, 6, `erros: ${'x'.repeat(erros)}${'.'.repeat(MAX_ERROS - erros)}`);
  if (fim === true) g.texto(13, 8, t % 2 ? '*** SALVO! ***' : '+++ SALVO! +++');
  if (fim === false) g.texto(13, 8, 'enforcado...');

  return (
    <Casca
      cartao={cartao}
      quadro={g.toString()}
      respondeu={fim !== null}
      acertou={fim === true}
      legenda={false}
      dica={`Descubra a resposta letra por letra (${alvo.replace(/[^A-Z]/g, '').length} letras). Acentos não importam. ${MAX_ERROS} erros e o boneco cai.`}
      nome="forca"
      onProximo={onProximo}
      controles={
        <div className="flex flex-wrap gap-1">
          {'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((l) => (
            <button
              key={l}
              type="button"
              disabled={chutes.includes(l)}
              onClick={() => chutar(l)}
              className={cn('h-8 w-8 rounded border text-xs font-bold', chutes.includes(l) ? (alvo.includes(l) ? 'border-accent/50 text-accent/60' : 'border-line text-muted/50 line-through') : 'border-line hover:border-accent hover:text-accent')}
            >
              {l}
            </button>
          ))}
        </div>
      }
    />
  );
}
