import { BookOpen, Dices, PenLine, Plus, Sparkles, X, Zap } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Badge, Button, ErrorNote, Modal, Select, Textarea } from '../../components/ui';
import { escolherAngulo, retratoDoTopico, type NivelConhecimento, type Retrato } from '../../domain/conhecimento';
import { bancoDoTopico } from '../../domain/sandbox';
import type { Challenge, Id, Topic } from '../../domain/types';
import { useAI } from '../../hooks/useAI';
import { generateChallenge, type DadosDesafio } from '../../services/ai/professor';
import { useIALigada } from '../../store/conexoes';
import { useImportacao } from '../../store/importacao';
import { useNav } from '../../store/nav';
import { newId, useStudy } from '../../store/study';

const NIVEL_TEXTO: Record<NivelConhecimento, string> = {
  nada: 'sem registro',
  comeco: 'começando',
  andando: 'andando',
  firme: 'firme',
};

/** Retrato de qualquer tópico (só recalcula quando algo muda). */
function useRetratos(): (t: Topic) => Retrato {
  const subjects = useStudy((s) => s.subjects);
  const sessions = useStudy((s) => s.sessions);
  const contexto = useImportacao((s) => s.contexto);
  return useMemo(
    () => (t: Topic) => retratoDoTopico(t, { subject: subjects.find((x) => x.id === t.subjectId), sessions, contexto: contexto[t.subjectId] }),
    [subjects, sessions, contexto],
  );
}

/**
 * Gera desafio do tópico. O professor só cobra o que a pessoa estudou (aula, anotações,
 * explicações, fontes, erros); sem registro, pede antes uma aula. Dá pra misturar
 * tópicos (até de outras matérias), e cada desafio vem por um ponto de vista novo.
 */
