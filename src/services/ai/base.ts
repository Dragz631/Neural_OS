import { lerBase, type ExplicacaoBase } from '../../domain/base';
import { aprendizParaIA } from '../../store/aprendiz';
import { chatJSON } from './client';
import { PROFESSOR } from './persona';

// "Travei numa base": o professor explica um pré-requisito (dividir, fração, regra de três...)
// em quadros desenhados, um por vez, quase sem texto. Não reescreve a aula: é um parêntese.

const EXEMPLO = `{
  "titulo": "Divisão",
  "quadros": [
    {"texto": "Dividir = repartir igual", "desenho": {"tipo": "grupos", "total": 12, "grupos": 3}},
    {"texto": "12 bolinhas, 3 grupos: 4 em cada", "desenho": {"tipo": "conta", "linhas": ["12 ÷ 3 = 4", "porque 3 × 4 = 12"]}},
    {"texto": "Na sua aula: 3 faces pares de 6", "desenho": {"tipo": "fracao", "partes": 6, "pintadas": 3, "forma": "pizza"}},
    {"texto": "3 de cada 6 = metade", "desenho": {"tipo": "conta", "linhas": ["3 ÷ 6 = 0,5", "= 50%"]}}
  ],
  "pergunta": {"texto": "Reparta 18 bolinhas em 6 grupos. Quantas em cada?", "resposta": "3"}
}`;

const GUIA_BASE = `Desenhos que você pode usar (o app desenha; você só dá os números):
- "grupos": repartir. {"tipo":"grupos","total":12,"grupos":3} = 12 bolinhas em 3 grupos (até 60 bolinhas, 12 grupos). A sobra aparece sozinha.
- "fileiras": vezes, área, potência (3² = 3 fileiras de 3). {"tipo":"fileiras","linhas":3,"colunas":4,"destaque":4} (até 12×12; "destaque" pinta as primeiras).
- "fracao": k de n. {"tipo":"fracao","partes":4,"pintadas":1,"forma":"pizza"} ou "barra" (até 24 partes). Porcentagem = barra de 10 ou pizza.
- "conta": a conta escrita grande, até 4 linhas curtas. {"tipo":"conta","linhas":["2x + 3 = 11","2x = 8","x = 4"]}
- "regra3": a está pra b assim como c está pra x. {"tipo":"regra3","a":"2 kg","b":"R$ 10","c":"5 kg","x":"?","rotulos":["peso","preço"]}
- "reta": reta numérica (negativos, somar e tirar). {"tipo":"reta","de":-5,"ate":5,"marcas":[-2,3],"salto":{"de":-2,"para":3,"rotulo":"+5"}}
Regras:
1. De 3 a 6 quadros, um passo por quadro, do mais concreto (bolinhas, pizza, dinheiro) pro símbolo.
2. "texto" com NO MÁXIMO 8 palavras. Nada de parágrafo: quem trava em conta trava também em texto longo. O desenho explica.
3. Um quadro usa os NÚMEROS DA AULA dele (quando houver aula), pra ligar a base ao que ele estava vendo.
4. Operação em palavras: ÷ = repartir, × = fileiras/vezes, + = juntar, − = tirar.
5. "pergunta": UMA conta parecida, com outros números, resposta curta (só o número ou uma palavra). Não use os mesmos números dos quadros.
6. "titulo": o nome da base em 1 a 3 palavras ("Divisão", "Fração", "Regra de três").`;

export interface PedidoBase {
  duvida: string;
  materia?: string;
  topico?: string;
  /** Um trecho da aula em que ele travou (pros números da aula). */
  trechoAula?: string;
  /** Ele já viu uma explicação e errou a pergunta: explique de OUTRO jeito. */
  errou?: { explicacao: ExplicacaoBase; respondeu: string };
}

export async function gerarBase(p: PedidoBase, signal?: AbortSignal): Promise<ExplicacaoBase> {
  const outroJeito = p.errou
    ? `\nEle já viu uma explicação desenhada assim: ${p.errou.explicacao.quadros.map((q) => `${q.texto} [${q.desenho?.tipo ?? 'texto'}]`).join(' → ')}.
Na pergunta "${p.errou.explicacao.pergunta.texto}" (certo: ${p.errou.explicacao.pergunta.resposta}) ele respondeu "${p.errou.respondeu}".
Pense no que esse erro mostra que ele entendeu errado e explique de OUTRO jeito: outro desenho, outros números, mais devagar. Não repita os mesmos quadros.`
    : '';
  return chatJSON(
    [
      {
        role: 'system',
        content: `${PROFESSOR}\n${aprendizParaIA()}\nAgora você abre um parêntese na aula: o aluno travou numa BASE (um pré-requisito). Explique só essa base, desenhando, como pra quem tem dificuldade de verdade. Sem pressa, sem julgamento, sem texto longo.`,
      },
      {
        role: 'user',
        content: `Dúvida do aluno: "${p.duvida}".
${p.topico ? `Ele estava na aula de ${p.topico}${p.materia ? ` (${p.materia})` : ''}.` : 'Ele não está numa aula agora.'}
${p.trechoAula ? `Trecho da aula (use os números daqui num quadro):\n"""\n${p.trechoAula}\n"""` : ''}${outroJeito}
${GUIA_BASE}
Exemplo do formato:
${EXEMPLO}
Responda só com o JSON nesse formato.`,
      },
    ],
    (raw) => {
      const base = lerBase(raw);
      if (!base) throw new Error('o professor não conseguiu desenhar essa base agora, tente de novo');
      return base;
    },
    signal,
  );
}
