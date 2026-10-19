import { serializeAsJSON } from '@excalidraw/excalidraw';
import type { ExcalidrawElement } from '@excalidraw/excalidraw/element/types';
import type { AppState, BinaryFiles } from '@excalidraw/excalidraw/types';
import { idbGet, idbSet } from '../../services/idb';

// Onde o desenho de cada lousa mora:
//  1) IndexedDB do navegador (rápido, é de onde o app lê)
//  2) cópia em <cofre de estudos>/Lousas/<nome>.excalidraw — abre no Obsidian
//     (plugin Excalidraw) e o Brazuka/eu conseguimos ler.

export interface SavedScene {
  elements: readonly ExcalidrawElement[];
  appState: Partial<AppState>;
  files: BinaryFiles;
}

const key = (id: string) => `lousa:${id}`;

export const loadScene = (id: string) => idbGet<SavedScene>(key(id));

/** Só o que vale guardar do estado da tela (posição, zoom, fundo, grade). */
function pickAppState(a: AppState): Partial<AppState> {
  return {
    viewBackgroundColor: a.viewBackgroundColor,
    scrollX: a.scrollX,
    scrollY: a.scrollY,
    zoom: a.zoom,
    gridModeEnabled: a.gridModeEnabled,
    objectsSnapModeEnabled: a.objectsSnapModeEnabled,
  };
}

export async function saveScene(id: string, elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) {
  const scene: SavedScene = { elements, appState: pickAppState(appState), files };
  await idbSet(key(id), scene);
}

function mirrorBody(name: string, elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) {
  const content = serializeAsJSON(elements, appState, files, 'local');
  const safe = name.replace(/[\\/:*?"<>|#^[\]]/g, '-').trim() || 'lousa';
  return JSON.stringify({ path: `Lousas/${safe}.excalidraw`, content });
}

/** Espelha no cofre. Falha em silêncio se o cofre não estiver configurado (o IndexedDB já salvou). */
export async function mirrorToVault(name: string, elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) {
  try {
    await fetch('/api/estudos/file', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: mirrorBody(name, elements, appState, files) });
  } catch {
    /* sem servidor/cofre: tudo bem, o IndexedDB é a fonte */
  }
}

/** Versão pra hora de fechar a página: o navegador garante o envio mesmo saindo. */
export function mirrorOnExit(name: string, elements: readonly ExcalidrawElement[], appState: AppState, files: BinaryFiles) {
  const body = new Blob([mirrorBody(name, elements, appState, files)], { type: 'application/json' });
  navigator.sendBeacon('/api/estudos/file', body);
}
