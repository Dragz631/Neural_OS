import fs from 'node:fs/promises';
import path from 'node:path';
import type { IncomingMessage } from 'node:http';
import type { Plugin, ProxyOptions } from 'vite';

// ─── "Backend" mínimo que roda dentro do servidor do Vite ────────────────────
// 1) Proxy de IA: o navegador chama /ai/<provedor>/..., e aqui a gente repassa
//    pro destino real, colocando a chave que está no .env.local. Assim a chave
//    nunca vai pro navegador, e não tem problema de CORS.
// 2) Cofre do Obsidian: grava notas .md dentro de <OBSIDIAN_VAULT_PATH>/Neural-OS.

export interface DevApiEnv {
  HERMES_URL?: string;
  HERMES_API_KEY?: string;
  NVIDIA_API_KEY?: string;
  OLLAMA_URL?: string;
  OBSIDIAN_VAULT_PATH?: string;
  /** Cofre de estudos (lousas, resumo pro Brazuka). Se faltar, usa o OBSIDIAN_VAULT_PATH. */
  ESTUDOS_VAULT_PATH?: string;
}

function target(url: string, prefix: string, key?: string): ProxyOptions {
  return {
    target: url,
    changeOrigin: true,
    rewrite: (p) => p.replace(prefix, ''),
    headers: key ? { Authorization: `Bearer ${key}` } : undefined,
  };
}

export function aiProxy(env: DevApiEnv): Record<string, ProxyOptions> {
  return {
    '/ai/hermes': target(env.HERMES_URL || 'http://localhost:8642', '/ai/hermes', env.HERMES_API_KEY),
    '/ai/nvidia': target('https://integrate.api.nvidia.com', '/ai/nvidia', env.NVIDIA_API_KEY),
    '/ai/ollama': target(env.OLLAMA_URL || 'http://localhost:11434', '/ai/ollama'),
  };
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
  const vaultRoot = env.OBSIDIAN_VAULT_PATH ? path.resolve(env.OBSIDIAN_VAULT_PATH, 'Neural-OS') : undefined;
  const estudosBase = env.ESTUDOS_VAULT_PATH || env.OBSIDIAN_VAULT_PATH;
  const estudosRoot = estudosBase ? path.resolve(estudosBase) : undefined;
  const excalidrawAssets = path.resolve(import.meta.dirname, '../node_modules/@excalidraw/excalidraw/dist/prod');

  return {
    name: 'neural-os-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/vault/status', (_req, res) => {
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
        if (!estudosRoot) {
          res.statusCode = 400;
          return res.end('ESTUDOS_VAULT_PATH não configurado no .env.local');
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
        if (!vaultRoot) {
          res.statusCode = 400;
          return res.end('OBSIDIAN_VAULT_PATH não configurado no .env.local');
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
