// Como a pessoa aprende. Uma entrevista curta (baseada no que a neurociência
// da aprendizagem diz que muda o resultado: atenção, esforço de lembrar, erro
// sem dor, energia) vira um perfil que o professor usa pra se adaptar.
// Nada aqui é rótulo fixo: o perfil é revisto sempre que a pessoa quiser.

export interface Opcao {
  valor: string;
  texto: string;
}

export interface PerguntaEntrevista {
  id: 'atencao' | 'perde' | 'entende' | 'cansado' | 'trava' | 'erro' | 'comecar' | 'hora';
  pergunta: string;
  /** Por que o professor pergunta isso (aparece pequeno, pra pessoa saber que tem motivo). */
  porque: string;
  opcoes: Opcao[];
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
    opcoes: [
      { valor: 'celular', texto: 'Pego o celular ou abro outra coisa' },
      { valor: 'mente', texto: 'Fico lendo mas a cabeça está longe' },
      { valor: 'trava', texto: 'Travo num ponto, fico com raiva e largo' },
      { valor: 'cansaco', texto: 'Dá um cansaço e não rende mais' },
    ],
  },
  {
    id: 'entende',
    pergunta: 'Quando algo finalmente faz sentido pra você, geralmente foi como?',
    porque: 'Ver, falar e fazer ativam partes diferentes do cérebro. Eu começo pelo seu caminho mais curto e misturo os outros.',
    opcoes: [
      { valor: 'desenho', texto: 'Vi um desenho ou esquema' },
      { valor: 'falar', texto: 'Expliquei em voz alta ou ouvi alguém explicar' },
      { valor: 'fazer', texto: 'Fui lá e fiz, errei e ajustei' },
      { valor: 'ler', texto: 'Li com calma até clicar' },
    ],
  },
  {
    id: 'cansado',
    pergunta: 'Quando você está de cabeça cheia, o que ainda funciona?',
    porque: 'Cansado, o cérebro não grava aula nova, mas ainda consolida pouca coisa bem feita. Eu escolho a melhor dose pra você.',
    essencial: true,
    opcoes: [
      { valor: 'curto', texto: 'Algo bem curto, de 5 minutos' },
      { valor: 'desenho', texto: 'Só olhar um desenho, sem ler' },
      { valor: 'pergunta', texto: 'Perguntas fáceis, tipo um joguinho' },
      { valor: 'pausa', texto: 'Nada. Prefiro descansar e voltar amanhã' },
    ],
  },
  {
    id: 'trava',
    pergunta: 'Quando você trava num exercício, o que mais ajuda?',
    porque: 'Dica demais tira o esforço (que é o que fixa). Dica de menos desanima. Preciso achar o seu meio.',
    opcoes: [
      { valor: 'dica', texto: 'Uma dica pequena, pra eu continuar sozinho' },
      { valor: 'exemplo', texto: 'Ver um exemplo parecido já resolvido' },
      { valor: 'desenho', texto: 'Ver o problema desenhado' },
      { valor: 'explicar', texto: 'Explicar o que entendi até achar onde errei' },
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
    opcoes: [
      { valor: 'comecar', texto: 'Começar. Depois que começo, vai' },
      { valor: 'manter', texto: 'Manter o foco até o fim' },
      { valor: 'entender', texto: 'Entender o que está sendo pedido' },
      { valor: 'lembrar', texto: 'Lembrar depois do que estudei' },
    ],
  },
  {
    id: 'hora',
    pergunta: 'Em que parte do dia sua cabeça rende mais?',
    porque: 'Pra deixar o que é pesado nessa hora e o leve pro resto.',
    opcoes: [
      { valor: 'manha', texto: 'De manhã' },
      { valor: 'tarde', texto: 'À tarde' },
      { valor: 'noite', texto: 'À noite' },
      { valor: 'varia', texto: 'Varia muito (trabalho em horários diferentes)' },
    ],
  },
];

export type Respostas = Partial<Record<PerguntaEntrevista['id'], string>>;

export interface PerfilAprendiz {
  /** Minutos de atenção seguida. */
  bloco: number;
  perde: string;
  entende: string;
  cansado: string;
  trava: string;
  erroDoi: boolean;
  dificil: string;
  hora: string;
  respondidas: number;
  em: string;
}

/** Valores neutros pra quem ainda não fez a entrevista. */
export const PERFIL_PADRAO: PerfilAprendiz = { bloco: 10, perde: 'mente', entende: 'desenho', cansado: 'curto', trava: 'dica', erroDoi: false, dificil: 'comecar', hora: 'varia', respondidas: 0, em: '' };

export function derivarPerfil(r: Respostas, em: string): PerfilAprendiz {
  const d = PERFIL_PADRAO;
  return {
    bloco: Number(r.atencao ?? d.bloco),
    perde: r.perde ?? d.perde,
    entende: r.entende ?? d.entende,
    cansado: r.cansado ?? d.cansado,
    trava: r.trava ?? d.trava,
    erroDoi: r.erro === 'desanima',
    dificil: r.comecar ?? d.dificil,
    hora: r.hora ?? d.hora,
    respondidas: Object.keys(r).length,
    em,
  };
}

const TEXTO: Record<string, Record<string, string>> = {
  perde: { celular: 'foge pro celular quando perde o interesse', mente: 'continua lendo mas a mente sai', trava: 'trava num ponto, se irrita e larga', cansaco: 'sente cansaço e para de render' },
  entende: { desenho: 'entende melhor por desenho/esquema', falar: 'entende melhor falando em voz alta', fazer: 'entende melhor fazendo e ajustando o erro', ler: 'entende lendo com calma' },
  cansado: { curto: 'cansado, aguenta algo bem curto', desenho: 'cansado, só olhar desenho funciona', pergunta: 'cansado, perguntas fáceis em formato de joguinho funcionam', pausa: 'cansado, prefere descansar e voltar depois' },
  trava: { dica: 'travado, quer uma dica pequena', exemplo: 'travado, quer um exemplo parecido resolvido', desenho: 'travado, quer ver o problema desenhado', explicar: 'travado, precisa explicar o que entendeu pra achar o erro' },
  dificil: { comecar: 'o mais difícil é começar', manter: 'o mais difícil é manter o foco', entender: 'o mais difícil é entender o que pedem', lembrar: 'o mais difícil é lembrar depois' },
};

/** Texto que vai junto de todo pedido ao professor. Vazio se a pessoa ainda não respondeu. */
export function descreverPerfil(p: PerfilAprendiz): string {
  if (p.respondidas === 0) return '';
  const t = (campo: keyof typeof TEXTO, v: string) => TEXTO[campo][v] ?? v;
  return `Como este aluno aprende (ele mesmo respondeu numa entrevista):
- Atenção seguida: cerca de ${p.bloco} min. Corte tudo em blocos desse tamanho.
- Quando perde o interesse: ${t('perde', p.perde)}.
- ${t('entende', p.entende)}.
- ${t('cansado', p.cansado)}.
- ${t('trava', p.trava)}.
- ${p.erroDoi ? 'Errar desanima: comece sempre pelo que acertou, trate o erro como pista e nunca dê nota seca.' : 'Lida bem com erro: pode ser direto.'}
- ${t('dificil', p.dificil)}. Melhor hora: ${p.hora}.`;
}
