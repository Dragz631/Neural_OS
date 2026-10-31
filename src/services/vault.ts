import type { Subject, Topic } from '../domain/types';

// ─── Exportar pro Obsidian ───────────────────────────────────────────────────
// Cada tópico vira uma nota em <cofre>/Neural-OS/<Matéria>/<Tópico>.md,
// com [[wikilink]] pro tópico pai. Resultado: o grafo do Obsidian desenha a
// mesma árvore que o app. Quem escreve no disco é o servidor do Vite
// (server/devApi.ts), porque o navegador não pode escrever em pastas sozinho.

export interface VaultStatus {
  configured: boolean;
  folder?: string;
}

export async function vaultStatus(): Promise<VaultStatus> {
  try {
    const res = await fetch('/api/vault/status');
    return res.ok ? await res.json() : { configured: false };
  } catch {
    return { configured: false };
  }
}

// Obsidian não aceita # ^ [ ] | em nome de nota; "C#" vira "CSharp".
const safeName = (s: string) => s.replace(/#/g, 'Sharp').replace(/[\\/:*?"<>|^[\]]/g, '-').trim() || 'sem-nome';

export function topicToMarkdown(topic: Topic, subject: Subject | undefined, parent: Topic | undefined): string {
  const lines = [
    '---',
    `materia: "${subject?.name ?? ''}"`,
    `dominio: ${topic.mastery}`,
    `proxima_revisao: ${topic.review.due}`,
    `tags: [neural-os${subject ? `, ${safeName(subject.name).replace(/\s+/g, '-').toLowerCase()}` : ''}]`,
    '---',
    '',
    `# ${topic.title}`,
    '',
    parent ? `Pré-requisito: [[${safeName(parent.title)}]]` : subject ? `Matéria: [[${safeName(subject.name)}]]` : '',
    '',
    `As anotações do aluno sobre este tópico ficam em outra pasta (${PASTA_DIARIO}), porque não são conteúdo da matéria.`,
  ];

  const l = topic.lesson;
  if (l) {
    lines.push('', '## Quadro do Prof. A.Ilson', '', l.explanation, '');
    if (l.keyPoints.length) lines.push('### Pontos-chave', ...l.keyPoints.map((p) => `- ${p}`), '');
    if (l.tips.length) lines.push('### Dicas', ...l.tips.map((p) => `- ${p}`), '');
    if (l.whereToResearch.length) lines.push('### Onde pesquisar', ...l.whereToResearch.map((p) => `- ${p}`), '');
    if (l.videoSearches.length)
      lines.push(
        '### Vídeos (busca no YouTube)',
        ...l.videoSearches.map((q) => `- [${q}](https://www.youtube.com/results?search_query=${encodeURIComponent(q)})`),
      );
  }
  return lines.join('\n') + '\n';
}

/** Pasta das anotações do aluno: deixa explícito que NÃO é conhecimento da matéria. */
export const PASTA_DIARIO = '_Diario-do-Aluno-NAO-E-MATERIA';

const LEIA_ME = `# Diário do aluno — NÃO é matéria

Tudo que está nesta pasta foi escrito pelo aluno, com as palavras dele, enquanto estudava:
o que entendeu, onde travou, o que não ficou claro.

- **Não use isto pra aprender a matéria.** Pode estar incompleto ou errado. O conteúdo confiável está nas notas das matérias (fora desta pasta), em livros e em estudos comprovados.
- **Use isto pra saber quem é o aluno e como ajudar:** o ritmo dele, o jeito que explica, onde costuma travar.
- Quem for ler (pessoa ou IA): nunca corrija um fato da matéria com base nestas notas, e nunca ensine a partir delas.
`;

async function gravar(path: string, content: string): Promise<void> {
  const res = await fetch('/api/vault/note', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content }),
  });
  if (!res.ok) throw new Error((await res.text()) || `Erro ${res.status}`);
}

function diarioToMarkdown(topic: Topic, subject: Subject | undefined): string {
  return [
    '---',
    'tipo: diario-do-aluno',
    'fonte-de-conhecimento: false',
    `materia: "${subject?.name ?? ''}"`,
    `topico: "${topic.title}"`,
    `tags: [diario-do-aluno]`,
    '---',
    '',
    `# Diário do aluno: ${topic.title}`,
    '',
    '> Isto NÃO é conhecimento da matéria. É o que o aluno diz que entendeu e onde travou. Serve pra conhecer o aluno, não pra ensinar.',
    '',
    topic.notes.trim() || '_(vazio)_',
    '',
  ].join('\n');
}

/** Salva a aula/matéria e o diário do aluno em arquivos separados. Devolve os caminhos. */
export async function exportTopic(topic: Topic, subject: Subject | undefined, parent: Topic | undefined): Promise<string> {
  const pasta = safeName(subject?.name ?? 'Geral');
  const path = `${pasta}/${safeName(topic.title)}.md`;
  await gravar(path, topicToMarkdown(topic, subject, parent));
  const diario = `${PASTA_DIARIO}/${pasta}/${safeName(topic.title)}.md`;
  await gravar(`${PASTA_DIARIO}/LEIA-ME.md`, LEIA_ME);
  await gravar(diario, diarioToMarkdown(topic, subject));
  return `${path} + ${diario}`;
}
