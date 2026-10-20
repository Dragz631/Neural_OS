import { Dices, PenLine, Sparkles, Zap } from 'lucide-react';
import { useState } from 'react';
import { Button, ErrorNote, Modal, Textarea } from '../../components/ui';
import { bancoDoTopico } from '../../domain/sandbox';
import type { Challenge, Id, Topic } from '../../domain/types';
import { useAI } from '../../hooks/useAI';
import { generateChallenge } from '../../services/ai/professor';
import { useSettings } from '../../store/settings';
import { newId, useStudy } from '../../store/study';

type Dados = Pick<Challenge, 'prompt' | 'hints' | 'starterCode'>;

/** Gera desafio do tópico: IA (cobrando as habilidades marcadas), banco, mini ou o seu. */
export function NovoDesafio({ topic, linguagem, foco, onCriado }: { topic: Topic; linguagem: string; foco: string[]; onCriado: (id: Id) => void }) {
  const aiOn = useSettings((s) => s.provider !== 'off');
  const { run, loading, error } = useAI();
  const [proprio, setProprio] = useState(false);

  const criar = (d: Dados) => {
    const c: Challenge = { id: newId('ch'), topicId: topic.id, language: linguagem, ...d, code: d.starterCode, createdAt: new Date().toISOString() };
    useStudy.getState().saveChallenge(c);
    onCriado(c.id);
  };

  const comIA = (tamanho: 'micro' | 'normal') =>
    run(async (signal) => {
      const { topics, subjects, sessions } = useStudy.getState();
      const parents: Topic[] = [];
      let p = topics.find((t) => t.id === topic.parentId);
      while (p && parents.length < 5) {
        parents.push(p);
        p = topics.find((t) => t.id === p!.parentId);
      }
      const ctx = { topic, subject: subjects.find((s) => s.id === topic.subjectId), parents, sessions: sessions.filter((s) => s.topicId === topic.id) };
      criar(await generateChallenge(ctx, linguagem, tamanho, foco, signal));
    });

  // Banco antigo: só desafios do ASSUNTO deste tópico (nunca algo sem relação).
  const doBanco = (micro: boolean) => {
    const opcoes = bancoDoTopico(topic, linguagem, micro);
    const c = opcoes[Math.floor(Math.random() * opcoes.length)];
    if (c) criar({ prompt: `${c.title}\n\n${c.prompt}`, hints: c.hints, starterCode: c.starterCode });
  };
  const temBanco = (micro: boolean) => bancoDoTopico(topic, linguagem, micro).length > 0;

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="primary" onClick={() => (aiOn ? comIA('micro') : doBanco(true))} disabled={loading || (!aiOn && !temBanco(true))}>
          <Zap size={13} /> Mini (5 min)
        </Button>
        <Button variant="primary" onClick={() => (aiOn ? comIA('normal') : doBanco(false))} disabled={loading || (!aiOn && !temBanco(false))}>
          <Sparkles size={13} /> {loading ? 'Criando…' : 'Desafio'}
        </Button>
      </div>
      {aiOn && (temBanco(false) || temBanco(true)) && (
        <Button className="w-full" onClick={() => doBanco(Math.random() < 0.5 && temBanco(true))}>
          <Dices size={13} /> Sortear do banco
        </Button>
      )}
      <Button className="w-full" onClick={() => setProprio(true)}>
        <PenLine size={13} /> Escrever meu próprio
      </Button>
      {foco.length > 0 && aiOn && <p className="text-[11px] text-muted">A IA também vai cobrar: {foco.join(', ')}.</p>}
      {!aiOn && !temBanco(false) && !temBanco(true) && (
        <p className="text-[11px] text-warn">Ainda não tenho desafio de "{topic.title}" guardado. Conecte o motor do professor (⚙ Configurações) e ele cria um sob medida, ou escreva o seu.</p>
      )}
      <ErrorNote error={error} />
      <MeuDesafio open={proprio} onClose={() => setProprio(false)} onCriar={criar} />
    </div>
  );
}

function MeuDesafio({ open, onClose, onCriar }: { open: boolean; onClose: () => void; onCriar: (d: Dados) => void }) {
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
