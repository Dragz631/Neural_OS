// Como a pessoa aprende. Uma entrevista curta (baseada no que a neurociência
// da aprendizagem diz que muda o resultado: atenção, esforço de lembrar, erro
// sem dor, energia, motivação) vira um perfil que o professor usa pra se adaptar.
// Dá pra marcar MAIS DE UMA opção por pergunta: ninguém aprende de um jeito só.
// No fim sai um relatório: como o professor entendeu a pessoa e como vai ensinar.
// Nada aqui é rótulo fixo: o perfil é revisto sempre que a pessoa quiser.

export interface Opcao {
  valor: string;
  texto: string;
}

export type IdPergunta = 'atencao' | 'perde' | 'entende' | 'cansado' | 'trava' | 'erro' | 'comecar' | 'hora' | 'motiva' | 'ritmo';

export interface PerguntaEntrevista {
  id: IdPergunta;
  pergunta: string;
  /** Por que o professor pergunta isso (aparece pequeno, pra pessoa saber que tem motivo). */
  porque: string;
  opcoes: Opcao[];
  /** Pode marcar mais de uma. */
  multi?: boolean;
  /** Entra na versão curta (pra quem está sem energia). */
  essencial?: boolean;
}

export const ENTREVISTA: PerguntaEntrevista[] = [
  {
    id: 'atencao',
    pergunta: 'Quando você começa a estudar, por quanto tempo seguido a cabeça costuma ficar ali?',
    porque: 'A atenção vem em ondas. Se sei o tamanho da sua, corto a aula em blocos que cabem nela.',
    essencial: true,
    opcoes: [
      { valor: '5', texto: 'Uns 5 minutos, depois já foge' },
      { valor: '10', texto: 'Uns 10 a 15 minutos' },
      { valor: '25', texto: '25 minutos ou mais, quando engata' },
    ],
  },
  {
    id: 'perde',
    pergunta: 'Quando perde o interesse no meio, o que costuma acontecer?',
    porque: 'Cada saída pede uma resposta diferente: trocar de formato, de ritmo ou dar uma vitória rápida.',
    essencial: true,
    multi: true,
    opcoes: [
      { valor: 'celular', texto: 'Pego o celular ou abro outra coisa' },
      { valor: 'mente', texto: 'Fico lendo mas a cabeça está longe' },
      { valor: 'trava', texto: 'Travo num ponto, fico com raiva e largo' },
      { valor: 'cansaco', texto: 'Dá um cansaço e não rende mais' },
      { valor: 'tedio', texto: 'Acho repetitivo ou fácil demais e enjoo' },
    ],
  },
  {
    id: 'entende',
    pergunta: 'Quando algo finalmente faz sentido pra você, geralmente foi como?',
    porque: 'Ver, falar e fazer ativam partes diferentes do cérebro. Eu começo pelo seu caminho mais curto e misturo os outros. A ordem em que você marca importa.',
    multi: true,
    opcoes: [
      { valor: 'desenho', texto: 'Vi um desenho ou esquema' },
      { valor: 'falar', texto: 'Expliquei em voz alta ou ouvi alguém explicar' },
      { valor: 'fazer', texto: 'Fui lá e fiz, errei e ajustei' },
      { valor: 'ler', texto: 'Li com calma até clicar' },
      { valor: 'exemplo', texto: 'Vi um exemplo da vida real' },
    ],
  },
  {
    id: 'cansado',
    pergunta: 'Quando você está de cabeça cheia, o que ainda funciona?',
    porque: 'Cansado, o cérebro não grava aula nova, mas ainda consolida pouca coisa bem feita. Eu escolho a melhor dose pra você.',
    essencial: true,
    multi: true,
    opcoes: [
      { valor: 'curto', texto: 'Algo bem curto, de 5 minutos' },
      { valor: 'desenho', texto: 'Só olhar um desenho, sem ler' },
      { valor: 'pergunta', texto: 'Perguntas fáceis, tipo um joguinho' },
      { valor: 'audio', texto: 'Só ouvir alguém explicar' },
      { valor: 'pausa', texto: 'Nada. Prefiro descansar e voltar amanhã' },
    ],
  },
  {
    id: 'trava',
    pergunta: 'Quando você trava num exercício, o que mais ajuda?',
    porque: 'Dica demais tira o esforço (que é o que fixa). Dica de menos desanima. Preciso achar o seu meio.',
    multi: true,
    opcoes: [
      { valor: 'dica', texto: 'Uma dica pequena, pra eu continuar sozinho' },
      { valor: 'exemplo', texto: 'Ver um exemplo parecido já resolvido' },
      { valor: 'desenho', texto: 'Ver o problema desenhado' },
      { valor: 'explicar', texto: 'Explicar o que entendi até achar onde errei' },
      { valor: 'pausa', texto: 'Dar um tempo e voltar depois' },
    ],
  },
  {
    id: 'erro',
    pergunta: 'Como você se sente quando erra uma resposta?',
    porque: 'Errar tentando lembrar ensina mais do que acertar de primeira. Mas só se errar não doer.',
    opcoes: [
      { valor: 'normal', texto: 'Tranquilo, faz parte' },
      { valor: 'incomoda', texto: 'Incomoda, mas eu sigo' },
      { valor: 'desanima', texto: 'Desanima, dá vontade de parar' },
    ],
  },
  {
    id: 'comecar',
    pergunta: 'O mais difícil pra você é…',
    porque: 'Se o difícil é começar, o primeiro passo tem que ser ridículo de pequeno.',
    essencial: true,
    multi: true,
    opcoes: [
      { valor: 'comecar', texto: 'Começar. Depois que começo, vai' },
      { valor: 'manter', texto: 'Manter o foco até o fim' },
      { valor: 'entender', texto: 'Entender o que está sendo pedido' },
      { valor: 'lembrar', texto: 'Lembrar depois do que estudei' },
    ],
  },
  {
    id: 'motiva',
    pergunta: 'O que te faz querer continuar estudando?',
    porque: 'Motivação não é força de vontade: é ver progresso, ter um motivo ou sentir curiosidade. Eu uso a sua.',
    multi: true,
    opcoes: [
      { valor: 'progresso', texto: 'Ver que estou avançando (barra, nível, o que já dominei)' },
      { valor: 'desafio', texto: 'Um desafio na medida certa' },
      { valor: 'prazo', texto: 'Prova ou prazo chegando' },
      { valor: 'curiosidade', texto: 'Curiosidade pelo assunto' },
      { valor: 'uso', texto: 'Saber pra que vou usar isso' },
    ],
  },
  {
    id: 'ritmo',
    pergunta: 'Como você prefere que o professor explique?',
    porque: 'Um texto longo cansa quem quer o ponto, e um texto seco confunde quem quer entender o porquê.',
    multi: true,
    opcoes: [
      { valor: 'direto', texto: 'Direto ao ponto, sem enrolar' },
      { valor: 'exemplos', texto: 'Com muitos exemplos' },
      { valor: 'passo', texto: 'Passo a passo, devagar' },
      { valor: 'porque', texto: 'Explicando o porquê das coisas' },
      { valor: 'analogia', texto: 'Com comparações do dia a dia' },
    ],
  },
  {
    id: 'hora',
    pergunta: 'Em que parte do dia sua cabeça rende mais?',
    porque: 'Pra deixar o que é pesado nessa hora e o leve pro resto.',
    multi: true,
    opcoes: [
      { valor: 'manha', texto: 'De manhã' },
      { valor: 'tarde', texto: 'À tarde' },
      { valor: 'noite', texto: 'À noite' },
      { valor: 'varia', texto: 'Varia muito (trabalho em horários diferentes)' },
    ],
  },
];

