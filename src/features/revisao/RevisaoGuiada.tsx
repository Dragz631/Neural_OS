import { useEffect, useState } from 'react';
import { useRascunhos } from '../../store/rascunhos';
import { Mic, MicOff, Sparkles } from 'lucide-react';
import { toLocalDate } from '../../domain/dates';
import { ERRO_TEXTO, notaDe, perguntasSemIA, quantasPerguntas, TAMANHOS, tamanhoSugerido, type Diagnostico, type PerguntaRevisao, type Tamanho } from '../../domain/revisao';
import { useAI } from '../../hooks/useAI';
import { useVoz } from '../../hooks/useVoz';
import { diagnosticar, gerarPerguntas } from '../../services/ai/revisao';
import { useAprendiz } from '../../store/aprendiz';
import { useIALigada } from '../../store/conexoes';
import { useImportacao } from '../../store/importacao';
import { useStudy } from '../../store/study';
import { toast } from '../../store/toast';
import type { Topic } from '../../domain/types';
import { Badge, Button, ErrorNote, Panel, Textarea } from '../../components/ui';
import { cn } from '../../lib/utils';
import { EntrevistaModal } from './Entrevista';

// Revisão guiada. Regras: (1) a pessoa sempre sabe onde está e o que fazer agora;
// (2) o professor descobre ONDE o raciocínio quebrou e conserta só aquilo;
// (3) quem decide avançar é a pessoa; (4) cansado, tudo encolhe e fica leve.

type Fase = 'inicio' | 'carregando' | 'perguntando' | 'diagnostico' | 'fim';

interface Feita {
  pergunta: PerguntaRevisao;
  resposta: string;
  diag: Diagnostico;
}

const COR_NIVEL = { certo: 'text-accent', quase: 'text-warn', errado: 'text-warn' } as const;
const ROTULO_NIVEL = { certo: 'Acertou', quase: 'Quase lá', errado: 'Ainda não' } as const;

