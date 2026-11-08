import { create } from 'zustand';
import { montarRodada, notaDoTopico, ordemDosTopicos, pontuar, type Cartao } from '../../../domain/cartoes';
import { cartoesSemIA } from '../../../domain/cartoesSemIA';
import { toLocalDate } from '../../../domain/dates';
import { gerarCartoes } from '../../../services/ai/cartoes';
import { gerarJogo } from '../../../services/ai/jogos';
import { temaDoJogo } from './jogos/tema';
import { sons } from '../../../services/sons';
import { useFeed } from '../../../store/feed';
import { useImportacao } from '../../../store/importacao';
import { usePresenca } from '../../../store/presenca';
import { iaLigada, useConexoes } from '../../../store/conexoes';
import { useStudy } from '../../../store/study';
import { rodarTarefa, useTarefa } from '../../../store/tarefas';
import { useFontesSemana } from '../../../hooks/useSemana';

// Lógica de uma rodada do feed: monta 5 cartões, conta combo e XP, manda erro
// pro diário do tópico e, no fim, reagenda a revisão dos tópicos vencidos.
// O estado mora num store (não na tela): sair do Lobby no meio não zera a rodada
// nem cancela os cartões que a IA está preparando.

export type Fase = 'parado' | 'carregando' | 'jogando' | 'fim' | 'vazio';

export interface Resultado {
  cartao: Cartao;
  acertou: boolean;
  xp: number;
}

/** Quantos tópicos sem cartão a IA prepara por rodada (cada um é 1 chamada). */
const GERAR_POR_RODADA = 2;
const CHAVE = 'feed:rodada';

/** A resposta certa em texto, pro diário guardar a versão corrigida. */
function respostaCerta(c: Cartao): string | undefined {
  if (c.tipo === 'lembra') return c.resposta;
  if (c.tipo === 'frase') return c.referencia;
  if (c.tipo === 'ordem') return `${c.passos.join(' → ')}${c.explicacao ? ` (${c.explicacao})` : ''}`;
  return `${c.opcoes[c.certa]}${c.explicacao ? ` (${c.explicacao})` : ''}`;
}

/** Quanto a tela de "preparando" espera o jogo do 1º cartão antes de começar sem ele. */
const ESPERA_PRIMEIRO_JOGO_MS = 45_000;

/** Pede à IA o jogo deste cartão (só múltipla escolha). undefined = nada a fazer. Nunca lança. */
function jogoPara(c: Cartao): Promise<void> | undefined {
  if (c.tipo !== 'revisao' && c.tipo !== 'micro') return undefined;
  const feed = useFeed.getState();
  if (feed.jogos[c.id]) return undefined;
  const estudo = useStudy.getState();
  const topico = estudo.topics.find((t) => t.id === c.topicId);
  const materia = estudo.subjects.find((s) => s.id === topico?.subjectId);
  const tema = temaDoJogo(materia?.name, materia?.language, topico?.title);
  const recentes = Object.values(feed.jogos)
    .sort((a, b) => b.geradoEm.localeCompare(a.geradoEm))
    .slice(0, 6)
    .map((j) => j.nome);
  return gerarJogo({ cartao: c, materia: materia?.name ?? '', topico: topico?.title ?? '', chefe: tema.chefe, simbolos: tema.simbolos, recentes })
    .then((j) => useFeed.getState().guardarJogo(c.id, j))
    .catch(() => undefined);
}

interface RodadaState {
  fase: Fase;
  cartoes: Cartao[];
  indice: number;
  combo: number;
  maiorCombo: number;
  resultados: Resultado[];
  /** Último "+XP" (a `chave` muda pra animação tocar de novo). */
  pop: { xp: number; chave: number } | null;
  criandoJogo: boolean;
}

const useRodadaStore = create<RodadaState>()(() => ({
  fase: 'parado',
  cartoes: [],
  indice: 0,
  combo: 0,
  maiorCombo: 0,
  resultados: [],
  pop: null,
  criandoJogo: false,
}));

