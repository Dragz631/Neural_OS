import type { TipoEvento } from '../../store/faculdade';
import { chatJSON } from './client';
import { PROFESSOR } from './persona';

// Tira as datas do que o professor da faculdade escreveu (slides, avisos).
// Regra de ouro: só o que está escrito. Data inventada aqui vira prova perdida.

export interface EventoAchado {
  titulo: string;
  data: string;
  tipo: TipoEvento;
  /** Trecho exato de onde saiu, pra ele conferir. */
  trecho: string;
}

const TIPOS: TipoEvento[] = ['prova', 'trabalho', 'apresentacao', 'palestra', 'aula', 'outro'];

/** Só as partes com cara de calendário: slides inteiros são grandes demais. */
export function trechosComData(texto: string): string {
  const linhas = texto.split('\n');
  const uteis = new Set<number>();
  linhas.forEach((l, i) => {
    if (/\d{1,2}\/\d{1,2}|\bdia \d{1,2}\b|prova|avalia[cç][aã]o|\bA[1-4]\b|\bAV ?\d|cronograma|entrega/i.test(l)) {
      for (let j = Math.max(0, i - 1); j <= i + 1; j++) uteis.add(j);
    }
  });
  return [...uteis].sort((a, b) => a - b).map((i) => linhas[i]).join('\n').slice(0, 9000);
}

export async function extrairCronograma(materia: string, texto: string, hoje: string, signal?: AbortSignal): Promise<EventoAchado[]> {
  return chatJSON(
    [
      { role: 'system', content: PROFESSOR },
      {
        role: 'user',
        content: `Hoje é ${hoje}. Abaixo está o que o professor de "${materia}" escreveu.
"""
${texto}
"""
Liste os eventos COM DATA ESCRITA no texto (prova, trabalho, entrega, apresentação, palestra).
Regras:
- Só o que está escrito. NUNCA invente nem deduza data. Se não tem data, não entra.
- Data sem ano: use o ano de hoje (se já passou mais de 2 meses, descarte).
- "data" no formato AAAA-MM-DD; "trecho" = cópia exata da linha de onde saiu.
- "tipo": prova, trabalho, apresentacao, palestra, aula ou outro.
Formato JSON: {"eventos": [{"titulo": "...", "data": "2026-12-09", "tipo": "prova", "trecho": "..."}]}`,
      },
    ],
    (raw) => {
      const lista = (raw as { eventos?: unknown }).eventos;
      if (!Array.isArray(lista)) throw new Error('faltou "eventos"');
      return lista.flatMap((e): EventoAchado[] => {
        const r = e as Record<string, unknown>;
        const data = String(r.data ?? '');
        const trecho = String(r.trecho ?? '');
        // Confere: o trecho citado tem que existir mesmo no texto.
        if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !r.titulo || !trecho || !texto.includes(trecho.trim().slice(0, 25))) return [];
        return [{ titulo: String(r.titulo), data, tipo: TIPOS.includes(r.tipo as TipoEvento) ? (r.tipo as TipoEvento) : 'outro', trecho }];
      });
    },
    signal,
  );
}
