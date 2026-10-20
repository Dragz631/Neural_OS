import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react';
import { removerTopico, type MapaMateria } from '../../domain/mapa';
import { Button, Input } from '../../components/ui';

/** Prévia editável do mapa: renomear, remover, mover e adicionar tópicos antes de confirmar. */
export function PreviaMapa({ mapa, onChange }: { mapa: MapaMateria; onChange: (m: MapaMateria) => void }) {
  const titulos = mapa.topicos.map((t) => t.titulo);

  const renomear = (i: number, titulo: string) =>
    onChange({ ...mapa, topicos: mapa.topicos.map((t, j) => (j === i ? { ...t, titulo } : t)) });

  // Mover troca a posição de dois vizinhos e conserta os pais que apontavam pra eles.
  const trocar = (a: number, b: number) => {
    if (b < 0 || b >= mapa.topicos.length) return;
    const mapaIndice = (x?: number) => (x === a ? b : x === b ? a : x);
    const topicos = [...mapa.topicos];
    [topicos[a], topicos[b]] = [topicos[b], topicos[a]];
    // Pai precisa vir antes do filho; se a troca quebrar isso, o tópico perde o pai.
    onChange({ ...mapa, topicos: topicos.map((t, i) => ({ ...t, pai: (mapaIndice(t.pai) ?? -1) < i ? mapaIndice(t.pai) : undefined })) });
  };

  const adicionar = () =>
    onChange({ ...mapa, topicos: [...mapa.topicos, { titulo: 'Novo tópico', porque: '', pai: mapa.topicos.length - 1, minutos: 30 }] });

  return (
    <div className="space-y-1.5">
      <ol className="max-h-[45vh] space-y-1.5 overflow-y-auto pr-1">
        {mapa.topicos.map((t, i) => (
          <li key={i} className="rounded border border-line bg-bg p-2">
            <div className="flex items-center gap-1.5">
              <span className="w-5 shrink-0 text-right text-[10px] text-muted">{i + 1}.</span>
              <Input value={t.titulo} onChange={(e) => renomear(i, e.target.value)} className="py-1 text-xs" />
              <button type="button" onClick={() => trocar(i, i - 1)} className="text-muted hover:text-accent" aria-label="Subir">
                <ArrowUp size={13} />
              </button>
              <button type="button" onClick={() => trocar(i, i + 1)} className="text-muted hover:text-accent" aria-label="Descer">
                <ArrowDown size={13} />
              </button>
              <button type="button" onClick={() => mapa.topicos.length > 2 && onChange(removerTopico(mapa, i))} className="text-muted hover:text-danger" aria-label="Remover">
                <Trash2 size={13} />
              </button>
            </div>
            {(t.porque || t.pai !== undefined) && (
              <p className="ml-7 mt-1 text-[10px] leading-snug text-muted">
                {t.pai !== undefined && <span className="text-info">depois de "{titulos[t.pai]}" · </span>}
                {t.porque}
              </p>
            )}
          </li>
        ))}
      </ol>
      <Button className="w-full px-2 py-1 text-[10px]" onClick={adicionar}>
        <Plus size={12} /> Adicionar tópico
      </Button>
    </div>
  );
}
