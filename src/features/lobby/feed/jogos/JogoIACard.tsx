import { useCallback, useState } from 'react';
import type { CartaoEscolha } from '../../../../domain/cartoes';
import type { JogoIA } from '../../../../domain/jogoIA';
import { useStudy } from '../../../../store/study';
import { cn } from '../../../../lib/utils';
import { BotaoProximo, type PropsCartao } from '../comum';
import { JogoSandbox } from './JogoSandbox';
import { temaDoJogo } from './tema';

/** Cartão de múltipla escolha cujo "jogo" foi inventado pela IA pra esta pergunta. */
export function JogoIACard({ cartao, onResponder, onProximo, jogo, onFalhou }: PropsCartao<CartaoEscolha> & { jogo: JogoIA; onFalhou: (motivo: string) => void }) {
  const topico = useStudy((s) => s.topics.find((t) => t.id === cartao.topicId));
  const materia = useStudy((s) => s.subjects.find((x) => x.id === topico?.subjectId));
  const tema = temaDoJogo(materia?.name, materia?.language, topico?.title);
  const [escolha, setEscolha] = useState<number | null>(null);
  const [direto, setDireto] = useState(false);
  const respondeu = escolha !== null;
  const acertou = escolha === cartao.certa;

  const escolher = useCallback(
    (i: number) => {
      if (escolha !== null || i < 0 || i >= cartao.opcoes.length) return;
      setEscolha(i);
      onResponder(i === cartao.certa, cartao.opcoes[i]);
    },
    [escolha, cartao, onResponder],
  );

  return (
    <div className="space-y-3">
      <p className="text-base font-bold text-fg">{cartao.pergunta}</p>
      {cartao.codigo && <pre className="overflow-x-auto rounded border border-line bg-bg p-3 text-xs text-accent">{cartao.codigo}</pre>}

      <JogoSandbox jogo={jogo} cartao={cartao} tema={tema} materia={materia?.name ?? ''} topico={topico?.title ?? ''} respondeu={respondeu} acertou={acertou} onEscolher={escolher} onFalhou={onFalhou} />

      {/* Legenda das letras. Só responde direto se o jogo travar (ou depois de responder, pra ver o certo). */}
      <div className="grid gap-1.5">
        {cartao.opcoes.slice(0, 5).map((op, i) => (
          <button
            key={i}
            type="button"
            onClick={() => escolher(i)}
            disabled={!direto || respondeu}
            className={cn(
              'rounded border px-3 py-1.5 text-left text-sm transition',
              !respondeu && 'border-line',
              !respondeu && direto && 'hover:border-accent hover:text-accent',
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
      {!respondeu && !direto && (
        <button type="button" onClick={() => setDireto(true)} className="text-[11px] text-muted underline hover:text-accent">
          O jogo travou? Responder pelas letras
        </button>
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
