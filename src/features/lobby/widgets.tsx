import type { ComponentType } from 'react';
import type { ItemGrade } from '../../domain/lobbyGrade';
import { AbasLobby } from './AbasLobby';
import { CaixaEntradaCard } from './CaixaEntradaCard';
import { CalendarioCard } from './CalendarioCard';
import { EntregasCard } from './EntregasCard';
import { FaixaMaterias } from './FaixaMaterias';
import { FeedCartoes } from './feed/FeedCartoes';
import { FocoWidget } from './FocoWidget';
import { TabuadaWidget } from './TabuadaWidget';
import { MusculosWidget } from './MusculosWidget';
import { LembreteWidget } from './LembreteWidget';
import { LigacaoDoDia } from './LigacaoDoDia';
import { MissoesHoje } from './MissoesHoje';
import { PerfilResumo } from './PerfilResumo';
import { TargetTerminal } from './TargetTerminal';

// Catálogo dos widgets do Lobby: nome, componente, tamanho padrão e tamanho mínimo (em células).

export interface DefWidget {
  id: string;
  titulo: string;
  Componente: ComponentType;
  padrao: { x: number; y: number; w: number; h: number };
  min: { w: number; h: number };
}

export const WIDGETS: DefWidget[] = [
  { id: 'feed', titulo: 'Feed', Componente: FeedCartoes, padrao: { x: 0, y: 0, w: 7, h: 9 }, min: { w: 4, h: 6 } },
  { id: 'target', titulo: 'Target', Componente: TargetTerminal, padrao: { x: 7, y: 0, w: 5, h: 4 }, min: { w: 3, h: 3 } },
  { id: 'missoes', titulo: 'Missões de hoje', Componente: MissoesHoje, padrao: { x: 7, y: 4, w: 5, h: 5 }, min: { w: 3, h: 3 } },
  { id: 'materias', titulo: 'Matérias', Componente: FaixaMaterias, padrao: { x: 0, y: 9, w: 8, h: 3 }, min: { w: 4, h: 2 } },
  { id: 'ligacao', titulo: 'Ligação do dia', Componente: LigacaoDoDia, padrao: { x: 8, y: 9, w: 4, h: 3 }, min: { w: 3, h: 2 } },
  { id: 'perfil', titulo: 'Perfil', Componente: PerfilResumo, padrao: { x: 0, y: 12, w: 3, h: 4 }, min: { w: 2, h: 3 } },
  { id: 'entregas', titulo: 'Entregas', Componente: EntregasCard, padrao: { x: 3, y: 12, w: 3, h: 4 }, min: { w: 2, h: 3 } },
  { id: 'calendario', titulo: 'Calendário', Componente: CalendarioCard, padrao: { x: 6, y: 12, w: 3, h: 4 }, min: { w: 2, h: 3 } },
  { id: 'caixa', titulo: 'Caixa de entrada', Componente: CaixaEntradaCard, padrao: { x: 9, y: 12, w: 3, h: 4 }, min: { w: 2, h: 3 } },
  { id: 'lembrete', titulo: 'Lembrete', Componente: LembreteWidget, padrao: { x: 0, y: 16, w: 4, h: 3 }, min: { w: 2, h: 2 } },
  { id: 'foco', titulo: 'Foco', Componente: FocoWidget, padrao: { x: 4, y: 16, w: 5, h: 3 }, min: { w: 3, h: 3 } },
  { id: 'tabuada', titulo: 'Tabuada', Componente: TabuadaWidget, padrao: { x: 9, y: 16, w: 3, h: 6 }, min: { w: 3, h: 5 } },
  { id: 'musculos', titulo: 'Músculos do cérebro', Componente: MusculosWidget, padrao: { x: 0, y: 19, w: 9, h: 4 }, min: { w: 3, h: 4 } },
  { id: 'abas', titulo: 'Troféus e mais', Componente: AbasLobby, padrao: { x: 0, y: 23, w: 12, h: 8 }, min: { w: 4, h: 3 } },
];

export const padraoDoLobby = (): ItemGrade[] => WIDGETS.map((w) => ({ id: w.id, ...w.padrao }));
