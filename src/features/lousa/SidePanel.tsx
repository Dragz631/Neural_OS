import { useEffect, useState } from 'react';
import { FileText, Loader2, Terminal, Trash2, Wand2, X } from 'lucide-react';
import type { FlowEdge, FlowNode } from './types';
import { translateNode } from './aiDictionary';

interface SidePanelProps {
  open: boolean;
  onClose: () => void;
  selected: FlowNode | null;
  nodes: FlowNode[];
  edges: FlowEdge[];
  onUpdate: (id: string, patch: Partial<Pick<FlowNode, 'title' | 'description' | 'translation'>>) => void;
  onDeleteNode: (id: string) => void;
}

export default function SidePanel({
  open,
  onClose,
  selected,
  nodes,
  edges,
  onUpdate,
  onDeleteNode,
}: SidePanelProps) {
  const [loading, setLoading] = useState(false);
  const [typed, setTyped] = useState('');

  const result = selected?.translation ?? null;

  // Typewriter reveal whenever a translation result is present.
  useEffect(() => {
    if (!result) {
      setTyped('');
      return;
    }
    setTyped('');
    let i = 0;
    const id = window.setInterval(() => {
      i += 1;
      setTyped(result.translation.slice(0, i));
      if (i >= result.translation.length) window.clearInterval(id);
    }, 16);
    return () => window.clearInterval(id);
  }, [result]);

  if (!open) return null;

  const runTranslate = () => {
    if (!selected) return;
    setLoading(true);
    window.setTimeout(() => {
      const source = selected.description.trim() || selected.title.trim();
      onUpdate(selected.id, { translation: translateNode(source) });
      setLoading(false);
    }, 1000);
  };

  const hasContent = !!selected && (selected.description.trim() || selected.title.trim());

  return (
    <aside className="absolute right-0 top-0 z-20 flex h-full w-[30%] min-w-[340px] max-w-[460px] flex-col border-l border-neural-olive/40 bg-neural-panel/90 backdrop-blur-md animate-slide-in-right">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neural-olive/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Terminal size={14} className="text-neural-neon" />
          <span className="text-xs tracking-[0.2em] text-neural-green">
            <span className="text-neural-neon">&gt;_</span> COMPILER_TRANSLATION_FEED
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded-md p-1 text-neural-green/60 transition-colors hover:text-neural-neon"
          aria-label="Close panel"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="neural-scroll flex-1 space-y-5 overflow-y-auto p-4">
        {!selected ? (
          <div className="rounded-lg border border-dashed border-neural-olive/30 bg-black/20 px-4 py-16 text-center">
            <Terminal size={26} className="mx-auto mb-3 text-neural-olive/60" />
            <p className="text-[11px] leading-relaxed tracking-widest text-neural-olive">
              FEED OCIOSO
              <br />
              SELECIONE UM NÓ NA LOUSA
            </p>
          </div>
        ) : (
          <>
            {/* Title input — bound to canvas box title */}
            <section>
              <div className="mb-1 flex items-center gap-1.5 text-[10px] tracking-[0.3em] text-neural-olive">
                <FileText size={10} className="text-neural-neon" />
                NODE_TITLE
              </div>
              <input
                value={selected.title}
                onChange={(e) => onUpdate(selected.id, { title: e.target.value })}
                placeholder="Título do nó (ex: Pai / Molde Base)"
                className="w-full rounded-lg border border-neural-olive/40 bg-black/50 px-3 py-2.5 font-handwriting text-xl text-neural-green outline-none transition-colors focus:border-neural-neon/70 focus:[box-shadow:0_0_12px_rgba(57,255,20,0.3)]"
              />
            </section>

            {/* Description textarea — informal logic */}
            <section>
              <div className="mb-1 flex items-center justify-between text-[10px] tracking-[0.3em] text-neural-olive">
                <span>DESCRIPTION / CONCEPT</span>
                <span className="text-neural-olive/60">as 2 primeiras linhas viram subtítulo</span>
              </div>
              <textarea
                value={selected.description}
                onChange={(e) => onUpdate(selected.id, { description: e.target.value })}
                rows={6}
                placeholder="Escreva sua lógica informal... ex: A classe é a forma do bolo. O objeto é o bolo pronto."
                className="neural-scroll w-full resize-none rounded-lg border border-neural-olive/40 bg-black/50 px-3 py-2.5 text-sm leading-relaxed text-neural-green outline-none transition-colors focus:border-neural-neon/70 focus:[box-shadow:0_0_12px_rgba(57,255,20,0.3)]"
              />
            </section>

            {/* Translate button */}
            <button
              onClick={runTranslate}
              disabled={!hasContent || loading}
              className={`flex w-full items-center justify-center gap-2 rounded-lg border px-4 py-3 text-xs tracking-widest transition-all ${
                !hasContent
                  ? 'cursor-not-allowed border-neural-olive/30 text-neural-olive/50'
                  : loading
                    ? 'cursor-wait border-neural-neon/50 bg-neural-neon/5 text-neural-neon'
                    : 'border-neural-neon/60 bg-neural-neon/10 text-neural-neon hover:bg-neural-neon/20 hover:[box-shadow:0_0_16px_rgba(57,255,20,0.45)]'
              }`}
            >
              {loading ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
              TRANSLATE VIA LOCAL AI
            </button>

            {loading && (
              <div className="space-y-2">
                <div className="h-4 w-2/3 animate-pulse-neon rounded bg-neural-olive/20" />
                <div className="h-20 w-full animate-pulse-neon rounded bg-neural-olive/15" />
                <p className="text-center text-[10px] tracking-widest text-neural-neon/70">
                  COMPILANDO TRADUÇÃO...
                </p>
              </div>
            )}

            {/* Translation result — appended beneath, terminal-styled */}
            {result && !loading && (
              <section className="space-y-4">
                <div>
                  <div className="mb-1 text-[10px] tracking-[0.3em] text-neural-olive">TARGET_CONCEPT</div>
                  <h2 className="font-mono text-2xl font-bold text-neural-neon neon-text-glow">
                    {result.concept}
                  </h2>
                </div>

                <div>
                  <div className="mb-2 flex items-center gap-2 text-[10px] tracking-[0.25em] text-neural-olive">
                    <Wand2 size={11} className="text-neural-neon" />
                    AI_TRANSLATION
                  </div>
                  <div className="rounded-lg border border-neural-neon/30 bg-black/70 p-3 shadow-[inset_0_1px_8px_rgba(0,0,0,0.7)]">
                    <div className="mb-2 flex items-center gap-1.5 border-b border-neural-neon/20 pb-1.5 text-[10px] tracking-widest text-neural-olive">
                      <span className="flex gap-1">
                        <span className="h-2 w-2 rounded-full bg-red-500/60" />
                        <span className="h-2 w-2 rounded-full bg-yellow-500/60" />
                        <span className="h-2 w-2 rounded-full bg-neural-neon/60" />
                      </span>
                      csharp_translation.cs
                    </div>
                    <pre className="neural-scroll overflow-x-auto whitespace-pre-wrap font-mono text-[12px] leading-relaxed text-neural-green">
{typed}
<span className="cursor-blink text-neural-neon">▊</span>
                    </pre>
                  </div>
                </div>

                <div>
                  <div className="mb-2 text-[10px] tracking-[0.25em] text-neural-olive">FORMAL_KEYWORD_MAP</div>
                  <div className="overflow-hidden rounded-lg border border-neural-olive/30">
                    <div className="grid grid-cols-2 bg-neural-olive/15 text-[10px] tracking-widest text-neural-green/80">
                      <div className="px-3 py-2">INFORMAL</div>
                      <div className="border-l border-neural-olive/30 px-3 py-2">FORMAL</div>
                    </div>
                    {result.keywords.map((row, i) => (
                      <div key={row.formal + i} className={`grid grid-cols-2 text-xs ${i % 2 ? 'bg-black/30' : 'bg-black/10'}`}>
                        <div className="px-3 py-2.5 text-neural-green/80">{row.informal}</div>
                        <div className="border-l border-neural-olive/30 px-3 py-2.5 font-bold text-neural-neon neon-text-glow">
                          {row.formal}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => onUpdate(selected.id, { translation: null })}
                  className="flex items-center gap-1.5 text-[10px] tracking-widest text-neural-olive transition-colors hover:text-red-400"
                >
                  <Trash2 size={11} />
                  LIMPAR TRADUÇÃO
                </button>
              </section>
            )}

            {/* Telemetry + actions */}
            <section className="rounded-lg border border-neural-olive/30 bg-black/40 p-3">
              <div className="mb-2 text-[10px] tracking-[0.25em] text-neural-olive">NODE_TELEMETRY</div>
              <dl className="space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <dt className="text-neural-olive">id</dt>
                  <dd className="text-neural-green">{selected.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neural-olive">kind</dt>
                  <dd className="text-neural-green">{selected.kind}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-neural-olive">pos</dt>
                  <dd className="text-neural-green">
                    {Math.round(selected.x)}, {Math.round(selected.y)}
                  </dd>
                </div>
              </dl>
              <button
                onClick={() => onDeleteNode(selected.id)}
                className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-500/40 bg-red-950/30 px-3 py-2 text-[10px] tracking-widest text-red-300 transition-colors hover:bg-red-900/50 hover:text-red-200"
              >
                <Trash2 size={11} />
                DELETAR NÓ
              </button>
            </section>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-neural-olive/40 px-4 py-2 text-[10px] tracking-widest text-neural-olive">
        <span className="text-neural-neon">●</span> {nodes.length} NODES · {edges.length} EDGES
      </div>
    </aside>
  );
}
