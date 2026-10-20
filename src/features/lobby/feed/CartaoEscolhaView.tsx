import { useState } from 'react';
import type { CartaoEscolha } from '../../../domain/cartoes';
import { cn } from '../../../lib/utils';
import { BotaoProximo, type PropsCartao } from './comum';

/** Revisão ativa e micro-desafio: escolhe, vê na hora se acertou e o porquê. */
export function CartaoEscolhaView({ cartao, onResponder, onProximo }: PropsCartao<CartaoEscolha>) {
  const [escolha, setEscolha] = useState<number | null>(null);
  const respondeu = escolha !== null;

  const escolher = (i: number) => {
    if (respondeu) return;
    setEscolha(i);
    onResponder(i === cartao.certa, cartao.opcoes[i]);
  };

  return (
    <div className="space-y-3">
      <p className="text-base font-bold text-fg">{cartao.pergunta}</p>
      {cartao.codigo && <pre className="overflow-x-auto rounded border border-line bg-bg p-3 text-xs text-accent">{cartao.codigo}</pre>}
      <div className="grid gap-2">
        {cartao.opcoes.map((op, i) => (
          <button
            key={i}
            type="button"
            onClick={() => escolher(i)}
            disabled={respondeu}
            className={cn(
              'rounded border px-3 py-2 text-left text-sm transition',
              !respondeu && 'border-line hover:border-accent hover:text-accent',
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
            <b className={escolha === cartao.certa ? 'text-accent' : 'text-danger'}>{escolha === cartao.certa ? 'Isso! ' : 'Quase. '}</b>
            {cartao.explicacao}
          </p>
          <BotaoProximo onClick={onProximo} />
        </div>
      )}
    </div>
  );
}
