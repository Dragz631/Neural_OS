import { lerCena, semGraficoFora, type Cena } from '../../domain/cena';
import type { Lesson } from '../../domain/types';
import { aprendizParaIA } from '../../store/aprendiz';
import { chatJSON } from './client';
import { PROFESSOR } from './persona';
import type { TopicContext } from './professor';

// O professor escolhe COMO desenhar a aula no quadro. Ele não dá coordenada:
// dá os blocos, as ligações e uma linha/coluna numa grade pequena.

const EXEMPLO = `{
  "estilo": "estados",
  "porque": "a variável muda de valor com o tempo, e isso só se entende vendo o antes e o depois",
  "elementos": [
    {"id":"a","tipo":"estado","texto":"x = 2","papel":"entrada","linha":0,"coluna":0},
    {"id":"b","tipo":"estado","texto":"x = 5","papel":"passo","linha":0,"coluna":1},
    {"id":"c","tipo":"estado-final","texto":"x = 10","papel":"resultado","linha":0,"coluna":2},
    {"id":"d","tipo":"nota","texto":"A caixa é a mesma, o valor dentro mudou","papel":"dica","linha":1,"coluna":1}
  ],
  "ligacoes": [
    {"de":"a","para":"b","rotulo":"x = x + 3"},
    {"de":"b","para":"c","rotulo":"x = x * 2"}
  ],
  "anotacoes": [{"texto":"repare: o nome não muda","em":"a"}]
}`;

