// Converte um ícone do simple-icons (SVG 24x24) em formas nativas do Excalidraw:
// cada trecho do desenho vira uma "linha fechada" preenchida (line + polygon).
// Os furos (o miolo de um "O", por exemplo) são pintados com a cor do fundo da tela.
import svgpath from 'svgpath';
import { svgPathProperties } from 'svg-path-properties';

const TAMANHO = 64; // px do logo na lousa
const ESCALA = TAMANHO / 24;
const FUNDO = '#ffffff'; // fundo do Excalidraw no tema claro (no escuro ele inverte sozinho)

// Tudo determinístico (sem aleatório): o mesmo ícone gera sempre o mesmo resultado,
// então a "versão" da biblioteca só muda quando o conteúdo muda de verdade.
function semente(texto) {
  let h = 2166136261;
  for (const c of texto) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return (h >>> 0) % 2 ** 31;
}

/** Separa o caminho em trechos que começam com M (já em coordenadas absolutas). */
function trechos(d) {
  const abs = svgpath(d).abs().unshort().toString();
  return abs.split(/(?=M)/).map((s) => s.trim()).filter(Boolean);
}

/** Amostra pontos ao longo do trecho. */
function pontos(trecho) {
  const props = new svgPathProperties(trecho);
  const total = props.getTotalLength();
  if (!total) return [];
  const n = Math.min(160, Math.max(12, Math.round(total / 0.6)));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const p = props.getPointAtLength((total * i) / n);
    out.push([Math.round(p.x * ESCALA * 10) / 10, Math.round(p.y * ESCALA * 10) / 10]);
  }
  return out;
}

function dentro([x, y], poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}

/** Devolve um item de biblioteca com o logo. */
export function logoParaItem(icone, slug, rotulo) {
  const cor = `#${icone.hex}`;
  const grupo = `logo-${slug}`;
  const polys = trechos(icone.path).map(pontos).filter((p) => p.length > 2);

  // Profundidade = em quantos outros polígonos o trecho está dentro. Ímpar = furo.
  const comProf = polys.map((p, i) => ({
    p,
    prof: polys.reduce((acc, outro, j) => (j !== i && dentro(p[Math.floor(p.length / 2)], outro) ? acc + 1 : acc), 0),
  }));
  comProf.sort((a, b) => a.prof - b.prof); // furos desenhados por cima

  const elements = comProf.map(({ p, prof }, i) => {
    const xs = p.map((q) => q[0]);
    const ys = p.map((q) => q[1]);
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const rel = p.map(([x, y]) => [x - minX, y - minY]);
    rel.push([...rel[0]]); // fecha o polígono
    const preenche = prof % 2 === 1 ? FUNDO : cor;
    return {
      id: `logo-${slug}-${i}`,
      type: 'line',
      x: minX,
      y: minY,
      width: Math.max(...xs) - minX,
      height: Math.max(...ys) - minY,
      angle: 0,
      strokeColor: preenche,
      backgroundColor: preenche,
      fillStyle: 'solid',
      strokeWidth: 1,
      strokeStyle: 'solid',
      roughness: 0,
      opacity: 100,
      groupIds: [grupo],
      frameId: null,
      roundness: null,
      seed: semente(`${slug}:${i}:s`),
      version: 1,
      versionNonce: semente(`${slug}:${i}:n`),
      isDeleted: false,
      boundElements: null,
      updated: 1,
      link: null,
      locked: false,
      points: rel,
      lastCommittedPoint: null,
      startBinding: null,
      endBinding: null,
      startArrowhead: null,
      endArrowhead: null,
      polygon: true,
    };
  });

  return { id: `logo:${slug}`, status: 'published', created: 1, name: `${rotulo}: ${icone.title}`, elements };
}
