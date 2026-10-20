import { useState } from 'react';
import type { CartaoLembra } from '../../../domain/cartoes';
import { Button } from '../../../components/ui';
import { Autoavaliar, BotaoProximo, type PropsCartao } from './comum';

/** Pensa na resposta, vira o cartão e diz com honestidade se lembrou. */
export function CartaoLembraView({ cartao, onResponder, onProximo }: PropsCartao<CartaoLembra>) {
  const [virado, setVirado] = useState(false);
  const [acertou, setAcertou] = useState<boolean | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-base font-bold text-fg">{cartao.pergunta}</p>
      {!virado ? (
        <Button onClick={() => setVirado(true)}>Virar o cartão</Button>
      ) : (
        <>
          <p className="rounded border border-accent/40 bg-accent/5 p-3 text-sm text-fg">{cartao.resposta}</p>
          {acertou === null ? (
            <Autoavaliar
              onResponder={(ok) => {
                setAcertou(ok);
                onResponder(ok, ok ? 'lembrei' : 'não lembrei');
              }}
            />
          ) : (
            <div className="flex justify-end">
              <BotaoProximo onClick={onProximo} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
