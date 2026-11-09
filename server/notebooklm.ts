import { execFile, spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

// Ponte com o NotebookLM pela CLI `notebooklm` (notebooklm-py, não oficial).
// Cada caderno = uma matéria; cada fonte = uma aula (PDF dos slides).
// O texto das aulas fica em cache no PC (não muda), as listas por 10 min.
// Se o Google mudar o site: atualizar a lib (`pip install -U notebooklm-py`)
// no venv dela e, se pedir, `notebooklm login`.

export interface Caderno {
  id: string;
  titulo: string;
}
export interface Fonte {
  id: string;
  titulo: string;
  tipo: string;
  criadaEm: string;
}

const LISTA_MS = 10 * 60 * 1000;

export function criarNotebookLM(raiz: string, env: () => Promise<Record<string, string>>) {
  const cachePath = path.join(raiz, 'notebooklm.cache.local.json');
  type Cache = { listas: Record<string, { quando: number; dados: unknown }>; textos: Record<string, string> };
  let cache: Cache | null = null;

  const lerCache = async (): Promise<Cache> => {
    if (cache) return cache;
    try {
      cache = JSON.parse(await fs.readFile(cachePath, 'utf8')) as Cache;
    } catch {
      cache = { listas: {}, textos: {} };
    }
    return cache;
  };
  const gravarCache = async () => cache && fs.writeFile(cachePath, JSON.stringify(cache), 'utf8');

  const noWindows = process.platform === 'win32';
  const dentro = (pasta: string, nome: string) => path.join(pasta, noWindows ? 'Scripts' : 'bin', noWindows ? `${nome}.exe` : nome);
  const existe = (p: string) => fs.access(p).then(() => true, () => false);

  /**
   * Onde estão a CLI, o python dela e os navegadores. Ordem: o que estiver no .env.local;
   * a pasta `.notebooklm-venv` dentro do projeto (o botão "Instalar" cria ela); e, por último,
   * o layout antigo do Hugo (3 pastas acima do projeto).
   */
  const caminhos = async () => {
    const e = await env();
    const local = path.join(raiz, '.notebooklm-venv');
    const antigo = path.resolve(raiz, '..', '..', '..', '.notebooklm-venv');
    const pasta = e.NOTEBOOKLM_VENV || ((await existe(dentro(local, 'notebooklm'))) ? local : (await existe(dentro(antigo, 'notebooklm'))) ? antigo : local);
    const navegadores = e.PLAYWRIGHT_BROWSERS_PATH || (pasta === antigo ? path.resolve(raiz, '..', '..', '..', '.playwright-browsers') : path.join(raiz, '.playwright-browsers'));
    return {
      pasta,
      local,
      navegadores,
      bin: dentro(pasta, 'notebooklm'),
      python: dentro(pasta, 'python'),
      perfil: path.join(os.homedir(), '.notebooklm', 'profiles', 'default', 'browser_profile'),
      // HEADLESS_REAUTH: quando o acesso vence, a lib tenta renovar sozinha usando a
      // sessão do Google guardada no perfil dela (sem abrir janela).
      ambiente: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: navegadores, PYTHONIOENCODING: 'utf-8', NOTEBOOKLM_HEADLESS_REAUTH: '1' },
    };
  };

  /** Roda a CLI com --json e devolve o objeto (ou lança com a mensagem dela). */
  const rodar = async (args: string[]): Promise<Record<string, unknown>> => {
    const { bin, ambiente } = await caminhos();
    const saida = await new Promise<string>((ok, falha) =>
      execFile(bin, [...args, '--json'], { timeout: 120_000, windowsHide: true, maxBuffer: 20_000_000, env: ambiente }, (erro, stdout) => {
        if (stdout?.trim()) return ok(stdout);
        falha(new Error(erro?.code === 'ENOENT' ? 'NotebookLM não instalado neste PC (CLI notebooklm).' : `NotebookLM não respondeu: ${erro?.message ?? 'sem saída'}`));
      }),
    );
    const dados = JSON.parse(saida) as Record<string, unknown>;
    if (dados.error) throw new Error(`NotebookLM: ${String(dados.message ?? dados.code)}`);
    return dados;
  };

  const lista = async <T>(chave: string, buscar: () => Promise<T>, forcar = false): Promise<T> => {
    const c = await lerCache();
    const guardado = c.listas[chave];
    if (!forcar && guardado && Date.now() - guardado.quando < LISTA_MS) return guardado.dados as T;
    const dados = await buscar();
    c.listas[chave] = { quando: Date.now(), dados };
    await gravarCache();
    return dados;
  };

  // Login pelo botão do app: abre a janela do Google; quem digita é a pessoa.
  let login: { fase: 'parado' | 'janela' | 'capturando' | 'pronto' | 'erro'; erro?: string } = { fase: 'parado' };

  /** Salva o acesso a partir do perfil já logado, com o MESMO navegador que fez o login. */
  const capturar = async (navegador: string) => {
    const { bin, ambiente } = await caminhos();
    const args = ['login', '--browser-timeout', '120', ...(navegador !== 'chromium' ? ['--browser', navegador] : [])];
    await new Promise<void>((ok, falha) =>
      execFile(bin, args, { timeout: 180_000, windowsHide: true, env: ambiente }, (erro, _out, stderr) =>
        erro ? falha(new Error(String(stderr || erro.message).trim().split('\n').slice(-3).join(' '))) : ok(),
      ),
    );
  };

  const entrar = async () => {
    if (login.fase === 'janela' || login.fase === 'capturando') return;
    const { python, perfil, ambiente } = await caminhos();
    login = { fase: 'janela' };
    const janela = spawn(python, ['-I', path.join(import.meta.dirname, 'notebooklm_entrar.py'), perfil], { env: ambiente });
    let saida = '';
    let erros = '';
    janela.stdout.on('data', (d: Buffer) => (saida += d.toString('utf8')));
    janela.stderr.on('data', (d: Buffer) => (erros += d.toString('utf8')));
    janela.on('error', () => (login = { fase: 'erro', erro: 'Não consegui abrir a janela: o NotebookLM não está instalado neste PC.' }));
    janela.on('close', () => {
      if (login.fase !== 'janela') return;
      if (!saida.includes('LOGIN_OK')) {
        // Diz o motivo de verdade (antes era sempre "fechou antes", e ninguém sabia por quê).
        const motivo = saida.includes('BLOQUEADO')
          ? 'O Google bloqueou o login nessa janela ("navegador pode não ser seguro"). Instale o Google Chrome e tente de novo: a janela abre nele.'
          : saida.includes('SEM_NAVEGADOR')
            ? `Não consegui abrir nenhum navegador. ${erros.trim().split('\n').slice(-1)[0] ?? ''}`
            : !saida.includes('JANELA_ABERTA')
              ? `A janela não chegou a abrir: ${erros.trim().split('\n').slice(-2).join(' ').slice(0, 300) || 'erro desconhecido'}`
              : 'A janela fechou antes do NotebookLM abrir logado. Entre na conta e espere a página do NotebookLM carregar: a janela fecha sozinha.';
        login = { fase: 'erro', erro: motivo };
        return;
      }
      login = { fase: 'capturando' };
      const navegador = /NAVEGADOR (\w+)/.exec(saida)?.[1] ?? 'chromium';
      capturar(navegador)
        .then(async () => {
          const c = await lerCache();
          delete c.listas.cadernos; // a lista antiga pode ter sido a do erro
          login = { fase: 'pronto' };
        })
        .catch((e: unknown) => (login = { fase: 'erro', erro: `Entrou no Google, mas não consegui guardar o acesso: ${e instanceof Error ? e.message : e}` }));
    });
  };

  // ── Instalação guiada (botão "Instalar o NotebookLM") ──────────────────────
  // Cria um ambiente Python só do app dentro do projeto (.notebooklm-venv), instala a
  // biblioteca e baixa o navegador que ela usa pro login. Nada fora dessa pasta é mexido.
  type Instalacao = { fase: 'parado' | 'rodando' | 'pronto' | 'erro'; passo?: string; passoN?: number; total: number; erro?: string };
  let instalacao: Instalacao = { fase: 'parado', total: 4 };

  const executar = (cmd: string, args: string[], extra: { env?: NodeJS.ProcessEnv; timeout?: number } = {}) =>
    new Promise<string>((ok, falha) =>
      execFile(cmd, args, { timeout: extra.timeout ?? 10 * 60_000, windowsHide: true, maxBuffer: 20_000_000, env: extra.env ?? process.env, encoding: 'utf8' }, (erro, stdout, stderr) => {
        if (erro) return falha(Object.assign(new Error((stderr || erro.message).toString().trim().split('\n').slice(-4).join(' ')), { code: (erro as NodeJS.ErrnoException).code }));
        ok(`${stdout}${stderr}`);
      }),
    );

  /** Procura um Python 3.10+ no PC (o instalador do python.org põe `py`/`python` no PATH). */
  const acharPython = async (): Promise<{ cmd: string; args: string[] } | null> => {
    const candidatos = noWindows
      ? [{ cmd: 'py', args: ['-3'] }, { cmd: 'python', args: [] }, { cmd: 'python3', args: [] }]
      : [{ cmd: 'python3', args: [] }, { cmd: 'python', args: [] }];
    for (const c of candidatos) {
      try {
        const v = /Python (\d+)\.(\d+)/.exec(await executar(c.cmd, [...c.args, '--version'], { timeout: 15_000 }));
        if (v && (Number(v[1]) > 3 || (Number(v[1]) === 3 && Number(v[2]) >= 10))) return c;
      } catch {
        /* esse não existe: tenta o próximo */
      }
    }
    return null;
  };

  const instalar = () => {
    if (instalacao.fase === 'rodando') return;
    instalacao = { fase: 'rodando', passo: 'Procurando o Python no seu PC', passoN: 1, total: 4 };
    void (async () => {
      try {
        const py = await acharPython();
        if (!py) throw new Error('Não achei o Python (versão 3.10 ou mais nova). Instale em python.org/downloads, marque "Add Python to PATH" no instalador, e aperte "Instalar" de novo.');
        // O navegador vai pra pasta do ambiente que ESTA instalação cria (bug de 09/11: com o
        // ambiente antigo ainda na máquina, ele baixava na pasta antiga e o login não achava).
        const { local, ambiente: amb } = await caminhos();
        const navegadores = (await env()).PLAYWRIGHT_BROWSERS_PATH || path.join(raiz, '.playwright-browsers');
        const ambiente = { ...amb, PLAYWRIGHT_BROWSERS_PATH: navegadores };
        const pythonLocal = dentro(local, 'python');
        instalacao = { ...instalacao, passo: 'Criando o ambiente do NotebookLM', passoN: 2 };
        if (!(await existe(pythonLocal))) await executar(py.cmd, [...py.args, '-m', 'venv', local]);
        instalacao = { ...instalacao, passo: 'Baixando o NotebookLM (alguns minutos)', passoN: 3 };
        await executar(pythonLocal, ['-m', 'pip', 'install', '--disable-pip-version-check', 'notebooklm-py[browser]'], { env: ambiente });
        instalacao = { ...instalacao, passo: 'Baixando o navegador do login (uns 150 MB, só uma vez)', passoN: 4 };
        await executar(pythonLocal, ['-m', 'playwright', 'install', 'chromium'], { env: { ...ambiente, PLAYWRIGHT_BROWSERS_PATH: navegadores } });
        const c = await lerCache();
        delete c.listas.cadernos;
        instalacao = { fase: 'pronto', total: 4 };
      } catch (e) {
        instalacao = { fase: 'erro', total: 4, erro: e instanceof Error ? e.message : String(e) };
      }
    })();
  };

  /** Cutucão: a sessão do Google esfria parada; a lib pede um a cada 15-20 min. */
  const cutucar = async () => {
    const { bin, ambiente } = await caminhos();
    await new Promise<void>((ok) => execFile(bin, ['auth', 'refresh'], { timeout: 90_000, windowsHide: true, env: ambiente }, () => ok()));
  };

  return {
    entrar,
    cutucar,
    instalar,
    statusInstalacao: () => instalacao,
    /** A biblioteca está instalada neste PC? (não diz se está logada) */
    instalado: async () => existe((await caminhos()).bin),
    statusLogin: () => login,
    cadernos: (forcar = false) =>
      lista('cadernos', async () => ((await rodar(['list'])).notebooks as { id: string; title: string }[]).map((n) => ({ id: n.id, titulo: n.title })), forcar) as Promise<Caderno[]>,

    fontes: (caderno: string, forcar = false) =>
      lista(
        `fontes:${caderno}`,
        async () =>
          ((await rodar(['source', 'list', '-n', caderno])).sources as { id: string; title: string; type: string; created_at: string }[]).map((s) => ({
            id: s.id,
            titulo: s.title,
            tipo: s.type,
            criadaEm: s.created_at,
          })),
        forcar,
      ) as Promise<Fonte[]>,

    /** Texto inteiro de uma aula (slides). Não muda: fica em cache pra sempre. */
    texto: async (caderno: string, fonte: string): Promise<string> => {
      const c = await lerCache();
      if (c.textos[fonte]) return c.textos[fonte];
      const t = String((await rodar(['source', 'fulltext', fonte, '-n', caderno])).content ?? '');
      // Vazio NÃO fica em cache: o NotebookLM às vezes não tem o texto (PDF só de imagem, upload
      // que falhou). Se a pessoa reenviar o arquivo, a próxima leitura pega o texto novo.
      if (t.trim()) {
        c.textos[fonte] = t;
        await gravarCache();
      }
      return t;
    },

    /** Pergunta ao caderno (responde com base nas fontes dele). */
    perguntar: async (caderno: string, pergunta: string): Promise<string> => {
      const r = await rodar(['ask', pergunta, '-n', caderno]);
      return String(r.answer ?? r.response ?? r.text ?? '');
    },
  };
}

export type NotebookLM = ReturnType<typeof criarNotebookLM>;