/** Cada pergunta guarda uma LISTA de valores, na ordem em que a pessoa marcou. */
export type Respostas = Partial<Record<IdPergunta, string[]>>;

/** Aceita o formato antigo (um texto por pergunta) e o novo (lista). */
export function normalizarRespostas(bruto: unknown): Respostas {
  const out: Respostas = {};
  if (!bruto || typeof bruto !== 'object') return out;
  for (const p of ENTREVISTA) {
    const v = (bruto as Record<string, unknown>)[p.id];
    const lista = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : typeof v === 'string' ? [v] : [];
    if (lista.length) out[p.id] = lista;
  }
  return out;
}

export interface PerfilAprendiz {
  /** Minutos de atenção seguida. */
  bloco: number;
  perde: string[];
  entende: string[];
  cansado: string[];
  trava: string[];
  erroDoi: boolean;
  dificil: string[];
  hora: string[];
  motiva: string[];
  ritmo: string[];
  /** Texto livre que a pessoa deixou no fim da entrevista. */
  livre: string;
  respondidas: number;
  em: string;
}

/** Valores neutros pra quem ainda não fez a entrevista. */
export const PERFIL_PADRAO: PerfilAprendiz = { bloco: 10, perde: ['mente'], entende: ['desenho'], cansado: ['curto'], trava: ['dica'], erroDoi: false, dificil: ['comecar'], hora: ['varia'], motiva: [], ritmo: [], livre: '', respondidas: 0, em: '' };

