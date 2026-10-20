import { useEffect, useState } from 'react';
import type { CodeReview } from '../../domain/types';
import { cn } from '../../lib/utils';

interface Linha {
  texto: string;
  tom?: 'ok' | 'erro' | 'aviso';
}

/** Monta as linhas a partir do que a correção devolveu de verdade (nada de log falso). */
function linhasDe(review: CodeReview, fator: number, resolvido: boolean): Linha[] {
  const l: Linha[] = [];
  if (review.source === 'basica') {
    l.push({ texto: '> checagem básica (sem IA): estrutura, chaves e palavras-chave do desafio' });
    l.push({ texto: `> sintaxe: ${review.syntaxOk ? 'parece ok' : 'com problema'}`, tom: review.syntaxOk ? 'ok' : 'erro' });
    l.push({ texto: '> lógica: só você sabe; confira com o enunciado', tom: 'aviso' });
  } else {
    l.push({ texto: `> sintaxe: ${review.syntaxOk ? 'ok' : 'com erro'}`, tom: review.syntaxOk ? 'ok' : 'erro' });
    l.push({ texto: `> lógica e casos de borda: ${review.logicOk ? 'ok' : 'com erro'}`, tom: review.logicOk ? 'ok' : 'erro' });
    l.push({ texto: `> nota do professor: ${review.score}/100`, tom: review.score >= 70 ? 'ok' : 'erro' });
    if (fator < 1) l.push({ texto: `> dicas abertas: vale ${Math.round(fator * 100)}% do XP`, tom: 'aviso' });
  }
  if (review.issues.length) l.push({ texto: `> ${review.issues.length} ponto(s) pra olhar`, tom: 'aviso' });
  if (review.source === 'ia') l.push({ texto: resolvido ? '✓ RESOLVIDO' : '✗ ainda não: veja o diagnóstico', tom: resolvido ? 'ok' : 'erro' });
  return l;
}

const PASSO_MS = 220;

export function TerminalCorrecao({ canal, nLinhas, corrigindo, review, fator, resolvido }: { canal: string; nLinhas: number; corrigindo: boolean; review?: CodeReview; fator: number; resolvido: boolean }) {
  const linhas = review && !corrigindo ? linhasDe(review, fator, resolvido) : [];
  const [mostradas, setMostradas] = useState(linhas.length);

  // Resultado novo: revela uma linha por vez.
  useEffect(() => {
    if (corrigindo) return setMostradas(0);
    const t = setInterval(() => setMostradas((n) => (n >= linhas.length ? n : n + 1)), PASSO_MS);
    return () => clearInterval(t);
  }, [corrigindo, review, linhas.length]);

  if (!corrigindo && !review) return null;

  return (
    <div className="rounded border border-line bg-black/60 p-3 text-xs leading-6" role="log" aria-live="polite">
      <p className="text-muted">
        $ {canal} --corrigir ({nLinhas} linha{nLinhas === 1 ? '' : 's'})
      </p>
      {corrigindo ? (
        <p className="cursor-blink text-accent">&gt; o professor está lendo o seu código</p>
      ) : (
        linhas.slice(0, mostradas).map((l, i) => (
          <p key={i} className={cn(l.tom === 'ok' && 'text-accent', l.tom === 'erro' && 'text-danger', l.tom === 'aviso' && 'text-warn', !l.tom && 'text-fg')}>
            {l.texto}
          </p>
        ))
      )}
    </div>
  );
}
