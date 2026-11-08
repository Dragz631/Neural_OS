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

/** O slide chegou no caderno depois que a faculdade foi montada? ("11/08/2026 16:40:26" vem do NotebookLM.) */
function chegouDepois(f: FonteNLM, montadaEm: string | undefined): boolean {
  if (!montadaEm || !f.criadaEm) return false;
  const t = Date.parse(f.criadaEm);
  return Number.isFinite(t) && t > Date.parse(montadaEm);
}

/** Ids dos slides que o app já leu (store da importação), direto do armazenamento. */
function idsJaLidos(subjectId: string): Set<string> {
  try {
    const imp = JSON.parse(localStorage.getItem('neural-os.importacao') ?? '{}') as { state?: { porFonte?: Record<string, Record<string, unknown>> } };
    return new Set(Object.keys(imp.state?.porFonte?.[subjectId] ?? {}));
  } catch {
    return new Set();
  }
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
          if (!vistas) {
            // 1ª conferência: o que já estava no caderno quando a faculdade foi montada é conhecido;
            // o que chegou DEPOIS é novo (bug de 08/11: os PDFs de Probabilidade foram engolidos calados).
            const novas = fontes.filter((f) => chegouDepois(f, s.montadaEm));
            return {
              fontesVistas: { ...s.fontesVistas, [subjectId]: fontes.filter((f) => !novas.includes(f)) },
              ...(novas.length ? { fontesNovas: { ...s.fontesNovas, [subjectId]: novas } } : {}),
            };
          }
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
    {
      name: 'neural-os.faculdade',
      version: 2,
      // v2 (08/11/2026): devolve pra "novos" os slides que a 1ª conferência engoliu calada:
      // chegaram depois da faculdade montada e o app nunca leu. O aviso aparece de novo.
      migrate: (estado) => {
        const s = (estado ?? {}) as Partial<FaculdadeState>;
        const vistas = { ...(s.fontesVistas ?? {}) };
        const novasPor = { ...(s.fontesNovas ?? {}) };
        for (const [subjectId, lista] of Object.entries(vistas)) {
          const lidos = idsJaLidos(subjectId);
          const voltam = lista.filter((f) => chegouDepois(f, s.montadaEm) && !lidos.has(f.id));
          if (!voltam.length) continue;
          vistas[subjectId] = lista.filter((f) => !voltam.includes(f));
          novasPor[subjectId] = [...(novasPor[subjectId] ?? []), ...voltam];
        }
        return { ...s, fontesVistas: vistas, fontesNovas: novasPor } as never;
      },
    },
  ),
);
