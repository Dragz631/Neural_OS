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

function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      size += c.length;
      if (size > MAX_BODY) reject(new Error('Nota grande demais'));
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

export function devApi(env: DevApiEnv): Plugin {
  const vaultRoot = env.OBSIDIAN_VAULT_PATH ? path.resolve(env.OBSIDIAN_VAULT_PATH, 'Neural-OS') : undefined;

  return {
    name: 'neural-os-dev-api',
    configureServer(server) {
      server.middlewares.use('/api/vault/status', (_req, res) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ configured: !!vaultRoot, folder: vaultRoot }));
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
