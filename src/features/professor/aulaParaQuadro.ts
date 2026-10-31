import { convertToExcalidrawElements } from '@excalidraw/excalidraw';
import type { Lesson } from '../../domain/types';
import { paletaQuadro } from '../lousa/temaQuadro';
import { cenaParaEsqueletos } from './cenaParaQuadro';

// O Prof. A.Ilson desenha a aula no quadro (Excalidraw, igual à Lousa).
// Com `aula.cena` (o professor escolheu como explicar: fluxo, estados, passos,
// comparação...), o desenho vem primeiro e o texto vira resumo embaixo.
// Sem cena (aula antiga ou sem IA), cai no desenho em colunas de sempre:
//   coluna 1: título + explicação · coluna 2: pontos-chave ligados por setas ·
//   coluna 3: vídeos (cartão clicável → busca no YouTube), onde pesquisar e dicas.
// Link de vídeo de verdade: o Hugo cola na ferramenta "Incorporar" e vira vídeo.

export type Esqueleto = Parameters<typeof convertToExcalidrawElements>[0] extends (infer T)[] | null ? T : never;

const youtube = (q: string) => `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}`;

/** Quebra o texto em linhas de até `max` letras (sem cortar palavra). */
export function quebrar(texto: string, max: number): string {
  return texto
    .split('\n')
    .map((par) => {
      const linhas: string[] = [];
      let atual = '';
      // Palavra maior que a linha (ex.: um link) é picada, senão vaza da coluna.
      const palavras = par
        .split(/\s+/)
        .filter(Boolean)
        .flatMap((p) => p.match(new RegExp(`.{1,${max}}`, 'g')) ?? []);
      for (const palavra of palavras) {
        if (atual && (atual + ' ' + palavra).length > max) {
          linhas.push(atual);
          atual = palavra;
        } else atual = atual ? `${atual} ${palavra}` : palavra;
      }
      return [...linhas, atual].join('\n');
    })
    .join('\n');
}

const alturaDe = (texto: string, fonte: number) => texto.split('\n').length * fonte * 1.3;

export function aulaParaElementos(titulo: string, aula: Lesson) {
  const p = paletaQuadro();
  const redondo = p.arredondado ? ({ type: 3 } as const) : null;
  const f = { fontFamily: p.fonte };
  const e: Esqueleto[] = [];
  const data = new Date(aula.generatedAt).toLocaleDateString('pt-BR');
  const desenho = aula.cena ? cenaParaEsqueletos(titulo, aula.cena) : null;

  let fimCol1: number;
  let X3: number;
  let y: number;
  if (desenho) {
    // O desenho do professor primeiro; o texto vira resumo embaixo; vídeos e dicas à direita.
    e.push(...desenho.esqueletos);
    const explicacao = quebrar(aula.explanation, 90);
    e.push({ type: 'text', x: 0, y: desenho.altura + 90, text: 'Em texto', fontSize: 22, strokeColor: p.mutado, ...f });
    e.push({ type: 'text', x: 0, y: desenho.altura + 130, text: explicacao, fontSize: 16, strokeColor: p.texto, ...f });
    fimCol1 = desenho.altura + 130 + alturaDe(explicacao, 16);
    X3 = desenho.largura + 200;
    y = 0;
  } else {
    // Coluna 1: título e explicação.
    e.push({ type: 'text', x: 0, y: 0, text: titulo, fontSize: 36, strokeColor: p.texto, ...f });
    e.push({ type: 'text', x: 0, y: 52, text: `Quadro do Prof. A.Ilson · ${data}`, fontSize: 16, strokeColor: p.mutado, ...f });
    const explicacao = quebrar(aula.explanation, 52);
    e.push({ type: 'text', x: 0, y: 100, text: explicacao, fontSize: 20, strokeColor: p.texto, ...f });
    fimCol1 = 100 + alturaDe(explicacao, 20);

    // Coluna 2: pontos-chave em sequência.
    const X2 = 720;
    e.push({ type: 'text', x: X2, y: 0, text: 'Pontos-chave', fontSize: 28, strokeColor: p.texto, ...f });
    y = 60;
    aula.keyPoints.forEach((ponto, i) => {
      const texto = quebrar(`${i + 1}. ${ponto}`, 34);
      const altura = alturaDe(texto, 18) + 30;
      e.push({ type: 'rectangle', id: `ponto-${i}`, x: X2, y, width: 420, height: altura, roundness: redondo, strokeColor: p.destaque, roughness: 0, label: { text: texto, fontSize: 18, strokeColor: p.texto, ...f } });
      if (i > 0) e.push({ type: 'arrow', x: X2 + 210, y: y - 45, points: [[0, 0], [0, 40]] as never, strokeColor: p.texto, roughness: 0, start: { id: `ponto-${i - 1}` }, end: { id: `ponto-${i}` } });
      y += altura + 50;
    });
    X3 = 1240;
  }

  // Vídeos, onde pesquisar, dicas.
  let y3 = 0;
  if (aula.videoSearches.length) {
    e.push({ type: 'text', x: X3, y: y3, text: 'Assista (clique no cartão)', fontSize: 24, strokeColor: p.texto, ...f });
    y3 += 50;
    for (const q of aula.videoSearches) {
      e.push({ type: 'rectangle', x: X3, y: y3, width: 380, height: 56, roundness: redondo, strokeColor: p.info, roughness: 0, link: youtube(q), label: { text: quebrar(`▶ ${q}`, 34), fontSize: 16, strokeColor: p.texto, ...f } });
      y3 += 72;
    }
    y3 += 20;
  }
  if (aula.whereToResearch.length) {
    const texto = quebrar(aula.whereToResearch.map((w) => `• ${w}`).join('\n'), 40);
    e.push({ type: 'text', x: X3, y: y3, text: 'Onde pesquisar', fontSize: 24, strokeColor: p.texto, ...f });
    e.push({ type: 'text', x: X3, y: y3 + 40, text: texto, fontSize: 16, strokeColor: p.texto, ...f });
    y3 += 60 + alturaDe(texto, 16);
  }
  for (const dica of aula.tips) {
    const texto = quebrar(`💡 ${dica}`, 32);
    const altura = alturaDe(texto, 16) + 30;
    e.push({ type: 'rectangle', x: X3, y: y3, width: 380, height: altura, backgroundColor: p.fundoAviso, fillStyle: 'solid', strokeColor: p.aviso, roughness: 0, roundness: redondo, label: { text: texto, fontSize: 16, strokeColor: p.texto, ...f } });
    y3 += altura + 20;
  }

  // Lembrete embaixo de tudo: o vídeo de verdade entra pela ferramenta Incorporar.
  fimCol1 = Math.max(fimCol1, y, y3) + 40;
  e.push({ type: 'text', x: 0, y: fimCol1, text: 'Achou um vídeo bom? Cole o link do YouTube com a ferramenta "Incorporar" e ele toca aqui no quadro.', fontSize: 16, strokeColor: p.mutado, ...f });

  return convertToExcalidrawElements(e, { regenerateIds: true });
}
