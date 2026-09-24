export type ToolId =
  | 'select'
  | 'text'
  | 'shape'
  | 'connect'
  | 'ai'
  | 'pencil'
  | 'eraser';

export type AnchorSide = 'top' | 'right' | 'bottom' | 'left';

export type Corner = 'nw' | 'ne' | 'se' | 'sw';

export interface Point {
  x: number;
  y: number;
}

export type NodeKind = 'text' | 'shape';

export interface FlowNode {
  id: string;
  kind: NodeKind;
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  description: string;
  translation: TranslationResult | null;
}

export interface FlowEdge {
  id: string;
  from: string;
  fromAnchor: AnchorSide;
  to: string;
  toAnchor: AnchorSide;
}

export interface DrawPath {
  id: string;
  points: Point[];
}

export interface KeywordRow {
  informal: string;
  formal: string;
}

export interface TranslationResult {
  concept: string;
  translation: string;
  keywords: KeywordRow[];
}
