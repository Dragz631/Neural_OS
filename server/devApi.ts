import fs from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage } from 'node:http';
import type { Plugin } from 'vite';
import { registrarConexoes } from './conexoes/rotas.ts';
import { registrarFontes } from './fontes.ts';
import { criarPastas, registrarPastas } from './pastas.ts';

// ─── "Backend" mínimo que roda dentro do servidor do Vite ────────────────────
// 1) IA: o navegador pede por MOTOR (/ai/motor/<leve|professor|dificil>) e o
//    servidor escolhe a conexão, põe a chave do .env.local e faz o revezamento
//    (server/conexoes). A chave nunca vai pro navegador.
// 2) Cofre do Obsidian: grava notas .md dentro de <OBSIDIAN_VAULT_PATH>/Neural-OS.

export interface DevApiEnv {
  OBSIDIAN_VAULT_PATH?: string;
  /** Cofre de estudos (lousas, resumo pro Brazuka). Se faltar, usa o OBSIDIAN_VAULT_PATH. */
  ESTUDOS_VAULT_PATH?: string;
}

const MAX_BODY = 1_000_000;
const MAX_FILE_BODY = 20_000_000; // lousa com imagem pesa

function readJson(req: IncomingMessage, maxBody = MAX_BODY): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > maxBody) reject(new Error('Arquivo grande demais'));
      else chunks.push(c);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

/** Resolve um caminho relativo dentro de `root`, recusando qualquer coisa que escape (../). */
function inside(root: string, rel: string): string | null {
  const file = path.resolve(root, rel);
  return file.startsWith(root + path.sep) ? file : null;
}

const ESTUDOS_EXT = ['.excalidraw', '.json', '.md'];

export function devApi(env: DevApiEnv): Plugin {
  // O cofre pode mudar a qualquer momento (botão "Escolher pasta" no app), então é relido a cada pedido.
  const pastas = criarPastas(path.resolve(import.meta.dirname, '..'), env.OBSIDIAN_VAULT_PATH);
  const vaultRootAtual = async () => {
    const c = await pastas.cofre();
    return c ? path.resolve(c, 'Neural-OS') : undefined;
  };
  const estudosRootAtual = async () => {
    const base = env.ESTUDOS_VAULT_PATH || (await pastas.cofre());
    return base ? path.resolve(base) : undefined;
  };
  const excalidrawAssets = path.resolve(import.meta.dirname, '../node_modules/@excalidraw/excalidraw/dist/prod');

  return {
    name: 'neural-os-dev-api',
    configureServer(server) {
      registrarConexoes(server, path.resolve(import.meta.dirname, '..'));
      registrarFontes(server, path.resolve(import.meta.dirname, '..'));
      registrarPastas(server, pastas);

      server.middlewares.use('/api/vault/status', async (_req, res) => {
        const vaultRoot = await vaultRootAtual();
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ configured: !!vaultRoot, folder: vaultRoot }));
      });

      // Fontes do Excalidraw servidas daqui (sem depender de CDN/internet).
      server.middlewares.use('/excalidraw-assets', async (req, res, next) => {
        const rel = decodeURIComponent((req.url ?? '').split('?')[0]).replace(/^\/+/, '');
        const file = inside(excalidrawAssets, rel);
        if (!file || !rel.startsWith('fonts/')) return next();
        try {
          const data = await fs.readFile(file);
          res.setHeader('Content-Type', file.endsWith('.woff2') ? 'font/woff2' : 'application/octet-stream');
          res.setHeader('Cache-Control', 'public, max-age=31536000');
          res.end(data);
        } catch {
          next();
        }
      });

      // Grava arquivos no cofre de estudos (lousas .excalidraw, resumo .json/.md).
      // Mapas de matéria gerados pelo Claude a pedido do Hugo (um .json por matéria).
      server.middlewares.use('/api/estudos/mapas', async (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        const estudosRoot = await estudosRootAtual();
        if (!estudosRoot) return res.end('[]');
        const pasta = path.join(estudosRoot, 'Neural-OS', 'import', 'mapas');
        try {
          const nomes = (await fs.readdir(pasta)).filter((n) => n.endsWith('.json'));
          const mapas = await Promise.all(
            nomes.map(async (arquivo) => {
              try {
                return { arquivo, mapa: JSON.parse(await fs.readFile(path.join(pasta, arquivo), 'utf8')) };
              } catch {
                return null; // arquivo quebrado: ignora, o app valida o resto
              }
            }),
          );
          res.end(JSON.stringify(mapas.filter(Boolean)));
        } catch {
          res.end('[]'); // pasta ainda não existe
        }
      });

      // Importação sob demanda: o Claude lê o Notion/NotebookLM quando o Hugo
      // pede e grava esses dois arquivos; o app só lê (ver domain/importacao.ts).
      server.middlewares.use('/api/estudos/import', async (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        const estudosRoot = await estudosRootAtual();
        const ler = async (arquivo: string) => {
          if (!estudosRoot) return null;
          try {
            return JSON.parse(await fs.readFile(path.join(estudosRoot, 'Neural-OS', 'import', arquivo), 'utf8'));
          } catch {
            return null; // não existe ou está quebrado
          }
        };
        res.end(JSON.stringify({ notion: await ler('notion.json'), notebooklm: await ler('notebooklm.json') }));
      });

      server.middlewares.use('/api/estudos/file', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('Use POST');
        }
        const estudosRoot = await estudosRootAtual();
        if (!estudosRoot) {
          res.statusCode = 400;
          return res.end('Nenhum cofre escolhido. Abra "Conectar fontes" e escolha a pasta do seu cofre.');
        }
        try {
          const body = (await readJson(req, MAX_FILE_BODY)) as { path?: unknown; content?: unknown };
          if (typeof body.path !== 'string' || typeof body.content !== 'string' || !ESTUDOS_EXT.some((e) => (body.path as string).endsWith(e))) {
            res.statusCode = 400;
            return res.end('Pedido inválido');
          }
          const file = inside(estudosRoot, body.path);
          if (!file) {
            res.statusCode = 400;
            return res.end('Caminho fora do cofre');
          }
          await fs.mkdir(path.dirname(file), { recursive: true });
          await fs.writeFile(file, body.content, 'utf8');
          res.end('ok');
        } catch (e) {
          res.statusCode = 500;
          res.end(e instanceof Error ? e.message : 'Erro ao salvar');
        }
      });

      server.middlewares.use('/api/vault/note', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('Use POST');
        }
        const vaultRoot = await vaultRootAtual();
        if (!vaultRoot) {
          res.statusCode = 400;
          return res.end('Nenhum cofre escolhido. Abra "Conectar fontes" e escolha a pasta do seu cofre.');
        }
        try {
          const body = (await readJson(req)) as { path?: unknown; content?: unknown };
          if (typeof body.path !== 'string' || typeof body.content !== 'string' || !body.path.endsWith('.md')) {
            res.statusCode = 400;
            return res.end('Pedido inválido');
          }
          // Impede "../" de escapar da pasta do cofre.
          const file = path.resolve(vaultRoot, body.path);
          if (!file.startsWith(vaultRoot + path.sep)) {
            res.statusCode = 400;
            return res.end('Caminho fora do cofre');
          }
          await fs.mkdir(path.dirname(file), { recursive: true });
          await fs.writeFile(file, body.content, 'utf8');
          res.end('ok');
        } catch (e) {
          res.statusCode = 500;
          res.end(e instanceof Error ? e.message : 'Erro ao salvar');
        }
      });
    },
  };
}
