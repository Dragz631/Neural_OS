import { useState } from 'react';
import type { CartaoFrase } from '../../../domain/cartoes';
import { Button, ErrorNote, Textarea } from '../../../components/ui';
import { useAI } from '../../../hooks/useAI';
import { avaliarFrase, type NotaFrase } from '../../../services/ai/cartoes';
import { useSettings } from '../../../store/settings';
import { useStudy } from '../../../store/study';
import { Autoavaliar, BotaoProximo, type PropsCartao } from './comum';

/** Nota mínima pra contar como acerto quando a IA corrige. */
const NOTA_OK = 60;

/** Explique em 1 frase. Com IA: nota + dica. Sem IA: compara com a referência e se avalia. */
export function CartaoFraseView({ cartao, onResponder, onProximo }: PropsCartao<CartaoFrase>) {
  const aiOn = useSettings((s) => s.provider !== 'off');
  const topico = useStudy((s) => s.topics.find((t) => t.id === cartao.topicId)?.title ?? '');
  const { run, loading, error } = useAI();
  const [texto, setTexto] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [nota, setNota] = useState<NotaFrase | null>(null);
  const [fechado, setFechado] = useState(false);

  const enviar = async () => {
    setEnviado(true);
    if (!aiOn) return;
    const r = await run((signal) => avaliarFrase(cartao, texto, topico, signal));
    if (!r) return;
    setNota(r);
    setFechado(true);
    onResponder(r.nota >= NOTA_OK, texto);
  };

  return (
    <div className="space-y-3">
      <p className="text-base font-bold text-fg">{cartao.pergunta}</p>
      <Textarea rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} disabled={enviado && !error} placeholder="Com as suas palavras, sem consultar." />
      {!enviado || (error && !fechado) ? (
        <Button variant="primary" onClick={enviar} disabled={texto.trim().length < 5 || loading}>
          {loading ? 'O professor está lendo…' : error ? 'Tentar de novo' : 'Responder'}
        </Button>
      ) : null}
      <ErrorNote error={error} />
      {nota && (
        <p className="text-sm text-muted">
          <b className={nota.nota >= NOTA_OK ? 'text-accent' : 'text-danger'}>Nota {nota.nota}. </b>
          {nota.dica}
        </p>
      )}
      {enviado && (!aiOn || error) && !fechado && (
        <>
          {cartao.referencia && <p className="rounded border border-accent/40 bg-accent/5 p-3 text-sm text-fg">Referência: {cartao.referencia}</p>}
          <p className="text-xs text-muted">Sua ideia bate com o essencial?</p>
          <Autoavaliar
            onResponder={(ok) => {
              setFechado(true);
              onResponder(ok, texto);
            }}
          />
        </>
      )}
      {fechado && (
        <div className="flex justify-end">
          <BotaoProximo onClick={onProximo} />
        </div>
      )}
    </div>
  );
}
