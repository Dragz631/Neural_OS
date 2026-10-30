import { useMemo, useState } from 'react';
import { Lightbulb, RefreshCw, Sparkles } from 'lucide-react';
import { prazosProximos } from '../../domain/calendario';
import { toLocalDate } from '../../domain/dates';
import { useAI } from '../../hooks/useAI';
import { useToday } from '../../hooks/useToday';
import { explicarFacil, type ExplicacaoFacil } from '../../services/ai/explicar';
import { useIALigada } from '../../store/conexoes';
import { useEntregas } from '../../store/entregas';
import { useNav, type TabId } from '../../store/nav';
import { useStudy } from '../../store/study';
import { Button, Panel } from '../../components/ui';

// Widget "Lembra de mim": uma coisa por vez. Primeiro o que não pode esquecer
// (o que sobrou de um dia cansado, prazo, aula de hoje) e depois uma ideia
// simples de algo que a pessoa estuda, com "explica mais fácil".

interface Lembrete {
  chave: string;
  tom: 'aviso' | 'ideia';
  texto: string;
  acao?: { rotulo: string; tab: TabId; topicId?: string };
  /** Só nas ideias: assunto e material pra explicar fácil. */
  assunto?: string;
  base?: string;
}

export function LembreteWidget() {
  const { herdadas, missions } = useToday();
  const entregas = useEntregas((s) => s.lista);
  const topics = useStudy((s) => s.topics);
  const go = useNav((s) => s.go);
  const aiOn = useIALigada();
  const { run, loading, error } = useAI();
  const [i, setI] = useState(0);
  const [facil, setFacil] = useState<Record<string, ExplicacaoFacil>>({});

  const lembretes = useMemo<Lembrete[]>(() => {
    const hoje = toLocalDate();
    const avisos: Lembrete[] = [
      ...herdadas.map((h): Lembrete => ({ chave: h.id, tom: 'aviso', texto: `${h.title}. Só ${h.minutes} min já ajuda.`, acao: { rotulo: 'Fazer agora', tab: 'professor', topicId: h.topicId } })),
      ...prazosProximos(entregas, hoje, 7)
        .slice(0, 2)
        .map((e): Lembrete => ({ chave: `pz-${e.id}`, tom: 'aviso', texto: `${e.titulo}: ${e.faltam === 0 ? 'é hoje' : e.faltam === 1 ? 'é amanhã' : `faltam ${e.faltam} dias`}.` })),
      ...missions
        .filter((m) => m.id.startsWith('aula_'))
        .map((m): Lembrete => ({ chave: m.id, tom: 'aviso', texto: `${m.title}. Enquanto está fresco, ${m.minutes} min.`, acao: { rotulo: 'Revisar', tab: 'professor', topicId: m.topicId } })),
    ];
    const ideias: Lembrete[] = topics
      .filter((t) => t.lesson?.keyPoints.length)
      .slice(0, 12)
      .map((t) => ({
        chave: `id-${t.id}`,
        tom: 'ideia' as const,
        texto: t.lesson!.keyPoints[0],
        assunto: t.title,
        base: [t.lesson!.explanation, ...t.lesson!.keyPoints].join('\n'),
        acao: { rotulo: 'Abrir no quadro', tab: 'professor' as const, topicId: t.id },
      }));
    return [...avisos, ...ideias];
  }, [herdadas, missions, entregas, topics]);

  const atual = lembretes.length ? lembretes[i % lembretes.length] : undefined;
  const explicacao = atual ? facil[atual.chave] : undefined;

  const explicar = () =>
    atual?.assunto &&
    run(async (signal) => {
      const r = await explicarFacil(atual.assunto!, atual.base ?? '', signal);
      setFacil((f) => ({ ...f, [atual.chave]: r }));
    });

  return (
    <Panel
      title="Lembra_de_mim // uma coisa por vez"
      actions={
        lembretes.length > 1 && (
          <Button className="px-2 py-1 text-[10px]" onClick={() => setI((n) => n + 1)} title="Próximo lembrete">
            <RefreshCw size={12} /> {(i % lembretes.length) + 1}/{lembretes.length}
          </Button>
        )
      }
    >
      {!atual ? (
        <p className="text-xs leading-relaxed text-muted">Nada pra lembrar agora. Quando você montar a faculdade ou estudar um tópico, eu aviso o que não pode escapar e explico ideias de um jeito fácil.</p>
      ) : (
        <div className="space-y-2">
          <p className="flex items-start gap-2 text-sm leading-relaxed">
            <Lightbulb size={16} className={atual.tom === 'aviso' ? 'mt-0.5 shrink-0 text-warn' : 'mt-0.5 shrink-0 text-accent'} />
            <span>
              {atual.assunto && <b className="text-accent">{atual.assunto}: </b>}
              {atual.texto}
            </span>
          </p>
          {explicacao && (
            <div className="rounded border border-accent/40 bg-accent/5 p-2 text-xs leading-relaxed">
              <p>{explicacao.ideia}</p>
              <p className="mt-1 text-info">{explicacao.imagem}</p>
            </div>
          )}
          {error && <p className="text-[11px] text-warn">{error}</p>}
          <div className="flex flex-wrap gap-2">
            {atual.assunto && aiOn && (
              <Button className="px-2 py-1 text-[10px]" onClick={explicar} disabled={loading}>
                <Sparkles size={12} /> {loading ? 'Pensando…' : explicacao ? 'Outro jeito' : 'Explica mais fácil'}
              </Button>
            )}
            {atual.acao && (
              <Button className="px-2 py-1 text-[10px]" onClick={() => go(atual.acao!.tab, atual.acao!.topicId)}>
                {atual.acao.rotulo}
              </Button>
            )}
          </div>
        </div>
      )}
    </Panel>
  );
}
