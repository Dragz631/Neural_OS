import { asString, chatJSON } from './client';
import { PROFESSOR } from './persona';

// "Explica fácil": uma ideia só, em palavras do dia a dia, com uma imagem na
// cabeça. Pensado pra hora em que a pessoa está cansada ou não curte ler.

export interface ExplicacaoFacil {
  ideia: string;
  imagem: string;
}

export async function explicarFacil(assunto: string, base: string, signal?: AbortSignal): Promise<ExplicacaoFacil> {
  return chatJSON(
    [
      { role: 'system', content: PROFESSOR },
      {
        role: 'user',
        content: `Explique "${assunto}" pra alguém cansado, que perde a atenção rápido e não gosta de ler.
${base ? `Material da pessoa (use como base, não invente fora dele):\n"""\n${base.slice(0, 1500)}\n"""\n` : ''}
Regras: 1 ideia só. Frase curta, palavra simples, sem jargão. Termine com uma imagem do dia a dia pra ela "ver" a ideia.
Formato JSON: {"ideia": "até 2 frases", "imagem": "1 frase começando com 'Pense assim:'"}`,
      },
    ],
    (raw) => {
      const r = raw as Record<string, unknown>;
      return { ideia: asString(r.ideia, 'ideia'), imagem: asString(r.imagem, 'imagem') };
    },
    signal,
    'leve',
  );
}
