import { Download, RotateCcw, Upload } from 'lucide-react';
import { useRef } from 'react';
import { contraste, corSobre, ehHex, PRESETS, type CoresTema, type FonteCorpo, type FonteTitulos, type Moldura, type Movimento } from '../domain/tema';
import { cn } from '../lib/utils';
import { useTema } from '../store/tema';
import { toast } from '../store/toast';
import { Button, Label, Modal, Select } from './ui';

// Personalizar o tema: só aparência. Tudo muda ao vivo (a tela de trás já é o preview).

const CORES: { id: keyof Omit<CoresTema, 'onAccent'>; nome: string; dica: string }[] = [
  { id: 'bg', nome: 'Fundo', dica: 'O fundo do app' },
  { id: 'panel', nome: 'Painel', dica: 'Cartões e caixas' },
  { id: 'panel2', nome: 'Painel 2', dica: 'Itens dentro dos cartões' },
  { id: 'line', nome: 'Linhas', dica: 'Bordas e divisórias' },
  { id: 'fg', nome: 'Texto', dica: 'Texto principal' },
  { id: 'muted', nome: 'Texto apagado', dica: 'Legendas e dicas' },
  { id: 'accent', nome: 'Destaque', dica: 'Botão principal, aba ativa, progresso' },
  { id: 'warn', nome: 'Aviso', dica: 'Atenção, revisão vencida' },
  { id: 'danger', nome: 'Erro / irreversível', dica: 'Apagar, errou, não volta atrás' },
  { id: 'info', nome: 'Informação', dica: 'Notas e dicas azuladas' },
];

const CORPOS: Record<FonteCorpo, string> = { jetbrains: 'JetBrains Mono (código)', sistema: 'Fonte do sistema' };
const TITULOS: Record<FonteTitulos, string> = { silkscreen: 'Silkscreen (pixel)', michroma: 'Michroma (largura aberta)', corpo: 'A mesma do texto' };
const MOLDURAS: Record<Moldura, string> = { simples: 'Simples', colchetes: 'Cantos de mira' };
const MOVIMENTOS: Record<Movimento, string> = { passos: 'Em passos (pixel)', suave: 'Suave', nenhum: 'Sem movimento' };

