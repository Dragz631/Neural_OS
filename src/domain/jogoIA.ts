// Jogo criado pela IA pra uma pergunta do feed: um pedaço de JavaScript que roda isolado
// (iframe sem acesso ao app). Ele só consegue desenhar texto, ouvir teclas e dizer
// "escolhi a alternativa N". Quem decide se acertou é o app.

export interface JogoIA {
  codigo: string;
  nome: string;
  geradoEm: string;
}

export const JOGO_LARGURA = 42;
export const JOGO_ALTURA = 13;
export const JOGO_CODIGO_MAX = 9000;

/** Recusa código que obviamente trava (laço sem fim) ou tenta sair do isolamento. */
export function codigoSeguro(codigo: string): string | null {
  if (codigo.length < 80) return 'código curto demais';
  if (codigo.length > JOGO_CODIGO_MAX) return 'código grande demais';
  if (/\bwhile\s*\(\s*(true|1)\s*\)|\bfor\s*\(\s*;\s*;\s*\)|\bdo\s*\{[^}]*\}\s*while\s*\(\s*(true|1)\s*\)/.test(codigo)) return 'laço sem fim';
  if (/\b(?:fetch|XMLHttpRequest|WebSocket|importScripts|eval|Function|localStorage|sessionStorage|indexedDB|postMessage)\b|document\.cookie|window\.parent|\bparent\.|\btop\.|\bimport\s*\(/.test(codigo)) return 'usa algo proibido';
  if (!/api\.escolher\s*\(/.test(codigo)) return 'o jogo nunca chama api.escolher';
  return null;
}
