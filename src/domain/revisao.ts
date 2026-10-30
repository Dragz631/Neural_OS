import type { PerfilAprendiz } from './aprendiz';
import { cartoesSemIA } from './cartoesSemIA';
import type { Energy, Topic } from './types';

// Revisão guiada: lembrar ativamente (o que mais fixa), em três tamanhos.
// Quem escolhe quanto fazer é a pessoa; o professor só recomenda pela energia.

export type Tamanho = 'relampago' | 'posaula' | 'completa';

export const TAMANHOS: Record<Tamanho, { rotulo: string; minutos: number; perguntas: number; quando: string }> = {
  relampago: { rotulo: 'Relâmpago', minutos: 5, perguntas: 3, quando: 'antes de sair pro trabalho, ou com a cabeça cheia' },
  posaula: { rotulo: 'Pós-aula', minutos: 15, perguntas: 5, quando: 'ao chegar da aula, com ela ainda fresca' },
  completa: { rotulo: 'Completa', minutos: 30, perguntas: 8, quando: 'na biblioteca, com calma' },
};

export function tamanhoSugerido(energia?: Energy, minutosLivres?: number): Tamanho {
  if (energia === 1 || (minutosLivres !== undefined && minutosLivres < 10)) return 'relampago';
  if (energia === 3 && (minutosLivres === undefined || minutosLivres >= 30)) return 'completa';
  return 'posaula';
}

/** Com a cabeça cheia e atenção curta, menos perguntas e mais leves. */
export function quantasPerguntas(tamanho: Tamanho, cansado: boolean, perfil: PerfilAprendiz): number {
  const base = TAMANHOS[tamanho].perguntas;
  const porAtencao = Math.max(2, Math.round(perfil.bloco / 3));
  return Math.min(cansado ? Math.min(base, 3) : base, Math.max(porAtencao, 3));
}

export type Nivel = 'certo' | 'quase' | 'errado';

/** Onde o raciocínio quebrou. É isso que diz como consertar. */
export type TipoErro = 'lacuna' | 'confusao' | 'superficial' | 'procedimento' | 'nenhum';

export const ERRO_TEXTO: Record<TipoErro, string> = {
  lacuna: 'Ainda não chegou nessa ideia',
  confusao: 'Misturou com outro conceito',
  superficial: 'Sabe o nome, falta o porquê',
  procedimento: 'Entendeu a ideia, errou a ordem dos passos',
  nenhum: 'Sem erro',
};

export interface PerguntaRevisao {
  id: string;
  pergunta: string;
  /** Resposta-modelo (pra comparar quando não há IA). */
  referencia: string;
  /** "Slide 12" ou "Aula 3": de onde a pergunta saiu. */
  origem?: string;
  /** Pergunta leve, feita pra dia cansado. */
  leve?: boolean;
}

export interface Diagnostico {
  nivel: Nivel;
  acertou: string[];
  ajusteFino: string;
  tipoErro: TipoErro;
  /** Em uma frase: onde o raciocínio quebrou. */
  causa: string;
  /** A explicação feita pra esse erro, não a aula inteira de novo. */
  reparo: { ideia: string; imagem: string };
}

/** Sem IA: pergunta tirada dos pontos-chave e das anotações da pessoa. */
export function perguntasSemIA(t: Topic, n: number): PerguntaRevisao[] {
  return cartoesSemIA(t)
    .slice(0, n)
    .map((c, i) => ({
      id: `${t.id}-${i}`,
      pergunta: c.pergunta,
      referencia: c.tipo === 'lembra' ? c.resposta : c.tipo === 'frase' ? (c.referencia ?? '') : '',
      origem: t.title,
      leve: c.tipo === 'lembra',
    }));
}

/** Nota 0..100 de uma resposta, pra reagendar a revisão do tópico. */
export const notaDe = (n: Nivel) => (n === 'certo' ? 90 : n === 'quase' ? 60 : 25);
