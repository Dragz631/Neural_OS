import type { StateStorage } from 'zustand/middleware';

// ─── Mesmo progresso no PC e no celular, ao vivo (08/11/2026) ────────────────
// Cada store do app continua gravando no navegador (abre rápido, funciona sem rede),
// e também manda pro PC (server/dados.ts), que é a fonte da verdade. Quando outro
// aparelho grava, chega um aviso (SSE) e este recarrega só aquele store.
// IMPORTANTE: este arquivo não importa nenhum store (eles leem os dados ao serem
// importados, então a sincronia tem que rodar ANTES; ver main.tsx).

/** Coisas deste aparelho que não fazem sentido no outro (tarefas em andamento, grade do Lobby do PC). */
const SO_DESTE_APARELHO = new Set(['neural-os.tarefas', 'neural-os.lobby']);
const PREFIXO = 'neural-os.';
const CHAVE_VERSOES = 'neural-os-sync.versoes';
const CHAVE_APARELHO = 'neural-os-sync.aparelho';
const CHAVE_JA_SINCRONIZOU = 'neural-os-sync.ok';

const sincroniza = (nome: string) => nome.startsWith(PREFIXO) && !SO_DESTE_APARELHO.has(nome);

type Rehidratavel = { persist: { rehydrate: () => Promise<void> | void } };
const registro = new Map<string, Rehidratavel>();
const agendados = new Map<string, ReturnType<typeof setTimeout>>();
/** Versão do servidor que este aparelho conhece, por store (sobrevive a recarregar). */
let versoes: Record<string, number> = {};
/** Último valor (canônico) que está igual no servidor: gravar igual não manda nada (evita eco). */
const conhecido: Record<string, string> = {};
let ativo = false;
let fonte: EventSource | undefined;

export type EstadoSincronia = 'desligada' | 'ok' | 'sem-conexao';
let estado: EstadoSincronia = 'desligada';
const ouvintesEstado = new Set<(e: EstadoSincronia) => void>();
function mudarEstado(e: EstadoSincronia) {
  if (e === estado) return;
  estado = e;
  for (const f of ouvintesEstado) f(e);
}
export const estadoSincronia = () => estado;
export function aoMudarSincronia(f: (e: EstadoSincronia) => void) {
  ouvintesEstado.add(f);
  return () => void ouvintesEstado.delete(f);
}

const ler = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const gravar = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    // cheio ou bloqueado: o servidor ainda tem
  }
};

function aparelho(): string {
  let id = ler(CHAVE_APARELHO);
  if (!id) {
    id = `${/iPhone|Android|Mobile/i.test(navigator.userAgent) ? 'cel' : 'pc'}-${Math.random().toString(36).slice(2, 10)}`;
    gravar(CHAVE_APARELHO, id);
  }
  return id;
}

const salvarVersoes = () => gravar(CHAVE_VERSOES, JSON.stringify(versoes));

/** JSON com as chaves em ordem: dois aparelhos podem escrever o mesmo estado em ordem diferente. */
function canonico(texto: string | null): string {
  if (texto === null) return '';
  try {
    const ordenar = (v: unknown): unknown =>
      Array.isArray(v) ? v.map(ordenar) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v as object).sort().map((k) => [k, ordenar((v as Record<string, unknown>)[k])])) : v;
    return JSON.stringify(ordenar(JSON.parse(texto)));
  } catch {
    return texto;
  }
}

/** Chegou um valor de outro aparelho: grava aqui e recarrega o store (a tela atualiza sozinha). */
async function aplicarRemoto(nome: string, valor: string, versao: number) {
  conhecido[nome] = canonico(valor);
  versoes[nome] = versao;
  salvarVersoes();
  gravar(nome, valor);
  await registro.get(nome)?.persist.rehydrate();
}

