import type { CartaoEscolha } from '../../domain/cartoes';
import { codigoSeguro, JOGO_ALTURA, JOGO_LARGURA, type JogoIA } from '../../domain/jogoIA';
import { AIError, chat } from './client';

// O feed pede à IA um minijogo em ASCII por pergunta. A IA escreve o código; ele roda
// isolado (features/lobby/feed/jogos/JogoSandbox.tsx). Aqui só pedimos e conferimos.

export interface PedidoJogo {
  cartao: CartaoEscolha;
  materia: string;
  topico: string;
  chefe: string;
  simbolos: string[];
  /** Nomes dos últimos jogos, pra IA não repetir a ideia. */
  recentes: string[];
}

const REGRAS = `Você cria MINIJOGOS em ASCII que fazem a pessoa responder uma pergunta de estudo jogando.
Criatividade sem limite: invente uma mecânica NOVA ligada ao assunto (pode lembrar TuxMath, Pac-Man, batalha Pokémon, snake, breakout, corrida, labirinto, memória, plataforma, o que quiser).
O jogo precisa ser jogável em menos de 45 segundos, divertido e leve.

Você escreve o CORPO de uma função JavaScript que recebe \`api\`. Nada de HTML, DOM, rede, import, eval, localStorage, nem laços sem fim (while(true)).
API disponível (tudo que existe):
- api.W = ${JOGO_LARGURA}, api.H = ${JOGO_ALTURA}: tamanho da tela em caracteres.
- api.pergunta (texto), api.opcoes (lista de textos; a ordem é A, B, C...), api.materia, api.topico, api.tema = { chefe, simbolos }.
- api.desenhar(texto): mostra a tela inteira (linhas separadas por \\n, no máx. H linhas de W caracteres, fonte monoespaçada). Chame a cada quadro.
- api.cada(ms, fn): roda fn a cada ms milissegundos (mínimo 80). É o único jeito de animar.
- api.teclas(fn): fn recebe 'esquerda','direita','cima','baixo','acao' (espaço/enter) ou a letra digitada ('a','b'...). Há botões de toque pra essas 5 ações.
- api.escolher(i): a resposta final da pessoa, i = índice da alternativa (0 = A). Só vale uma vez. É o objetivo do jogo: o jogo termina quando a pessoa escolhe.
- api.aoResponder(fn): fn({ i, acertou, certa }) roda DEPOIS de escolher; use pra mostrar vitória/derrota (você NÃO sabe a resposta certa antes disso).

Regras:
1. As alternativas (letras A, B, C...) devem aparecer NA TELA do jogo, e a pessoa as alcança jogando (atirar, comer, pular, escolher a porta...).
2. A pessoa precisa conseguir chegar em qualquer alternativa, inclusive a errada.
3. Mostre as instruções curtas na própria tela ("← → move, ESPAÇO atira").
4. Nunca desenhe qual é a certa. Só use api.aoResponder pra reagir.
5. Tudo em ASCII simples (letras, números, símbolos comuns). Use api.tema.simbolos e api.tema.chefe pra dar clima da matéria.
6. Mantenha o código abaixo de 6000 caracteres. Sem comentários longos.

Responda SÓ com:
NOME: <nome curto do jogo>
\`\`\`js
<corpo da função>
\`\`\``;

export async function gerarJogo(p: PedidoJogo, signal?: AbortSignal): Promise<JogoIA> {
  const { cartao } = p;
  const texto = await chat(
    [
      { role: 'system', content: REGRAS },
      {
        role: 'user',
        content: `Matéria: ${p.materia}\nTópico: ${p.topico}\nChefe/clima: ${p.chefe} · símbolos: ${p.simbolos.join(' ')}\n${p.recentes.length ? `Jogos recentes (faça diferente): ${p.recentes.join(', ')}\n` : ''}\nPergunta: ${cartao.pergunta}\n${cartao.codigo ? `Código da pergunta:\n${cartao.codigo}\n` : ''}Alternativas:\n${cartao.opcoes.map((o, i) => `${String.fromCharCode(65 + i)}) ${o}`).join('\n')}\n\nCrie o jogo.`,
      },
    ],
    signal,
    // Código e criatividade pedem o motor forte (Claude): o da NVIDIA leva minutos pra escrever um jogo.
    'dificil',
  );
  const bloco = texto.match(/```(?:js|javascript)?\s*\n([\s\S]*?)```/);
  const codigo = (bloco?.[1] ?? '').trim();
  const problema = codigoSeguro(codigo);
  if (problema) throw new AIError(`o jogo que a IA criou não serve (${problema})`);
  const nome = texto.match(/NOME:\s*(.+)/)?.[1]?.trim().slice(0, 40) || 'Minijogo';
  return { codigo, nome, geradoEm: new Date().toISOString() };
}
