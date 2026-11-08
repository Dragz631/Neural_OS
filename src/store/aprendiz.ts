import { create } from 'zustand';
import { persist } from '../lib/persistir';
import { focoParaIA } from './foco';
import { basesParaIA } from './bases';
import { perfilExternoParaIA } from '../lib/perfilExterno';
import { derivarPerfil, descreverPerfil, ENTREVISTA, normalizarRespostas, PERFIL_PADRAO, type IdPergunta, type PerfilAprendiz, type Respostas } from '../domain/aprendiz';

// O perfil de aprendizagem da pessoa (resultado da entrevista). Fica no navegador
// e no backup; o professor lê daqui em todo pedido.

/**
 * Uma lembrança do professor sobre COMO você aprendeu um tópico (nasce quando você passa na prova).
 * É sobre você, nunca é matéria. Você pode corrigir ou apagar (a sua edição vence).
 */
export interface Memoria {
  id: string;
  topicId: string;
  topico: string;
  materia: string;
  quando: string;
  nota: number;
  oQueFuncionou: string;
  oQueTravou: string;
  comoExplicar: string;
  /** Você editou: o professor não reescreve. */
  editada?: boolean;
}

interface AprendizState {
  /** A "mente do professor": o que ele lembra do seu jeito de aprender (mais nova primeiro, até 60). */
  memorias: Memoria[];
  guardarMemoria: (m: Omit<Memoria, 'id'>) => void;
  editarMemoria: (id: string, patch: Partial<Pick<Memoria, 'oQueFuncionou' | 'oQueTravou' | 'comoExplicar'>>) => void;
  apagarMemoria: (id: string) => void;
  respostas: Respostas;
  /** Texto livre do fim da entrevista. */
  livre: string;
  perfil: PerfilAprendiz;
  /** Quantas vezes a pessoa pediu cada ajuste ao professor no chat ("mais fácil", "desenha"...). */
  ajustes: Record<string, number>;
  registrarAjuste: (tipo: string) => void;
  /** Liga/desliga uma opção (pergunta de várias) ou troca a escolhida (pergunta de uma só). */
  alternar: (id: IdPergunta, valor: string) => void;
  /** Troca as opções da pergunta de uma vez. */
  definir: (id: IdPergunta, valores: string[]) => void;
  escrever: (livre: string) => void;
  /** Carrega respostas de um backup (aceita o formato antigo, de um valor por pergunta). */
  carregar: (dados: { respostas?: unknown; livre?: string }) => void;
  refazer: () => void;
}

const recalcular = (respostas: Respostas, livre: string) => derivarPerfil(respostas, new Date().toISOString(), livre);

export const useAprendiz = create<AprendizState>()(
  persist(
    (set, get) => ({
      respostas: {},
      livre: '',
      perfil: PERFIL_PADRAO,
      ajustes: {},
      memorias: [],
      // Uma por tópico: passar de novo atualiza a lembrança (menos a que você editou à mão).
      guardarMemoria: (m) =>
        set((s) => {
          const antiga = s.memorias.find((x) => x.topicId === m.topicId);
          if (antiga?.editada) return {};
          const nova: Memoria = { ...m, id: antiga?.id ?? `mem_${Date.now().toString(36)}` };
          return { memorias: [nova, ...s.memorias.filter((x) => x.topicId !== m.topicId)].slice(0, 60) };
        }),
      editarMemoria: (id, patch) => set((s) => ({ memorias: s.memorias.map((x) => (x.id === id ? { ...x, ...patch, editada: true } : x)) })),
      apagarMemoria: (id) => set((s) => ({ memorias: s.memorias.filter((x) => x.id !== id) })),
      registrarAjuste: (tipo) => set((s) => ({ ajustes: { ...s.ajustes, [tipo]: (s.ajustes[tipo] ?? 0) + 1 } })),
      alternar: (id, valor) => {
        const multi = ENTREVISTA.find((p) => p.id === id)?.multi;
        const atual = get().respostas[id] ?? [];
        const lista = !multi ? [valor] : atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor];
        get().definir(id, lista);
      },
      definir: (id, valores) => {
        const respostas = { ...get().respostas, [id]: valores };
        if (valores.length === 0) delete respostas[id];
        set({ respostas, perfil: recalcular(respostas, get().livre) });
      },
      escrever: (livre) => set({ livre, perfil: recalcular(get().respostas, livre) }),
      carregar: (dados) => {
        const respostas = normalizarRespostas(dados.respostas);
        const livre = typeof dados.livre === 'string' ? dados.livre : '';
        set({ respostas, livre, perfil: recalcular(respostas, livre) });
      },
      refazer: () => set({ respostas: {}, livre: '', perfil: PERFIL_PADRAO }),
    }),
    {
      name: 'neural-os.aprendiz',
      version: 2,
      // v1 guardava um texto por pergunta; v2 guarda uma lista.
      migrate: (estado) => {
        const e = (estado ?? {}) as { respostas?: unknown; livre?: string };
        const respostas = normalizarRespostas(e.respostas);
        const livre = typeof e.livre === 'string' ? e.livre : '';
        return { respostas, livre, ajustes: {}, perfil: Object.keys(respostas).length || livre ? recalcular(respostas, livre) : PERFIL_PADRAO };
      },
    },
  ),
);

/** O que o professor precisa saber sobre como a pessoa aprende (vazio sem entrevista). */
const NOME_AJUSTE: Record<string, string> = {
  'mais-facil': 'pediu pra deixar mais fácil',
  desenho: 'pediu pra desenhar',
  exemplo: 'pediu um exemplo',
  analogia: 'pediu analogia/emoji',
  resumo: 'pediu um resumo curto',
  pergunta: 'fez uma pergunta própria',
  discordo: 'discordou e pediu argumento',
};

/** As lembranças mais recentes, em texto pro professor (as 6 mais novas). */
export function memoriasParaIA(): string {
  const ms = (useAprendiz.getState().memorias ?? []).slice(0, 6);
  if (!ms.length) return '';
  const linhas = ms.map((m) => `- ${m.materia} › ${m.topico} (passou com ${m.nota}): funcionou: ${m.oQueFuncionou} | travou: ${m.oQueTravou} | ensine assim: ${m.comoExplicar}`);
  return `MENTE DO PROFESSOR (o que você lembra de como ESTE aluno aprendeu, das provas que ele passou; é sobre ele, NÃO é matéria):\n${linhas.join('\n')}\nUse isso pra ensinar já do jeito que funcionou com ele.`;
}

export const aprendizParaIA = () => {
  const { perfil, respostas, ajustes } = useAprendiz.getState();
  const base = descreverPerfil(perfil, respostas);
  const pedidos = Object.entries(ajustes ?? {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([t, n]) => `${NOME_AJUSTE[t] ?? t} ${n}x`);
  // Vem do comportamento do aluno (diário), não é conteúdo de matéria.
  const comportamento = pedidos.length
    ? `O que ele já pediu ao professor nas aulas (comportamento do aluno, NÃO é matéria): ${pedidos.join(', ')}. Ensine já do jeito que ele mais pede (ex.: se pede muito desenho ou "mais fácil", comece desenhando e mais simples).`
    : '';
  return [base, perfilExternoParaIA(), comportamento, memoriasParaIA(), basesParaIA(), focoParaIA()].filter(Boolean).join('\n').trim();
};