async function enviar(nome: string, tentativa = 0): Promise<void> {
  agendados.delete(nome);
  const valor = ler(nome);
  if (valor === null) return;
  const c = canonico(valor);
  if (c === conhecido[nome]) return;
  try {
    const r = await fetch(`/api/dados/${encodeURIComponent(nome)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ valor, base: versoes[nome] ?? -1, aparelho: aparelho() }),
    });
    const j = (await r.json().catch(() => ({}))) as { versao?: number; valor?: string };
    if (r.ok && typeof j.versao === 'number') {
      versoes[nome] = j.versao;
      conhecido[nome] = c;
      salvarVersoes();
      mudarEstado('ok');
    } else if (r.status === 409 && typeof j.valor === 'string' && typeof j.versao === 'number') {
      // Outro aparelho gravou antes (ex.: este celular acordou com dados velhos): vale o do servidor.
      await aplicarRemoto(nome, j.valor, j.versao);
    }
  } catch {
    // Sem rede agora: tenta de novo daqui a pouco (o valor continua guardado aqui).
    mudarEstado('sem-conexao');
    if (tentativa < 20) agendados.set(nome, setTimeout(() => void enviar(nome, tentativa + 1), Math.min(30_000, 3000 * (tentativa + 1))));
  }
}

function agendar(nome: string) {
  clearTimeout(agendados.get(nome));
  agendados.set(nome, setTimeout(() => void enviar(nome), 700));
}

/** O "armazém" que todos os stores usam (lib/persistir.ts): navegador + PC. */
export const armazem: StateStorage = {
  getItem: (nome) => ler(nome),
  setItem: (nome, valor) => {
    gravar(nome, valor);
    if (ativo && sincroniza(nome)) agendar(nome);
  },
  removeItem: (nome) => {
    try {
      localStorage.removeItem(nome);
    } catch {
      // ignore
    }
  },
};

export function registrarStore(nome: string, api: Rehidratavel) {
  registro.set(nome, api);
}

/**
 * Primeira vez deste aparelho com o PC: o estudo (matérias, tópicos, sessões...) é JUNTADO,
 * pra o que só existia aqui não sumir. Os outros stores ficam com o do PC.
 */
function juntarEstudo(doServidor: string, daqui: string): string {
  try {
    const s = JSON.parse(doServidor) as { state: Record<string, unknown>; version?: number };
    const a = JSON.parse(daqui) as { state: Record<string, unknown> };
    const porId = (k: string) => {
      const lista = [...((s.state[k] as { id: string }[]) ?? [])];
      const ids = new Set(lista.map((x) => x.id));
      for (const x of (a.state[k] as { id: string }[]) ?? []) if (!ids.has(x.id)) lista.push(x);
      return lista;
    };
    const obj = (k: string) => ({ ...((a.state[k] as object) ?? {}), ...((s.state[k] as object) ?? {}) });
    const ps = (s.state.profile ?? {}) as { xp?: number };
    const pa = (a.state.profile ?? {}) as { xp?: number };
    s.state = {
      ...s.state,
      subjects: porId('subjects'),
      topics: porId('topics'),
      sessions: porId('sessions'),
      challenges: porId('challenges'),
      plans: obj('plans'),
      checkins: obj('checkins'),
      profile: { ...ps, xp: Math.max(ps.xp ?? 0, pa.xp ?? 0) },
    };
    return JSON.stringify(s);
  } catch {
    return doServidor;
  }
}

async function conferirVersoes() {
  try {
    const r = await fetch('/api/dados?versoes=1', { cache: 'no-store' });
    if (!r.ok) return;
    const { chaves } = (await r.json()) as { chaves: Record<string, { versao: number }> };
    for (const [nome, it] of Object.entries(chaves)) {
      if (!sincroniza(nome) || it.versao <= (versoes[nome] ?? 0)) continue;
      const um = await fetch(`/api/dados/${encodeURIComponent(nome)}`, { cache: 'no-store' });
      if (um.ok) {
        const j = (await um.json()) as { valor: string; versao: number };
        await aplicarRemoto(nome, j.valor, j.versao);
      }
    }
    // O que mudou aqui enquanto estava sem rede vai agora.
    for (const nome of Object.keys(localStorage)) if (sincroniza(nome)) agendar(nome);
    mudarEstado('ok');
  } catch {
    mudarEstado('sem-conexao');
  }
}

function ouvirMudancas() {
  fonte?.close();
  fonte = new EventSource('/api/dados/eventos');
  let primeira = true;
  fonte.onopen = () => {
    mudarEstado('ok');
    // Reconectou (celular acordou, rede voltou): confere o que mudou enquanto estava fora.
    if (!primeira) void conferirVersoes();
    primeira = false;
  };
  fonte.onerror = () => mudarEstado('sem-conexao');
  fonte.onmessage = (ev) => {
    try {
      const { nome, versao, por } = JSON.parse(ev.data) as { nome: string; versao: number; por: string };
      if (por === aparelho() || !sincroniza(nome) || versao <= (versoes[nome] ?? 0)) return;
      void fetch(`/api/dados/${encodeURIComponent(nome)}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : undefined))
        .then((j?: { valor: string; versao: number }) => j && aplicarRemoto(nome, j.valor, j.versao));
    } catch {
      // aviso estranho: ignora
    }
  };
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void conferirVersoes();
  });
}

/**
 * Roda ANTES do app abrir: baixa do PC o que for mais novo, sobe o que só existe aqui
 * e começa a ouvir. Sem servidor (ex.: versão publicada na Vercel), o app segue só no navegador.
 */
export async function iniciarSincronia(): Promise<void> {
  try {
    versoes = JSON.parse(ler(CHAVE_VERSOES) ?? '{}') as Record<string, number>;
  } catch {
    versoes = {};
  }
  let chaves: Record<string, { valor: string; versao: number }>;
  try {
    const r = await fetch('/api/dados', { cache: 'no-store', signal: AbortSignal.timeout(4000) });
    if (!r.ok || !(r.headers.get('Content-Type') ?? '').includes('json')) return;
    chaves = ((await r.json()) as { chaves: typeof chaves }).chaves ?? {};
  } catch {
    return; // sem PC: segue só com o navegador
  }
  const primeiraVez = ler(CHAVE_JA_SINCRONIZOU) !== '1';

  for (const [nome, it] of Object.entries(chaves)) {
    if (!sincroniza(nome)) continue;
    const local = ler(nome);
    const igual = local !== null && canonico(local) === canonico(it.valor);
    if (igual || local === null) {
      gravar(nome, it.valor);
      conhecido[nome] = canonico(it.valor);
      versoes[nome] = it.versao;
      continue;
    }
    // Diferente do PC.
    if (!primeiraVez && (versoes[nome] ?? -1) === it.versao) {
      // Ninguém gravou no PC desde a última vez: a diferença é daqui (mudou sem rede). Sobe.
      conhecido[nome] = canonico(it.valor);
      continue;
    }
    // O PC é mais novo. Guarda a cópia daqui (nunca apaga sem guardar) e fica com o do PC.
    gravar(`neural-os-sync.antes.${nome}`, local);
    const final = primeiraVez && nome === 'neural-os.v2' ? juntarEstudo(it.valor, local) : it.valor;
    gravar(nome, final);
    conhecido[nome] = canonico(it.valor);
    versoes[nome] = it.versao;
  }
  salvarVersoes();
  gravar(CHAVE_JA_SINCRONIZOU, '1');
  ativo = true;
  mudarEstado('ok');
  // Sobe o que só existe aqui, ou o que ficou diferente (a junção do estudo, mudanças sem rede).
  for (const nome of Object.keys(localStorage)) if (sincroniza(nome)) agendar(nome);
  ouvirMudancas();
}
