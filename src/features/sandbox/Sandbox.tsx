import { useEffect, useMemo, useState } from 'react';
import { Empty, Panel } from '../../components/ui';
import { proximoTopico } from '../../domain/materias';
import { habilidadesDa } from '../../domain/sandbox';
import type { Challenge, Id } from '../../domain/types';
import { levelFromXp, xpForSession } from '../../domain/xp';
import { useNav } from '../../store/nav';
import { newId, selectDueTopics, useStudy } from '../../store/study';
import { toast } from '../../store/toast';
import { CabecalhoSandbox } from './CabecalhoSandbox';
import { DesafioView } from './DesafioView';
import { GavetaHistorico } from './GavetaHistorico';
import { MatrizHabilidades } from './MatrizHabilidades';
import { NovoDesafio } from './NovoDesafio';

// Sandbox = academia de prática. Os desafios saem do que você já estudou.
// O código NÃO roda: a correção lê lógica e sintaxe, como prova no papel.
// Cada bloco é um arquivo nesta pasta.

export default function Sandbox() {
  const navTopicId = useNav((s) => s.topicId);
  const codigoNaFila = useNav((s) => s.codigo);
  const subjects = useStudy((s) => s.subjects);
  const topics = useStudy((s) => s.topics);
  const challenges = useStudy((s) => s.challenges);
  const sessions = useStudy((s) => s.sessions);
  const targetTopicId = useStudy((s) => s.target.topicId);

  const materiaDe = (topicId?: Id) => topics.find((t) => t.id === topicId)?.subjectId;
  const [subjectId, setSubjectId] = useState<Id | undefined>(() => materiaDe(navTopicId) ?? materiaDe(targetTopicId) ?? subjects[0]?.id);
  const [topicId, setTopicId] = useState<Id | undefined>(navTopicId ?? targetTopicId);
  const [ativoId, setAtivoId] = useState<Id | null>(null);
  const [foco, setFoco] = useState<Set<Id>>(new Set());
  const [historico, setHistorico] = useState(false);
  /** Muda quando o código do desafio aberto é trocado por fora (restaurar). */
  const [versao, setVersao] = useState(0);

  // Veio de outra aba já num tópico ("praticar no Sandbox").
  useEffect(() => {
    if (!navTopicId) return;
    setTopicId(navTopicId);
    setSubjectId(materiaDe(navTopicId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navTopicId]);

  const subject = subjects.find((s) => s.id === subjectId);
  const linguagem = subject?.language ?? '';
  const habilidades = useMemo(() => (subjectId ? habilidadesDa(topics, subjectId) : []), [topics, subjectId]);
  const topic = topics.find((t) => t.id === topicId && t.subjectId === subjectId) ?? proximoTopico(habilidades.map((h) => h.topic));
  const desafiosDaMateria = useMemo(() => challenges.filter((c) => materiaDe(c.topicId) === subjectId), [challenges, subjectId, topics]); // eslint-disable-line react-hooks/exhaustive-deps
  const ativo = challenges.find((c) => c.id === ativoId);
  const due = useMemo(() => selectDueTopics(topics).filter((t) => t.subjectId === subjectId), [topics, subjectId]);

  const trilha = useMemo(() => {
    const ids = new Set(habilidades.map((h) => h.topic.id));
    const xp = sessions.filter((s) => ids.has(s.topicId)).reduce((soma, s) => soma + xpForSession(s.minutes, s.score), 0);
    const dominio = habilidades.length ? Math.round(habilidades.reduce((s, h) => s + h.topic.mastery, 0) / habilidades.length) : 0;
    return { nivel: levelFromXp(xp).level, xp, resolvidos: desafiosDaMateria.filter((c) => c.solvedAt).length, dominioMedio: dominio };
  }, [habilidades, sessions, desafiosDaMateria]);

  // Código mandado da Lousa/Dungeon/Professor vira um desafio "leia e melhore".
  useEffect(() => {
    if (!codigoNaFila) return;
    if (!topic) return void toast({ title: 'Crie uma matéria primeiro', description: 'O código fica esperando até ter um tópico pra ligar.' });
    const c = useNav.getState().pegarCodigo();
    if (!c) return;
    const desafio: Challenge = {
      id: newId('ch'),
      topicId: topic.id,
      language: c.linguagem ?? linguagem,
      prompt: `Código vindo de: ${c.origem}.\n\n1. Antes de corrigir, preveja: o que esse código faz?\n2. Ache um problema ou um caso que ele não trata.\n3. Melhore ou complete, e mande corrigir.`,
      hints: [],
      starterCode: c.texto,
      code: c.texto,
      createdAt: new Date().toISOString(),
    };
    useStudy.getState().saveChallenge(desafio);
    setAtivoId(desafio.id);
    toast({ title: `Código recebido de ${c.origem}`, variant: 'success' });
  }, [codigoNaFila, topic, linguagem]);

  const trocarMateria = (id: Id) => {
    setSubjectId(id);
    setTopicId(undefined);
    setFoco(new Set());
    setAtivoId(null);
  };

  const alternarFoco = (id: Id) =>
    setFoco((f) => {
      const n = new Set(f);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  if (subjects.length === 0) {
    return (
      <div className="mx-auto max-w-[1500px] p-4">
        <Empty>Crie uma matéria no Lobby ("O que você quer aprender?") e o Sandbox monta os treinos dela.</Empty>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1600px] space-y-4 p-4">
      <CabecalhoSandbox subjects={subjects} subjectId={subjectId} onMateria={trocarMateria} linguagem={linguagem} desafioId={ativo?.id} onHistorico={() => setHistorico(true)} />

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-4">
          <MatrizHabilidades
            habilidades={habilidades}
            topicId={topic?.id}
            foco={foco}
            trilha={trilha}
            onEscolher={(id) => {
              setTopicId(id);
              setAtivoId(null);
            }}
            onAlternarFoco={alternarFoco}
          />
          {topic && (
            <Panel title={`Treinar // ${topic.title}`}>
              <NovoDesafio
                topic={topic}
                linguagem={linguagem}
                foco={habilidades.filter((h) => foco.has(h.topic.id) && h.topic.id !== topic.id).map((h) => h.topic.title)}
                onCriado={setAtivoId}
              />
            </Panel>
          )}
          {due.length > 0 && (
            <Panel title="Pra não esquecer">
              <ul className="space-y-1">
                {due.slice(0, 5).map((t) => (
                  <li key={t.id}>
                    <button type="button" onClick={() => setTopicId(t.id)} className="w-full truncate rounded px-2 py-1 text-left text-xs hover:bg-panel-2">
                      {t.title}
                    </button>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </div>

        {ativo && topics.some((t) => t.id === ativo.topicId) ? (
          <DesafioView key={`${ativo.id}-${versao}`} challenge={ativo} topic={topics.find((t) => t.id === ativo.topicId)!} />
        ) : (
          <Empty>{topic ? `Gere um desafio de "${topic.title}" à esquerda, ou abra um do histórico.` : 'Essa matéria ainda não tem tópicos.'}</Empty>
        )}
      </div>

      <GavetaHistorico
        open={historico}
        onClose={() => setHistorico(false)}
        desafios={desafiosDaMateria}
        topics={topics}
        ativoId={ativo?.id}
        onAbrir={(c) => {
          setAtivoId(c.id);
          setTopicId(c.topicId);
          setHistorico(false);
        }}
        onRestaurar={(c) => {
          if (!ativo) return;
          useStudy.getState().saveChallenge({ ...ativo, code: c.code });
          setVersao((v) => v + 1);
          setHistorico(false);
          toast({ title: 'Código restaurado no editor', variant: 'success' });
        }}
      />
    </div>
  );
}
