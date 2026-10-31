import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp } from 'lucide-react';
import type { CartaoEscolha } from '../../../../domain/cartoes';
import { JOGO_ALTURA, JOGO_LARGURA, type JogoIA } from '../../../../domain/jogoIA';
import type { TemaJogo } from './tema';

// Roda um jogo que a IA escreveu, isolado: <iframe sandbox="allow-scripts"> sem
// "allow-same-origin" (não enxerga localStorage, cookies nem o app) e com CSP que bloqueia
// rede. O jogo só consegue: desenhar texto, ouvir teclas e dizer "escolhi a alternativa N".

export interface RespostaJogo {
  i: number;
}

/** Documento HTML do jogo. O código da IA entra num <script> próprio (erro dele não derruba o resto). */
function montarDocumento(codigo: string, params: unknown, cores: { fg: string; bg: string }): string {
  const seguro = codigo.replace(/<\/script/gi, '<\\/script');
  const p = JSON.stringify(params).replace(/</g, '\\u003c');
  return `<!doctype html><html><head><meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'">
<style>html,body{margin:0;background:${cores.bg};color:${cores.fg};height:100%;display:flex;justify-content:center;align-items:flex-start}
pre{margin:6px 0 0;font:13px/1.1 ui-monospace,Consolas,monospace;white-space:pre;user-select:none}</style></head>
<body><pre id="t"> </pre>
<script>
var P=${p},pre=document.getElementById('t'),desenhos=0,respondeu=false,teclaFn=null,respFn=null;
function erro(e){parent.postMessage({tipo:'erro',m:String(e&&e.message||e)},'*')}
var api={W:${JOGO_LARGURA},H:${JOGO_ALTURA},pergunta:P.pergunta,opcoes:P.opcoes,materia:P.materia,topico:P.topico,tema:P.tema,
 desenhar:function(s){desenhos++;pre.textContent=String(s).split('\\n').slice(0,${JOGO_ALTURA}).map(function(l){return l.slice(0,${JOGO_LARGURA})}).join('\\n')},
 cada:function(ms,fn){return setInterval(function(){try{fn()}catch(e){erro(e)}},Math.max(80,Number(ms)||100))},
 teclas:function(fn){teclaFn=fn;parent.postMessage({tipo:'controles'},'*')},
 aoResponder:function(fn){respFn=fn},
 escolher:function(i){if(respondeu)return;i=Number(i);if(!(i>=0&&i<P.opcoes.length))return;respondeu=true;parent.postMessage({tipo:'escolher',i:i},'*')}};
addEventListener('error',function(e){erro(e.message)});
addEventListener('message',function(e){var d=e.data||{};try{if(d.tipo==='tecla'&&teclaFn)teclaFn(d.k);else if(d.tipo==='resultado'&&respFn)respFn(d)}catch(x){erro(x)}});
var MAP={ArrowLeft:'esquerda',ArrowRight:'direita',ArrowUp:'cima',ArrowDown:'baixo',' ':'acao',Enter:'acao'};
addEventListener('keydown',function(e){if(!teclaFn)return;e.preventDefault();try{teclaFn(MAP[e.key]||String(e.key).toLowerCase())}catch(x){erro(x)}});
setTimeout(function(){parent.postMessage({tipo:'pronto',desenhos:desenhos},'*')},2500);
</script>
<script>try{(function(api){
${seguro}
})(api)}catch(e){erro(e)}</script></body></html>`;
}

