import { ArrowRight } from 'lucide-react';
import type { Cartao } from '../../../domain/cartoes';
import { Button } from '../../../components/ui';

/** O que todo componente de cartão recebe (tipo novo de cartão segue isso). */
export interface PropsCartao<C extends Cartao> {
  cartao: C;
  /** Chamado UMA vez, quando ele responde. `resposta` vai pro diário se errar. */
  onResponder: (acertou: boolean, resposta: string) => void;
  onProximo: () => void;
}

export function BotaoProximo({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="primary" onClick={onClick} autoFocus>
      Próximo <ArrowRight size={13} />
    </Button>
  );
}

/** Autoavaliação honesta (cartões sem IA). */
export function Autoavaliar({ onResponder }: { onResponder: (acertou: boolean) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={() => onResponder(true)} className="border-accent/60 text-accent">
        Lembrei
      </Button>
      <Button onClick={() => onResponder(false)} className="border-danger/60 text-danger">
        Não lembrei
      </Button>
    </div>
  );
}
