import type { DesenhoBase } from '../domain/base';
import { cn } from '../lib/utils';

// Os desenhos do "Travei numa base": o professor só dá o tipo e os números,
// e aqui vira bolinha, pizza, barra, conta grande, tabela da regra de três ou reta.
// Leve de propósito (HTML e SVG, sem o Excalidraw): abre na hora, no celular também.

const Bolinha = ({ cheia = true, aviso = false }: { cheia?: boolean; aviso?: boolean }) => (
  <span className={cn('inline-block h-3.5 w-3.5 rounded-full', cheia ? (aviso ? 'bg-warn' : 'bg-accent') : 'border border-accent/50')} />
);

function Grupos({ total, grupos }: { total: number; grupos: number }) {
  const cada = Math.floor(total / grupos);
  const sobra = total % grupos;
  return (
    <div className="flex flex-wrap items-start justify-center gap-3">
      {Array.from({ length: grupos }, (_, g) => (
        <div key={g} className="flex flex-col items-center gap-1">
          <div className="flex min-h-[2.5rem] min-w-[2.5rem] max-w-[7rem] flex-wrap content-center justify-center gap-1 rounded-lg border-2 border-accent/60 p-1.5">
            {Array.from({ length: cada }, (_, i) => (
              <Bolinha key={i} />
            ))}
          </div>
          <span className="font-mono text-sm text-accent">{cada}</span>
        </div>
      ))}
      {sobra > 0 && (
        <div className="flex flex-col items-center gap-1">
          <div className="flex min-h-[2.5rem] flex-wrap content-center justify-center gap-1 rounded-lg border-2 border-dashed border-warn/70 p-1.5">
            {Array.from({ length: sobra }, (_, i) => (
              <Bolinha key={i} aviso />
            ))}
          </div>
          <span className="font-mono text-sm text-warn">sobra {sobra}</span>
        </div>
      )}
    </div>
  );
}

function Fileiras({ linhas, colunas, destaque = 0 }: { linhas: number; colunas: number; destaque?: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <span className="text-[11px] text-muted">{colunas} em cada fileira →</span>
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted [writing-mode:vertical-rl]">{linhas} fileiras</span>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${colunas}, 0.875rem)` }}>
          {Array.from({ length: linhas * colunas }, (_, i) => (
            <Bolinha key={i} cheia={!destaque || i < destaque} aviso={!!destaque && i < destaque} />
          ))}
        </div>
      </div>
      <span className="font-mono text-sm text-accent">{linhas * colunas} no total</span>
    </div>
  );
}

function Pizza({ partes, pintadas }: { partes: number; pintadas: number }) {
  const r = 70;
  const c = 80;
  const fatia = (i: number) => {
    if (partes === 1) return `M ${c} ${c - r} A ${r} ${r} 0 1 1 ${c - 0.01} ${c - r} Z`;
    const a0 = (i / partes) * 2 * Math.PI - Math.PI / 2;
    const a1 = ((i + 1) / partes) * 2 * Math.PI - Math.PI / 2;
    const grande = a1 - a0 > Math.PI ? 1 : 0;
    return `M ${c} ${c} L ${c + r * Math.cos(a0)} ${c + r * Math.sin(a0)} A ${r} ${r} 0 ${grande} 1 ${c + r * Math.cos(a1)} ${c + r * Math.sin(a1)} Z`;
  };
  return (
    <svg viewBox="0 0 160 160" className="h-40 w-40" role="img" aria-label={`${pintadas} de ${partes} fatias pintadas`}>
      {Array.from({ length: partes }, (_, i) => (
        <path key={i} d={fatia(i)} fill={i < pintadas ? 'var(--color-accent)' : 'transparent'} fillOpacity={i < pintadas ? 0.85 : 1} stroke="var(--color-fg)" strokeWidth={2} />
      ))}
    </svg>
  );
}

function Barra({ partes, pintadas }: { partes: number; pintadas: number }) {
  return (
    <div className="flex h-12 w-full max-w-sm overflow-hidden rounded border-2 border-fg/70">
      {Array.from({ length: partes }, (_, i) => (
        <div key={i} className={cn('flex-1 border-r border-fg/50 last:border-r-0', i < pintadas && 'bg-accent/85')} />
      ))}
    </div>
  );
}

