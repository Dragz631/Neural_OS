import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, LifeBuoy, RotateCcw, Sparkles, Trash2, X } from 'lucide-react';
import { ACERTOS_PRA_FIRMAR, ATALHOS_BASE, respostaCerta } from '../domain/base';
import type { Id } from '../domain/types';
import { useCelular } from '../hooks/useCelular';
import { cn } from '../lib/utils';
import { useBases } from '../store/bases';
import { treinar } from '../store/musculos';
import { useIALigada } from '../store/conexoes';
import { CHAVE_BASE as CHAVE, explicarBase as explicar, explicarDeOutroJeito as outroJeito, useGavetaBase } from '../store/gavetaBase';
import { useTarefa } from '../store/tarefas';
import { DesenhoBaseView } from './DesenhoBase';
import { Orbe } from './Orbe';
import { Button } from './ui';

// "Travei numa base": um parêntese na aula. A gaveta abre por cima (embaixo, no celular),
// a aula fica parada onde estava. Quadros desenhados um por vez, no ritmo dele, e no fim
// 1 pergunta pra conferir. Errou? Mostra de outro jeito. Fechou, volta pro mesmo ponto.

/** O botão que abre o parêntese. */
export function BotaoTraveiBase({ topicId, duvida, className, rotulo = 'Travei numa base' }: { topicId?: Id; duvida?: string; className?: string; rotulo?: string }) {
  return (
    <Button className={className} onClick={() => useGavetaBase.getState().abrir({ topicId, duvida })} title="Não sabe uma conta que a aula usa (dividir, fração...)? O professor explica desenhando, sem parar a aula.">
      <LifeBuoy size={14} /> {rotulo}
    </Button>
  );
}

export function GavetaBase() {
  const { aberta, baseId, topicId, duvida: duvidaInicial } = useGavetaBase();
  const celular = useCelular();
  if (!aberta) return null;
  return (
    <>
      {celular && <div className="fixed inset-0 z-40 bg-black/50" onClick={() => useGavetaBase.getState().fechar()} aria-hidden />}
      <aside
        className={cn('z-50 flex flex-col border-info/60 bg-panel shadow-2xl', celular ? 'fixed inset-x-0 bottom-0 h-[80dvh] rounded-t-xl border-t-2' : 'fixed bottom-0 right-0 top-[52px] w-[440px] border-l-2')}
        aria-label="Travei numa base"
      >
        <header className="flex items-center gap-2 border-b border-line px-3 py-2">
          <LifeBuoy size={18} className="text-info" />
          <div className="min-w-0 flex-1">
            <p className="fonte-titulo text-[10px] uppercase tracking-[0.2em] text-info">Parêntese · base</p>
            <p className="truncate text-[11px] text-muted">A aula fica parada onde está. Fechou, você volta pro mesmo ponto.</p>
          </div>
          <button type="button" onClick={() => useGavetaBase.getState().fechar()} className="flex items-center gap-1 rounded border border-line px-2 py-1 text-[10px] uppercase tracking-wider text-muted hover:text-fg" title="Voltar pra aula">
            <X size={13} /> Voltar pra aula
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">{baseId ? <VerBase key={baseId} baseId={baseId} /> : <Escolher topicId={topicId} duvidaInicial={duvidaInicial} />}</div>
      </aside>
    </>
  );
}

