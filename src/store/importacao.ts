import { create } from 'zustand';
import { persist } from '../lib/persistir';
import type { Id } from '../domain/types';

// O que já veio do Notion/NotebookLM (importado ou dispensado, pra não oferecer
// de novo) e o contexto de cada matéria, que alimenta o mapa e os cartões.

interface ImportacaoState {
  /** notionId das disciplinas/entregas e id dos cadernos já tratados. */
  vistos: string[];
  /** Texto de apoio por matéria (anotações do Notion + resumos do NotebookLM). */
  contexto: Record<Id, string>;
  marcarVisto: (ids: string[]) => void;
  juntarContexto: (subjectId: Id, texto: string) => void;
  /** Texto de cada slide/fonte do NotebookLM, por matéria (pra aula escolher o slide do tópico). */
  porFonte: Record<Id, Record<string, { titulo: string; texto: string }>>;
  guardarFonte: (subjectId: Id, fonteId: string, titulo: string, texto: string) => void;
}

/** Limite por fonte guardada (as aulas usam um trecho; o roadmap, o começo). */
const MAX_FONTE = 12_000;

/** Limite do contexto guardado por matéria (vai inteiro em prompt). */
const MAX_CONTEXTO = 8000;

export const useImportacao = create<ImportacaoState>()(
  persist(
    (set) => ({
      vistos: [],
      contexto: {},
      porFonte: {},
      guardarFonte: (subjectId, fonteId, titulo, texto) =>
        set((s) => ({ porFonte: { ...s.porFonte, [subjectId]: { ...(s.porFonte[subjectId] ?? {}), [fonteId]: { titulo, texto: texto.slice(0, MAX_FONTE) } } } })),
      marcarVisto: (ids) => set((s) => ({ vistos: [...new Set([...s.vistos, ...ids])] })),
      juntarContexto: (subjectId, texto) =>
        set((s) => {
          const atual = s.contexto[subjectId];
          if (atual?.includes(texto)) return s;
          return { contexto: { ...s.contexto, [subjectId]: [atual, texto].filter(Boolean).join('\n\n').slice(-MAX_CONTEXTO) } };
        }),
    }),
    { name: 'neural-os.importacao', version: 1 },
  ),
);
