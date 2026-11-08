import { create } from 'zustand';
import { persist } from '../lib/persistir';
import { ACERTOS_PRA_FIRMAR, type ExplicacaoBase } from '../domain/base';
import { SUBJECT_COLORS } from '../domain/catalog';
import type { Id } from '../domain/types';
import { useStudy } from './study';

// As bases em que o aluno travou ("não sei dividir"). Cada uma vira um tópico na matéria
// "Bases" (criada sozinha) e fica guardada pra rever. Enquanto ele não acerta a pergunta
// de conferir algumas vezes, ela é "base fraca": o professor explica essa conta em 1 linha
// desenhada quando ela aparecer numa aula.

export interface BaseGuardada {
  id: string;
  /** O tópico na matéria "Bases". */
  topicId: Id;
  duvida: string;
  explicacao: ExplicacaoBase;
  /** A aula em que ele travou (título), quando foi dentro de uma aula. */
  deTopico?: string;
  criadaEm: string;
  acertos: number;
  erros: number;
}

interface BasesState {
  bases: BaseGuardada[];
  guardar: (b: Omit<BaseGuardada, 'id' | 'topicId' | 'criadaEm' | 'acertos' | 'erros'>) => string;
  trocarExplicacao: (id: string, explicacao: ExplicacaoBase) => void;
  acertou: (id: string) => void;
  errou: (id: string) => void;
  apagar: (id: string) => void;
}

const semAcento = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .trim();

/** A matéria "Bases" e o tópico desta base (cria o que faltar). */
export function topicoDaBase(titulo: string): Id {
  const st = useStudy.getState();
  const materia = st.subjects.find((s) => semAcento(s.name) === 'bases');
  const subjectId = materia?.id ?? st.addSubject({ name: 'Bases', language: '', color: SUBJECT_COLORS[3] });
  const existente = useStudy.getState().topics.find((t) => t.subjectId === subjectId && semAcento(t.title) === semAcento(titulo));
  return existente?.id ?? useStudy.getState().addTopic({ subjectId, title: titulo });
}

export const useBases = create<BasesState>()(
  persist(
    (set) => ({
      bases: [],
      guardar: (b) => {
        const topicId = topicoDaBase(b.explicacao.titulo);
        const id = `base_${Date.now().toString(36)}`;
        set((s) => ({ bases: [{ ...b, id, topicId, criadaEm: new Date().toISOString(), acertos: 0, erros: 0 }, ...s.bases].slice(0, 80) }));
        return id;
      },
      trocarExplicacao: (id, explicacao) => set((s) => ({ bases: s.bases.map((b) => (b.id === id ? { ...b, explicacao } : b)) })),
      acertou: (id) => set((s) => ({ bases: s.bases.map((b) => (b.id === id ? { ...b, acertos: b.acertos + 1 } : b)) })),
      errou: (id) => set((s) => ({ bases: s.bases.map((b) => (b.id === id ? { ...b, erros: b.erros + 1 } : b)) })),
      apagar: (id) => set((s) => ({ bases: s.bases.filter((b) => b.id !== id) })),
    }),
    { name: 'neural-os.bases', version: 1 },
  ),
);

/** As bases que ainda não firmaram, juntando as do mesmo título (ex.: duas vezes "Divisão"). */
export function basesFracas(): { titulo: string; acertos: number; erros: number }[] {
  const por = new Map<string, { titulo: string; acertos: number; erros: number }>();
  for (const b of useBases.getState().bases) {
    const k = semAcento(b.explicacao.titulo);
    const atual = por.get(k) ?? { titulo: b.explicacao.titulo, acertos: 0, erros: 0 };
    por.set(k, { titulo: atual.titulo, acertos: atual.acertos + b.acertos, erros: atual.erros + b.erros });
  }
  return [...por.values()].filter((b) => b.acertos < ACERTOS_PRA_FIRMAR);
}

/** Pro professor: as bases fracas do aluno (vazio se não tem). */
export function basesParaIA(): string {
  const fracas = basesFracas();
  if (!fracas.length) return '';
  return `BASES FRACAS deste aluno (pré-requisitos em que ele travou; é sobre ele, NÃO é matéria): ${fracas.map((b) => b.titulo).join(', ')}.
Quando a aula usar uma dessas contas, explique ela em 1 linha desenhada ali mesmo (ex.: "12 ÷ 3 = repartir 12 em 3 grupos = 4 em cada"), sem supor que ele sabe.`;
}
