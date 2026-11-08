import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Escada } from '../domain/ajuda';
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

export type Marca = 'ok' | 'confuso';

export interface PedidoChat {
  topicId: Id;
  pedido: string;
  tipo: string;
  sobre?: string;
  chave: number;
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
  /** Termômetro da aula: em cada parte do desenho, 🙂 (entendi) ou 😕 (não entrou). Zera quando a aula muda. */
  termometro: Record<Id, { aula: string; marcas: Record<string, Marca> }>;
  marcarParte: (topicId: Id, aula: string, parte: string, marca: Marca | undefined) => void;
  /** Pedido feito de fora do chat (ex.: o 😕 do termômetro). O chat abre, manda e limpa. Não fica salvo. */
  pedidoChat?: PedidoChat;
  pedirAoChat: (p: Omit<PedidoChat, 'chave'>) => void;
  limparPedidoChat: () => void;
  /** Escada de ajuda em andamento no chat de cada tópico (domain/ajuda.ts). */
  escada: Record<Id, Escada>;
  guardarEscada: (topicId: Id, e: Escada | undefined) => void;
  /** Tópico com a prova aberta: a aula, as anotações e o chat ficam escondidos ("sem olhar"). */
  provaAberta?: Id;
  abrirProva: (id: Id | undefined) => void;
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
      termometro: {},
      marcarParte: (topicId, aula, parte, marca) =>
        set((s) => {
          const atual = s.termometro[topicId];
          const marcas = { ...(atual?.aula === aula ? atual.marcas : {}) };
          if (marca) marcas[parte] = marca;
          else delete marcas[parte];
          return { termometro: { ...s.termometro, [topicId]: { aula, marcas } } };
        }),
      pedirAoChat: (p) => set({ pedidoChat: { ...p, chave: Date.now() } }),
      limparPedidoChat: () => set({ pedidoChat: undefined }),
      abrirDias: (datas, aberto) => set((s) => ({ diasAbertos: { ...s.diasAbertos, ...Object.fromEntries(datas.map((d) => [d, aberto])) } })),
      lembrarTopico: (id) => set({ ultimoTopico: id }),
      abrirProva: (id) => set({ provaAberta: id }),
      escada: {},
      guardarEscada: (topicId, e) =>
        set((s) => {
          const escada = { ...s.escada };
          if (e) escada[topicId] = e;
          else delete escada[topicId];
          return { escada };
        }),
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
    {
      name: 'neural-os.rascunhos',
      version: 1,
      // O pedido pendente do chat não vai pro disco: recarregar a página não pode reenviar pergunta.
      partialize: ({ pedidoChat: _pedido, ...resto }) => resto,
    },
  ),
);