export function NovoDesafio({ topic, linguagem, foco, onCriado }: { topic: Topic; linguagem: string; foco: Id[]; onCriado: (id: Id) => void }) {
  const aiOn = useIALigada();
  const { run, loading, error } = useAI();
  const retratoDe = useRetratos();
  const topics = useStudy((s) => s.topics);
  const subjects = useStudy((s) => s.subjects);
  const [proprio, setProprio] = useState(false);
  const [declarado, setDeclarado] = useState(false);
  const [extras, setExtras] = useState<Id[]>([]);

  const retrato = retratoDe(topic);
  const liberado = retrato.podeDesafio || declarado;

  // Companheiros = os marcados na Matriz + os misturados de outras matérias.
  const idsMistura = [...new Set([...foco.filter((id) => id !== topic.id), ...extras])];
  const companheiros = idsMistura.map((id) => topics.find((t) => t.id === id)).filter((t): t is Topic => !!t);
  const prontos = companheiros.map(retratoDe).filter((r) => r.podeDesafio);
  const semRegistro = companheiros.map(retratoDe).filter((r) => !r.podeDesafio);
  // Estatística + C#: a linguagem vem de quem tiver uma.
  const linguagemFinal =
    linguagem ||
    companheiros
      .map((c) => subjects.find((s) => s.id === c.subjectId)?.language)
      .find((l) => !!l) ||
    '';

  const criar = (d: Partial<DadosDesafio> & Pick<Challenge, 'prompt' | 'hints' | 'starterCode'>, mais: Partial<Challenge> = {}) => {
    const c: Challenge = { id: newId('ch'), topicId: topic.id, language: linguagemFinal, ...d, ...mais, code: d.starterCode, createdAt: new Date().toISOString() };
    useStudy.getState().saveChallenge(c);
    onCriado(c.id);
  };

  const comIA = (tamanho: 'micro' | 'normal') =>
    run(async (signal) => {
      const { topics: todos, subjects: materias, sessions, challenges } = useStudy.getState();
      const parents: Topic[] = [];
      let p = todos.find((t) => t.id === topic.parentId);
      while (p && parents.length < 5) {
        parents.push(p);
        p = todos.find((t) => t.id === p!.parentId);
      }
      const ctx = { topic, subject: materias.find((s) => s.id === topic.subjectId), parents, sessions: sessions.filter((s) => s.topicId === topic.id) };
      const ids = new Set([topic.id, ...prontos.map((r) => r.topicId)]);
      const anteriores = challenges.filter((c) => ids.has(c.topicId) || c.topicIds?.some((i) => ids.has(i)));
      const angulo = escolherAngulo(anteriores);
      const dados = await generateChallenge(
        {
          principal: { ctx, retrato },
          companheiros: prontos,
          language: linguagemFinal,
          size: tamanho,
          angulo,
          anteriores: anteriores.slice(0, 6).map((c) => ({ prompt: c.prompt, angulo: c.angulo })),
          declarado: declarado && !retrato.podeDesafio,
        },
        signal,
      );
      criar(dados, { angulo: angulo.id, topicIds: prontos.length ? prontos.map((r) => r.topicId) : undefined });
    });

  // Banco antigo: só desafios do ASSUNTO deste tópico (nunca algo sem relação).
  const doBanco = (micro: boolean) => {
    const opcoes = bancoDoTopico(topic, linguagem, micro);
    const c = opcoes[Math.floor(Math.random() * opcoes.length)];
    if (c) criar({ prompt: `${c.title}\n\n${c.prompt}`, hints: c.hints, starterCode: c.starterCode });
  };
  const temBanco = (micro: boolean) => bancoDoTopico(topic, linguagem, micro).length > 0;

  return (
    <div className="space-y-3">
      <RetratoCard retrato={retrato} declarado={declarado} />

      {!liberado ? (
        <div className="space-y-2 rounded border border-warn/50 bg-warn/5 p-3">
          <p className="text-xs leading-snug">
            Ainda não sei o que você sabe de <b>{topic.title}</b>. Pra não te dar um exercício que você nunca viu, eu preciso de pelo menos uma destas coisas:
          </p>
          <Button variant="primary" className="w-full" onClick={() => useNav.getState().go('professor', topic.id)}>
            <BookOpen size={13} /> Fazer a aula com o Prof. A.Ilson
          </Button>
          <Button className="w-full" onClick={() => useNav.getState().go('professor', topic.id)}>
            Provar que entendi (explicar com minhas palavras)
          </Button>
          <Button className="w-full" onClick={() => setDeclarado(true)}>
            Já estudei isso antes: me teste no básico
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="primary" onClick={() => (aiOn ? comIA('micro') : doBanco(true))} disabled={loading || (!aiOn && !temBanco(true))}>
              <Zap size={13} /> Mini (5 min)
            </Button>
            <Button variant="primary" onClick={() => (aiOn ? comIA('normal') : doBanco(false))} disabled={loading || (!aiOn && !temBanco(false))}>
              <Sparkles size={13} /> {loading ? 'Criando…' : 'Desafio'}
            </Button>
          </div>
          <Mistura topic={topic} extras={extras} onExtras={setExtras} retratoDe={retratoDe} />
          {aiOn && (temBanco(false) || temBanco(true)) && (
            <Button className="w-full" onClick={() => doBanco(Math.random() < 0.5 && temBanco(true))}>
              <Dices size={13} /> Sortear do banco
            </Button>
          )}
          {prontos.length > 0 && aiOn && <p className="text-[11px] text-muted">Vai misturar com: {prontos.map((r) => r.titulo).join(', ')}.</p>}
          {semRegistro.length > 0 && <p className="text-[11px] text-warn">Ficam de fora (sem registro do que você sabe): {semRegistro.map((r) => r.titulo).join(', ')}.</p>}
          {!aiOn && !temBanco(false) && !temBanco(true) && (
            <p className="text-[11px] text-warn">Ainda não tenho desafio de "{topic.title}" guardado. Conecte o motor do professor (⚙ Configurações) e ele cria um sob medida, ou escreva o seu.</p>
          )}
        </>
      )}
      <Button className="w-full" onClick={() => setProprio(true)}>
        <PenLine size={13} /> Escrever meu próprio
      </Button>
      <ErrorNote error={error} />
      <MeuDesafio open={proprio} onClose={() => setProprio(false)} onCriar={criar} />
    </div>
  );
}

