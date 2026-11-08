import { Play, Volume2, VolumeX, Zap } from 'lucide-react';
import { useState, type ComponentType } from 'react';
import { TIPOS_CARTAO, type Cartao, type TipoCartao } from '../../../domain/cartoes';
import { toLocalDate } from '../../../domain/dates';
import { Badge, Button, ErrorNote, Panel } from '../../../components/ui';
import { cn } from '../../../lib/utils';
import { useFeed } from '../../../store/feed';
import { useStudy } from '../../../store/study';
import { Fogos } from './jogos/Fogos';
import { JogoEscolha } from './jogos/JogoEscolha';
import { JogoOrdem } from './jogos/JogoOrdem';
import { temaDoJogo } from './jogos/tema';
import { CartaoFraseView } from './CartaoFraseView';
import { CartaoLembraView } from './CartaoLembraView';
import type { PropsCartao } from './comum';
import { FimDeRodada } from './FimDeRodada';
import { useRodada } from './useRodada';

// Tipo novo de cartão: registre em domain/cartoes.ts e o componente aqui.
const COMPONENTES: Record<TipoCartao, ComponentType<PropsCartao<never>>> = {
  revisao: JogoEscolha,
  micro: JogoEscolha,
  frase: CartaoFraseView,
  lembra: CartaoLembraView,
  ordem: JogoOrdem,
};

/** Feed do Lobby: rodadas surpresa (de 3 a 8 cartões, o app decide), com combo e XP. */
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
      {r.fase === 'carregando' && <p className="py-10 text-center text-sm text-muted">{r.criandoJogo ? 'A IA está inventando o jogo da 1ª pergunta… (os outros saem enquanto você joga)' : r.carregando ? 'O professor está preparando os cartões…' : 'Montando a rodada…'}</p>}
      {r.fase === 'vazio' && <Vazio />}
      {r.fase === 'jogando' && r.cartao && (
        <Jogando cartao={r.cartao} indice={r.indice} combo={r.combo} pop={r.pop} onResponder={r.responder} onProximo={r.proximo} />
      )}
      {r.fase === 'fim' && <FimDeRodada resultados={r.resultados} maiorCombo={r.maiorCombo} onMais={r.comecar} />}
      {r.fase !== 'jogando' && <ErrorNote error={r.erro} />}
    </Panel>
  );
}

function Inicio({ onComecar }: { onComecar: () => void }) {
  return (
    <div className="space-y-3 py-6 text-center">
      <p className="text-sm text-muted">Uma rodada surpresa do que você já estudou. Acertos seguidos multiplicam o XP.</p>
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
  combo,
  pop,
  onResponder,
  onProximo,
}: {
  cartao: Cartao;
  indice: number;
  combo: number;
  pop: { xp: number; chave: number } | null;
} & Omit<PropsCartao<Cartao>, 'cartao'>) {
  const topicoObj = useStudy((s) => s.topics.find((t) => t.id === cartao.topicId));
  const materia = useStudy((s) => s.subjects.find((x) => x.id === topicoObj?.subjectId));
  const topico = topicoObj?.title;
  const Componente = COMPONENTES[cartao.tipo] as ComponentType<PropsCartao<Cartao>>;
  const [fogos, setFogos] = useState(0);
  const simbolos = temaDoJogo(materia?.name, materia?.language, topico).simbolos;

  // Acertou: fogos e confete em ASCII por cima do cartão, em qualquer tipo.
  const responder: PropsCartao<Cartao>['onResponder'] = (acertou, resposta) => {
    onResponder(acertou, resposta);
    if (acertou) setFogos(Date.now());
  };

  return (
    // key por cartão: cada um "entra" de baixo, como o próximo vídeo de um reels.
    <div key={cartao.id + indice} className="reel-in relative space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-wider">
        {/* Surpresa: mostra só quantos já foram, nunca quantos faltam. */}
        <span className="font-bold text-accent" aria-label={`Cartão ${indice + 1}`}>
          #{indice + 1}
        </span>
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
      <Componente cartao={cartao} onResponder={responder} onProximo={onProximo} />
      <Fogos chave={fogos} simbolos={simbolos} />
    </div>
  );
}
