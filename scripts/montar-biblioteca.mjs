// Monta a biblioteca da Lousa em public/biblioteca/.
// Rodar: node scripts/montar-biblioteca.mjs   (precisa de internet só nessa hora)
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as icones from 'simple-icons';
import { COMMIT, LOGOS_IA, LOGOS_LINGUAGENS, ROTULO, TEMAS } from './biblioteca/pacotes.mjs';
import { logoParaItem } from './biblioteca/logos.mjs';

const RAIZ = `https://raw.githubusercontent.com/excalidraw/excalidraw-libraries/${COMMIT}`;
const SAIDA = path.resolve(import.meta.dirname, '../public/biblioteca');

async function baixarJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} em ${url}`);
  return res.json();
}

/** Seta ligada a um elemento que não está no item: solta a ligação (senão o Excalidraw reclama no console). */
function soltarLigacoesQuebradas(elements) {
  const ids = new Set(elements.map((e) => e.id));
  return elements.map((e) => ({
    ...e,
    startBinding: e.startBinding?.elementId && !ids.has(e.startBinding.elementId) ? null : e.startBinding ?? null,
    endBinding: e.endBinding?.elementId && !ids.has(e.endBinding.elementId) ? null : e.endBinding ?? null,
  }));
}

/** Aceita os dois formatos (v1: `library`, v2: `libraryItems`) e dá id estável. */
function normalizar(lib, origem, rotulo) {
  const brutos = lib.libraryItems ?? (lib.library ?? []).map((elements) => ({ elements }));
  return brutos
    .filter((it) => Array.isArray(it.elements) && it.elements.length > 0)
    .map((it, i) => ({
      id: `${origem}:${i}`,
      status: 'published',
      created: 1,
      name: `${rotulo}: ${it.name?.trim() || `item ${i + 1}`}`,
      elements: soltarLigacoesQuebradas(it.elements),
    }));
}

const arquivoLib = (items) => JSON.stringify({ type: 'excalidrawlib', version: 2, source: 'neural-os', libraryItems: items });

async function main() {
  await fs.mkdir(SAIDA, { recursive: true });
  const indice = await baixarJson(`${RAIZ}/libraries.json`);
  const porFonte = new Map(indice.map((l) => [l.source, l]));
  const creditos = [];
  const saidas = [];
  const impressao = createHash('sha1'); // muda se qualquer byte da biblioteca mudar

  for (const [tema, fontes] of Object.entries(TEMAS)) {
    const itens = [];
    for (const fonte of fontes) {
      const lib = await baixarJson(`${RAIZ}/libraries/${fonte}`);
      const novos = normalizar(lib, fonte.replace(/\.excalidrawlib$/, ''), ROTULO[tema]);
      itens.push(...novos);
      const meta = porFonte.get(fonte);
      const autores = (meta?.authors ?? []).map((a) => a.name).join(', ') || 'desconhecido';
      creditos.push(`| ${tema} | ${meta?.name ?? fonte} | ${autores} | ${novos.length} | [fonte](https://github.com/excalidraw/excalidraw-libraries/blob/${COMMIT}/libraries/${fonte}) |`);
      console.log(`${tema}: ${fonte} → ${novos.length} itens`);
    }
    const conteudoTema = arquivoLib(itens);
    impressao.update(conteudoTema);
    await fs.writeFile(path.join(SAIDA, `${tema}.excalidrawlib`), conteudoTema);
    saidas.push({ arquivo: `${tema}.excalidrawlib`, tema, itens: itens.length });
  }

  for (const [arquivo, slugs, rotulo] of [['logos-ia', LOGOS_IA, 'Logo IA'], ['logos-linguagens', LOGOS_LINGUAGENS, 'Logo']]) {
    const itens = [];
    for (const slug of slugs) {
      const icone = icones[`si${slug.charAt(0).toUpperCase()}${slug.slice(1)}`];
      if (!icone) {
        console.warn(`!! logo não encontrado: ${slug}`);
        continue;
      }
      itens.push(logoParaItem(icone, slug, rotulo));
    }
    const conteudoLogos = arquivoLib(itens);
    impressao.update(conteudoLogos);
    await fs.writeFile(path.join(SAIDA, `${arquivo}.excalidrawlib`), conteudoLogos);
    saidas.push({ arquivo: `${arquivo}.excalidrawlib`, tema: arquivo, itens: itens.length });
    console.log(`${arquivo}: ${itens.length} logos`);
  }

  // Versão = muda quando o conteúdo muda; o app recarrega a biblioteca só nesse caso.
  const versao = `${COMMIT.slice(0, 7)}-${impressao.digest('hex').slice(0, 10)}`;
  await fs.writeFile(path.join(SAIDA, 'indice.json'), JSON.stringify({ versao, arquivos: saidas }, null, 2));

  const md = [
    '# Créditos da biblioteca da Lousa',
    '',
    `Pacotes da comunidade: [excalidraw/excalidraw-libraries](https://github.com/excalidraw/excalidraw-libraries) (licença MIT), commit \`${COMMIT}\`.`,
    '',
    '| Tema | Pacote | Autor(es) | Itens | Link |',
    '|---|---|---|---|---|',
    ...creditos,
    '',
    'Logos: [simple-icons](https://simpleicons.org) (CC0 1.0), convertidos em formas. O ícone do Git é de Jason Long, licença CC BY 3.0.',
    'As marcas pertencem aos seus donos; uso aqui é pessoal, para estudo.',
    'ChatGPT, OpenAI, Grok, C#, Java e VS Code não estão no simple-icons: aparecem como selos com o nome (feitos no app).',
    '',
  ].join('\n');
  await fs.writeFile(path.join(SAIDA, 'CREDITOS.md'), md);
  console.log(`\nversão ${versao} gravada em ${SAIDA}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
