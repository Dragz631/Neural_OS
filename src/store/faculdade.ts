import { create } from 'zustand';
import { persist } from '../lib/persistir';
import type { BlocoGrade } from '../domain/grade';
import type { Id, LocalDate } from '../domain/types';

// A faculdade dentro do app: grade (aulas fixas e rotina), eventos do calendário
// (cronograma tirado dos slides e do Notion) e qual caderno do NotebookLM é de
// qual matéria. Prazos com entrega ficam em store/entregas.ts.

export type TipoEvento = 'prova' | 'trabalho' | 'apresentacao' | 'palestra' | 'aula' | 'outro';

export interface EventoFaculdade {
  id: Id;
  titulo: string;
  data: LocalDate;
  tipo: TipoEvento;
  materia?: string;
  /** De onde veio ("slides de Paradigmas", "Notion"), pra ele poder conferir. */
  origem: string;
}

/** Uma fonte (slide, PDF) de um caderno do NotebookLM. */
export interface FonteNLM {
  id: string;
  titulo: string;
  criadaEm?: string;
}

interface FaculdadeState {
  /** subjectId → fontes que o app já conhece (pra saber quando chega slide novo). */
  fontesVistas: Record<Id, FonteNLM[]>;
  /** subjectId → fontes novas, ainda não adaptadas na trilha. */
  fontesNovas: Record<Id, FonteNLM[]>;
  /** subjectId → até quando o aviso fica escondido ("Depois"). */
  adiadoAte: Record<Id, number>;
  /** Compara a lista atual do caderno com a que o app conhece. 1ª vez: só guarda, sem avisar. */
  registrarFontes: (subjectId: Id, fontes: FonteNLM[]) => void;
  /** Adaptou: as novas passam a ser conhecidas. */
  marcarFontesVistas: (subjectId: Id) => void;
  adiarAviso: (subjectId: Id) => void;
  montadaEm?: string;
  blocos: BlocoGrade[];
  eventos: EventoFaculdade[];
  /** subjectId → id do caderno do NotebookLM. */
  cadernoDe: Record<Id, string>;
  salvarGrade: (blocos: BlocoGrade[]) => void;
  somarEventos: (eventos: EventoFaculdade[]) => void;
  removerEvento: (id: Id) => void;
  ligarCaderno: (subjectId: Id, cadernoId: string) => void;
  marcarMontada: () => void;
}

export const useFaculdade = create<FaculdadeState>()(
  persist(
    (set) => ({
      blocos: [],
      eventos: [],
      cadernoDe: {},
      fontesVistas: {},
      fontesNovas: {},
      adiadoAte: {},
      registrarFontes: (subjectId, fontes) =>
        set((s) => {
          const vistas = s.fontesVistas[subjectId];
          if (!vistas) return { fontesVistas: { ...s.fontesVistas, [subjectId]: fontes } };
          const conhecidas = new Set(vistas.map((f) => f.id));
          const novas = fontes.filter((f) => !conhecidas.has(f.id));
          const fontesNovas = { ...s.fontesNovas };
          if (novas.length) fontesNovas[subjectId] = novas;
          else delete fontesNovas[subjectId];
          return { fontesNovas };
        }),
      marcarFontesVistas: (subjectId) =>
        set((s) => {
          const fontesNovas = { ...s.fontesNovas };
          const novas = fontesNovas[subjectId] ?? [];
          delete fontesNovas[subjectId];
          return { fontesNovas, fontesVistas: { ...s.fontesVistas, [subjectId]: [...(s.fontesVistas[subjectId] ?? []), ...novas] } };
        }),
      adiarAviso: (subjectId) => set((s) => ({ adiadoAte: { ...s.adiadoAte, [subjectId]: Date.now() + 20 * 60 * 60 * 1000 } })),
      salvarGrade: (blocos) => set({ blocos }),
      somarEventos: (novos) =>
        set((s) => {
          const repetido = (e: EventoFaculdade) => s.eventos.some((x) => x.data === e.data && x.titulo === e.titulo);
          return { eventos: [...s.eventos, ...novos.filter((e) => !repetido(e))] };
        }),
      removerEvento: (id) => set((s) => ({ eventos: s.eventos.filter((e) => e.id !== id) })),
      ligarCaderno: (subjectId, cadernoId) => set((s) => ({ cadernoDe: { ...s.cadernoDe, [subjectId]: cadernoId } })),
      marcarMontada: () => set({ montadaEm: new Date().toISOString() }),
    }),
    { name: 'neural-os.faculdade', version: 1 },
  ),
);