export function TemaModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { baseId, valores, escolher, ajustar, restaurar, importar } = useTema();
  const arquivo = useRef<HTMLInputElement>(null);
  const c = valores.cores;
  const onAccent = c.onAccent ?? corSobre(c.accent);
  const legivel = contraste(c.accent, onAccent) >= 4.5;

  const exportar = () => {
    const blob = new Blob([JSON.stringify({ nome: baseId, ...valores }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neural-os-tema-${baseId}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const ler = async (f: File) => {
    try {
      const ok = importar(JSON.parse(await f.text()));
      toast(ok ? { title: 'Tema carregado', variant: 'success' } : { title: 'Esse arquivo não parece um tema', variant: 'destructive' });
    } catch {
      toast({ title: 'Não consegui ler esse arquivo', variant: 'destructive' });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Aparência" wide>
      <div className="space-y-5 text-sm">
        <p className="text-xs leading-relaxed text-muted">Isto muda só o visual. Nada de comportamento, e o app nunca troca de tema sozinho. A tela atrás já mostra o resultado.</p>

        <section className="space-y-2">
          <h3 className="text-xs font-bold uppercase tracking-widest text-fg">Temas prontos</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => escolher(p.id)}
                aria-pressed={baseId === p.id}
                className={cn('rounded border p-2.5 text-left transition hover:border-accent', baseId === p.id ? 'border-accent bg-accent/10' : 'border-line')}
              >
                <div className="mb-1.5 flex gap-1">
                  {[p.valores.cores.bg, p.valores.cores.panel2, p.valores.cores.fg, p.valores.cores.accent, p.valores.cores.warn, p.valores.cores.info].map((cor, i) => (
                    <span key={i} className="h-4 w-4 rounded-sm border border-line" style={{ background: cor }} />
                  ))}
                </div>
                <div className="text-xs font-bold">{p.nome}</div>
                <div className="text-[11px] leading-snug text-muted">{p.descricao}</div>
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-2 border-t border-line pt-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-fg">Cores</h3>
          <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
            {CORES.map((k) => (
              <CampoCor key={k.id} nome={k.nome} dica={k.dica} valor={c[k.id]} onChange={(v) => ajustar({ cores: { [k.id]: v } })} />
            ))}
            <div>
              <Label>Texto sobre o destaque</Label>
              <div className="flex items-center gap-2">
                <button type="button" className="rounded border border-line px-2 py-1 text-[11px] hover:border-accent" onClick={() => ajustar({ cores: { onAccent: undefined } })} aria-pressed={!c.onAccent}>
                  Automático
                </button>
                <CampoCor compacto nome="" dica="" valor={onAccent} onChange={(v) => ajustar({ cores: { onAccent: v } })} />
              </div>
              <p className={cn('mt-1 text-[10px]', legivel ? 'text-muted' : 'text-warn')}>{legivel ? 'Dá pra ler bem.' : 'Pouco contraste: o texto do botão pode ficar difícil de ler.'}</p>
            </div>
          </div>
        </section>

        <section className="space-y-3 border-t border-line pt-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-fg">Forma e letras</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <Label>Letra do texto</Label>
              <Select value={valores.corpo} onChange={(e) => ajustar({ corpo: e.target.value as FonteCorpo })}>
                {Object.entries(CORPOS).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <Label>Letra dos títulos</Label>
              <Select value={valores.titulos} onChange={(e) => ajustar({ titulos: e.target.value as FonteTitulos })}>
                {Object.entries(TITULOS).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block">
              <Label>Cantos ({valores.raio === 0 ? 'retos' : `${valores.raio}px`})</Label>
              <input type="range" min={0} max={16} step={1} value={valores.raio} onChange={(e) => ajustar({ raio: Number(e.target.value) })} className="w-full accent-accent" />
            </label>
            <label className="block">
              <Label>Moldura dos painéis</Label>
              <Select value={valores.moldura} onChange={(e) => ajustar({ moldura: e.target.value as Moldura })}>
                {Object.entries(MOLDURAS).map(([v, t]) => (
                  <option key={v} value={v}>
                    {t}
                  </option>
                ))}
              </Select>
            </label>
          </div>
        </section>

        <section className="space-y-3 border-t border-line pt-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-fg">Efeitos e movimento</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            <Chave nome="Brilho nos destaques" ligado={valores.brilho} onChange={(v) => ajustar({ brilho: v })} />
            <Chave nome="Grade e vinheta no fundo" ligado={valores.grade} onChange={(v) => ajustar({ grade: v })} />
            <Chave nome="Linhas de varredura" ligado={valores.scanline} onChange={(v) => ajustar({ scanline: v })} />
            <Chave nome="Título cromado" ligado={valores.cromo} onChange={(v) => ajustar({ cromo: v })} />
            <Chave nome="Orbe do professor" ligado={valores.orbe} onChange={(v) => ajustar({ orbe: v })} />
          </div>
          <label className="block sm:max-w-xs">
            <Label>Movimento</Label>
            <Select value={valores.movimento} onChange={(e) => ajustar({ movimento: e.target.value as Movimento })}>
              {Object.entries(MOVIMENTOS).map(([v, t]) => (
                <option key={v} value={v}>
                  {t}
                </option>
              ))}
            </Select>
          </label>
          <p className="text-[11px] text-muted">Se o seu sistema pede "reduzir movimento", as linhas de varredura já somem sozinhas.</p>
        </section>

        <section className="flex flex-wrap gap-2 border-t border-line pt-4">
          <Button onClick={restaurar}>
            <RotateCcw size={14} /> Voltar ao tema original
          </Button>
          <Button onClick={exportar}>
            <Download size={14} /> Exportar meu tema
          </Button>
          <Button onClick={() => arquivo.current?.click()}>
            <Upload size={14} /> Importar tema
          </Button>
          <input ref={arquivo} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && ler(e.target.files[0])} />
        </section>
      </div>
    </Modal>
  );
}

function CampoCor({ nome, dica, valor, onChange, compacto }: { nome: string; dica: string; valor: string; onChange: (v: string) => void; compacto?: boolean }) {
  return (
    <div>
      {!compacto && <Label>{nome}</Label>}
      <div className="flex items-center gap-2">
        <input type="color" aria-label={nome || 'Cor'} value={ehHex(valor) ? valor : '#000000'} onChange={(e) => onChange(e.target.value)} className="h-8 w-10 shrink-0 cursor-pointer rounded border border-line bg-transparent p-0.5" />
        <input
          type="text"
          aria-label={`${nome || 'Cor'} em hexadecimal`}
          defaultValue={valor}
          key={valor}
          maxLength={7}
          spellCheck={false}
          onBlur={(e) => (ehHex(e.target.value) ? onChange(e.target.value.toLowerCase()) : (e.target.value = valor))}
          className="w-24 rounded border border-line bg-bg px-2 py-1 font-mono text-xs"
        />
        {!compacto && <span className="hidden text-[10px] leading-tight text-muted lg:inline">{dica}</span>}
      </div>
    </div>
  );
}

function Chave({ nome, ligado, onChange }: { nome: string; ligado: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" role="switch" aria-checked={ligado} onClick={() => onChange(!ligado)} className="flex items-center justify-between gap-3 rounded border border-line px-3 py-2 text-left text-xs hover:border-accent">
      <span>{nome}</span>
      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', ligado ? 'bg-accent text-on-accent' : 'bg-panel-2 text-muted')}>{ligado ? 'ligado' : 'desligado'}</span>
    </button>
  );
}
