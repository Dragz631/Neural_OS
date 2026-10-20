import { Play, Volume2, VolumeX, Zap } from 'lucide-react';
import type { ComponentType } from 'react';
import { TIPOS_CARTAO, type Cartao, type TipoCartao } from '../../../domain/cartoes';
import { toLocalDate } from '../../../domain/dates';
import { Badge, Button, ErrorNote, Panel } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import { useFeed } from '../../../store/feed';
import { useStudy } from '../../../store/study';
import { CartaoEscolhaView } from './CartaoEscolhaView';
import { CartaoFraseView } from './CartaoFraseView';
import { CartaoLembraView } from './CartaoLembraView';
import type { PropsCartao } from './comum';
import { FimDeRodada } from './FimDeRodada';
import { useRodada } from './useRodada';

// Tipo novo de cartão: registre em domain/cartoes.ts e o componente aqui.
const COMPONENTES: Record<TipoCartao, ComponentType<PropsCartao<never>>> = {
  revisao: CartaoEscolhaView,
  micro: CartaoEscolhaView,
  frase: CartaoFraseView,
  lembra: CartaoLembraView,
};

/** Feed do Lobby: rodadas de 5 cartões de 1 minuto, com combo e XP. */
export function FeedCartoes() {
  const r = useRodada();
  const som = useFeed((s) => s.som);
  const alternarSom = useFeed((s) => s.alternarSom);
  const rodadasHoje = useFeed((s) => (s.rodadas.data === toLocalDate() ? s.rodadas.n : 0));

  return (
    <Panel
      accent={r.fase === 'jogando'}
      title="Feed // 1 minuto por cartão"
      actions={
        <>
          {rodadasHoje > 0 && <Badge>{rodadasHoje} rodada(s) hoje</Badge>}
          <button type="button" onClick={alternarSom} className="text-muted hover:text-accent" aria-label={som ? 'Desligar som' : 'Ligar som'} title={som ? 'Som ligado' : 'Som desligado'}>
            {som ? <Volume2 size={15} /> : <VolumeX size={15} />}
          </button>
        </>
      }
    >
      {r.fase === 'parado' && <Inicio onComecar={r.comecar} />}
      {r.fase === 'carregando' && <p className="py-10 text-center text-sm text-muted">{r.carregando ? 'O professor está preparando os cartões…' : 'Montando a rodada…'}</p>}
      {r.fase === 'vazio' && <Vazio />}
      {r.fase === 'jogando' && r.cartao && (
        <Jogando cartao={r.cartao} indice={r.indice} total={r.total} combo={r.combo} pop={r.pop} onResponder={r.responder} onProximo={r.proximo} />
      )}
      {r.fase === 'fim' && <FimDeRodada resultados={r.resultados} maiorCombo={r.maiorCombo} onMais={r.comecar} />}
      {r.fase !== 'jogando' && <ErrorNote error={r.erro} />}
    </Panel>
  );
}

function Inicio({ onComecar }: { onComecar: () => void }) {
  return (
    <div className="space-y-3 py-6 text-center">
      <p className="text-sm text-muted">5 cartões rápidos do que você já estudou: revisão, micro-desafio e "explique em 1 frase". Acertos seguidos multiplicam o XP.</p>
      <Button variant="primary" onClick={onComecar}>
        <Play size={13} /> Começar rodada
      </Button>
    </div>
  );
}

function Vazio() {
  const temTopicos = useStudy((s) => s.topics.length > 0);
  return (
    <p className="py-8 text-center text-sm text-muted">
      {temTopicos ? 'Ainda não tem nada estudado pra revisar. Faça o próximo passo lá em cima e o feed acende.' : 'Crie sua primeira matéria e o feed acende com cartões dela.'}
    </p>
  );
}

function Jogando({
  cartao,
  indice,
  total,
  combo,
  pop,
  onResponder,
  onProximo,
}: {
  cartao: Cartao;
  indice: number;
  total: number;
  combo: number;
  pop: { xp: number; chave: number } | null;
} & Omit<PropsCartao<Cartao>, 'cartao'>) {
  const topico = useStudy((s) => s.topics.find((t) => t.id === cartao.topicId)?.title);
  const Componente = COMPONENTES[cartao.tipo] as ComponentType<PropsCartao<Cartao>>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider">
        <div className="flex gap-1" aria-label={`Cartão ${indice + 1} de ${total}`}>
          {Array.from({ length: total }, (_, i) => (
            <span key={i} className={cn('h-1.5 w-6 rounded-full', i < indice ? 'bg-accent' : i === indice ? 'bg-accent/60' : 'bg-line')} />
          ))}
        </div>
        <span className="text-muted">{TIPOS_CARTAO[cartao.tipo].rotulo}</span>
        {topico && <span className="truncate text-muted/70">· {topico}</span>}
        <span key={combo} className={cn('relative ml-auto flex items-center gap-1 rounded border px-2 py-0.5 font-bold', combo >= 2 ? 'combo-glow border-accent text-accent' : 'border-line text-muted')}>
          <Zap size={11} /> combo x{Math.max(combo, 1)}
          {pop && (
            <span key={pop.chave} className="xp-pop absolute -top-5 right-0 text-xs font-bold text-accent">
              +{pop.xp} XP
            </span>
          )}
        </span>
      </div>
      <Componente key={cartao.id + indice} cartao={cartao} onResponder={onResponder} onProximo={onProximo} />
    </div>
  );
}
