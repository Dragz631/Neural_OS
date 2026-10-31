import { useState } from 'react';
import { montarRodada, notaDoTopico, ordemDosTopicos, pontuar, type Cartao } from '../../../domain/cartoes';
import { cartoesSemIA } from '../../../domain/cartoesSemIA';
import { toLocalDate } from '../../../domain/dates';
import { useAI } from '../../../hooks/useAI';
import { gerarCartoes } from '../../../services/ai/cartoes';
import { gerarJogo } from '../../../services/ai/jogos';
import { temaDoJogo } from './jogos/tema';
import { sons } from '../../../services/sons';
import { useFeed } from '../../../store/feed';
import { useImportacao } from '../../../store/importacao';
import { usePresenca } from '../../../store/presenca';
import { iaLigada, useConexoes } from '../../../store/conexoes';
import { useStudy } from '../../../store/study';
import { useFontesSemana } from '../../../hooks/useSemana';

// Lógica de uma rodada do feed: monta 5 cartões, conta combo e XP, manda erro
// pro diário do tópico e, no fim, reagenda a revisão dos tópicos vencidos.

export type Fase = 'parado' | 'carregando' | 'jogando' | 'fim' | 'vazio';

export interface Resultado {
  cartao: Cartao;
  acertou: boolean;
  xp: number;
}

/** Quantos tópicos sem cartão a IA prepara por rodada (cada um é 1 chamada). */
const GERAR_POR_RODADA = 2;

/** A resposta certa em texto, pro diário guardar a versão corrigida. */
function respostaCerta(c: Cartao): string | undefined {
  if (c.tipo === 'lembra') return c.resposta;
  if (c.tipo === 'frase') return c.referencia;
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

export function useRodada() {
  const ia = useAI();
  const [criandoJogo, setCriandoJogo] = useState(false);
  const { herdadasPara } = useFontesSemana();
  const [fase, setFase] = useState<Fase>('parado');
  const [cartoes, setCartoes] = useState<Cartao[]>([]);
  const [indice, setIndice] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maiorCombo, setMaiorCombo] = useState(0);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  /** Último "+XP" (a `chave` muda pra animação tocar de novo). */
  const [pop, setPop] = useState<{ xp: number; chave: number } | null>(null);

  const comecar = async () => {
    setFase('carregando');
    const estudo = useStudy.getState();
    // O que ficou de ontem (dia cansado) abre a rodada, em forma de pergunta leve.
    const herdados = herdadasPara(toLocalDate()).flatMap((l) => (l.topicId ? [l.topicId] : []));
    const ordem = ordemDosTopicos(estudo.topics, toLocalDate(), estudo.target.topicId, herdados);

    if (iaLigada(useConexoes.getState().motores)) {
      const semCartao = ordem.filter((t) => !useFeed.getState().cache[t.id]?.length).slice(0, GERAR_POR_RODADA);
      for (const t of semCartao) {
        const materia = estudo.subjects.find((s) => s.id === t.subjectId);
        const lote = await ia.run((signal) => gerarCartoes({ topic: t, materia: materia?.name ?? '', linguagem: materia?.language ?? '', contextoMateria: useImportacao.getState().contexto[t.subjectId] }, signal));
        if (lote) useFeed.getState().guardar(t.id, lote);
      }
    }

    const cache = useFeed.getState().cache;
    const rodada = montarRodada(ordem, (t) => (cache[t.id]?.length ? cache[t.id] : cartoesSemIA(t)));
    // Cada pergunta ganha um jogo criado pela IA. O 1º a gente espera um pouco (a pessoa vai vê-lo
    // já); os outros saem enquanto ela joga. Se não ficar pronto, o cartão usa um jogo embutido.
    if (rodada.length && iaLigada(useConexoes.getState().motores)) {
      const primeiro = jogoPara(rodada[0]);
      if (primeiro) {
        setCriandoJogo(true);
        await Promise.race([primeiro, new Promise<void>((ok) => setTimeout(ok, ESPERA_PRIMEIRO_JOGO_MS))]);
        setCriandoJogo(false);
      }
      void rodada.slice(1).reduce((fila, c) => fila.then(() => jogoPara(c) ?? undefined), Promise.resolve());
    }

    setCartoes(rodada);
    setIndice(0);
    setCombo(0);
    setMaiorCombo(0);
    setResultados([]);
    setPop(null);
    setFase(rodada.length ? 'jogando' : 'vazio');
  };

  const responder = (acertou: boolean, resposta: string) => {
    const cartao = cartoes[indice];
    const novoCombo = acertou ? combo + 1 : 0;
    const xp = pontuar(cartao.tipo, acertou, novoCombo);
    setCombo(novoCombo);
    setMaiorCombo((m) => Math.max(m, novoCombo));
    setResultados((r) => [...r, { cartao, acertou, xp }]);
    useFeed.getState().gastar([cartao.id]);

    if (acertou) {
      useStudy.getState().addXp(xp);
      setPop({ xp, chave: Date.now() });
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
  };

  const fechar = () => {
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
    setFase('fim');
  };

  const proximo = () => {
    if (indice + 1 < cartoes.length) setIndice(indice + 1);
    else fechar();
  };

  return { fase, cartao: cartoes[indice], indice, total: cartoes.length, combo, maiorCombo, resultados, pop, comecar, responder, proximo, carregando: ia.loading, criandoJogo, erro: ia.error };
}
