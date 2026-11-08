import { useEffect, useState } from 'react';
import { AVATARES_COMUNS, lerAvatares, type Avatar } from '../domain/avatares';

// Junta os avatares comuns (do repositório) com os seus (avatares.local.txt, servido pelo PC).
// Busca uma vez por sessão; sem servidor (ou sem arquivo), ficam só os comuns.

let meus: Avatar[] | undefined;
let buscando: Promise<Avatar[]> | undefined;

function buscarMeus(): Promise<Avatar[]> {
  buscando ??= fetch('/api/avatares', { cache: 'no-store' })
    .then((r) => (r.ok ? r.text() : ''))
    .then((t) => (meus = lerAvatares(t, 'meu')))
    .catch(() => (meus = []));
  return buscando;
}

/** Todos os avatares: os seus primeiro (se tiver), depois os comuns. */
export function useAvatares(): Avatar[] {
  const [lista, setLista] = useState<Avatar[]>(() => [...(meus ?? []), ...AVATARES_COMUNS]);
  useEffect(() => {
    if (meus) return;
    let vivo = true;
    void buscarMeus().then((m) => vivo && setLista([...m, ...AVATARES_COMUNS]));
    return () => {
      vivo = false;
    };
  }, []);
  return lista;
}
