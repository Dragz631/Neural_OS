import { ChevronUp, Lightbulb } from 'lucide-react';
import { useState } from 'react';
import { dicaSemIA, fatorDica, NIVEIS_DICA, NIVEL_MAX } from '../domain/dicas';
import type { Challenge } from '../domain/types';
import { useAI } from '../hooks/useAI';
import { cn } from '../lib/utils';
import { gerarDica } from '../services/ai/dicas';
import { useIALigada } from '../store/conexoes';
import { Button, ErrorNote, Input, Label, Panel } from './ui';

/**
 * Pista socrática: escada de dicas 0→6. Antes do degrau 0 pede "o que tentei"
 * e "o que espero que aconteça". Cada clique sobe 1 degrau; a partir do 3 custa XP.
 */
export function HintLadder({ challenge, codigo, onSalvar }: { challenge: Challenge; codigo: string; onSalvar: (patch: Partial<Challenge>) => void }) {
  const aiOn = useIALigada();
  const { run, loading, error } = useAI();
  const [tentei, setTentei] = useState(challenge.attempt ?? '');
  const [espero, setEspero] = useState(challenge.prediction ?? '');
  const nivel = challenge.hintLevel ?? -1;
  const proximo = nivel + 1;
  const comecou = !!challenge.attempt && !!challenge.prediction;

  const subir = async () => {
    if (proximo > NIVEL_MAX) return;
    if (proximo === NIVEL_MAX && !confirm('Ver a solução inteira? Vale metade do XP e do domínio. Tente mais um degrau antes, se der.')) return;
    const base = { ...challenge, attempt: tentei.trim(), prediction: espero.trim() };
    const dica = aiOn ? await run((signal) => gerarDica(base, codigo, proximo, signal)) : dicaSemIA(challenge, proximo);
    if (!dica) return;
    const ladder = [...(challenge.ladder ?? [])];
    ladder[proximo] = dica;
    onSalvar({ attempt: base.attempt, prediction: base.prediction, hintLevel: proximo, ladder });
  };

  return (
    <Panel title={`Pista socrática // degrau ${Math.max(nivel, 0)}/${NIVEL_MAX}`}>
      <div className="mb-3 flex gap-1" aria-hidden>
        {NIVEIS_DICA.map((n, i) => (
          <span key={n.nome} title={n.nome} className={cn('h-1.5 flex-1 rounded-full', i <= nivel ? (i >= 3 ? 'bg-warn' : 'bg-accent') : 'bg-line')} />
        ))}
      </div>

      {!comecou && (
        <div className="mb-3 space-y-2">
          <label className="block">
            <Label>O que você já tentou?</Label>
            <Input value={tentei} onChange={(e) => setTentei(e.target.value)} placeholder="Ex.: fiz um for, mas o saldo fica negativo" />
          </label>
          <label className="block">
            <Label>O que você espera que aconteça?</Label>
            <Input value={espero} onChange={(e) => setEspero(e.target.value)} placeholder="Ex.: sacar mais que o saldo deveria recusar" />
          </label>
        </div>
      )}

      {nivel >= 0 && (
        <ol className="mb-3 space-y-2">
          {(challenge.ladder ?? []).slice(0, nivel + 1).map((d, i) => (
            <li key={i} className={cn('dica-entra rounded border p-2 text-xs', i >= 3 ? 'border-warn/40 bg-warn/5' : 'border-info/30 bg-info/5')}>
              <span className={cn('font-bold uppercase tracking-wider', i >= 3 ? 'text-warn' : 'text-info')}>
                {i}. {NIVEIS_DICA[i].nome}
              </span>
              <p className="mt-1 whitespace-pre-wrap text-fg">{d}</p>
            </li>
          ))}
        </ol>
      )}

      {proximo <= NIVEL_MAX ? (
        <div className="space-y-1">
          <Button onClick={subir} disabled={loading || (!comecou && (tentei.trim().length < 3 || espero.trim().length < 3))}>
            {nivel < 0 ? <Lightbulb size={13} /> : <ChevronUp size={13} />}
            {loading ? 'Pensando…' : `Degrau ${proximo}: ${NIVEIS_DICA[proximo].nome}`}
          </Button>
          <p className="text-[11px] text-muted">
            {NIVEIS_DICA[proximo].explica}
            {fatorDica(proximo) < 1 && <span className="text-warn"> Vale {Math.round(fatorDica(proximo) * 100)}% do XP.</span>}
          </p>
        </div>
      ) : (
        <p className="text-xs text-muted">Você viu a solução. Agora escreva ela de cabeça no editor, sem copiar: é isso que fixa.</p>
      )}
      <ErrorNote error={error} />
    </Panel>
  );
}
