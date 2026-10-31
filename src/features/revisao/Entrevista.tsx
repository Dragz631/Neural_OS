import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ENTREVISTA, gerarRelatorio } from '../../domain/aprendiz';
import { useAprendiz } from '../../store/aprendiz';
import { Button, Modal, Textarea } from '../../components/ui';
import { cn } from '../../lib/utils';

// Entrevista de aprendizagem. Uma pergunta por vez, sem certo nem errado, e dá pra
// marcar mais de uma opção (a ordem importa: a primeira é a mais forte).
// Versão curta (4 perguntas) pra quem está sem energia; dá pra completar depois.
// No fim: o relatório de como o professor entendeu a pessoa e como vai ensinar.

export function EntrevistaModal({ open, onClose, curta = false, direto = false }: { open: boolean; onClose: () => void; curta?: boolean; direto?: boolean }) {
  const alternar = useAprendiz((s) => s.alternar);
  const escrever = useAprendiz((s) => s.escrever);
  const respostas = useAprendiz((s) => s.respostas);
  const livre = useAprendiz((s) => s.livre);
  const perguntas = curta ? ENTREVISTA.filter((p) => p.essencial) : ENTREVISTA;
  const [i, setI] = useState(0);
  const total = perguntas.length;
  const naLivre = i === total;
  const noRelatorio = i > total;
  const atual = perguntas[i];
  const marcadas = atual ? (respostas[atual.id] ?? []) : [];

  // Ao abrir: ou começa a entrevista, ou vai direto pro relatório (botão "Ver relatório").
  useEffect(() => {
    if (open) setI(direto && useAprendiz.getState().perfil.respondidas > 0 ? total + 1 : 0);
  }, [open, direto, total]);

  const fechar = () => {
    setI(0);
    onClose();
  };

  return (
    <Modal open={open} onClose={fechar} title={noRelatorio ? 'Como o professor te entendeu' : 'Como você aprende?'} wide={noRelatorio}>
      {noRelatorio ? (
        <Relatorio onAjustar={() => setI(0)} onFechar={fechar} />
      ) : naLivre ? (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-muted">Última · opcional</p>
          <p className="text-base font-bold leading-snug">Tem mais alguma coisa sobre o seu jeito de estudar que o professor deveria saber?</p>
          <Textarea rows={4} value={livre} onChange={(e) => escrever(e.target.value)} placeholder="Ex.: estudo com música, fico sem foco depois do almoço, travo com texto longo, trabalho de madrugada…" />
          <p className="text-[11px] leading-snug text-muted">Por que eu pergunto: nenhuma lista cobre todo mundo. O que você escrever aqui vai junto de tudo que eu fizer por você.</p>
          <div className="flex justify-between">
            <Button className="px-2 py-1 text-[10px]" onClick={() => setI(i - 1)}>
              Voltar
            </Button>
            <Button variant="primary" className="px-3 py-1 text-[10px]" onClick={() => setI(i + 1)}>
              Ver o que entendi de você
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-muted">
            Pergunta {i + 1} de {total} · sem resposta certa · {atual.multi ? 'marque quantas quiser' : 'marque uma'}
          </p>
          <p className="text-base font-bold leading-snug">{atual.pergunta}</p>
          <div className="space-y-2" role={atual.multi ? 'group' : 'radiogroup'} aria-label={atual.pergunta}>
            {atual.opcoes.map((o) => {
              const idx = marcadas.indexOf(o.valor);
              const ligada = idx >= 0;
              return (
                <button
                  key={o.valor}
                  type="button"
                  role={atual.multi ? 'checkbox' : 'radio'}
                  aria-checked={ligada}
                  onClick={() => alternar(atual.id, o.valor)}
                  className={cn('flex w-full items-center gap-2.5 rounded border border-line bg-bg px-3 py-2 text-left text-sm hover:border-accent', ligada && 'border-accent/70 bg-accent/10')}
                >
                  <span className={cn('flex h-4 w-4 shrink-0 items-center justify-center border text-on-accent', atual.multi ? 'rounded-sm' : 'rounded-full', ligada ? 'border-accent bg-accent' : 'border-line')}>
                    {ligada && <Check size={11} strokeWidth={3} />}
                  </span>
                  <span className="flex-1">{o.texto}</span>
                  {atual.multi && ligada && marcadas.length > 1 && <span className="text-[10px] font-bold text-accent">{idx + 1}º</span>}
                </button>
              );
            })}
          </div>
          <p className="text-[11px] leading-snug text-muted">Por que eu pergunto: {atual.porque}</p>
          <div className="flex justify-between">
            <Button className="px-2 py-1 text-[10px]" disabled={i === 0} onClick={() => setI(i - 1)}>
              Voltar
            </Button>
            <Button variant={marcadas.length ? 'primary' : 'ghost'} className="px-3 py-1 text-[10px]" onClick={() => setI(i + 1)}>
              {marcadas.length ? 'Próxima' : 'Pular'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

/** O que o professor entendeu e como vai agir. Serve também sozinho (botão "Ver relatório"). */
function Relatorio({ onAjustar, onFechar }: { onAjustar: () => void; onFechar: () => void }) {
  const respostas = useAprendiz((s) => s.respostas);
  const perfil = useAprendiz((s) => s.perfil);
  const rel = gerarRelatorio(perfil, respostas);
  if (perfil.respondidas === 0) {
    return (
      <div className="space-y-3 text-sm">
        <p>Você ainda não respondeu nada, então não tenho o que concluir. Responda pelo menos uma pergunta e eu monto este relatório.</p>
        <Button variant="primary" className="w-full" onClick={onAjustar}>
          Começar a entrevista
        </Button>
      </div>
    );
  }
  return (
    <div className="space-y-4 text-sm leading-relaxed">
      <section>
        <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-info">Como te entendi</h3>
        <ul className="space-y-1">
          {rel.comoEntendi.map((l) => (
            <li key={l} className="flex gap-2">
              <span className="text-info">▸</span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
      </section>
      <section>
        <h3 className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-accent">Como vou te ensinar</h3>
        <ul className="space-y-1">
          {rel.comoVouEnsinar.map((l) => (
            <li key={l} className="flex gap-2">
              <span className="text-accent">▸</span>
              <span>{l}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded border border-accent/40 bg-accent/5 p-3">
        <h3 className="mb-1 text-[10px] font-bold uppercase tracking-widest text-accent">Seu primeiro passo</h3>
        <p>{rel.primeiroPasso}</p>
      </section>
      {rel.faltou.length > 0 && <p className="text-[11px] text-muted">Ficaram em branco {rel.faltou.length} pergunta(s). Quanto mais você responder, mais certeiro eu fico.</p>}
      <p className="text-[11px] text-muted">Isto não é rótulo: muda com o tempo. Se algo estiver errado, ajuste as respostas.</p>
      <div className="flex gap-2">
        <Button className="flex-1" onClick={onAjustar}>
          Ajustar respostas
        </Button>
        <Button variant="primary" className="flex-1" onClick={onFechar}>
          Está certo
        </Button>
      </div>
    </div>
  );
}