function Escolher({ topicId, duvidaInicial }: { topicId?: Id; duvidaInicial?: string }) {
  const aiOn = useIALigada();
  const { rodando, erro, limpar } = useTarefa(CHAVE);
  const [texto, setTexto] = useState(duvidaInicial ?? '');
  const bases = useBases((s) => s.bases);
  const pedir = (d: string) => {
    if (!d.trim() || rodando) return;
    limpar();
    explicar(d.trim(), topicId);
  };

  if (rodando)
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Orbe estado="thinking" tamanho={72} />
        <p className="text-sm text-muted">O professor está desenhando a explicação…</p>
        <p className="text-[11px] text-muted">Pode fechar e continuar a aula: quando ficar pronta, aparece aqui.</p>
      </div>
    );

  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm text-fg">Qual conta travou?</p>
        <div className="flex flex-wrap gap-1.5">
          {ATALHOS_BASE.map((a) => (
            <button key={a.rotulo} type="button" disabled={!aiOn} onClick={() => pedir(a.duvida)} className="rounded border border-line px-2.5 py-1.5 text-xs hover:border-info hover:text-info disabled:opacity-50">
              {a.rotulo}
            </button>
          ))}
        </div>
      </div>
      <form
        className="space-y-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          pedir(texto);
        }}
      >
        <p className="text-xs text-muted">Ou diga com as suas palavras:</p>
        <div className="flex gap-1.5">
          <input value={texto} onChange={(e) => setTexto(e.target.value)} disabled={!aiOn} placeholder={aiOn ? 'ex.: não sei dividir com vírgula' : 'Conecte um modelo pra usar'} className="min-w-0 flex-1 rounded border border-line bg-bg px-2 py-1.5 text-sm text-fg" />
          <Button variant="primary" type="submit" disabled={!aiOn || !texto.trim()}>
            <Sparkles size={14} /> Explica
          </Button>
        </div>
      </form>
      {erro && <p className="text-xs text-warn">{erro}</p>}
      {bases.length > 0 && (
        <div>
          <p className="mb-1.5 text-[10px] uppercase tracking-widest text-muted">Bases que você já viu</p>
          <ul className="space-y-1">
            {bases.slice(0, 10).map((b) => (
              <li key={b.id} className="flex items-center gap-2 rounded border border-line px-2 py-1.5 text-xs">
                <button type="button" onClick={() => useGavetaBase.getState().mostrar(b.id)} className="min-w-0 flex-1 truncate text-left hover:text-info">
                  <b>{b.explicacao.titulo}</b> <span className="text-muted">· {b.duvida}</span>
                </button>
                <span className={cn('shrink-0 font-mono text-[10px]', b.acertos >= ACERTOS_PRA_FIRMAR ? 'text-accent' : 'text-muted')} title={`acertou a pergunta de conferir ${b.acertos}x (${ACERTOS_PRA_FIRMAR} firma a base)`}>
                  {b.acertos >= ACERTOS_PRA_FIRMAR ? '✓ firme' : `${b.acertos}/${ACERTOS_PRA_FIRMAR}`}
                </span>
                <button type="button" onClick={() => confirm(`Apagar a explicação de "${b.explicacao.titulo}"?`) && useBases.getState().apagar(b.id)} className="shrink-0 text-muted hover:text-danger" title="Apagar">
                  <Trash2 size={12} />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function VerBase({ baseId }: { baseId: string }) {
  const base = useBases((s) => s.bases.find((b) => b.id === baseId));
  const { rodando, erro } = useTarefa(CHAVE);
  const aiOn = useIALigada();
  const [i, setI] = useState(0);
  const [resposta, setResposta] = useState('');
  const [resultado, setResultado] = useState<'certo' | 'errado' | null>(null);
  const [erros, setErros] = useState(0);
  const explicacao = base?.explicacao;
  // Explicação nova (o "outro jeito" chegou): volta pro 1º quadro.
  const [vista, setVista] = useState(explicacao);
  if (vista !== explicacao) {
    setVista(explicacao);
    setI(0);
    setResultado(null);
    setResposta('');
  }

  if (!base || !explicacao) return <p className="text-sm text-muted">Essa explicação não existe mais.</p>;
  const n = explicacao.quadros.length;
  const naPergunta = i >= n;
  const q = explicacao.quadros[Math.min(i, n - 1)];

  const conferir = () => {
    if (!resposta.trim()) return;
    if (respostaCerta(resposta, explicacao.pergunta.resposta)) {
      setResultado('certo');
      useBases.getState().acertou(base.id);
      treinar('raciocinio');
    } else {
      setResultado('errado');
      setErros((e) => e + 1);
      useBases.getState().errou(base.id);
    }
  };

  if (rodando)
    return (
      <div className="flex flex-col items-center gap-3 py-10 text-center">
        <Orbe estado="thinking" tamanho={72} />
        <p className="text-sm text-muted">O professor está pensando em outro jeito de mostrar…</p>
      </div>
    );

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => useGavetaBase.getState().mostrar(undefined)} className="text-muted hover:text-fg" title="Outra base">
          <ArrowLeft size={15} />
        </button>
        <h3 className="flex-1 text-base font-bold text-fg">{explicacao.titulo}</h3>
        {/* Bolinhas de progresso: quadros + a pergunta no fim. */}
        <div className="flex gap-1" aria-label={`quadro ${Math.min(i + 1, n + 1)} de ${n + 1}`}>
          {Array.from({ length: n + 1 }, (_, k) => (
            <span key={k} className={cn('h-1.5 w-4 rounded-full', k === i ? 'bg-info' : k < i ? 'bg-info/40' : 'bg-line')} />
          ))}
        </div>
      </div>

      {!naPergunta ? (
        <div className="flex min-h-[260px] flex-1 flex-col items-center justify-center gap-5 rounded-lg border border-line bg-panel-2 p-4">
          {q.desenho && <DesenhoBaseView d={q.desenho} />}
          {q.texto && <p className="text-center text-lg font-bold leading-snug text-fg">{q.texto}</p>}
        </div>
      ) : (
        <div className="flex min-h-[260px] flex-1 flex-col justify-center gap-3 rounded-lg border border-info/50 bg-info/5 p-4">
          <p className="text-[10px] uppercase tracking-widest text-info">Agora você</p>
          <p className="text-lg font-bold leading-snug text-fg">{explicacao.pergunta.texto}</p>
          {resultado !== 'certo' && (
            <form
              className="flex gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                conferir();
              }}
            >
              <input
                value={resposta}
                onChange={(e) => {
                  setResposta(e.target.value);
                  setResultado(null);
                }}
                inputMode="decimal"
                autoFocus
                placeholder="sua resposta"
                className="min-w-0 flex-1 rounded border border-line bg-bg px-3 py-2 font-mono text-lg text-fg"
              />
              <Button variant="primary" type="submit" disabled={!resposta.trim()}>
                <Check size={14} /> Conferir
              </Button>
            </form>
          )}
          {resultado === 'certo' && (
            <div className="space-y-2">
              <p className="text-base font-bold text-accent">Isso! {explicacao.pergunta.resposta} 🎯</p>
              <p className="text-xs text-muted">{base.acertos >= ACERTOS_PRA_FIRMAR ? 'Essa base já está firme.' : `Acertou ${base.acertos} de ${ACERTOS_PRA_FIRMAR} vezes: quando firmar, sai da lista de bases fracas.`}</p>
              <Button variant="primary" className="w-full" onClick={() => useGavetaBase.getState().fechar()}>
                Voltar pra aula
              </Button>
            </div>
          )}
          {resultado === 'errado' && (
            <div className="space-y-2">
              <p className="text-sm text-warn">Ainda não. Errar aqui é normal: é assim que acha onde a conta escapa.</p>
              <div className="flex flex-wrap gap-2">
                <Button disabled={!aiOn} onClick={() => outroJeito(base.id, resposta)}>
                  <Sparkles size={14} /> Mostra de outro jeito
                </Button>
                <Button onClick={() => setI(0)}>
                  <RotateCcw size={14} /> Rever os quadros
                </Button>
              </div>
              {/* Escada de ajuda: depois de 2 tentativas de verdade, a resposta pode aparecer (explicada pelos quadros). */}
              {erros >= 2 && (
                <p className="rounded border border-line p-2 text-xs text-muted">
                  Tentou 2 vezes: a resposta é <b className="font-mono text-fg">{explicacao.pergunta.resposta}</b>. Volte nos quadros e veja de onde ela sai, depois peça outro jeito pra treinar com outros números.
                </p>
              )}
            </div>
          )}
          {erro && <p className="text-xs text-warn">{erro}</p>}
        </div>
      )}

      <div className="flex gap-2">
        <Button className="flex-1" disabled={i === 0} onClick={() => setI((v) => Math.max(0, v - 1))}>
          <ArrowLeft size={14} /> Voltar
        </Button>
        {!naPergunta && (
          <Button variant="primary" className="flex-1" onClick={() => setI((v) => v + 1)}>
            {i === n - 1 ? 'Agora eu tento' : 'Próximo'} <ArrowRight size={14} />
          </Button>
        )}
      </div>
    </div>
  );
}
