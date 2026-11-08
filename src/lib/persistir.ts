import { createJSONStorage, persist as persistDoZustand } from 'zustand/middleware';
import { armazem, registrarStore } from './sincronia';

// O `persist` de todos os stores do app: igual ao do zustand, mas grava no "armazém"
// sincronizado (navegador + PC) e se registra pra recarregar quando outro aparelho mudar.
// Um store que passar `storage` próprio continua usando o dele.

/* eslint-disable @typescript-eslint/no-explicit-any -- só repassa pro persist do zustand; o tipo público é o dele */
function persistSincronizado(criar: any, opcoes: any) {
  const comArmazem = (persistDoZustand as any)(criar, { storage: createJSONStorage(() => armazem), ...opcoes });
  return (set: any, get: any, api: any) => {
    const r = comArmazem(set, get, api);
    registrarStore(opcoes.name, api);
    return r;
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export const persist = persistSincronizado as unknown as typeof persistDoZustand;
