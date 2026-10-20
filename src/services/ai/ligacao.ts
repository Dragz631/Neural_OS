import { asString, chatJSON } from './client';
import { PROFESSOR } from './persona';

// Ligação do dia: 1–2 frases mostrando como dois tópicos de matérias
// diferentes conversam, com um exemplo concreto.

export interface PontaDaLigacao {
  topico: string;
  materia: string;
}

export async function gerarLigacao(a: PontaDaLigacao, b: PontaDaLigacao, signal?: AbortSignal): Promise<string> {
  return chatJSON(
    [
      { role: 'system', content: PROFESSOR },
      {
        role: 'user',
        content: `Ligue os dois tópicos que o aluno já estudou:
- "${a.topico}" (${a.materia})
- "${b.topico}" (${b.materia})
Em 1 ou 2 frases curtas: como um aparece no outro ou ajuda a entender o outro, com um exemplo concreto do dia a dia de um dev. Sem enrolação, em português.
Formato JSON: {"ligacao": "..."}`,
      },
    ],
    (raw) => asString((raw as Record<string, unknown>).ligacao, 'ligacao'),
    signal,
    'leve',
  );
}