export function derivarPerfil(r: Respostas, em: string, livre = ''): PerfilAprendiz {
  const d = PERFIL_PADRAO;
  const lista = (id: IdPergunta, padrao: string[]) => (r[id]?.length ? r[id]! : padrao);
  return {
    bloco: Number(r.atencao?.[0] ?? d.bloco),
    perde: lista('perde', d.perde),
    entende: lista('entende', d.entende),
    cansado: lista('cansado', d.cansado),
    trava: lista('trava', d.trava),
    erroDoi: !!r.erro?.includes('desanima'),
    dificil: lista('comecar', d.dificil),
    hora: lista('hora', d.hora),
    motiva: r.motiva ?? [],
    ritmo: r.ritmo ?? [],
    livre: livre.trim(),
    respondidas: ENTREVISTA.filter((p) => r[p.id]?.length).length + (livre.trim() ? 1 : 0),
    em,
  };
}

// ─── O relatório: como o professor entendeu a pessoa e como vai ensinar ───

const COMO_ENTENDI: Record<string, Record<string, string>> = {
  perde: {
    celular: 'foge pro celular quando perde o interesse',
    mente: 'continua lendo mas a mente sai',
    trava: 'trava num ponto, se irrita e larga',
    cansaco: 'sente cansaço e para de render',
    tedio: 'enjoa quando acha repetitivo ou fácil demais',
  },
  entende: { desenho: 'desenho/esquema', falar: 'falar em voz alta ou ouvir explicação', fazer: 'fazer, errar e ajustar', ler: 'ler com calma', exemplo: 'exemplos da vida real' },
  cansado: { curto: 'algo bem curto', desenho: 'só olhar um desenho', pergunta: 'perguntas fáceis em formato de joguinho', audio: 'só ouvir a explicação', pausa: 'descansar e voltar depois' },
  trava: { dica: 'uma dica pequena', exemplo: 'um exemplo parecido resolvido', desenho: 'ver o problema desenhado', explicar: 'explicar o que entendeu até achar o erro', pausa: 'dar um tempo e voltar' },
  dificil: { comecar: 'começar', manter: 'manter o foco', entender: 'entender o que pedem', lembrar: 'lembrar depois' },
  motiva: { progresso: 'ver o próprio progresso', desafio: 'um desafio na medida certa', prazo: 'prazo e prova chegando', curiosidade: 'curiosidade pelo assunto', uso: 'saber pra que vai usar' },
  ritmo: { direto: 'direto ao ponto', exemplos: 'muitos exemplos', passo: 'passo a passo, devagar', porque: 'o porquê das coisas', analogia: 'comparações do dia a dia' },
  hora: { manha: 'de manhã', tarde: 'à tarde', noite: 'à noite', varia: 'varia muito' },
};

