import fs from 'node:fs/promises';
import type { IncomingMessage, ServerResponse } from 'node:http';
import path from 'node:path';
import type { ViteDevServer } from 'vite';
import type { Conexao, ConexaoPublica, Motor } from '../../src/domain/conexoes.ts';
import { criarArmazem, lerEnvTexto, varDaChave } from './armazem.ts';
import { chamarConexao, ErroConexao, listarModelos, type Mensagem } from './chamar.ts';
import { pedirAoMotor } from './motor.ts';
import { cancelarPedido, idValido, iniciarPedido, resultadoDoPedido } from './pedidos.ts';
import { chamarNotion, ErroNotion, tituloDe } from '../notion/cliente.ts';

// Rotas das conexões. A chave entra por aqui UMA vez (o Hugo digita no modal)
// e vai direto pro .env.local; nenhuma rota devolve chave pro navegador.

const ID_OK = /^[a-z0-9-]{1,40}$/;
const MOTORES_OK: Motor[] = ['leve', 'professor', 'dificil'];

function lerCorpo(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let corpo = '';
    req.on('data', (c: Buffer) => {
      corpo += c.toString('utf8');
      if (corpo.length > 2_000_000) reject(new Error('Pedido grande demais'));
    });
    req.on('end', () => {
      try {
        resolve(corpo ? JSON.parse(corpo) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function responder(res: ServerResponse, status: number, dados: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(dados));
}

const novoId = (nome: string) =>
  `${nome
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30) || 'conexao'}-${Date.now().toString(36).slice(-4)}`;

export function registrarConexoes(server: ViteDevServer, raiz: string) {
  const armazem = criarArmazem(raiz);
  const segredosBrazuka = path.resolve(raiz, '..', '..', 'Brazuka', '.secrets.env');

  server.middlewares.use('/api/conexoes', async (req, res) => {
    try {
      const rota = (req.url ?? '/').split('?')[0];
      const cfg = await armazem.lerConfig();
      const env = await armazem.lerEnv();

      if (req.method === 'GET' && rota === '/') {
        const conexoes: ConexaoPublica[] = await Promise.all(cfg.conexoes.map(async (c) => ({ ...c, temChave: !!env[varDaChave(c.id)], usoHoje: await armazem.usoHoje(c.id) })));
        const brazuka = lerEnvTexto(await fs.readFile(segredosBrazuka, 'utf8').catch(() => ''));
        return responder(res, 200, { conexoes, motores: cfg.motores, temChaveBrazuka: !!brazuka.NVIDIA_API_KEY, temNotion: !!env.NOTION_TOKEN });
      }
      if (req.method !== 'POST') return responder(res, 405, { erro: 'Use POST' });
      const corpo = await lerCorpo(req);
      const id = typeof corpo.id === 'string' && ID_OK.test(corpo.id) ? corpo.id : undefined;
      const conexao = cfg.conexoes.find((c) => c.id === id);

      if (rota === '/salvar') {
        const c = corpo.conexao as Partial<Conexao>;
        if (!c?.nome || !c.tipo || (c.tipo === 'openai' && !/^https?:\/\//.test(c.baseUrl ?? ''))) return responder(res, 400, { erro: 'Faltou nome ou endereço (http…).' });
        const final: Conexao = {
          id: c.id && ID_OK.test(c.id) ? c.id : novoId(c.nome),
          nome: c.nome.slice(0, 60),
          tipo: c.tipo === 'claude-cli' ? 'claude-cli' : 'openai',
          baseUrl: (c.baseUrl ?? '').trim(),
          modelo: (c.modelo ?? '').trim(),
          limiteDia: Number(c.limiteDia) > 0 ? Math.round(Number(c.limiteDia)) : undefined,
        };
        cfg.conexoes = [...cfg.conexoes.filter((x) => x.id !== final.id), final];
        await armazem.salvarConfig(cfg);
        const chave = typeof corpo.chave === 'string' ? corpo.chave.trim() : '';
        if (chave) {
          if (/[\r\n\s]/.test(chave) || chave.length > 500) return responder(res, 400, { erro: 'Chave com espaço ou quebra de linha: confira o que foi colado.' });
          await armazem.gravarVar(varDaChave(final.id), chave);
        }
        return responder(res, 200, { id: final.id });
      }

      if (rota === '/remover' && conexao) {
        cfg.conexoes = cfg.conexoes.filter((c) => c.id !== conexao.id);
        for (const m of MOTORES_OK) if (cfg.motores[m] === conexao.id) delete cfg.motores[m];
        await armazem.salvarConfig(cfg);
        await armazem.gravarVar(varDaChave(conexao.id), null);
        return responder(res, 200, { ok: true });
      }

      if (rota === '/motores') {
        const m = (corpo.motores ?? {}) as Record<string, unknown>;
        cfg.motores = Object.fromEntries(MOTORES_OK.filter((k) => typeof m[k] === 'string' && cfg.conexoes.some((c) => c.id === m[k])).map((k) => [k, m[k] as string]));
        await armazem.salvarConfig(cfg);
        return responder(res, 200, { motores: cfg.motores });
      }

      // A chave da NVIDIA do Brazuka vai do arquivo dele direto pro .env.local (não passa na tela).
      if (rota === '/chave-brazuka' && conexao) {
        const chave = lerEnvTexto(await fs.readFile(segredosBrazuka, 'utf8').catch(() => '')).NVIDIA_API_KEY;
        if (!chave) return responder(res, 404, { erro: 'Não achei NVIDIA_API_KEY no .secrets.env do Brazuka.' });
        await armazem.gravarVar(varDaChave(conexao.id), chave);
        return responder(res, 200, { ok: true });
      }

      if (rota === '/testar' && conexao) {
        const inicio = Date.now();
        await armazem.contarUso(conexao.id); // teste também gasta cota
        const texto = await chamarConexao(conexao, env, env[varDaChave(conexao.id)], [{ role: 'user', content: 'Responda só: "Prof. A.Ilson online."' }], 0);
        return responder(res, 200, { texto: texto.replace(/<think>[\s\S]*?<\/think>/gi, '').trim().slice(0, 200), ms: Date.now() - inicio });
      }

      // Notion: a chave da integração interna vai direto pro .env.local.
      if (rota === '/notion') {
        const token = typeof corpo.token === 'string' ? corpo.token.trim() : '';
        if (!token) {
          await armazem.gravarVar('NOTION_TOKEN', null);
          return responder(res, 200, { ok: true });
        }
        if (/[\r\n\s]/.test(token) || token.length > 300) return responder(res, 400, { erro: 'Chave com espaço ou quebra de linha: confira o que foi colado.' });
        await armazem.gravarVar('NOTION_TOKEN', token);
        return responder(res, 200, { ok: true });
      }

      // Testa a chave e mostra quais páginas a integração enxerga (as que o Hugo compartilhou).
      if (rota === '/notion/testar') {
        const eu = await chamarNotion<{ name?: string }>(armazem, 'GET', '/users/me');
        const busca = await chamarNotion<{ results: { object: string; parent?: { type?: string }; title?: { plain_text: string }[]; properties?: never }[] }>(armazem, 'POST', '/search', { page_size: 100 });
        const paginas = busca.results.filter((r) => r.parent?.type === 'workspace').map((r) => tituloDe(r));
        return responder(res, 200, { integracao: eu.name ?? 'integração', paginas, total: busca.results.length });
      }

      if (rota === '/modelos' && conexao) return responder(res, 200, { modelos: await listarModelos(conexao, env[varDaChave(conexao.id)]) });

      return responder(res, 404, { erro: 'Rota ou conexão não encontrada.' });
    } catch (e) {
      return responder(res, e instanceof ErroConexao || e instanceof ErroNotion ? 502 : 500, { erro: e instanceof Error ? e.message : String(e) });
    }
  });

  // O app pede por MOTOR, nunca por provedor: POST /ai/motor/<leve|professor|dificil>.
  // Cancelamento de verdade (botão Cancelar, página fechada): para o modelo, sem gastar cota à toa.
  server.middlewares.use('/ai/cancelar', async (req, res) => {
    try {
      const corpo = await lerCorpo(req);
      return responder(res, 200, { ok: idValido(corpo.id) && cancelarPedido(corpo.id) });
    } catch {
      return responder(res, 200, { ok: false });
    }
  });

  server.middlewares.use('/ai/motor', async (req, res) => {
    try {
      const [caminho, busca = ''] = (req.url ?? '').split('?');
      const motor = caminho.replace(/^\/+/, '');

      // O celular voltou (a conexão tinha caído): entrega o resultado do pedido que ficou rodando.
      if (motor === 'resultado') {
        const id = new URLSearchParams(busca).get('id');
        const p = idValido(id) ? resultadoDoPedido<Awaited<ReturnType<typeof pedirAoMotor>>>(id) : undefined;
        if (!p) return responder(res, 404, { erro: 'O servidor não tem mais esse pedido (reiniciou ou passou de 10 min). Peça de novo.' });
        return responder(res, 200, await p);
      }

      if (req.method !== 'POST' || !MOTORES_OK.includes(motor as Motor)) return responder(res, 404, { erro: 'Motor desconhecido.' });
      const corpo = await lerCorpo(req);
      const mensagens = (Array.isArray(corpo.messages) ? corpo.messages : []) as Mensagem[];
      const temperatura = typeof corpo.temperature === 'number' ? corpo.temperature : 0.4;
      const id = req.headers['x-pedido'];
      // Com id: o pedido sobrevive à conexão cair (celular com a tela apagada). Sem id: o jeito antigo.
      if (idValido(id)) return responder(res, 200, await iniciarPedido(id, (signal) => pedirAoMotor(armazem, motor as Motor, mensagens, temperatura, signal)));
      return responder(res, 200, await pedirAoMotor(armazem, motor as Motor, mensagens, temperatura));
    } catch (e) {
      return responder(res, 502, { erro: e instanceof Error ? e.message : String(e) });
    }
  });
}
