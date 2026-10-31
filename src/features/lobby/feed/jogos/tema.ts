// Cada matéria dá o "clima" do minijogo: quem é o jogador, o chefe, e que símbolos aparecem
// (nos pontinhos do comilão e no confete). Tabela local, sem IA: leve e sempre disponível.

export interface TemaJogo {
  /** Nome do chefe na batalha. */
  chefe: string;
  /** O que o chefe faz de ruim quando você erra. */
  golpe: string;
  /** Símbolos do assunto (comilão e confete). Curtos: 1 a 2 letras. */
  simbolos: string[];
  /** Sprite do chefe (5 linhas, 11 colunas no máximo). */
  sprite: string[];
}

const BUG = [' \\(o_o)/ ', '  /|=|\\  ', ' (_/ \\_) ', '  bug.exe '].map((l) => l.padEnd(11));
const DIV = ['+---------+', '| <div>   |', '|    ?    |', '| </div>  |', '+---------+'];
const CARACOL = ['  _____    ', ' /  @  \\_  ', '(_______ ) ', '  ~~~~~~~  '].map((l) => l.padEnd(11));
const SIGMA = ['  ,--.     ', ' / ?? \\    ', ' \\ x̄  /    ', '  `--´     '].map((l) => l.padEnd(11));
const SQL = [' .------.  ', ' | DROP |  ', ' | TABLE|  ', " '------'  "].map((l) => l.padEnd(11));

const TEMAS: { casa: RegExp; tema: TemaJogo }[] = [
  { casa: /c#|csharp|\bc\b|c\+\+|java\b|dotnet|\.net/i, tema: { chefe: 'NullReference', golpe: 'lançou uma exceção', simbolos: ['++', '#', ';', '{}', '()'], sprite: BUG } },
  { casa: /html|css|front|web|react|layout|dom\b/i, tema: { chefe: 'A DIV Rebelde', golpe: 'saiu do alinhamento', simbolos: ['<>', '</>', '{}', '#', '.'], sprite: DIV } },
  { casa: /python|script|js|javascript|typescript/i, tema: { chefe: 'IndentationError', golpe: 'quebrou a indentação', simbolos: [':', '()', '[]', '{}', 'py'], sprite: BUG } },
  { casa: /sql|banco|dados|database/i, tema: { chefe: 'DROP TABLE', golpe: 'apagou uma tabela', simbolos: ['*', ';', 'ID', '=', 'AS'], sprite: SQL } },
  { casa: /estat|probab|média|media|desvio/i, tema: { chefe: 'Outlier', golpe: 'estragou a média', simbolos: ['x̄', 'σ', 'Σ', '%', 'μ'], sprite: SIGMA } },
  { casa: /c[áa]lc|derivad|integral|limite|[áa]lgebra|matem|fun[çc]/i, tema: { chefe: 'Divisão por Zero', golpe: 'dividiu por zero', simbolos: ['∑', '∫', 'π', '√', '='], sprite: SIGMA } },
  { casa: /lfa|aut[ôo]mato|computa|linguagens formais|grafo|algorit/i, tema: { chefe: 'Loop Infinito', golpe: 'travou num loop', simbolos: ['q0', '->', 'δ', 'Σ', 'ε'], sprite: CARACOL } },
];

const PADRAO: TemaJogo = { chefe: 'O Esquecimento', golpe: 'apagou um pedaço da memória', simbolos: ['?', '!', '*', '+', '='], sprite: BUG };

export function temaDoJogo(...textos: (string | undefined)[]): TemaJogo {
  const alvo = textos.filter(Boolean).join(' ');
  return TEMAS.find((t) => t.casa.test(alvo))?.tema ?? PADRAO;
}

/** Hash simples e estável de um texto (pra escolher o jogo do cartão sem sorteio a cada render). */
export function hashTexto(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