const nomear = (campo: keyof typeof COMO_ENTENDI, valores: string[]) => valores.map((v) => COMO_ENTENDI[campo][v] ?? v);

/** "a, b e c" */
function juntar(itens: string[]): string {
  if (itens.length <= 1) return itens.join('');
  return `${itens.slice(0, -1).join(', ')} e ${itens[itens.length - 1]}`;
}

export interface Relatorio {
  /** Como o professor entendeu você. */
  comoEntendi: string[];
  /** O que ele vai fazer diferente por causa disso. */
  comoVouEnsinar: string[];
  /** O que fazer já na primeira vez. */
  primeiroPasso: string;
  /** Partes que ficaram em branco (a pessoa pulou). */
  faltou: string[];
}

export function gerarRelatorio(perfil: PerfilAprendiz, r: Respostas): Relatorio {
  const tem = (id: IdPergunta) => !!r[id]?.length;
  // Pergunta que a pessoa não respondeu NÃO vira conclusão (o perfil tem valores neutros de partida).
  const p: PerfilAprendiz = {
    ...perfil,
    perde: tem('perde') ? perfil.perde : [],
    entende: tem('entende') ? perfil.entende : [],
    cansado: tem('cansado') ? perfil.cansado : [],
    trava: tem('trava') ? perfil.trava : [],
    dificil: tem('comecar') ? perfil.dificil : [],
    hora: tem('hora') ? perfil.hora : [],
  };
  const comoEntendi: string[] = [];
  if (tem('atencao')) comoEntendi.push(`Sua atenção seguida é de uns ${p.bloco} minutos.`);
  if (tem('perde')) comoEntendi.push(`Quando perde o interesse, você ${juntar(nomear('perde', p.perde))}.`);
  if (tem('entende')) comoEntendi.push(`Você entende melhor por ${juntar(nomear('entende', p.entende))}${p.entende.length > 1 ? ` (começo pelo primeiro)` : ''}.`);
  if (tem('cansado')) comoEntendi.push(`De cabeça cheia, ainda funciona: ${juntar(nomear('cansado', p.cansado))}.`);
  if (tem('trava')) comoEntendi.push(`Quando trava, ajuda: ${juntar(nomear('trava', p.trava))}.`);
  if (tem('erro')) comoEntendi.push(p.erroDoi ? 'Errar desanima você, então vou tratar o erro como pista.' : 'Você lida bem com erro, então posso ser direto.');
  if (tem('comecar')) comoEntendi.push(`O mais difícil pra você é ${juntar(nomear('dificil', p.dificil))}.`);
  if (tem('motiva')) comoEntendi.push(`O que te move: ${juntar(nomear('motiva', p.motiva))}.`);
  if (tem('ritmo')) comoEntendi.push(`Você prefere explicação ${juntar(nomear('ritmo', p.ritmo))}.`);
  if (tem('hora')) comoEntendi.push(`Sua cabeça rende mais ${juntar(nomear('hora', p.hora))}.`);
  if (p.livre) comoEntendi.push(`Você me contou: "${p.livre}".`);

  const e = (v: string) => p.entende.includes(v);
  const vou: string[] = [`Corto cada aula e cada revisão em blocos de uns ${p.bloco} minutos.`];
  if (e('desenho')) vou.push(`Começo pelo quadro negro: desenho primeiro, texto depois${e('fazer') ? ', e logo em seguida você pratica' : ''}.`);
  if (e('falar')) vou.push('Peço pra você explicar em voz alta (o microfone fica à mão) e corrijo o que escapar.');
  if (e('fazer')) vou.push('Dou um desafio curto antes da teoria longa: você erra, eu mostro onde, e você ajusta.');
  if (e('ler')) vou.push('Textos curtos, com o essencial destacado, sem textão.');
  if (e('exemplo')) vou.push('Todo conceito vem com um exemplo do dia a dia antes da definição.');
  if (p.perde.includes('celular')) vou.push('Dou vitórias pequenas e rápidas no meio do bloco pra segurar a atenção.');
  if (p.perde.includes('mente')) vou.push('Em vez de só mostrar, faço uma pergunta a cada trecho, pra você não ler no piloto automático.');
  if (p.perde.includes('trava')) vou.push('Dicas em degraus: nunca te deixo travado sozinho por muito tempo.');
  if (p.perde.includes('cansaco')) vou.push('Planejo pausa curta no meio, antes de o cansaço chegar.');
  if (p.perde.includes('tedio')) vou.push('Mudo o ponto de vista dos exercícios a cada vez, pra não ficar repetitivo.');
  if (p.cansado.includes('pausa') && p.cansado.length === 1) vou.push('Quando você chegar cansado, em vez de forçar eu guardo a matéria como prioridade pro dia seguinte.');
  else {
    const q: string[] = [];
    if (p.cansado.includes('curto')) q.push('uma revisão relâmpago de 5 minutos');
    if (p.cansado.includes('desenho')) q.push('só o desenho, sem leitura');
    if (p.cansado.includes('pergunta')) q.push('perguntas fáceis em formato de joguinho');
    if (p.cansado.includes('audio')) q.push('uma explicação curta pra ouvir');
    if (q.length) vou.push(`Quando você estiver cansado, ofereço ${juntar(q)}${p.cansado.includes('pausa') ? ', ou deixo pra amanhã se preferir' : ''}.`);
  }
  if (p.erroDoi) vou.push('Começo sempre pelo que você acertou e trato o erro como pista, nunca como nota seca.');
  if (p.dificil.includes('comecar')) vou.push('O primeiro passo de cada sessão é ridículo de pequeno, só pra você começar.');
  if (p.dificil.includes('manter')) vou.push('Divido em metas pequenas e mostro quanto já foi, pra o fim ficar à vista.');
  if (p.dificil.includes('entender')) vou.push('Reescrevo o que está sendo pedido com palavras simples antes de você tentar.');
  if (p.dificil.includes('lembrar')) vou.push('Faço você lembrar sem olhar, em intervalos crescentes: é isso que fixa.');
  if (p.motiva.includes('progresso')) vou.push('Mostro sempre o que você já dominou e o que falta.');
  if (p.motiva.includes('uso')) vou.push('Digo pra que cada coisa serve antes de ensinar.');
  if (p.motiva.includes('prazo')) vou.push('Priorizo o que tem prova ou entrega chegando.');
  if (p.ritmo.includes('direto')) vou.push('Respostas diretas, sem enrolação.');
  if (p.ritmo.includes('passo')) vou.push('Explico passo a passo, esperando você acompanhar.');
  if (p.ritmo.includes('porque')) vou.push('Explico o porquê, não só o como.');
  if (p.ritmo.includes('analogia')) vou.push('Uso comparações do dia a dia.');

  const primeiroPasso = p.dificil.includes('comecar')
    ? `Hoje, só um bloco de ${Math.min(p.bloco, 10)} minutos: abra um tópico e faça a primeira coisa, que eu deixo pequena.`
    : `Escolha um tópico e faça uma revisão de ${p.bloco <= 5 ? 'relâmpago (5 min)' : 'pós-aula (15 min)'}. Eu conduzo.`;

  const faltou = ENTREVISTA.filter((q) => !tem(q.id)).map((q) => q.pergunta);
  return { comoEntendi, comoVouEnsinar: vou, primeiroPasso, faltou };
}

/** Texto que vai junto de todo pedido ao professor. Vazio se a pessoa ainda não respondeu. */
export function descreverPerfil(p: PerfilAprendiz, r: Respostas): string {
  if (p.respondidas === 0) return '';
  const rel = gerarRelatorio(p, r);
  return `Como este aluno aprende (ele mesmo respondeu numa entrevista; ele pode ter marcado mais de uma opção por pergunta, a primeira é a mais forte):
${rel.comoEntendi.map((l) => `- ${l}`).join('\n')}
Como você deve ensiná-lo:
${rel.comoVouEnsinar.map((l) => `- ${l.replace(/^Eu /, '')}`).join('\n')}`;
}