export function RevisaoGuiada({ topic, compacto = false }: { topic: Topic; compacto?: boolean }) {
  const subject = useStudy((s) => s.subjects.find((x) => x.id === topic.subjectId));
  const checkin = useStudy((s) => s.checkins[toLocalDate()]);
  const perfil = useAprendiz((s) => s.perfil);
  const aiOn = useIALigada();
  const { run, loading, error } = useAI();

  // Sair da aba e voltar não perde a revisão no meio: a foto fica em useRascunhos.
  const [salvo] = useState(() => useRascunhos.getState().revisao[topic.id]);
  const [fase, setFase] = useState<Fase>(() => (salvo && salvo.fase !== 'carregando' ? (salvo.fase as Fase) : 'inicio'));
  const [tamanho, setTamanho] = useState<Tamanho>(() => (salvo?.tamanho as Tamanho) ?? tamanhoSugerido(checkin?.energy, checkin?.minutesAvailable));
  const [cansado, setCansado] = useState(salvo?.cansado ?? checkin?.energy === 1);
  const [slide, setSlide] = useState(salvo?.slide ?? '');
  const [fila, setFila] = useState<PerguntaRevisao[]>((salvo?.fila as PerguntaRevisao[]) ?? []);
  const [i, setI] = useState(salvo?.i ?? 0);
  const [resposta, setResposta] = useState(salvo?.resposta ?? '');
  const [feitas, setFeitas] = useState<Feita[]>((salvo?.feitas as Feita[]) ?? []);
  const [diag, setDiag] = useState<Diagnostico | null>((salvo?.diag as Diagnostico) ?? null);
  const [mostrarRef, setMostrarRef] = useState(false);
  const [mini, setMini] = useState(salvo?.mini ?? false);
  /** O conserto de cada ponto fraco, pra mostrar de novo antes de perguntar outra vez. */
  const [consertos, setConsertos] = useState<Record<string, Diagnostico>>((salvo?.consertos as Record<string, Diagnostico>) ?? {});
  const [entrevista, setEntrevista] = useState(false);
  const [direto, setDireto] = useState(false);
  const [inicioEm, setInicioEm] = useState(salvo?.inicioEm ?? 0);

  useEffect(() => {
    useRascunhos.getState().guardarRevisao(topic.id, fase === 'inicio' && !slide ? undefined : { fase, tamanho, cansado, slide, fila, i, resposta, feitas, diag, mini, consertos, inicioEm });
  }, [topic.id, fase, tamanho, cansado, slide, fila, i, resposta, feitas, diag, mini, consertos, inicioEm]);

  const voz = useVoz((t) => setResposta((r) => (r ? `${r} ${t}` : t)));
  const sugerido = tamanhoSugerido(checkin?.energy, checkin?.minutesAvailable);

  const material = () => {
    const contexto = useImportacao.getState().contexto[topic.subjectId] ?? '';
    const aula = topic.lesson ? [topic.lesson.explanation, ...topic.lesson.keyPoints].join('\n') : '';
    return [aula, topic.notes, contexto].filter(Boolean).join('\n\n');
  };

  const comecar = async () => {
    setInicioEm(Date.now());
    setFase('carregando');
    const n = quantasPerguntas(tamanho, cansado, perfil);
    let perguntas: PerguntaRevisao[] | undefined;
    if (aiOn) {
      perguntas = await run((signal) => gerarPerguntas({ topico: topic.title, materia: subject?.name ?? '', material: material(), quantas: n, cansado, aPartirDe: slide.trim() || undefined }, signal));
    }
    perguntas ??= perguntasSemIA(topic, n);
    if (perguntas.length === 0) {
      setFase('inicio');
      toast({ title: 'Sem material pra perguntar', description: 'Escreva uma anotação ou peça a aula ao professor primeiro.', variant: 'destructive' });
      return;
    }
    setFila(perguntas);
    setI(0);
    setFeitas([]);
    setMini(false);
    setResposta('');
    setFase('perguntando');
  };

  const pergunta = fila[i];

  const responder = async (naoSei = false) => {
    const texto = naoSei ? '' : resposta.trim();
    let d: Diagnostico | undefined;
    if (aiOn) d = await run((signal) => diagnosticar(pergunta, texto, material(), cansado, signal));
    if (!d) {
      // Sem IA (ou falhou): ele mesmo confere com a resposta-modelo.
      setMostrarRef(true);
      return;
    }
    registrar(d, texto);
  };

  /** Autoavaliação quando não há IA: a pessoa compara com a resposta-modelo. */
  const autoavaliar = (nivel: 'certo' | 'quase' | 'errado') =>
    registrar(
      { nivel, acertou: nivel === 'certo' ? ['Você lembrou.'] : [], ajusteFino: '', tipoErro: nivel === 'certo' ? 'nenhum' : 'lacuna', causa: '', reparo: { ideia: pergunta.referencia, imagem: '' } },
      resposta.trim(),
    );

  const registrar = (d: Diagnostico, texto: string) => {
    setMostrarRef(false);
    setDiag(d);
    setFeitas((f) => [...f, { pergunta, resposta: texto, diag: d }]);
    if (d.nivel !== 'certo') useStudy.getState().addDiario(topic.id, { tipo: 'erro', original: `[revisão] ${pergunta.pergunta} → ${texto || 'não soube'}`, corrigido: d.reparo.ideia || pergunta.referencia });
    setFase('diagnostico');
  };

  const proxima = () => {
    setDiag(null);
    setResposta('');
    if (i + 1 < fila.length) {
      setI(i + 1);
      setFase('perguntando');
    } else encerrar();
  };

  const encerrar = () => {
    const certas = feitas.filter((f) => f.diag.nivel === 'certo').length;
    // O mini-estudo não reagenda de novo: o que valeu foi a primeira tentativa.
    if (!mini) {
      const nota = certas === feitas.length ? 'bom' : certas * 2 >= feitas.length ? 'dificil' : 'errei';
      const score = Math.round(feitas.reduce((s, f) => s + notaDe(f.diag.nivel), 0) / Math.max(feitas.length, 1));
      useStudy.getState().gradeTopic(topic.id, nota);
      const xp = useStudy.getState().logSession({ topicId: topic.id, minutes: Math.max(1, Math.round((Date.now() - inicioEm) / 60_000)), kind: 'revisao', score });
      toast({ title: `Revisão feita · +${xp} XP`, description: 'Próxima revisão agendada.', variant: 'success' });
    }
    setFase('fim');
  };

  const fracos = feitas.filter((f) => f.diag.nivel !== 'certo');

  const iniciarMini = () => {
    setMini(true);
    setConsertos(Object.fromEntries(fracos.map((f) => [f.pergunta.id, f.diag])));
    setFila(fracos.map((f) => f.pergunta));
    setFeitas([]);
    setI(0);
    setResposta('');
    setFase('perguntando');
  };

  const reiniciar = () => {
    setFase('inicio');
    setMini(false);
    setFeitas([]);
    setDiag(null);
  };

  return (
    <Panel
      title={compacto ? 'Fechar a aula: revisão relâmpago' : `Revisão guiada // ${topic.title}`}
      actions={
        <div className="flex gap-1.5">
          {perfil.respondidas > 0 && (
            <Button className="px-2 py-1 text-[10px]" onClick={() => { setDireto(true); setEntrevista(true); }} title="Ver como o professor te entendeu e como vai ensinar">
              Ver relatório
            </Button>
          )}
          <Button className="px-2 py-1 text-[10px]" onClick={() => { setDireto(false); setEntrevista(true); }} title="Responder (ou refazer) a entrevista de como você aprende">
            {perfil.respondidas ? 'Refazer entrevista' : 'Entrevista: como eu aprendo'}
          </Button>
        </div>
      }
    >
      <EntrevistaModal open={entrevista} onClose={() => setEntrevista(false)} curta={cansado && !direto} direto={direto} />

      {fase === 'inicio' && (
        <div className="space-y-3">
          <Onde aqui="Antes de começar" proximo="Escolha o tamanho da revisão e aperte Começar." />
          {perfil.respondidas === 0 && (
            <div className="rounded border border-info/40 bg-info/5 p-2 text-xs leading-relaxed">
              O professor ainda não sabe como você aprende. São {cansado ? 4 : 10} perguntas rápidas, sem resposta certa, e ele passa a se adaptar a você.{' '}
              <button type="button" className="font-bold text-info underline" onClick={() => setEntrevista(true)}>
                Fazer agora
              </button>
            </div>
          )}
          <div className={cn('grid gap-2', !compacto && 'sm:grid-cols-3')}>
            {(Object.keys(TAMANHOS) as Tamanho[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTamanho(t)}
                className={cn('rounded border p-2 text-left', tamanho === t ? 'border-accent bg-accent/10' : 'border-line bg-bg hover:border-accent/60')}
              >
                <div className="flex items-center justify-between text-sm font-bold">
                  {TAMANHOS[t].rotulo}
                  {sugerido === t && <Badge color="var(--color-accent)">pra hoje</Badge>}
                </div>
                <div className="text-[11px] text-muted">{TAMANHOS[t].minutos} min · {TAMANHOS[t].perguntas} perguntas</div>
                <div className="mt-1 text-[10px] leading-snug text-muted">{TAMANHOS[t].quando}</div>
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={cansado} onChange={(e) => setCansado(e.target.checked)} /> Estou com a cabeça cheia (perguntas mais leves e curtas)
          </label>
          <label className="block text-xs">
            <span className="text-muted">A aula de hoje começou em qual slide ou assunto? (opcional, o professor só pergunta daí em diante)</span>
            <input value={slide} onChange={(e) => setSlide(e.target.value)} placeholder="ex.: slide 12, ou 'herança'" className="mt-1 w-full rounded border border-line bg-bg px-2 py-1.5 text-sm" />
          </label>
          <Button variant="primary" onClick={comecar}>
            Começar ({Math.min(quantasPerguntas(tamanho, cansado, perfil), TAMANHOS[tamanho].perguntas)} perguntas)
          </Button>
        </div>
      )}

      {fase === 'carregando' && <Onde aqui="Preparando" proximo="O professor está lendo o seu material e montando as perguntas. Já já aparece a primeira." />}

      {(fase === 'perguntando' || fase === 'diagnostico') && pergunta && (
        <div className="space-y-3">
          <Onde
            aqui={`${mini ? 'Mini-estudo' : 'Revisão'}: pergunta ${i + 1} de ${fila.length}`}
            proximo={fase === 'perguntando' ? 'Responda com as suas palavras. Pode falar ou digitar. Se não souber, aperte "Não sei": é assim que ele descobre o que ensinar.' : 'Leia o que o professor viu e aperte o botão pra seguir quando estiver pronto.'}
          />
          <div className="rounded border border-line bg-bg p-3">
            {pergunta.origem && <p className="mb-1 text-[10px] uppercase tracking-widest text-info">{pergunta.origem}</p>}
            <p className="text-base font-bold leading-snug">{pergunta.pergunta}</p>
          </div>

          {fase === 'perguntando' && mini && consertos[pergunta.id] && (
            <div className="rounded border border-warn/50 bg-warn/5 p-2 text-sm">
              <p className="text-[10px] font-bold uppercase tracking-widest text-warn">Lembra do que vimos?</p>
              <p className="mt-1">{consertos[pergunta.id].reparo.ideia}</p>
              {consertos[pergunta.id].reparo.imagem && <p className="mt-1 text-info">{consertos[pergunta.id].reparo.imagem}</p>}
              <p className="mt-1 text-xs text-muted">Agora responda de novo com as suas palavras, sem copiar.</p>
            </div>
          )}

          {fase === 'perguntando' && (
            <>
              <Textarea rows={cansado ? 3 : 5} value={resposta} onChange={(e) => setResposta(e.target.value)} placeholder="O que você lembra? Do seu jeito, sem olhar nada." />
              {voz.erro && <p className="text-[11px] text-warn">{voz.erro}</p>}
              <ErrorNote error={error} />
              {mostrarRef && (
                <div className="rounded border border-accent/40 bg-accent/5 p-2 text-sm">
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-accent">Resposta do material</p>
                  <p>{pergunta.referencia || 'Sem resposta-modelo. Compare com as suas anotações.'}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                    Como foi?
                    <Button onClick={() => autoavaliar('certo')}>Lembrei</Button>
                    <Button onClick={() => autoavaliar('quase')}>Quase</Button>
                    <Button onClick={() => autoavaliar('errado')}>Não lembrei</Button>
                  </div>
                </div>
              )}
              {!mostrarRef && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="primary" onClick={() => responder()} disabled={loading || !resposta.trim()}>
                    <Sparkles size={14} /> {loading ? 'O professor está ouvindo…' : aiOn ? 'Responder' : 'Ver a resposta'}
                  </Button>
                  <Button onClick={() => responder(true)} disabled={loading}>
                    Não sei
                  </Button>
                  {voz.disponivel && (
                    <Button onClick={voz.alternar} className={cn(voz.ouvindo && 'border-accent text-accent')} title="Falar a resposta">
                      {voz.ouvindo ? <MicOff size={14} /> : <Mic size={14} />} {voz.ouvindo ? 'Parar' : 'Falar'}
                    </Button>
                  )}
                </div>
              )}
            </>
          )}

          {fase === 'diagnostico' && diag && (
            <div className="space-y-2">
              <p className={cn('text-lg font-bold', COR_NIVEL[diag.nivel])}>{ROTULO_NIVEL[diag.nivel]}</p>
              {diag.acertou.length > 0 && (
                <div className="rounded border border-line bg-bg p-2 text-sm">
                  <b className="text-[10px] uppercase tracking-widest text-accent">O que você acertou</b>
                  <ul className="mt-1 list-disc pl-4">{diag.acertou.map((a) => <li key={a}>{a}</li>)}</ul>
                </div>
              )}
              {diag.ajusteFino && (
                <p className="rounded border border-line bg-bg p-2 text-sm">
                  <b className="text-[10px] uppercase tracking-widest text-info">Ajuste fino </b>
                  {diag.ajusteFino}
                </p>
              )}
              {diag.tipoErro !== 'nenhum' && (
                <div className="rounded border border-warn/50 bg-warn/5 p-2 text-sm">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-warn">Onde quebrou: {ERRO_TEXTO[diag.tipoErro]}</p>
                  {diag.causa && <p className="mt-1">{diag.causa}</p>}
                  {diag.reparo.ideia && <p className="mt-2">{diag.reparo.ideia}</p>}
                  {diag.reparo.imagem && <p className="mt-1 text-info">{diag.reparo.imagem}</p>}
                </div>
              )}
              <Button variant="primary" onClick={proxima}>
                {i + 1 < fila.length ? 'Próxima pergunta' : 'Ver como foi'}
              </Button>
            </div>
          )}
        </div>
      )}

      {fase === 'fim' && (
        <div className="space-y-3">
          <Onde
            aqui={mini ? 'Mini-estudo concluído' : 'Revisão concluída'}
            proximo={!mini && fracos.length > 0 ? `Faça o mini-estudo: ${fracos.length} ponto(s) que ainda não fixaram. Dá uns ${Math.max(3, fracos.length * 3)} minutos.` : 'Pronto por hoje. Se der, volte amanhã: é aí que fixa.'}
          />
          <p className="text-sm">
            {feitas.filter((f) => f.diag.nivel === 'certo').length} de {feitas.length} certas de primeira.
          </p>
          <ul className="space-y-1 text-xs">
            {feitas.map((f) => (
              <li key={f.pergunta.id} className="flex items-start gap-2">
                <span className={cn('w-16 shrink-0 font-bold', COR_NIVEL[f.diag.nivel])}>{ROTULO_NIVEL[f.diag.nivel]}</span>
                <span className="text-muted">{f.pergunta.pergunta}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {!mini && fracos.length > 0 && (
              <Button variant="primary" onClick={iniciarMini}>
                Mini-estudo dos pontos fracos
              </Button>
            )}
            <Button onClick={reiniciar}>Nova revisão</Button>
          </div>
        </div>
      )}
    </Panel>
  );
}

/** "Você está aqui / próximo passo": aparece em toda tela da revisão. */
function Onde({ aqui, proximo }: { aqui: string; proximo: string }) {
  return (
    <div className="rounded border-l-2 border-accent bg-accent/5 px-3 py-1.5 text-xs leading-relaxed">
      <p className="text-[10px] font-bold uppercase tracking-widest text-accent">Você está aqui: {aqui}</p>
      <p>
        <b>Agora:</b> {proximo}
      </p>
    </div>
  );
}