/** Como o professor desenha: tipos, diagramas e regras. Usado na aula e no chat. */
export const GUIA_DESENHO = `Todo texto do desenho em português do Brasil ("Início", "Fim", "acabou a lista?"); só código e nomes técnicos ficam como são (range(5), print).
Escolha o MELHOR jeito de desenhar ISTO (não force um modelo fixo):
- fluxo: decisão e passos de um algoritmo (losangos pra "se", caixas pros passos).
- estados: algo que muda com o tempo (variável na memória, autômato, objeto). Use "estado" e "estado-final", e escreva o valor ou a regra nas ligações.
- passos: resolução passo a passo (matemática, fatoração, conta): cada passo numa caixa, "formula" pras contas, "destaque" ou papel "resultado" pra resposta.
- comparar: duas ou mais ideias lado a lado (uma coluna por ideia, as linhas dizem a mesma coisa em cada uma).
- mapa: um conceito no centro e partes em volta.
- camadas: coisas empilhadas ou que dependem uma da outra (de baixo pra cima).
- linha-do-tempo: o que veio antes e depois.
- livre: combine o que precisar.
Você também tem DIAGRAMAS prontos (um elemento cada; servem pra QUALQUER matéria, não só matemática). Use quando o assunto tem essa forma:
- "arvore": algo que se ramifica. Probabilidade em etapas (moeda, bebê menino/menina), hierarquia (classes e herança, taxonomia, órgãos de um sistema, partículas do átomo), classificação, árvore de decisão, cadeia de causas. Cada galho pode ter "chance" (o texto escrito no galho: "1/2", "sim", "herda").
  {"id":"a","tipo":"arvore","texto":"Dois filhos: as chances","papel":"conceito","arvore":{"raiz":"👶 1º filho","filhos":[{"texto":"Menino","chance":"1/2","filhos":[{"texto":"MM","chance":"1/2"},{"texto":"MF","chance":"1/2"}]},{"texto":"Menina","chance":"1/2","filhos":[{"texto":"FM","chance":"1/2"},{"texto":"FF","chance":"1/2"}]}]}}
  Até 4 níveis e 24 nós.
- "conjuntos": o que é comum e o que é só de um (Venn, 2 ou 3 círculos). Você só diz os itens de cada conjunto; o desenho calcula a interseção sozinho.
  {"id":"v","tipo":"conjuntos","texto":"Par ou maior que 3?","conjuntos":{"universo":"Ω = faces do 🎲","conjuntos":[{"nome":"A: par","itens":["2","4","6"]},{"nome":"B: maior que 3","itens":["4","5","6"]}],"fora":["1","3"]}}
- "grade": quadradinhos em linhas e colunas. Espaço amostral (dois dados = 6×6), matriz, tabuleiro, tabela verdade pequena. "destaque" = células [linha, coluna] (base 0) que fazem parte do evento.
  {"id":"q","tipo":"grade","texto":"Soma 7 com dois dados","grade":{"linhas":6,"colunas":6,"rotulosLinhas":["1","2","3","4","5","6"],"rotulosColunas":["1","2","3","4","5","6"],"destaque":[[0,5],[1,4],[2,3],[3,2],[4,1],[5,0]]}}
  Até 10×10. "celulas" (texto em cada quadrado, curto) é opcional.
- "tabela": comparar coisas em linhas e colunas (tipos de dado, tempos verbais, prós e contras, fórmulas lado a lado).
  {"id":"t","tipo":"tabela","texto":"Lista × Tupla","tabela":{"cabecalho":["","Lista","Tupla"],"linhas":[["Muda?","sim","não"],["Sintaxe","[1, 2]","(1, 2)"]]}}
  Até 6 colunas e 8 linhas, células curtas.
Um diagrama sozinho já pode ser a cena inteira; junte caixas, notas e setas em volta quando ajudar.
MATEMÁTICA PRA QUEM TEM DIFICULDADE (vale pra toda conta, em qualquer matéria):
- NUNCA um número ou fração solta numa caixa ("2/4" sozinho não explica nada). Todo número mostra DE ONDE veio.
- Conta = passos com o PORQUÊ em palavras, um por caixa: "1. Conte tudo que pode sair: 4" → "2. Conte o que você quer: 2" → "3. Reparta: 2 ÷ 4" → "4. = metade (50%)". Diga a operação em português: ÷ = repartir, × = "e depois" / vezes, + = juntar, − = tirar.
- Fração SEMPRE com desenho contando: k de n = "grade" de 1 linha × n colunas com k quadradinhos destacados (ou o espaço amostral inteiro, como os 36 dos dois dados). Escreva também "k de cada n" e a porcentagem.
- Símbolo novo vira palavra na primeira vez: "P(A) = chance de A", "Ω = tudo que pode acontecer".
- Na árvore, diga o que o número no galho significa ("1/2 = metade das vezes") e mostre que pra seguir o caminho inteiro multiplica.
- Prefira números pequenos e um exemplo concreto (dado, moeda, pizza, dinheiro) antes da fórmula.
Regras:
1. De 1 a 10 elementos, textos CURTOS (até 8 palavras). Quem tem dificuldade de ler precisa entender pelo desenho. Uma ideia = um desenho; nunca um parágrafo no quadro (caixa com mais de 12 palavras é cortada e o texto vai pra uma nota embaixo, fora do desenho).
   Emoji pode ancorar uma ideia (👶 🎲 💧 ⚛️), com moderação.
2. "tipo": caixa | losango | estado | estado-final | nota | texto | formula | destaque | grafico | arvore | conjuntos | grade | tabela.
   "grafico" é um plano cartesiano estilo Desmos. SÓ use quando a própria aula trabalha com uma função, uma equação ou pontos num plano (função, reta, parábola, geometria analítica, estatística com eixos, física com gráfico). NUNCA use em programação, paradigmas, conceitos, história, línguas, definições: nesses casos desenhe fluxo, mapa, camadas ou comparação. Em dúvida, NÃO use gráfico.
   Quando usar: cada função tem que aparecer escrita na aula (não invente curvas pra enfeitar), no máximo 2 funções por gráfico, e um gráfico por ideia (se há duas ideias, são dois gráficos). Formato do elemento:
   {"id":"g","tipo":"grafico","texto":"Parábola e suas raízes","papel":"conceito","linha":0,"coluna":0,
    "grafico":{"xmin":-5,"xmax":5,"ymin":-6,"ymax":10,
      "funcoes":[{"expr":"x^2 - 4","rotulo":"y = x² − 4","papel":"conceito"},{"expr":"2x","papel":"exemplo","tracejada":true}],
      "pontos":[{"x":-2,"y":0,"rotulo":"raiz"},{"x":2,"y":0,"rotulo":"raiz"}]}}
   "expr" aceita: + - * / ^ ( ), x, pi, e, sin cos tan sqrt abs ln log exp, multiplicação implícita (2x, 3(x+1)) e "x = 3" pra reta vertical. SÓ a variável x (nada de a, b, k: troque por números). "ymin"/"ymax" são opcionais (se faltarem, a janela se ajusta). Até 2 funções e 8 pontos por gráfico. Pode misturar gráfico com caixas, fórmulas e notas na mesma cena.
3. "papel" decide a cor: conceito | exemplo | erro | dica | resultado | passo | entrada | saida | neutro. Use "erro" pro erro comum, "dica" pro truque, "resultado" pra resposta final.
4. "linha" e "coluna" são números de 0 a 4 numa grade. Elementos em sequência vertical ficam na mesma coluna; lado a lado, na mesma linha.
5. "ligacoes": setas de um id pra outro. "rotulo" diz o que acontece na seta (opcional). "estilo": "tracejada" quando é só relação.
6. "anotacoes": até 3 comentários curtos de professor ao lado de um elemento ("repare nisso").
7. Use só o que a aula diz. Não invente fatos.
8. "porque": UMA frase dizendo por que você escolheu desenhar assim.`;

export async function gerarCena(ctx: TopicContext, aula: Pick<Lesson, 'explanation' | 'keyPoints'>, signal?: AbortSignal): Promise<Cena> {
  const { topic, subject } = ctx;
  return chatJSON(
    [
      {
        role: 'system',
        content: `${PROFESSOR}\n${aprendizParaIA()}\nAgora você desenha no quadro negro. Pense como um professor que desenha: o desenho tem que mostrar o que a explicação só diz. Escolha o diagrama que deixa o abstrato VISÍVEL pra este assunto, seja ele qual for.`,
      },
      {
        role: 'user',
        content: `Matéria: ${subject?.name ?? 'não informada'}. Tópico: ${topic.title}.
Aula que você acabou de escrever:
"""
${aula.explanation}
Pontos-chave: ${aula.keyPoints.join('; ')}
"""
${GUIA_DESENHO}
Exemplo do formato (de outro assunto):
${EXEMPLO}
Responda só com o JSON no mesmo formato.`,
      },
    ],
    (raw) => {
      const cena = lerCena(raw);
      if (!cena) throw new Error('o professor não conseguiu montar um desenho');
      return semGraficoFora(cena, `${topic.title} ${subject?.name ?? ''} ${aula.explanation}`);
    },
    signal,
  );
}
