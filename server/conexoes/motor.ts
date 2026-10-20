import { createHash } from 'node:crypto';
import { CADEIA, type Motor } from '../../src/domain/conexoes.ts';
import { varDaChave, type Armazem } from './armazem.ts';
import { chamarConexao, ErroConexao, type Mensagem } from './chamar.ts';

// Um professor, vários motores. Pede no motor certo; se ele estiver fora do ar,
// sem cota ou estourou o teto do dia, passa pro próximo da CADEIA (igual ao
// revezamento do Brazuka). Pedido idêntico repetido sai do cache, sem gastar.

const CACHE_MAX = 200;
const CACHE_MS = 6 * 60 * 60 * 1000;
const cache = new Map<string, { texto: string; quando: number; motor: Motor; conexao: string }>();

export interface Resposta {
  texto: string;
  motor: Motor;
  conexao: string;
  doCache: boolean;
}

export async function pedirAoMotor(armazem: Armazem, motorPedido: Motor, mensagens: Mensagem[], temperatura: number): Promise<Resposta> {
  const cfg = await armazem.lerConfig();
  const env = await armazem.lerEnv();
  const chaveCache = createHash('sha256').update(JSON.stringify([motorPedido, temperatura, mensagens])).digest('hex');
  const guardado = cache.get(chaveCache);
  if (guardado && Date.now() - guardado.quando < CACHE_MS) return { texto: guardado.texto, motor: guardado.motor, conexao: guardado.conexao, doCache: true };

  const falhas: string[] = [];
  const tentadas = new Set<string>();
  for (const motor of CADEIA[motorPedido]) {
    const conexao = cfg.conexoes.find((c) => c.id === cfg.motores[motor]);
    if (!conexao || tentadas.has(conexao.id)) continue;
    tentadas.add(conexao.id);
    if (conexao.limiteDia && (await armazem.usoHoje(conexao.id)) >= conexao.limiteDia) {
      falhas.push(`${conexao.nome}: teto de ${conexao.limiteDia} chamadas hoje.`);
      continue;
    }
    try {
      await armazem.contarUso(conexao.id);
      const texto = await chamarConexao(conexao, env, env[varDaChave(conexao.id)], mensagens, temperatura);
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value!);
      cache.set(chaveCache, { texto, quando: Date.now(), motor, conexao: conexao.nome });
      return { texto, motor, conexao: conexao.nome, doCache: false };
    } catch (e) {
      falhas.push(e instanceof Error ? e.message : String(e));
      if (e instanceof ErroConexao && !e.troca) break;
    }
  }
  throw new ErroConexao(falhas.length ? falhas.join(' | ') : 'Nenhum motor conectado. Abra Configurações → Conexões.', false);
}
