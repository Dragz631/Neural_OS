import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import type { Conexao } from '../../src/domain/conexoes.ts';

// Chama UMA conexão e devolve o texto. Quem decide qual conexão e o revezamento
// é o motor.ts; aqui é só "falar com o modelo".

export interface Mensagem {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** `troca` = vale a pena tentar o próximo motor (fora do ar, cota, 5xx, demora). */
export class ErroConexao extends Error {
  troca: boolean;
  constructor(msg: string, troca: boolean) {
    super(msg);
    this.troca = troca;
  }
}

const PRAZO_MS = 170_000;

/** Prazo do servidor + "o app desistiu" (Cancelar no app ou página fechada): o que vier primeiro. */
const prazoOu = (signal?: AbortSignal) => (signal ? AbortSignal.any([AbortSignal.timeout(PRAZO_MS), signal]) : AbortSignal.timeout(PRAZO_MS));

async function chamarOpenAI(c: Conexao, chave: string | undefined, mensagens: Mensagem[], temperatura: number, signal?: AbortSignal): Promise<string> {
  const corpo: Record<string, unknown> = { model: c.modelo, messages: mensagens, temperature: temperatura, stream: false };
  // Nemotron "pensa escondido" e às vezes gasta tudo sem responder (aprendido no Brazuka).
  if (c.baseUrl.includes('nvidia.com')) corpo.chat_template_kwargs = { enable_thinking: false };
  const res = await fetch(`${c.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(chave ? { Authorization: `Bearer ${chave}` } : {}) },
    body: JSON.stringify(corpo),
    signal: prazoOu(signal),
  }).catch((e: unknown) => {
    if (signal?.aborted) throw new ErroConexao('Cancelado pelo app.', false);
    throw new ErroConexao(`${c.nome}: sem resposta (${e instanceof Error ? e.name : 'erro'}).`, true);
  });
  if (!res.ok) {
    const detalhe = (await res.text().catch(() => '')).slice(0, 200);
    throw new ErroConexao(`${c.nome} respondeu ${res.status}. ${detalhe}`, res.status === 429 || res.status >= 500 || res.status === 404);
  }
  const data = (await res.json()) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  const texto: unknown = data?.choices?.[0]?.message?.content;
  if (typeof texto !== 'string' || !texto.trim()) throw new ErroConexao(`${c.nome} respondeu vazio.`, true);
  return texto;
}

/** Onde o instalador do npm põe o Claude Code no Windows (dá pra trocar com CLAUDE_BIN). */
export function caminhoClaude(env: Record<string, string>): string {
  return env.CLAUDE_BIN || path.join(process.env.APPDATA ?? '', 'npm', 'node_modules', '@anthropic-ai', 'claude-code', 'bin', 'claude.exe');
}

/**
 * Claude pela assinatura: roda o Claude Code em modo "-p", numa pasta neutra,
 * sem configurações nem ferramentas (testado: não carrega as instruções do
 * Hugo nem o cofre do Claude, só o que mandamos aqui).
 */
async function chamarClaude(c: Conexao, bin: string, mensagens: Mensagem[], signal?: AbortSignal): Promise<string> {
  const sistema = mensagens.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n') || 'Você é o Prof. A.Ilson.';
  const conversa = mensagens
    .filter((m) => m.role !== 'system')
    .map((m) => (m.role === 'user' ? m.content : `[Sua resposta anterior]\n${m.content}`))
    .join('\n\n');
  const pasta = path.join(os.tmpdir(), 'neural-os-claude');
  await fs.mkdir(pasta, { recursive: true });
  const args = ['-p', '--setting-sources', '', '--tools', '', '--no-session-persistence', '--output-format', 'json', '--model', c.modelo || 'sonnet', '--system-prompt', sistema];

  return new Promise((resolve, reject) => {
    const p = spawn(bin, args, { cwd: pasta, windowsHide: true });
    let saida = '';
    let erro = '';
    const prazo = setTimeout(() => {
      p.kill();
      reject(new ErroConexao('Claude demorou demais.', true));
    }, PRAZO_MS);
    // O app desistiu: encerra o Claude na hora (não gasta a assinatura à toa).
    signal?.addEventListener('abort', () => {
      clearTimeout(prazo);
      p.kill();
      reject(new ErroConexao('Cancelado pelo app.', false));
    });
    p.stdout.on('data', (d: Buffer) => (saida += d.toString('utf8')));
    p.stderr.on('data', (d: Buffer) => (erro += d.toString('utf8')));
    p.on('error', () => {
      clearTimeout(prazo);
      reject(new ErroConexao('Não achei o Claude Code instalado neste PC.', true));
    });
    p.on('close', () => {
      clearTimeout(prazo);
      try {
        const r = JSON.parse(saida);
        if (r.is_error || typeof r.result !== 'string') return reject(new ErroConexao(`Claude: ${String(r.result ?? erro).slice(0, 200)}`, true));
        resolve(r.result);
      } catch {
        reject(new ErroConexao(`Claude não respondeu direito. ${(erro || saida).slice(0, 200)}`, true));
      }
    });
    p.stdin.end(conversa, 'utf8');
  });
}

export async function chamarConexao(c: Conexao, env: Record<string, string>, chave: string | undefined, mensagens: Mensagem[], temperatura: number, signal?: AbortSignal): Promise<string> {
  return c.tipo === 'claude-cli' ? chamarClaude(c, caminhoClaude(env), mensagens, signal) : chamarOpenAI(c, chave, mensagens, temperatura, signal);
}

/** Lista os modelos de uma conexão no formato OpenAI (GET /models). */
export async function listarModelos(c: Conexao, chave: string | undefined): Promise<string[]> {
  if (c.tipo === 'claude-cli') return ['haiku', 'sonnet', 'opus'];
  const res = await fetch(`${c.baseUrl.replace(/\/+$/, '')}/models`, { headers: chave ? { Authorization: `Bearer ${chave}` } : {}, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) throw new ErroConexao(`Erro ${res.status} ao listar modelos.`, false);
  const data = (await res.json()) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
  return ((data?.data ?? data?.models ?? []) as { id?: string; name?: string }[]).map((m) => m.id ?? m.name ?? '').filter(Boolean).sort();
}
