import type { CodeReview } from './types';

// ─── Checagem básica (sem IA) ────────────────────────────────────────────────
// Não substitui um corretor de verdade: só pega erros estruturais óbvios.
// Quando a IA está ligada, quem corrige lógica e sintaxe é o professor.

const C_LIKE = new Set(['csharp', 'c', 'java', 'javascript']);

/** Conta ( [ { ignorando o que está dentro de strings e comentários. */
function unbalanced(code: string): string | null {
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  const stack: { ch: string; line: number }[] = [];
  let line = 1;
  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    const next = code[i + 1];
    if (ch === '\n') line++;
    else if (ch === '/' && next === '/') {
      while (i < code.length && code[i] !== '\n') i++;
      line++;
    } else if (ch === '/' && next === '*') {
      i += 2;
      while (i < code.length && !(code[i] === '*' && code[i + 1] === '/')) {
        if (code[i] === '\n') line++;
        i++;
      }
      i++;
    } else if (ch === '"' || ch === "'") {
      i++;
      while (i < code.length && code[i] !== ch && code[i] !== '\n') i += code[i] === '\\' ? 2 : 1;
    } else if ('([{'.includes(ch)) stack.push({ ch, line });
    else if (pairs[ch]) {
      const top = stack.pop();
      if (!top || top.ch !== pairs[ch]) return `"${ch}" sem par na linha ${line}`;
    }
  }
  const open = stack.pop();
  return open ? `"${open.ch}" aberto na linha ${open.line} e nunca fechado` : null;
}

export function basicCheck(code: string, language: string, keywords: string[] = []): CodeReview {
  const issues: string[] = [];
  const trimmed = code.trim();

  if (!trimmed) issues.push('O código está vazio.');

  if (language === 'automato') {
    try {
      const obj = JSON.parse(code);
      for (const field of ['estados', 'alfabeto', 'inicial', 'finais', 'transicoes']) {
        if (!(field in obj)) issues.push(`Falta o campo "${field}" da definição formal.`);
      }
    } catch (e) {
      issues.push(`JSON inválido: ${e instanceof Error ? e.message : e}`);
    }
  } else if (trimmed) {
    const b = unbalanced(code);
    if (b) issues.push(`Delimitador desbalanceado: ${b}.`);
    if (C_LIKE.has(language) && !code.includes(';')) issues.push('Nenhum ";" encontrado: instruções em linguagens estilo C terminam com ponto e vírgula.');
  }

  const lower = code.toLowerCase();
  const missing = keywords.filter((k) => !lower.includes(k.toLowerCase()));
  if (missing.length) issues.push(`Não encontrei no código: ${missing.join(', ')}.`);

  const syntaxOk = issues.length === 0 || (missing.length > 0 && issues.length === 1);
  return {
    syntaxOk,
    logicOk: false, // sem IA não dá pra afirmar que a lógica está certa
    score: issues.length === 0 ? 60 : Math.max(10, 50 - issues.length * 10),
    issues,
    feedback:
      issues.length === 0
        ? 'Estrutura ok. A checagem básica NÃO confere a lógica: compare com o enunciado e se autoavalie, ou ligue a IA pra uma correção de verdade.'
        : 'Corrija os pontos acima e tente de novo.',
    source: 'basica',
  };
}
