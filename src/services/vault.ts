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
    '## Minhas anotações',
    '',
    topic.notes.trim() || '_(vazio)_',
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

export async function exportTopic(topic: Topic, subject: Subject | undefined, parent: Topic | undefined): Promise<string> {
  const path = `${safeName(subject?.name ?? 'Geral')}/${safeName(topic.title)}.md`;
  const res = await fetch('/api/vault/note', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, content: topicToMarkdown(topic, subject, parent) }),
  });
  if (!res.ok) throw new Error((await res.text()) || `Erro ${res.status}`);
  return path;
}