function Regra3({ a, b, c, x, rotulos }: { a: string; b: string; c: string; x: string; rotulos?: [string, string] }) {
  const celula = 'flex h-14 items-center justify-center rounded border-2 px-2 font-mono text-lg';
  return (
    <div className="w-full max-w-xs">
      {rotulos && (
        <div className="mb-1 grid grid-cols-2 gap-8 text-center text-[11px] uppercase tracking-wider text-muted">
          <span>{rotulos[0]}</span>
          <span>{rotulos[1]}</span>
        </div>
      )}
      <div className="relative grid grid-cols-2 gap-x-8 gap-y-6">
        <div className={cn(celula, 'border-accent/70')}>{a}</div>
        <div className={cn(celula, 'border-accent/70')}>{b}</div>
        <div className={cn(celula, 'border-accent/70')}>{c}</div>
        <div className={cn(celula, 'border-warn text-warn')}>{x}</div>
        {/* A seta cruzada: multiplica na diagonal. */}
        <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
          <line x1="40" y1="35" x2="60" y2="65" stroke="var(--color-info)" strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
          <line x1="60" y1="35" x2="40" y2="65" stroke="var(--color-info)" strokeWidth="1.5" strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted">multiplica cruzado ✕</p>
    </div>
  );
}

function Reta({ de, ate, marcas, salto }: { de: number; ate: number; marcas: number[]; salto?: { de: number; para: number; rotulo?: string } }) {
  const L = 320;
  const M = 16;
  const xDe = (n: number) => M + ((n - de) / (ate - de)) * (L - 2 * M);
  const passo = ate - de <= 20 ? 1 : ate - de <= 40 ? 2 : 5;
  const ticks: number[] = [];
  for (let n = Math.ceil(de); n <= ate; n += passo) ticks.push(n);
  const y = 60;
  return (
    <svg viewBox={`0 0 ${L} 90`} className="w-full max-w-sm" role="img" aria-label={`reta numérica de ${de} a ${ate}`}>
      <defs>
        <marker id="ponta-reta" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--color-warn)" />
        </marker>
      </defs>
      <line x1={M - 8} y1={y} x2={L - M + 8} y2={y} stroke="var(--color-fg)" strokeWidth={2} />
      {ticks.map((n) => (
        <g key={n}>
          <line x1={xDe(n)} y1={y - 5} x2={xDe(n)} y2={y + 5} stroke="var(--color-fg)" strokeWidth={n === 0 ? 2.5 : 1} />
          <text x={xDe(n)} y={y + 20} textAnchor="middle" fontSize={11} fill={n === 0 ? 'var(--color-fg)' : 'var(--color-muted)'}>
            {n}
          </text>
        </g>
      ))}
      {marcas.map((n, i) => (
        <circle key={i} cx={xDe(n)} cy={y} r={6} fill="var(--color-accent)" />
      ))}
      {salto && (
        <g>
          <path d={`M ${xDe(salto.de)} ${y - 8} Q ${(xDe(salto.de) + xDe(salto.para)) / 2} ${y - 48} ${xDe(salto.para)} ${y - 8}`} fill="none" stroke="var(--color-warn)" strokeWidth={2} markerEnd="url(#ponta-reta)" />
          {salto.rotulo && (
            <text x={(xDe(salto.de) + xDe(salto.para)) / 2} y={y - 32} textAnchor="middle" fontSize={13} fill="var(--color-warn)">
              {salto.rotulo}
            </text>
          )}
        </g>
      )}
    </svg>
  );
}

export function DesenhoBaseView({ d }: { d: DesenhoBase }) {
  switch (d.tipo) {
    case 'grupos':
      return <Grupos total={d.total} grupos={d.grupos} />;
    case 'fileiras':
      return <Fileiras linhas={d.linhas} colunas={d.colunas} destaque={d.destaque} />;
    case 'fracao':
      return (
        <div className="flex w-full flex-col items-center gap-2">
          {d.forma === 'pizza' ? <Pizza partes={d.partes} pintadas={d.pintadas} /> : <Barra partes={d.partes} pintadas={d.pintadas} />}
          <span className="font-mono text-sm text-accent">
            {d.pintadas} de {d.partes}
          </span>
        </div>
      );
    case 'conta':
      return (
        <div className="space-y-1 text-center font-mono text-2xl text-fg">
          {d.linhas.map((l, i) => (
            <p key={i} className={i === d.linhas.length - 1 && d.linhas.length > 1 ? 'text-accent' : undefined}>
              {l}
            </p>
          ))}
        </div>
      );
    case 'regra3':
      return <Regra3 a={d.a} b={d.b} c={d.c} x={d.x} rotulos={d.rotulos} />;
    case 'reta':
      return <Reta de={d.de} ate={d.ate} marcas={d.marcas} salto={d.salto} />;
  }
}
