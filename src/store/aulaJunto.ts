import type { Cena } from '../domain/cena';
import type { Id } from '../domain/types';
import { useStudy } from './study';
import { toast } from './toast';

// Aula montada junto (Hugo, 08/11/2026): o que o professor responde no chat pode entrar
// na aula ("Pôr na aula") ou nas anotações. A aula é dos dois, não só do professor.

const dataBR = () => new Date().toLocaleDateString('pt-BR');

/** A resposta do chat vira um bloco extra da aula (aparece embaixo do quadro). */
export function porNaAula(topicId: Id, extra: { de: string; texto: string; cena?: Cena; em?: string }) {
  const t = useStudy.getState().topics.find((x) => x.id === topicId);
  if (!t?.lesson) return toast({ title: 'Ainda não tem aula', description: 'Gere ou escreva a aula primeiro; depois dá pra pôr pedaços nela.' });
  const novo = { ...extra, id: `ext_${Date.now().toString(36)}`, em: extra.em ?? new Date().toISOString() };
  useStudy.getState().updateTopic(topicId, { lesson: { ...t.lesson, extras: [...(t.lesson.extras ?? []), novo] } });
  toast({ title: 'Entrou na aula', description: 'Está embaixo do quadro, em "Montado junto".', variant: 'success' });
}

export function tirarDaAula(topicId: Id, extraId: string) {
  const t = useStudy.getState().topics.find((x) => x.id === topicId);
  if (!t?.lesson) return;
  useStudy.getState().updateTopic(topicId, { lesson: { ...t.lesson, extras: (t.lesson.extras ?? []).filter((e) => e.id !== extraId) } });
}

/**
 * Acrescenta nas anotações, com a data. `citar` = o trecho vem citado (">") pra ele completar
 * com as próprias palavras: copiar não fixa, escrever do seu jeito fixa.
 */
export function guardarNasAnotacoes(topicId: Id, texto: string, citar = false) {
  const t = useStudy.getState().topics.find((x) => x.id === topicId);
  if (!t) return;
  const corpo = citar ? `${texto.trim().split('\n').map((l) => `> ${l}`).join('\n')}\nCom as minhas palavras: ` : texto.trim();
  const bloco = `${t.notes.trim() ? `${t.notes.trimEnd()}\n\n` : ''}[${dataBR()}] ${corpo}`;
  useStudy.getState().updateTopic(topicId, { notes: bloco });
  toast({ title: 'Nas suas anotações', description: citar ? 'Complete com as suas palavras: é isso que faz lembrar.' : 'Guardado no diário do tópico.', variant: 'success' });
}
