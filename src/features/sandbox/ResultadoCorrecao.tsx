import { CheckCircle2, Stethoscope } from 'lucide-react';
import { useState } from 'react';
import { Button, Panel, Select } from '../../components/ui';
import type { CategoriaErro } from '../../domain/diario';
import type { Challenge, CodeReview } from '../../domain/types';

const CATEGORIAS: { id: CategoriaErro; rotulo: string }[] = [
  { id: 'sintaxe', rotulo: 'Sintaxe (escrevi errado)' },
  { id: 'modelo-mental', rotulo: 'Modelo mental (entendi errado o conceito)' },
  { id: 'fluxo', rotulo: 'Fluxo (if/loop na ordem errada)' },
  { id: 'estado', rotulo: 'Estado (variável com valor errado)' },
  { id: 'api', rotulo: 'API (usei a função/método errado)' },
  { id: 'suposicao', rotulo: 'Suposição (achei que algo era verdade)' },
  { id: 'decomposicao', rotulo: 'Decomposição (não quebrei o problema)' },
  { id: 'descuido', rotulo: 'Descuido' },
];

/** Dica do PRÓPRIO desafio (o bug antigo mostrava a dica de outro). */
function dicaDoDesafio(c: Challenge): string | undefined {
  const escada = c.ladder?.filter(Boolean) ?? [];
  return escada[escada.length - 1] ?? c.hints[0];
}

export function Sucesso({ xp, errosAntes, onClassificar }: { xp?: number; errosAntes?: string[]; onClassificar: (c: CategoriaErro) => void }) {
  const [categoria, setCategoria] = useState<CategoriaErro>('modelo-mental');
  const [feito, setFeito] = useState(false);
  return (
    <Panel accent title="Desafio resolvido // compilou na cabeça do professor">
      <p className="text-glow flex items-center gap-2 text-lg font-bold text-accent">
        <CheckCircle2 size={20} /> Resolvido{xp ? ` · +${xp} XP` : ''}
      </p>
      {errosAntes && errosAntes.length > 0 && !feito && (
        <div className="mt-3 space-y-2 border-t border-line pt-3">
          <p className="text-xs text-muted">
            Antes você errou: <span className="text-fg">{errosAntes[0]}</span>. Que tipo de erro foi? Vai pro diário do tópico, separado da versão certa.
          </p>
          <div className="flex flex-wrap gap-2">
            <Select value={categoria} onChange={(e) => setCategoria(e.target.value as CategoriaErro)} className="w-auto" aria-label="Tipo de erro">
              {CATEGORIAS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.rotulo}
                </option>
              ))}
            </Select>
            <Button
              onClick={() => {
                onClassificar(categoria);
                setFeito(true);
              }}
            >
              Guardar no diário
            </Button>
          </div>
        </div>
      )}
      {feito && <p className="mt-2 text-xs text-accent">Guardado no diário do tópico.</p>}
    </Panel>
  );
}

export function Diagnostico({ challenge, review, onAutoavaliar }: { challenge: Challenge; review: CodeReview; onAutoavaliar: (ok: boolean) => void }) {
  const dica = dicaDoDesafio(challenge);
  return (
    <Panel title={review.source === 'ia' ? 'Diagnóstico // o que falta' : 'Checagem básica // sem IA'}>
      {review.issues.length > 0 && (
        <ul className="mb-3 list-disc space-y-1 pl-5 text-sm text-warn">
          {review.issues.map((i) => (
            <li key={i}>{i}</li>
          ))}
        </ul>
      )}
      <p className="text-sm leading-relaxed">{review.feedback}</p>
      {dica && (
        <p className="mt-3 flex gap-2 rounded border border-info/30 bg-info/5 p-2 text-xs text-info">
          <Stethoscope size={14} className="shrink-0" /> {dica}
        </p>
      )}
      {review.source === 'basica' && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <span className="text-xs text-muted">Conferiu com o enunciado? Sua lógica resolve?</span>
          {review.issues.length === 0 && <Button onClick={() => onAutoavaliar(true)}>Sim, resolvi</Button>}
          <Button onClick={() => onAutoavaliar(false)}>Não, errei</Button>
        </div>
      )}
    </Panel>
  );
}
