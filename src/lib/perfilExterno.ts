// Perfil de aprendizagem que o aluno trouxe de fora (Hugo, 08/11/2026: "o que o ChatGPT sabe
// de como eu aprendo"). Fica em `perfil-aprendizagem.local.md` na pasta do app (fora do git);
// o app lê ao abrir e o professor recebe em todo pedido, como hipótese: o que ele OBSERVA vence.

const MAX = 3500;
let texto = '';

/** Lê o arquivo (sem servidor ou sem arquivo: fica vazio). Nunca lança. */
export async function carregarPerfilExterno(): Promise<void> {
  try {
    const r = await fetch('/api/perfil-aprendizagem', { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    if (!r.ok || !(r.headers.get('Content-Type') ?? '').includes('text/plain')) return;
    texto = (await r.text()).trim().slice(0, MAX);
  } catch {
    // sem servidor (versão publicada) ou sem arquivo
  }
}

export const temPerfilExterno = () => !!texto;

export function perfilExternoParaIA(): string {
  if (!texto) return '';
  return `PERFIL DE APRENDIZAGEM QUE O ALUNO TROUXE (escrito por outra IA que conversa com ele; é sobre ele, NÃO é matéria). Use pra ajustar o JEITO de ensinar. São hipóteses: o que você observar nas aulas, provas e memórias vence; nunca entregue resposta pronta por causa dele.
"""
${texto}
"""`;
}
