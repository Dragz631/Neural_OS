import fs from 'node:fs/promises';
import path from 'node:path';
import type { ConfigConexoes } from '../../src/domain/conexoes.ts';

// Onde as conexões vivem (tudo no PC, nada no navegador nem no git):
//   conexoes.local.json       endereço, modelo e qual conexão é cada motor
//   .env.local                as chaves, como NEURAL_KEY_<ID>=...
//   conexoes.uso.local.json   quantas chamadas cada conexão fez hoje (teto diário)

export const varDaChave = (id: string) => `NEURAL_KEY_${id.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`;

const hoje = () => new Date().toLocaleDateString('sv-SE'); // AAAA-MM-DD no fuso do PC

/** Lê um arquivo .env simples (CHAVE=valor por linha, # comentário). */
export function lerEnvTexto(texto: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const linha of texto.split(/\r?\n/)) {
    const m = linha.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  }
  return out;
}

export function criarArmazem(raiz: string) {
  const cfgPath = path.join(raiz, 'conexoes.local.json');
  const usoPath = path.join(raiz, 'conexoes.uso.local.json');
  const envPath = path.join(raiz, '.env.local');

  const lerJson = async <T>(arquivo: string, padrao: T): Promise<T> => {
    try {
      return JSON.parse(await fs.readFile(arquivo, 'utf8')) as T;
    } catch {
      return padrao;
    }
  };

  return {
    lerConfig: () => lerJson<ConfigConexoes>(cfgPath, { conexoes: [], motores: {} }),
    salvarConfig: (c: ConfigConexoes) => fs.writeFile(cfgPath, JSON.stringify(c, null, 2), 'utf8'),

    /** Relido a cada chamada: chave nova vale na hora, sem reiniciar o servidor. */
    lerEnv: async () => lerEnvTexto(await fs.readFile(envPath, 'utf8').catch(() => '')),

    /** Grava (ou apaga, com valor null) uma linha do .env.local, sem mexer nas outras. */
    gravarVar: async (nome: string, valor: string | null) => {
      const texto = await fs.readFile(envPath, 'utf8').catch(() => '');
      const linhas = texto.split(/\r?\n/).filter((l) => !l.match(new RegExp(`^\\s*${nome}\\s*=`)));
      while (linhas.length && linhas[linhas.length - 1] === '') linhas.pop();
      if (valor !== null) linhas.push(`${nome}=${valor}`);
      await fs.writeFile(envPath, `${linhas.join('\n')}\n`, 'utf8');
    },

    usoHoje: async (id: string) => {
      const uso = await lerJson<{ data: string; n: Record<string, number> }>(usoPath, { data: '', n: {} });
      return uso.data === hoje() ? (uso.n[id] ?? 0) : 0;
    },
    contarUso: async (id: string) => {
      const uso = await lerJson<{ data: string; n: Record<string, number> }>(usoPath, { data: '', n: {} });
      const n = uso.data === hoje() ? uso.n : {};
      n[id] = (n[id] ?? 0) + 1;
      await fs.writeFile(usoPath, JSON.stringify({ data: hoje(), n }), 'utf8');
    },
  };
}

export type Armazem = ReturnType<typeof criarArmazem>;
