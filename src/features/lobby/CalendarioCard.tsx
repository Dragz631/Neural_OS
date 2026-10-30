import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { itensDoDia, type ItemDoDia } from '../../domain/calendario';
import { addDays, toLocalDate, weekStartOf } from '../../domain/dates';
import { useEntregas } from '../../store/entregas';
import { useFaculdade } from '../../store/faculdade';
import { usePresenca } from '../../store/presenca';
import { useStudy } from '../../store/study';
import { Button, Panel } from '../../components/ui';
import { cn } from '../../lib/utils';

const MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const DIAS_SEMANA = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const pad = (n: number) => String(n).padStart(2, '0');
const COR: Record<ItemDoDia['tipo'], string> = { aula: 'text-info', prazo: 'text-warn', evento: 'text-accent' };

function ListaDoDia({ itens }: { itens: ItemDoDia[] }) {
  if (itens.length === 0) return <p className="text-[11px] text-muted">Nada marcado.</p>;
  return (
    <ul className="space-y-0.5">
      {itens.map((i) => (
        <li key={i.chave} className="truncate text-[11px]" title={[i.titulo, i.hora, i.sala].filter(Boolean).join(' · ')}>
          <span className={cn('font-bold', COR[i.tipo])}>{i.tipo === 'aula' ? i.hora : i.tipo === 'prazo' ? 'PRAZO' : 'EVENTO'}</span> {i.titulo}
        </li>
      ))}
    </ul>
  );
}

/** Calendário em duas visões: Mês (visão geral dos prazos) e Semana (o que tem em cada dia). */
export function CalendarioCard() {
  const hoje = toLocalDate();
  const [visao, setVisao] = useState<'mes' | 'semana'>('semana');
  const [cursor, setCursor] = useState(() => ({ ano: new Date().getFullYear(), mes: new Date().getMonth() }));
  const [semana, setSemana] = useState(() => weekStartOf(hoje));
  const [escolhido, setEscolhido] = useState(hoje);
  const manual = usePresenca((s) => s.dias);
  const alternar = usePresenca((s) => s.alternar);
  const sessions = useStudy((s) => s.sessions);
  const checkins = useStudy((s) => s.checkins);
  const entregas = useEntregas((s) => s.lista);
  const blocos = useFaculdade((s) => s.blocos);
  const eventos = useFaculdade((s) => s.eventos);

  const estudados = useMemo(() => new Set([...manual, ...sessions.map((s) => s.date)]), [manual, sessions]);
  const fontes = useMemo(() => ({ blocos, entregas, eventos }), [blocos, entregas, eventos]);

  const primeiro = new Date(cursor.ano, cursor.mes, 1);
  const vazios = (primeiro.getDay() + 6) % 7; // semana começa na segunda
  const diasNoMes = new Date(cursor.ano, cursor.mes + 1, 0).getDate();
  const mudar = (d: number) => {
    if (visao === 'semana') return setSemana((s) => addDays(s, d * 7));
    setCursor((c) => {
      const n = new Date(c.ano, c.mes + d, 1);
      return { ano: n.getFullYear(), mes: n.getMonth() };
    });
  };
  const titulo = visao === 'mes' ? `${MESES[cursor.mes]} ${cursor.ano}` : `Semana de ${semana.slice(8)}/${semana.slice(5, 7)}`;

  return (
    <Panel
      title={`Calendário // ${titulo}`}
      actions={
        <>
          <div className="flex overflow-hidden rounded border border-line text-[10px] font-bold uppercase">
            {(['semana', 'mes'] as const).map((v) => (
              <button key={v} type="button" onClick={() => setVisao(v)} className={cn('px-2 py-0.5', visao === v ? 'bg-accent text-black' : 'text-muted hover:text-accent')}>
                {v === 'mes' ? 'Mês' : 'Semana'}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => mudar(-1)} className="text-muted hover:text-accent" aria-label="Anterior">
            <ChevronLeft size={14} />
          </button>
          <button type="button" onClick={() => mudar(1)} className="text-muted hover:text-accent" aria-label="Próximo">
            <ChevronRight size={14} />
          </button>
        </>
      }
    >
      {visao === 'semana' ? (
        <ul className="space-y-1.5">
          {DIAS_SEMANA.map((nome, i) => {
            const dia = addDays(semana, i);
            const chegada = checkins[dia]?.chegadaEm;
            return (
              <li key={dia} className={cn('rounded border px-2 py-1', dia === hoje ? 'border-accent/60 bg-accent/5' : 'border-line')}>
                <p className="flex items-baseline gap-1.5 text-[10px] uppercase tracking-wider text-muted">
                  <b className={dia === hoje ? 'text-accent' : 'text-fg'}>{nome}</b> {dia.slice(8)}/{dia.slice(5, 7)}
                  {estudados.has(dia) && <span className="text-accent">· estudou</span>}
                  {chegada && <span>· chegou {chegada}</span>}
                </p>
                <ListaDoDia itens={itensDoDia(dia, fontes)} />
              </li>
            );
          })}
        </ul>
      ) : (
        <>
          <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
              <span key={i} className="text-muted">
                {d}
              </span>
            ))}
            {Array.from({ length: vazios }, (_, i) => (
              <span key={`v${i}`} />
            ))}
            {Array.from({ length: diasNoMes }, (_, i) => {
              const dia = `${cursor.ano}-${pad(cursor.mes + 1)}-${pad(i + 1)}`;
              const itens = itensDoDia(dia, fontes);
              const importante = itens.some((x) => x.tipo !== 'aula');
              return (
                <button
                  key={dia}
                  type="button"
                  onClick={() => setEscolhido(dia)}
                  aria-label={`Dia ${i + 1}`}
                  className={cn(
                    'relative aspect-square rounded text-[11px]',
                    estudados.has(dia) ? 'bg-accent/30 text-fg' : 'text-muted hover:bg-panel-2',
                    dia === hoje && 'font-bold text-accent',
                    dia === escolhido && 'outline outline-1 outline-accent',
                    importante && 'ring-2 ring-warn',
                  )}
                >
                  {i + 1}
                  {itens.some((x) => x.tipo === 'aula') && <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-info" />}
                </button>
              );
            })}
          </div>
          <div className="mt-2 space-y-1 border-t border-line pt-2">
            <p className="text-[10px] uppercase tracking-wider text-muted">{escolhido.split('-').reverse().join('/')}</p>
            <ListaDoDia itens={itensDoDia(escolhido, fontes)} />
            {escolhido <= hoje && (
              <Button className="px-2 py-0.5 text-[10px]" onClick={() => alternar(escolhido)}>
                {manual.includes(escolhido) ? 'Tirar presença' : 'Marcar que estudei'}
              </Button>
            )}
          </div>
          <p className="mt-2 text-[10px] text-muted">Verde = estudou · ponto = aula · anel = prazo ou evento</p>
        </>
      )}
    </Panel>
  );
}
