import { RotateCcw, Sparkles, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { HintLadder } from '../../components/HintLadder';
import { Badge, Button, ErrorNote, Panel } from '../../components/ui';
import { CHALLENGE_BANK } from '../../data/challengeBank';
import { basicCheck } from '../../domain/basicCheck';
import { fatorDica } from '../../domain/dicas';
import { CANAL_COMPILADOR } from '../../domain/sandbox';
import { gradeFromScore } from '../../domain/srs';
import type { Challenge, Topic } from '../../domain/types';
import { useAI } from '../../hooks/useAI';
import { reviewCode } from '../../services/ai/professor';
import { useIALigada } from '../../store/conexoes';
import { useStudy } from '../../store/study';
import { toast } from '../../store/toast';
import { EditorCodigo } from './EditorCodigo';
import { Diagnostico, Sucesso } from './ResultadoCorrecao';
import { TerminalCorrecao } from './TerminalCorrecao';

/** Nota mínima (já com o desconto das dicas) pra contar como resolvido. */
const NOTA_RESOLVIDO = 70;

export function DesafioView({ challenge, topic }: { challenge: Challenge; topic: Topic }) {
  const { saveChallenge, removeChallenge, gradeTopic, logSession, addDiario } = useStudy.getState();
  const aiOn = useIALigada();
  const { run, loading, error } = useAI();
  const [code, setCode] = useState(challenge.code);
  const [xpGanho, setXpGanho] = useState<number>();
  const [errosAntes, setErrosAntes] = useState<string[]>();
  const inicio = useRef(Date.now());
  const fator = fatorDica(challenge.hintLevel);
  const minutos = () => Math.max(1, Math.round((Date.now() - inicio.current) / 60_000));
  const salvar = (patch: Partial<Challenge>) => saveChallenge({ ...useStudy.getState().challenges.find((c) => c.id === challenge.id)!, ...patch });

  // Rascunho salvo com um pequeno atraso (não grava a cada tecla).
  useEffect(() => {
    if (code === challenge.code) return;
    const id = setTimeout(() => salvar({ code }), 600);
    return () => clearTimeout(id);
  });

  const corrigir = () =>
    run(async (signal) => {
      const anterior = challenge.review && !challenge.solvedAt ? challenge.review.issues : undefined;
      const keywords = CHALLENGE_BANK.find((b) => challenge.prompt.startsWith(b.title))?.keywords;
      const review = aiOn ? await reviewCode(challenge, code, signal) : basicCheck(code, challenge.language, keywords);
      const nota = Math.round(review.score * fator);
      const resolvido = review.source === 'ia' && review.syntaxOk && review.logicOk && nota >= NOTA_RESOLVIDO;
      salvar({ code, review, solvedAt: resolvido ? new Date().toISOString() : challenge.solvedAt });
      if (review.source !== 'ia') return;
      gradeTopic(topic.id, gradeFromScore(nota));
      const xp = logSession({ topicId: topic.id, minutes: minutos(), kind: 'desafio', score: nota });
      setXpGanho(xp);
      if (resolvido && anterior?.length) setErrosAntes(anterior);
      toast({ title: resolvido ? `Resolvido! +${xp} XP` : `Nota ${nota} · +${xp} XP`, variant: resolvido ? 'success' : 'default' });
    });

  // Checagem básica não sabe se a lógica está certa: ele mesmo fecha o desafio.
  const autoavaliar = (ok: boolean) => {
    gradeTopic(topic.id, ok ? (fator < 1 ? 'dificil' : 'bom') : 'errei');
    const xp = logSession({ topicId: topic.id, minutes: minutos(), kind: 'desafio', score: Math.round((ok ? 75 : 40) * fator) });
    salvar({ code, solvedAt: ok ? new Date().toISOString() : undefined });
    setXpGanho(xp);
    toast({ title: `Registrado · +${xp} XP`, variant: 'success' });
  };

  const classificar = (categoria: Parameters<typeof addDiario>[1]['categoria']) =>
    addDiario(topic.id, {
      tipo: 'erro',
      original: `[sandbox] ${errosAntes?.join('; ')}${challenge.attempt ? ` | tentei: ${challenge.attempt}` : ''}`,
      corrigido: code.slice(0, 800),
      categoria,
    });

  const review = challenge.review;
  const resolvido = !!challenge.solvedAt;

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-4">
        <Panel
          title={`Desafio // ${topic.title}`}
          actions={
            <Button className="px-2 py-1 text-[10px]" variant="danger" onClick={() => confirm('Apagar este desafio?') && removeChallenge(challenge.id)} aria-label="Apagar desafio">
              <Trash2 size={12} />
            </Button>
          }
        >
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{challenge.prompt}</p>
        </Panel>

        <EditorCodigo codigo={code} linguagem={challenge.language} onChange={setCode} onCorrigir={corrigir} />

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={corrigir} disabled={loading || !code.trim()}>
            <Sparkles size={14} /> {loading ? 'Corrigindo…' : aiOn ? 'Corrigir com o professor' : 'Checagem básica'}
          </Button>
          <Button onClick={() => confirm('Voltar pro código inicial? O que você escreveu some.') && setCode(challenge.starterCode)} disabled={code === challenge.starterCode}>
            <RotateCcw size={13} /> Código inicial
          </Button>
          {resolvido && <Badge color="var(--color-accent)">resolvido</Badge>}
        </div>
        <ErrorNote error={error} />

        <TerminalCorrecao canal={CANAL_COMPILADOR[challenge.language] ?? CANAL_COMPILADOR['']} nLinhas={code.split('\n').length} corrigindo={loading} review={review} fator={fator} resolvido={resolvido} />

        {review && !loading && (resolvido ? <Sucesso xp={xpGanho} errosAntes={errosAntes} onClassificar={classificar} /> : <Diagnostico challenge={challenge} review={review} onAutoavaliar={autoavaliar} />)}
      </div>

      <HintLadder challenge={challenge} codigo={code} onSalvar={salvar} />
    </div>
  );
}
