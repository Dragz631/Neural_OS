// "2/4" sozinho numa caixa não explica nada pra quem tem dificuldade com matemática
// (Hugo, 08/11/2026). O professor é instruído a mostrar de onde vem cada número, mas
// isto é a garantia: fração solta no quadro vira fala ("2 de cada 4 = metade, 50%").

const NOMES: Record<string, string> = {
  '1/2': 'metade',
  '1/3': 'um terço',
  '2/3': 'dois terços',
  '1/4': 'um quarto',
  '3/4': 'três quartos',
  '1/5': 'um quinto',
  '1/6': 'um sexto',
  '1/8': 'um oitavo',
  '1/10': 'um décimo',
  '1/1': 'tudo, sempre',
  '0/1': 'nada, nunca',
};

const mdc = (a: number, b: number): number => (b === 0 ? a : mdc(b, a % b));

/** Uma fração a/b em palavras: "2 de cada 4 = metade (50%)". */
export function fracaoFalada(a: number, b: number): string {
  if (b === 0) return `${a}/${b}`;
  const d = mdc(a, b) || 1;
  const simples = `${a / d}/${b / d}`;
  const pct = Math.round((a / b) * 1000) / 10;
  const nome = NOMES[simples] ?? (simples !== `${a}/${b}` ? `o mesmo que ${simples}` : '');
  const pctTxt = `${String(pct).replace('.', ',')}%`;
  return `${a} de cada ${b}${nome ? ` = ${nome}` : ''} (${pctTxt})`;
}

const SO_FRACAO = /^\s*(\d{1,4})\s*\/\s*(\d{1,4})\s*$/;
const FIM_FRACAO = /^(.{1,60}?)=\s*(\d{1,4})\s*\/\s*(\d{1,4})\s*$/;

/**
 * Se o texto for SÓ uma fração ("2/4") ou terminar numa ("P(par) = 3/6"), acrescenta a
 * fala. Código, fórmulas com letras e textos que já explicam ficam como estão.
 */
export function explicarNumero(texto: string): string {
  const so = SO_FRACAO.exec(texto);
  if (so) return `${so[1]}/${so[2]} = ${fracaoFalada(Number(so[1]), Number(so[2]))}`;
  const fim = FIM_FRACAO.exec(texto);
  if (fim && !/de cada|metade|%/.test(texto)) return `${texto.trim()} → ${fracaoFalada(Number(fim[2]), Number(fim[3]))}`;
  return texto;
}

/** A chance escrita num galho ("1/2") pede uma legenda: o que esse número quer dizer. */
export function legendaDeChance(chance: string): string | undefined {
  const so = SO_FRACAO.exec(chance);
  if (!so) return undefined;
  return `O número no galho é a chance: ${so[1]}/${so[2]} = ${fracaoFalada(Number(so[1]), Number(so[2]))} das vezes. Pra seguir um caminho inteiro, multiplica os galhos.`;
}