async function comecar(herdados: string[]) {
  const set = useRodadaStore.setState;
  if (useRodadaStore.getState().fase === 'carregando') return;
  set({ fase: 'carregando' });
  const estudo = useStudy.getState();
  const ordem = ordemDosTopicos(estudo.topics, toLocalDate(), estudo.target.topicId, herdados);

  if (iaLigada(useConexoes.getState().motores)) {
    const semCartao = ordem.filter((t) => !useFeed.getState().cache[t.id]?.length).slice(0, GERAR_POR_RODADA);
    if (semCartao.length) {
      await rodarTarefa(CHAVE, { rotulo: 'Professor preparando os cartões do Feed', aba: 'lobby', avisarPronto: 'Rodada do Feed pronta' }, async (signal) => {
        for (const t of semCartao) {
          const materia = estudo.subjects.find((s) => s.id === t.subjectId);
          try {
            const lote = await gerarCartoes({ topic: t, materia: materia?.name ?? '', linguagem: materia?.language ?? '', contextoMateria: useImportacao.getState().contexto[t.subjectId] }, signal);
            useFeed.getState().guardar(t.id, lote);
          } catch (e) {
            if (signal.aborted) throw e;
            // Um tópico falhar não derruba a rodada: ele usa os cartões sem IA.
          }
        }
      });
    }
  }

  const cache = useFeed.getState().cache;
  const rodada = montarRodada(ordem, (t) => (cache[t.id]?.length ? cache[t.id] : cartoesSemIA(t)));
  // Cada pergunta ganha um jogo criado pela IA. O 1º a gente espera um pouco (a pessoa vai vê-lo
  // já); os outros saem enquanto ela joga. Se não ficar pronto, o cartão usa um jogo embutido.
  if (rodada.length && iaLigada(useConexoes.getState().motores)) {
    const primeiro = jogoPara(rodada[0]);
    if (primeiro) {
      set({ criandoJogo: true });
      await Promise.race([primeiro, new Promise<void>((ok) => setTimeout(ok, ESPERA_PRIMEIRO_JOGO_MS))]);
      set({ criandoJogo: false });
    }
    void rodada.slice(1).reduce((fila, c) => fila.then(() => jogoPara(c) ?? undefined), Promise.resolve());
  }

  set({ cartoes: rodada, indice: 0, combo: 0, maiorCombo: 0, resultados: [], pop: null, fase: rodada.length ? 'jogando' : 'vazio' });
}

function responder(acertou: boolean, resposta: string) {
  const s = useRodadaStore.getState();
  const cartao = s.cartoes[s.indice];
  if (!cartao) return;
  const novoCombo = acertou ? s.combo + 1 : 0;
  // "Lembra e confere" é você que diz se lembrou: conta pro combo e pra revisão, mas não paga XP.
  const xp = cartao.tipo === 'lembra' ? 0 : pontuar(cartao.tipo, acertou, novoCombo);
  useRodadaStore.setState({ combo: novoCombo, maiorCombo: Math.max(s.maiorCombo, novoCombo), resultados: [...s.resultados, { cartao, acertou, xp }] });
  useFeed.getState().gastar([cartao.id]);

  if (acertou) {
    if (xp > 0) {
      useStudy.getState().addXp(xp);
      useRodadaStore.setState({ pop: { xp, chave: Date.now() } });
    }
    if (novoCombo >= 2) sons.combo(novoCombo);
    else sons.acerto();
  } else {
    sons.erro();
    useStudy.getState().addDiario(cartao.topicId, {
      tipo: 'erro',
      original: `[feed] ${cartao.pergunta} → respondi: ${resposta}`,
      corrigido: respostaCerta(cartao),
    });
  }
}

function fechar() {
  const { resultados, maiorCombo } = useRodadaStore.getState();
  const hoje = toLocalDate();
  const estudo = useStudy.getState();
  const porTopico = new Map<string, Resultado[]>();
  for (const r of resultados) porTopico.set(r.cartao.topicId, [...(porTopico.get(r.cartao.topicId) ?? []), r]);
  for (const [topicId, lista] of porTopico) {
    const t = estudo.topics.find((x) => x.id === topicId);
    // Só reagenda o que já foi estudado e venceu (o Target ainda não visto não ganha nota).
    if (t && (t.lastStudiedAt || t.review.reps > 0) && t.review.due <= hoje) estudo.gradeTopic(topicId, notaDoTopico(lista.filter((r) => r.acertou).length, lista.length));
  }
  usePresenca.getState().marcar(hoje);
  useFeed.getState().fecharRodada(hoje, maiorCombo);
  sons.fim();
  useRodadaStore.setState({ fase: 'fim' });
}

function proximo() {
  const { indice, cartoes } = useRodadaStore.getState();
  if (indice + 1 < cartoes.length) useRodadaStore.setState({ indice: indice + 1 });
  else fechar();
}

export function useRodada() {
  const s = useRodadaStore();
  const tarefa = useTarefa(CHAVE);
  const { herdadasPara } = useFontesSemana();
  // O que ficou de ontem (dia cansado) abre a rodada, em forma de pergunta leve.
  const iniciar = () => comecar(herdadasPara(toLocalDate()).flatMap((l) => (l.topicId ? [l.topicId] : [])));

  return {
    fase: s.fase,
    cartao: s.cartoes[s.indice],
    indice: s.indice,
    total: s.cartoes.length,
    combo: s.combo,
    maiorCombo: s.maiorCombo,
    resultados: s.resultados,
    pop: s.pop,
    comecar: iniciar,
    responder,
    proximo,
    carregando: tarefa.rodando,
    criandoJogo: s.criandoJogo,
    erro: tarefa.erro ?? null,
  };
}
