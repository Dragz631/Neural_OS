import { useEffect, useMemo, useRef, useState } from 'react';
import { Delete } from 'lucide-react';
import { chaveDe, contaCerta, dificeis, dominioDe, enunciado, resultado, sortearContas, XP_MAX_DIA, type Conta } from '../domain/tabuada';
import { useCelular } from '../hooks/useCelular';
import { cn } from '../lib/utils';
import { sons } from '../services/sons';
import { useTabuada } from '../store/tabuada';
import { DesenhoBaseView } from './DesenhoBase';
import { Button } from './ui';

// Uma partida de tabuada: uma conta por vez, grande. Enter confere. Errou? Mostra a conta
// certa desenhada (7×8 = 7 fileiras de 8) e ela volta mais adiante na mesma partida.

interface Placar {
  acertos: number;
  erros: number;
  tempos: number[];
  xp: number;
  errados: string[];
}

export function PartidaTabuada({ quantas, segundos, onFim }: { quantas: number; segundos?: number; onFim?: (p: Placar) => void }) {
  const divisao = useTabuada((s) => s.divisao);
  const celular = useCelular();
  const [fila, setFila] = useState<Conta[]>(() => sortearContas(useTabuada.getState().fatos, quantas, divisao));
  const [i, setI] = useState(0);
  const [resposta, setResposta] = useState('');
  const [fase, setFase] = useState<'jogando' | 'errou' | 'fim'>('jogando');
  const [placar, setPlacar] = useState<Placar>({ acertos: 0, erros: 0, tempos: [], xp: 0, errados: [] });
  const [inicio] = useState(() => Date.now());
  const inicioConta = useRef(Date.now());
  const [agora, setAgora] = useState(() => Date.now());
  const campo = useRef<HTMLInputElement>(null);
  const c = fila[i];

  const terminar = (p: Placar) => {
    setFase('fim');
    sons.fim();
    onFim?.(p);
  };

  // Relógio da partida (por horário: trocar de aba não engana).
  useEffect(() => {
    if (!segundos || fase === 'fim') return;
    const t = setInterval(() => setAgora(Date.now()), 250);
    return () => clearInterval(t);
  }, [segundos, fase]);
  const restante = segundos ? Math.max(0, segundos - Math.floor((agora - inicio) / 1000)) : undefined;
  useEffect(() => {
    if (restante === 0 && fase !== 'fim') terminar(placar);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só quando o tempo zera
  }, [restante]);

  const seguir = () => {
    if (i + 1 >= fila.length) return terminar(placar);
    setI(i + 1);
    setResposta('');
    setFase('jogando');
    inicioConta.current = Date.now();
    campo.current?.focus();
  };

  const conferir = () => {
    if (fase === 'errou') return seguir();
    if (fase !== 'jogando' || !resposta.trim() || !c) return;
    const ms = Date.now() - inicioConta.current;
    const certo = Number(resposta) === resultado(c);
    const xp = useTabuada.getState().responder(c, certo, ms);
    if (certo) {
      sons.acerto();
      const p = { ...placar, acertos: placar.acertos + 1, tempos: [...placar.tempos, ms], xp: placar.xp + xp };
      setPlacar(p);
      if (i + 1 >= fila.length) return terminar(p);
      setI(i + 1);
      setResposta('');
      inicioConta.current = Date.now();
    } else {
      sons.erro();
      setPlacar({ ...placar, erros: placar.erros + 1, errados: [...new Set([...placar.errados, chaveDe(c.a, c.b).replace('x', '×')])] });
      // A conta errada volta 3 contas depois, na mesma partida.
      setFila((f) => [...f.slice(0, i + 3), c, ...f.slice(i + 3)]);
      setFase('errou');
    }
  };

  const tecla = (t: string) => {
    if (fase === 'errou') return seguir();
    if (t === '⌫') setResposta((r) => r.slice(0, -1));
    else if (t === 'OK') conferir();
    else setResposta((r) => (r.length < 3 ? r + t : r));
  };

  if (fase === 'fim') return <FimTabuada placar={placar} />;
  if (!c) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between text-[11px] text-muted">
        <span>
          {i + 1}/{fila.length}
        </span>
        <span className="text-accent">✓ {placar.acertos}</span>
        {restante !== undefined && <span className={cn('font-mono', restante <= 10 && 'text-warn')}>{restante}s</span>}
      </div>
      <p className="font-mono text-5xl font-bold tracking-wider text-fg" aria-live="polite">
        {enunciado(c)} = <span className={fase === 'errou' ? 'text-danger line-through' : 'text-accent'}>{resposta || '?'}</span>
      </p>
      {fase === 'errou' ? (
        <div className="flex flex-col items-center gap-2">
          <p className="font-mono text-2xl text-warn">{contaCerta(c)}</p>
          {c.a * c.b <= 100 && <DesenhoBaseView d={{ tipo: 'fileiras', linhas: c.a, colunas: c.b }} />}
          <p className="text-[11px] text-muted">Ela volta daqui a pouco nesta partida.</p>
          <Button variant="primary" onClick={seguir} autoFocus>
            Entendi, próxima
          </Button>
        </div>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            conferir();
          }}
        >
          <input
            ref={campo}
            value={resposta}
            onChange={(e) => setResposta(e.target.value.replace(/\D/g, '').slice(0, 3))}
            inputMode={celular ? 'none' : 'numeric'}
            autoFocus
            aria-label="Sua resposta"
            className="w-28 rounded border border-line bg-bg px-3 py-2 text-center font-mono text-2xl text-fg"
          />
          <Button variant="primary" type="submit" disabled={!resposta}>
            OK
          </Button>
        </form>
      )}
      {celular && fase === 'jogando' && (
        <div className="grid w-full max-w-[260px] grid-cols-3 gap-1.5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', 'OK'].map((t) => (
            <button key={t} type="button" onClick={() => tecla(t)} className={cn('rounded border py-3 font-mono text-xl', t === 'OK' ? 'border-accent bg-accent/15 text-accent' : 'border-line text-fg active:bg-panel-2')}>
              {t === '⌫' ? <Delete size={18} className="mx-auto" /> : t}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FimTabuada({ placar }: { placar: Placar }) {
  const fatos = useTabuada((s) => s.fatos);
  const xpDia = useTabuada((s) => s.xpDia.xp);
  const media = placar.tempos.length ? (placar.tempos.reduce((s, t) => s + t, 0) / placar.tempos.length / 1000).toFixed(1) : '–';
  const dif = placar.errados.length ? placar.errados.slice(0, 4) : dificeis(fatos);
  return (
    <div className="space-y-2 text-center">
      <p className="text-2xl font-bold text-accent">
        {placar.acertos} {placar.acertos === 1 ? 'certa' : 'certas'}
        {placar.erros ? <span className="text-warn"> · {placar.erros} {placar.erros === 1 ? 'errada' : 'erradas'}</span> : null}
      </p>
      <p className="text-xs text-muted">
        {media}s por conta, em média · +{placar.xp} XP{xpDia >= XP_MAX_DIA ? ` (o teto de ${XP_MAX_DIA} XP da tabuada de hoje já bateu)` : ''}
      </p>
      {dif.length > 0 && (
        <p className="text-sm">
          Os seus difíceis: <b className="font-mono text-warn">{dif.join(', ')}</b>
        </p>
      )}
    </div>
  );
}

const COR: Record<string, string> = { novo: 'bg-line/40', fraco: 'bg-danger/70', medio: 'bg-warn/70', forte: 'bg-accent/80' };

/** O mapa 10×10: cada quadradinho é uma conta, colorido por quanto você sabe. */
export function MapaTabuada() {
  const fatos = useTabuada((s) => s.fatos);
  const celulas = useMemo(() => Array.from({ length: 100 }, (_, n) => ({ a: Math.floor(n / 10) + 1, b: (n % 10) + 1 })), []);
  return (
    <div>
      <div className="grid w-full max-w-[170px] grid-cols-10 gap-[2px]" role="img" aria-label="Mapa da tabuada de 1×1 a 10×10">
        {celulas.map(({ a, b }) => {
          const f = fatos[chaveDe(a, b)];
          return <span key={`${a}-${b}`} title={`${a}×${b} = ${a * b}${f ? ` · ${f.acertos} certas, ${f.erros} erradas` : ' · ainda não jogou'}`} className={cn('aspect-square rounded-[2px]', COR[dominioDe(f)])} />;
        })}
      </div>
      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-muted">
        <span><i className="mr-1 inline-block h-2 w-2 rounded-[2px] bg-accent/80" />sabe</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-[2px] bg-warn/70" />quase</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-[2px] bg-danger/70" />errou</span>
        <span><i className="mr-1 inline-block h-2 w-2 rounded-[2px] bg-line/40" />não jogou</span>
      </div>
    </div>
  );
}