function RetratoCard({ retrato, declarado }: { retrato: Retrato; declarado: boolean }) {
  return (
    <div className="rounded border border-line p-2.5">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">O que o professor sabe de você aqui</span>
        <Badge color={retrato.nivel === 'nada' ? 'var(--color-warn)' : 'var(--color-accent)'}>{declarado && retrato.nivel === 'nada' ? 'diz que já viu' : NIVEL_TEXTO[retrato.nivel]}</Badge>
      </div>
      {retrato.viu.length > 0 ? (
        <ul className="space-y-0.5 text-[11px] leading-snug">
          {retrato.viu.map((v) => (
            <li key={v}>
              <span className="text-accent">✓</span> {v}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-muted">Nada registrado ainda sobre este tópico.</p>
      )}
      {retrato.falta.length > 0 && retrato.nivel !== 'nada' && <p className="mt-1.5 text-[11px] text-muted">Pra eu te conhecer melhor: {retrato.falta.join(' · ')}.</p>}
    </div>
  );
}

/** Misturar com tópicos de qualquer matéria. Só entram os que o professor conhece. */
function Mistura({ topic, extras, onExtras, retratoDe }: { topic: Topic; extras: Id[]; onExtras: (ids: Id[]) => void; retratoDe: (t: Topic) => Retrato }) {
  const topics = useStudy((s) => s.topics);
  const subjects = useStudy((s) => s.subjects);
  const opcoes = useMemo(
    () => subjects.map((s) => ({ s, ts: topics.filter((t) => t.subjectId === s.id && t.id !== topic.id && !extras.includes(t.id)).map((t) => ({ t, ok: retratoDe(t).podeDesafio })) })).filter((g) => g.ts.length),
    [subjects, topics, topic.id, extras, retratoDe],
  );
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Plus size={12} className="text-muted" aria-hidden />
        <Select aria-label="Misturar com outro tópico" className="min-w-0 flex-1 text-xs" value="" onChange={(e) => e.target.value && onExtras([...extras, e.target.value])}>
          <option value="">Misturar com outro tópico…</option>
          {opcoes.map(({ s, ts }) => (
            <optgroup key={s.id} label={s.name}>
              {ts.map(({ t, ok }) => (
                <option key={t.id} value={t.id} disabled={!ok}>
                  {t.title}
                  {ok ? '' : ' (sem registro)'}
                </option>
              ))}
            </optgroup>
          ))}
        </Select>
      </div>
      {extras.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {extras.map((id) => (
            <button key={id} type="button" onClick={() => onExtras(extras.filter((x) => x !== id))} className="inline-flex items-center gap-1 rounded border border-accent/50 px-1.5 py-0.5 text-[10px] hover:bg-accent/10" aria-label="Tirar da mistura">
              {topics.find((t) => t.id === id)?.title}
              <X size={10} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function MeuDesafio({ open, onClose, onCriar }: { open: boolean; onClose: () => void; onCriar: (d: Pick<Challenge, 'prompt' | 'hints' | 'starterCode'>) => void }) {
  const [texto, setTexto] = useState('');
  return (
    <Modal open={open} onClose={onClose} title="Meu desafio">
      <Textarea rows={6} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Ex.: Implementar uma classe ContaBancaria com saldo privado e método Sacar que não deixa ficar negativo." />
      <Button
        variant="primary"
        className="mt-3 w-full"
        disabled={!texto.trim()}
        onClick={() => {
          onCriar({ prompt: texto.trim(), hints: [], starterCode: '' });
          setTexto('');
          onClose();
        }}
      >
        Criar
      </Button>
    </Modal>
  );
}