export function JogoSandbox({
  jogo,
  cartao,
  tema,
  materia,
  topico,
  respondeu,
  acertou,
  onEscolher,
  onFalhou,
}: {
  jogo: JogoIA;
  cartao: CartaoEscolha;
  tema: TemaJogo;
  materia: string;
  topico: string;
  respondeu: boolean;
  acertou: boolean;
  onEscolher: (i: number) => void;
  /** O jogo quebrou ou não desenhou nada: o cartão volta pro jogo embutido. */
  onFalhou: (motivo: string) => void;
}) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [controles, setControles] = useState(false);
  const cores = useMemo(() => {
    const css = getComputedStyle(document.documentElement);
    return { fg: css.getPropertyValue('--color-accent').trim() || '#c8f03a', bg: css.getPropertyValue('--color-bg').trim() || '#0b0c0d' };
  }, []);
  const doc = useMemo(
    () => montarDocumento(jogo.codigo, { pergunta: cartao.pergunta, opcoes: cartao.opcoes.slice(0, 5), materia, topico, tema: { chefe: tema.chefe, simbolos: tema.simbolos } }, cores),
    [jogo.codigo, cartao.pergunta, cartao.opcoes, materia, topico, tema, cores],
  );

  const mandar = useCallback((msg: unknown) => ref.current?.contentWindow?.postMessage(msg, '*'), []);

  useEffect(() => {
    const on = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return;
      const d = (e.data ?? {}) as { tipo?: string; i?: number; m?: string; desenhos?: number };
      if (d.tipo === 'escolher' && typeof d.i === 'number') onEscolher(d.i);
      else if (d.tipo === 'controles') setControles(true);
      else if (d.tipo === 'erro') onFalhou(d.m ?? 'erro no jogo');
      else if (d.tipo === 'pronto' && !d.desenhos) onFalhou('o jogo não desenhou nada');
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, [onEscolher, onFalhou]);

  // Teclado: a página repassa as teclas pro jogo (quando o foco está fora do iframe).
  useEffect(() => {
    if (respondeu) return;
    const MAPA: Record<string, string> = { ArrowLeft: 'esquerda', ArrowRight: 'direita', ArrowUp: 'cima', ArrowDown: 'baixo', ' ': 'acao', Enter: 'acao' };
    const on = (e: KeyboardEvent) => {
      const alvo = e.target as HTMLElement | null;
      if (e.ctrlKey || e.metaKey || e.altKey || document.activeElement === ref.current) return;
      if (alvo && (alvo.tagName === 'INPUT' || alvo.tagName === 'TEXTAREA' || alvo.tagName === 'SELECT' || alvo.isContentEditable)) return;
      mandar({ tipo: 'tecla', k: MAPA[e.key] ?? e.key.toLowerCase() });
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [respondeu, mandar]);

  // Depois da resposta o jogo pode comemorar ou lamentar (ele nunca soube qual era a certa).
  useEffect(() => {
    if (respondeu) mandar({ tipo: 'resultado', acertou, certa: cartao.certa });
  }, [respondeu, acertou, cartao.certa, mandar]);

  const botao = 'rounded border border-line px-3 py-2 hover:border-accent active:bg-accent/10';
  return (
    <div className="space-y-2">
      <div className="flex justify-center rounded border border-line bg-bg">
        <iframe ref={ref} title={`Minijogo: ${jogo.nome}`} sandbox="allow-scripts" srcDoc={doc} className="w-full max-w-[420px] border-0" style={{ height: `${JOGO_ALTURA * 14.3 + 12}px` }} />
      </div>
      <p className="text-[10px] uppercase tracking-widest text-muted">Jogo criado pela IA: {jogo.nome}</p>
      {controles && !respondeu && (
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={botao} aria-label="Esquerda" onClick={() => mandar({ tipo: 'tecla', k: 'esquerda' })}>
            <ArrowLeft size={14} />
          </button>
          <button type="button" className={botao} aria-label="Cima" onClick={() => mandar({ tipo: 'tecla', k: 'cima' })}>
            <ArrowUp size={14} />
          </button>
          <button type="button" className={botao} aria-label="Baixo" onClick={() => mandar({ tipo: 'tecla', k: 'baixo' })}>
            <ArrowDown size={14} />
          </button>
          <button type="button" className={botao} aria-label="Direita" onClick={() => mandar({ tipo: 'tecla', k: 'direita' })}>
            <ArrowRight size={14} />
          </button>
          <button type="button" className="rounded border border-accent px-4 py-2 text-xs font-bold uppercase text-accent hover:bg-accent/10" onClick={() => mandar({ tipo: 'tecla', k: 'acao' })}>
            Ação
          </button>
        </div>
      )}
    </div>
  );
}
