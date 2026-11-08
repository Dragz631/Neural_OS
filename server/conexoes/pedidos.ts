// Pedidos de IA retomáveis (pensado pro celular, 08/11/2026).
// O iPhone congela a aba quando você troca de app e a conexão cai no meio da aula.
// Por isso o servidor NÃO para o modelo só porque a conexão caiu: ele termina,
// guarda a resposta por 10 min e o app busca quando volta (/ai/motor/resultado?id=).
// Parar de verdade só com cancelamento explícito: botão Cancelar, ou fechar/recarregar a página.

const GUARDA_MS = 10 * 60 * 1000;
const MAX_PEDIDOS = 200;

interface Pedido<T> {
  promessa: Promise<T>;
  controle: AbortController;
}

const pedidos = new Map<string, Pedido<unknown>>();

/** Id que o navegador manda (x-pedido): só letras, números e hífen, pra não virar lixo no mapa. */
export const idValido = (id: unknown): id is string => typeof id === 'string' && /^[A-Za-z0-9-]{8,64}$/.test(id);

/** Começa (ou reaproveita, se o app repetiu o mesmo id) um pedido que sobrevive à conexão cair. */
export function iniciarPedido<T>(id: string, fazer: (signal: AbortSignal) => Promise<T>): Promise<T> {
  const ja = pedidos.get(id) as Pedido<T> | undefined;
  if (ja) return ja.promessa;
  if (pedidos.size >= MAX_PEDIDOS) pedidos.delete(pedidos.keys().next().value!);
  const controle = new AbortController();
  const promessa = fazer(controle.signal);
  pedidos.set(id, { promessa, controle });
  // Depois de pronto (ou com erro), fica guardado um tempo pro app buscar; aí some.
  void promessa.then(
    () => setTimeout(() => pedidos.delete(id), GUARDA_MS),
    () => setTimeout(() => pedidos.delete(id), GUARDA_MS),
  );
  return promessa;
}

/** O resultado de um pedido já começado (undefined = o servidor não conhece esse id). */
export function resultadoDoPedido<T>(id: string): Promise<T> | undefined {
  return (pedidos.get(id) as Pedido<T> | undefined)?.promessa;
}

/** Cancelamento de verdade: para o modelo (NVIDIA) ou encerra o processo do Claude. */
export function cancelarPedido(id: string): boolean {
  const p = pedidos.get(id);
  if (!p) return false;
  p.controle.abort();
  pedidos.delete(id);
  return true;
}
