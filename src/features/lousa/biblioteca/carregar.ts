import { useEffect } from 'react';
import { loadLibraryFromBlob, useHandleLibrary } from '@excalidraw/excalidraw';
import type { LibraryPersistenceAdapter } from '@excalidraw/excalidraw/data/library';
import type { ExcalidrawImperativeAPI, LibraryItems } from '@excalidraw/excalidraw/types';
import { idbGet, idbSet } from '../../../services/idb';
import { itensAutomatos, itensSelos } from './automatos';

// Biblioteca da Lousa (a mesma pra todas as lousas):
//  - fica guardada no IndexedDB (o que você salvar nela não some);
//  - na primeira vez, e quando a versão dos pacotes muda, junta os pacotes de
//    public/biblioteca/ + Autômatos + selos. Itens têm id fixo: não duplicam.

const CHAVE = 'lousa:biblioteca';
const CHAVE_VERSAO = 'lousa:biblioteca-versao';
const VERSAO_LOCAL = 'automatos-2'; // muda quando eu mexer em automatos.ts

const adaptador: LibraryPersistenceAdapter = {
  load: async () => ({ libraryItems: (await idbGet<LibraryItems>(CHAVE)) ?? [] }),
  save: ({ libraryItems }) => idbSet(CHAVE, libraryItems),
};

interface Indice {
  versao: string;
  arquivos: { arquivo: string; tema: string; itens: number }[];
}

async function semear(api: ExcalidrawImperativeAPI) {
  const indice: Indice = await fetch('/biblioteca/indice.json').then((r) => r.json());
  const versao = `${indice.versao}+${VERSAO_LOCAL}`;
  if ((await idbGet<string>(CHAVE_VERSAO)) === versao) return;

  const pacotes = await Promise.all(
    indice.arquivos.map(async ({ arquivo }) => {
      const blob = await fetch(`/biblioteca/${arquivo}`).then((r) => r.blob());
      return loadLibraryFromBlob(blob, 'published');
    }),
  );
  const todos = [...itensAutomatos(), ...itensSelos(), ...pacotes.flat()];
  // Não uso o "merge" do Excalidraw: ele compara os ids dos elementos de dentro, e os
  // Autômatos ganham ids novos a cada montagem (duplicaria). Em vez disso, troco os
  // itens que são do app (pelo id do item) e mantenho os que o Hugo salvou.
  await api.updateLibrary({
    libraryItems: (atuais: LibraryItems) => [...atuais.filter((i) => !eDoApp(i.id)), ...todos],
    merge: false,
    defaultStatus: 'published',
  });
  await idbSet(CHAVE_VERSAO, versao);
}

/** Itens montados pelo app: Autômatos, selos, logos e pacotes da comunidade ("autor/pacote:n"). */
export const eDoApp = (id: string) =>
  id.startsWith('automato:') || id.startsWith('selo:') || id.startsWith('logo:') || /^[^:]+\/[^:]+:\d+$/.test(id);

export function useBibliotecaNeural(api: ExcalidrawImperativeAPI | null) {
  useHandleLibrary({ excalidrawAPI: api, adapter: adaptador });

  useEffect(() => {
    if (!api) return;
    // Espera a tela ficar livre: o desenho abre primeiro, a biblioteca vem depois.
    const id = window.setTimeout(() => {
      semear(api).catch((e) => console.warn('Biblioteca da Lousa não carregou:', e));
    }, 1500);
    return () => window.clearTimeout(id);
  }, [api]);
}
