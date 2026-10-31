import { lerCena, type Cena } from '../../domain/cena';
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

export async function gerarCena(ctx: TopicContext, aula: Pick<Lesson, 'explanation' | 'keyPoints'>, signal?: AbortSignal): Promise<Cena> {
  const { topic, subject } = ctx;
  return chatJSON(
    [
      {
        role: 'system',
        content: `${PROFESSOR}\n${aprendizParaIA()}\nAgora você desenha no quadro negro. Pense como um professor que desenha: o desenho tem que mostrar o que a explicação só diz.`,
      },
      {
        role: 'user',
        content: `Matéria: ${subject?.name ?? 'não informada'}. Tópico: ${topic.title}.
Aula que você acabou de escrever:
"""
${aula.explanation}
Pontos-chave: ${aula.keyPoints.join('; ')}
"""
Escolha o MELHOR jeito de desenhar ISTO (não force um modelo fixo):
- fluxo: decisão e passos de um algoritmo (losangos pra "se", caixas pros passos).
- estados: algo que muda com o tempo (variável na memória, autômato, objeto). Use "estado" e "estado-final", e escreva o valor ou a regra nas ligações.
- passos: resolução passo a passo (matemática, fatoração, conta): cada passo numa caixa, "formula" pras contas, "destaque" ou papel "resultado" pra resposta.
- comparar: duas ou mais ideias lado a lado (uma coluna por ideia, as linhas dizem a mesma coisa em cada uma).
- mapa: um conceito no centro e partes em volta.
- camadas: coisas empilhadas ou que dependem uma da outra (de baixo pra cima).
- linha-do-tempo: o que veio antes e depois.
- livre: combine o que precisar.
Regras:
1. De 4 a 10 elementos, textos CURTOS (até 8 palavras). Quem tem dificuldade de ler precisa entender pelo desenho.
2. "tipo": caixa | losango | estado | estado-final | nota | texto | formula | destaque.
3. "papel" decide a cor: conceito | exemplo | erro | dica | resultado | passo | entrada | saida | neutro. Use "erro" pro erro comum, "dica" pro truque, "resultado" pra resposta final.
4. "linha" e "coluna" são números de 0 a 4 numa grade. Elementos em sequência vertical ficam na mesma coluna; lado a lado, na mesma linha.
5. "ligacoes": setas de um id pra outro. "rotulo" diz o que acontece na seta (opcional). "estilo": "tracejada" quando é só relação.
6. "anotacoes": até 3 comentários curtos de professor ao lado de um elemento ("repare nisso").
7. Use só o que a aula diz. Não invente fatos.
8. "porque": UMA frase dizendo por que você escolheu desenhar assim.
Exemplo do formato (de outro assunto):
${EXEMPLO}
Responda só com o JSON no mesmo formato.`,
      },
    ],
    (raw) => {
      const cena = lerCena(raw);
      if (!cena) throw new Error('o professor não conseguiu montar um desenho');
      return cena;
    },
    signal,
  );
}
