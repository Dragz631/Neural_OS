import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Cena } from '../domain/cena';
import type { Id } from '../domain/types';

// O que a pessoa estava fazendo no meio. Sair da aba e voltar não pode perder nada:
// o tópico aberto no Professor, o texto do Feynman e a revisão guiada em andamento.

/** Foto da revisão guiada (RevisaoGuiada.tsx). Os tipos finos ficam lá; aqui só guardamos. */
export interface RevisaoSalva {
  fase: string;
  tamanho: string;
  cansado: boolean;
  slide: string;
  fila: unknown[];
  i: number;
  resposta: string;
  feitas: unknown[];
  diag: unknown;
  mini: boolean;
  consertos: Record<string, unknown>;
  inicioEm: number;
}

export interface MensagemChat {
  de: 'aluno' | 'prof';
  texto: string;
  /** Desenho que o professor sugeriu junto da resposta (dá pra pôr no quadro). */
  cena?: Cena;
  /** Parte do quadro de que a pergunta falava. */
  sobre?: string;
  em: string;
}

export interface JanelaChat {
  aberto: boolean;
  /** Preso na lateral direita (em vez de flutuando). */
  preso: boolean;
  /** Canto de cima-esquerda da janela flutuante (-1 = posição padrão). */
  x: number;
  y: number;
}

interface RascunhosState {
  ultimoTopico?: Id;
  feynman: Record<Id, string>;
  revisao: Record<Id, RevisaoSalva>;
  /** Molda-horário: dias abertos (data → aberto). Sem registro, só hoje abre. */
  diasAbertos: Record<string, boolean>;
  abrirDias: (datas: string[], aberto: boolean) => void;
  /** Conversa com o professor, por tópico (só as últimas 30 mensagens). */
  chat: Record<Id, MensagemChat[]>;
  /** Onde a janelinha do chat está (e se está presa na lateral). */
  chatJanela: JanelaChat;
  /** Desenho que a pessoa mandou pôr no quadro do professor (vai ao lado, uma vez). */
  paraQuadro: Record<Id, { chave: string; titulo: string; cena: Cena }>;
  falarNoChat: (topicId: Id, m: MensagemChat) => void;
  limparChat: (topicId: Id) => void;
  moverChat: (j: Partial<JanelaChat>) => void;
  porNoQuadro: (topicId: Id, titulo: string, cena: Cena) => void;
  lembrarTopico: (id: Id) => void;
  escreverFeynman: (id: Id, texto: string) => void;
  guardarRevisao: (id: Id, r: RevisaoSalva | undefined) => void;
}

export const useRascunhos = create<RascunhosState>()(
  persist(
    (set) => ({
      feynman: {},
      revisao: {},
      diasAbertos: {},
      chat: {},
      chatJanela: { aberto: false, preso: false, x: -1, y: -1 },
      paraQuadro: {},
      falarNoChat: (topicId, m) => set((s) => ({ chat: { ...s.chat, [topicId]: [...(s.chat[topicId] ?? []), m].slice(-30) } })),
      limparChat: (topicId) =>
        set((s) => {
          const chat = { ...s.chat };
          delete chat[topicId];
          return { chat };
        }),
      moverChat: (j) => set((s) => ({ chatJanela: { ...s.chatJanela, ...j } })),
      porNoQuadro: (topicId, titulo, cena) => set((s) => ({ paraQuadro: { ...s.paraQuadro, [topicId]: { chave: `chat:${Date.now()}`, titulo, cena } } })),
      abrirDias: (datas, aberto) => set((s) => ({ diasAbertos: { ...s.diasAbertos, ...Object.fromEntries(datas.map((d) => [d, aberto])) } })),
      lembrarTopico: (id) => set({ ultimoTopico: id }),
      escreverFeynman: (id, texto) =>
        set((s) => {
          const feynman = { ...s.feynman };
          if (texto) feynman[id] = texto;
          else delete feynman[id];
          return { feynman };
        }),
      guardarRevisao: (id, r) =>
        set((s) => {
          const revisao = { ...s.revisao };
          if (r) revisao[id] = r;
          else delete revisao[id];
          return { revisao };
        }),
    }),
    { name: 'neural-os.rascunhos', version: 1 },
  ),
);
