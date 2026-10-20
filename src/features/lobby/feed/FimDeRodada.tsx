import { ArrowRight, RotateCcw } from 'lucide-react';
import { Button } from '../../../components/ui';
import { useNextStep } from '../../../hooks/useNextStep';
import { useNav } from '../../../store/nav';
import type { Resultado } from './useRodada';

/** Fechamento da rodada: o placar e, em destaque, a volta pro Próximo passo. */
export function FimDeRodada({ resultados, maiorCombo, onMais }: { resultados: Resultado[]; maiorCombo: number; onMais: () => void }) {
  const { step } = useNextStep();
  const go = useNav((s) => s.go);
  const xp = resultados.reduce((soma, r) => soma + r.xp, 0);
  const acertos = resultados.filter((r) => r.acertou).length;
  const erros = resultados.length - acertos;

  return (
    <div className="space-y-4 text-center">
      <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-accent">Rodada fechada</p>
      <div className="grid grid-cols-3 gap-2">
        <Placar valor={`+${xp}`} rotulo="XP" />
        <Placar valor={`${acertos}/${resultados.length}`} rotulo="acertos" />
        <Placar valor={`x${maiorCombo}`} rotulo="maior combo" />
      </div>
      {erros > 0 && <p className="text-xs text-muted">{erros === 1 ? 'O erro foi' : `Os ${erros} erros foram`} pro diário do tópico: é o que mais ensina na revisão.</p>}
      <div className="rounded border border-accent/50 bg-accent/5 p-3 text-left">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted">Agora, o próximo passo</p>
        <p className="mt-1 font-bold text-fg">{step.title}</p>
        <Button variant="primary" className="mt-2 w-full" onClick={() => { go(step.action, step.topicId); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          Ir pro próximo passo <ArrowRight size={13} />
        </Button>
      </div>
      <Button onClick={onMais} className="text-muted">
        <RotateCcw size={12} /> Mais uma rodada
      </Button>
    </div>
  );
}

function Placar({ valor, rotulo }: { valor: string; rotulo: string }) {
  return (
    <div className="rounded border border-line bg-bg p-2">
      <p className="text-glow text-xl font-bold text-accent">{valor}</p>
      <p className="text-[10px] uppercase tracking-wider text-muted">{rotulo}</p>
    </div>
  );
}
