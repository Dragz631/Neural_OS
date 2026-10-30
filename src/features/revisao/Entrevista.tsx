import { useState } from 'react';
import { ENTREVISTA } from '../../domain/aprendiz';
import { useAprendiz } from '../../store/aprendiz';
import { Button, Modal } from '../../components/ui';
import { cn } from '../../lib/utils';

// Entrevista de aprendizagem. Uma pergunta por vez, sem certo nem errado.
// Versão curta (4 perguntas) pra quem está sem energia; dá pra completar depois.

export function EntrevistaModal({ open, onClose, curta = false }: { open: boolean; onClose: () => void; curta?: boolean }) {
  const responder = useAprendiz((s) => s.responder);
  const respostas = useAprendiz((s) => s.respostas);
  const perguntas = curta ? ENTREVISTA.filter((p) => p.essencial) : ENTREVISTA;
  const [i, setI] = useState(0);
  const fim = i >= perguntas.length;
  const atual = perguntas[i];

  const fechar = () => {
    setI(0);
    onClose();
  };

  return (
    <Modal open={open} onClose={fechar} title="Como você aprende?">
      {fim ? (
        <div className="space-y-3 text-sm leading-relaxed">
          <p>Anotei. A partir de agora o Prof. A.Ilson usa isso pra decidir o tamanho das revisões, o jeito de perguntar e o que fazer quando você estiver cansado.</p>
          <p className="text-xs text-muted">Você pode refazer quando quiser: a gente muda com o tempo.</p>
          <Button variant="primary" className="w-full" onClick={fechar}>
            Fechar
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[10px] uppercase tracking-widest text-muted">
            Pergunta {i + 1} de {perguntas.length} · sem resposta certa
          </p>
          <p className="text-base font-bold leading-snug">{atual.pergunta}</p>
          <div className="space-y-2">
            {atual.opcoes.map((o) => (
              <button
                key={o.valor}
                type="button"
                onClick={() => {
                  responder(atual.id, o.valor);
                  setI(i + 1);
                }}
                className={cn('block w-full rounded border border-line bg-bg px-3 py-2 text-left text-sm hover:border-accent', respostas[atual.id] === o.valor && 'border-accent/70 bg-accent/10')}
              >
                {o.texto}
              </button>
            ))}
          </div>
          <p className="text-[11px] leading-snug text-muted">Por que eu pergunto: {atual.porque}</p>
          <div className="flex justify-between">
            <Button className="px-2 py-1 text-[10px]" disabled={i === 0} onClick={() => setI(i - 1)}>
              Voltar
            </Button>
            <Button className="px-2 py-1 text-[10px]" onClick={() => setI(i + 1)}>
              Pular
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
