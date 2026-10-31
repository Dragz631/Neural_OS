import { CheckCircle2, Download, ExternalLink, FolderOpen, LogIn, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { postConexoes, useConexoes } from '../../store/conexoes';
import { Badge, Button, ErrorNote, Input, Modal } from '../ui';
import { cn } from '../../lib/utils';

// "Conectar fontes": o que o professor pode ler. Tudo é opcional, e cada cartão diz em uma
// frase o que fazer AGORA. Nada exige abrir arquivo de configuração nem terminal.

interface InfoPasta {
  caminho: string;
  existe: boolean;
  ehObsidian: boolean;
  notas: number;
}
interface PastasEstado {
  cofre: (InfoPasta & { origem: 'app' | 'env' }) | null;
  extras: (InfoPasta & { id: string; nome: string })[];
}
interface FontesEstado {
  notion: { conectado: boolean; paginas?: string[]; total?: number; erro?: string };
  notebooklm: { instalado: boolean; conectado: boolean; cadernos?: { id: string; titulo: string }[]; erro?: string };
}
interface Instalacao {
  fase: 'parado' | 'rodando' | 'pronto' | 'erro';
  passo?: string;
  passoN?: number;
  total: number;
  erro?: string;
}
interface Login {
  fase: 'parado' | 'janela' | 'capturando' | 'pronto' | 'erro';
  erro?: string;
}

async function api<T>(rota: string, corpo?: unknown): Promise<T> {
  const r = await fetch(rota, corpo === undefined ? undefined : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.erro ?? `Erro ${r.status}`);
  return d as T;
}
const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

function Cartao({ titulo, ok, agora, children }: { titulo: string; ok: boolean; agora: string; children: ReactNode }) {
  return (
    <section className={cn('space-y-3 rounded border bg-bg p-3', ok ? 'border-accent/40' : 'border-line')}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-sm font-bold text-fg">{titulo}</h3>
        <Badge color={ok ? 'var(--color-accent)' : 'var(--color-warn)'}>{ok ? 'conectado' : 'falta conectar'}</Badge>
      </div>
      <p className="rounded border-l-2 border-accent bg-accent/5 px-2 py-1 text-xs">
        <b className="text-accent">Agora:</b> {agora}
      </p>
      {children}
    </section>
  );
}

const Passo = ({ n, children }: { n: number; children: ReactNode }) => (
  <li className="flex gap-2 text-xs leading-relaxed">
    <span className="mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-accent text-[10px] font-bold text-accent">{n}</span>
    <div className="min-w-0 flex-1 space-y-1.5">{children}</div>
  </li>
);

export function ConectarFontes({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [pastas, setPastas] = useState<PastasEstado | null>(null);
  const [fontes, setFontes] = useState<FontesEstado | null>(null);
  const [olhando, setOlhando] = useState(false);

  const carregarPastas = useCallback(async () => setPastas(await api<PastasEstado>('/api/pastas').catch(() => null)), []);
  const carregarFontes = useCallback(async (forcar = false) => {
    setOlhando(true);
    setFontes(await api<FontesEstado>(`/api/fontes${forcar ? '?forcar=1' : ''}`).catch(() => null));
    setOlhando(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    void carregarPastas();
    void carregarFontes();
    void useConexoes.getState().recarregar();
  }, [open, carregarPastas, carregarFontes]);

  return (
    <Modal open={open} onClose={onClose} title="Conectar fontes // o que o professor pode ler" wide>
      <div className="space-y-4 text-sm">
        <p className="text-xs leading-relaxed text-muted">
          Tudo aqui é <b className="text-fg">opcional</b>: conecte só o que você usa. Quanto mais o professor conhece do que você estuda, melhores ficam as aulas e os desafios. Você pode voltar aqui quando quiser, e cada cartão diz o que fazer agora.
        </p>
        {!pastas && !fontes && <ErrorNote error="Não consegui falar com o servidor do app. Ele está ligado (npm run dev)?" />}

        <CartaoObsidian pastas={pastas} recarregar={carregarPastas} />
        <CartaoExtras pastas={pastas} recarregar={carregarPastas} />
        <CartaoNotionGuia fontes={fontes} olhando={olhando} olhar={() => carregarFontes(true)} />
        <CartaoNotebookLM fontes={fontes} olhando={olhando} olhar={() => carregarFontes(true)} />
      </div>
    </Modal>
  );
}

// ── Obsidian ────────────────────────────────────────────────────────────────

function CartaoObsidian({ pastas, recarregar }: { pastas: PastasEstado | null; recarregar: () => Promise<void> }) {
  const [esperando, setEsperando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [colar, setColar] = useState('');
  const cofre = pastas?.cofre;

  const escolher = async (caminho?: string) => {
    setErro(null);
    setEsperando(true);
    try {
      await api('/api/pastas/escolher', { papel: 'cofre', caminho });
      setColar('');
      await recarregar();
    } catch (e) {
      setErro(msg(e));
    } finally {
      setEsperando(false);
    }
  };
  const desconectar = async () => {
    await api('/api/pastas/remover', { id: 'cofre' });
    await recarregar();
  };

  return (
    <Cartao titulo="Obsidian (suas notas)" ok={!!cofre?.existe} agora={cofre?.existe ? 'Nada. Está conectado. O professor lê suas notas e o app guarda as aulas lá.' : 'Aperte "Escolher a pasta do meu cofre" e navegue até ele. Se não usa Obsidian, pode pular.'}>
      <p className="text-xs leading-relaxed text-muted">O Obsidian é um app de notas em arquivos. Conectando, o Neural-OS salva as suas aulas e o seu diário de estudo nele, e o professor pode ler as suas notas de lá.</p>

      {cofre?.existe ? (
        <div className="space-y-1.5 text-xs">
          <p className="break-all rounded border border-line bg-panel px-2 py-1.5 font-mono text-[11px]">{cofre.caminho}</p>
          <p className="flex items-center gap-1.5 text-muted">
            <CheckCircle2 size={13} className="text-accent" />
            {cofre.ehObsidian ? `É um cofre do Obsidian, com ${cofre.notas} nota(s).` : `Pasta encontrada com ${cofre.notas} nota(s). Ela não tem a pasta .obsidian, então talvez não seja um cofre, mas funciona do mesmo jeito.`}
          </p>
          {cofre.origem === 'env' && <p className="text-muted">Veio do arquivo .env.local. Se trocar a pasta aqui, o app passa a usar a nova.</p>}
        </div>
      ) : (
        cofre && <ErrorNote error={`A pasta "${cofre.caminho}" não existe mais. Escolha de novo.`} />
      )}

      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => escolher()} disabled={esperando}>
          <FolderOpen size={14} /> {esperando ? 'Escolha na janela que abriu…' : cofre?.existe ? 'Trocar a pasta' : 'Escolher a pasta do meu cofre'}
        </Button>
        {cofre && (
          <Button onClick={desconectar} disabled={esperando}>
            Desconectar
          </Button>
        )}
      </div>
      {esperando && <p className="text-xs text-muted">Uma janela abriu no seu computador (se não aparecer, olhe na barra de tarefas). Navegue até a pasta do cofre e aperte OK.</p>}
      <ErrorNote error={erro} />

      <details className="text-xs text-muted">
        <summary className="cursor-pointer hover:text-accent">A janela não abriu? Cole o caminho da pasta</summary>
        <div className="mt-2 flex gap-2">
          <Input value={colar} onChange={(e) => setColar(e.target.value)} placeholder="Ex.: C:\Users\voce\Documents\MeuCofre" aria-label="Caminho da pasta do cofre" />
          <Button onClick={() => escolher(colar)} disabled={esperando || !colar.trim()}>
            Usar
          </Button>
        </div>
      </details>
    </Cartao>
  );
}

// ── Pastas extras ────────────────────────────────────────────────────────────

function CartaoExtras({ pastas, recarregar }: { pastas: PastasEstado | null; recarregar: () => Promise<void> }) {
  const [esperando, setEsperando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const extras = pastas?.extras ?? [];

  const adicionar = async () => {
    setErro(null);
    setEsperando(true);
    try {
      await api('/api/pastas/escolher', { papel: 'extra' });
      await recarregar();
    } catch (e) {
      setErro(msg(e));
    } finally {
      setEsperando(false);
    }
  };

  return (
    <Cartao titulo="Outras pastas de estudo" ok={extras.length > 0} agora={extras.length ? 'Nada. Pode adicionar mais pastas se quiser.' : 'Se você guarda resumos, apostilas ou anotações em outras pastas, adicione aqui. É opcional.'}>
      <p className="text-xs leading-relaxed text-muted">
        Qualquer pasta com arquivos <code>.md</code> ou <code>.txt</code> (resumos, apostilas convertidas, anotações). Quando você pede uma aula ou um desafio sobre um assunto, o professor procura trechos nelas. O app <b className="text-fg">só lê</b>: nunca escreve nem apaga nada nessas pastas.
      </p>
      {extras.length > 0 && (
        <ul className="space-y-1.5">
          {extras.map((e) => (
            <li key={e.id} className="flex items-center gap-2 rounded border border-line bg-panel px-2 py-1.5 text-xs">
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-fg">{e.nome}</p>
                <p className="truncate font-mono text-[10px] text-muted">{e.caminho}</p>
              </div>
              <span className="shrink-0 text-muted">{e.existe ? `${e.notas} nota(s)` : 'pasta não encontrada'}</span>
              <button
                type="button"
                aria-label={`Remover ${e.nome}`}
                className="shrink-0 text-muted hover:text-danger"
                onClick={async () => {
                  await api('/api/pastas/remover', { id: e.id });
                  await recarregar();
                }}
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Button onClick={adicionar} disabled={esperando}>
        <Plus size={14} /> {esperando ? 'Escolha na janela que abriu…' : 'Adicionar uma pasta'}
      </Button>
      <ErrorNote error={erro} />
    </Cartao>
  );
}

// ── Notion ───────────────────────────────────────────────────────────────────

function CartaoNotionGuia({ fontes, olhando, olhar }: { fontes: FontesEstado | null; olhando: boolean; olhar: () => void }) {
  const temChave = useConexoes((s) => s.temNotion);
  const [chave, setChave] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const n = fontes?.notion;
  const enxerga = !!n?.conectado;

  const salvar = async () => {
    setErro(null);
    setOcupado(true);
    try {
      await postConexoes('notion', { token: chave });
      setChave('');
      await useConexoes.getState().recarregar();
      await postConexoes('notion/testar', {}); // falha aqui = chave errada
      olhar();
    } catch (e) {
      setErro(`${msg(e)} Confira se copiou a chave inteira, sem espaços.`);
    } finally {
      setOcupado(false);
    }
  };

  const agora = enxerga
    ? 'Nada. O professor já enxerga suas páginas.'
    : !temChave
      ? 'Siga os passos 1 a 3 abaixo (leva uns 2 minutos).'
      : 'Passo 4: libere as páginas que o professor pode ler, e aperte "Olhar de novo".';

  return (
    <Cartao titulo="Notion" ok={enxerga} agora={agora}>
      <p className="text-xs leading-relaxed text-muted">
        O professor lê as páginas que <b className="text-fg">você liberar</b> (grade, matérias, prazos, anotações) e só escreve nas notas que ele mesmo cria. O Notion não deixa apps entrarem direto na sua conta; por isso você cria uma "integração" sua, que enxerga só o que você escolher.
      </p>
      <ol className="space-y-3">
        <Passo n={1}>
          <p>Abra a página de integrações do Notion (entre na sua conta se pedir).</p>
          <a href="https://www.notion.so/my-integrations" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded border border-accent px-2.5 py-1 font-bold text-accent hover:bg-accent/10">
            <ExternalLink size={12} /> Abrir as integrações do Notion
          </a>
        </Passo>
        <Passo n={2}>
          <p>
            Clique em <b>Nova integração</b>. Nome: <b>Neural-OS</b>. Tipo: <b>Interna</b>. Escolha o seu espaço de trabalho e salve.
          </p>
        </Passo>
        <Passo n={3}>
          <p>
            Na integração criada, copie o <b>Segredo da integração interna</b> (aperte "Mostrar" e depois "Copiar") e cole aqui:
          </p>
          <div className="flex gap-2">
            <Input type="password" autoComplete="off" value={chave} onChange={(e) => setChave(e.target.value)} placeholder={temChave ? 'Já configurada ✓ (cole outra pra trocar)' : 'Cole o segredo aqui'} aria-label="Segredo da integração do Notion" />
            <Button variant="primary" onClick={salvar} disabled={ocupado || !chave.trim()}>
              {ocupado ? 'Testando…' : 'Salvar e testar'}
            </Button>
          </div>
          <p className="text-muted">O segredo fica só no seu computador (arquivo .env.local) e nunca volta pra tela.</p>
        </Passo>
        <Passo n={4}>
          <p>
            No Notion, abra cada página que o professor pode ler, clique em <b>•••</b> (canto de cima) → <b>Conexões</b> → <b>Neural-OS</b>. Dá pra liberar uma página "mãe" (as de dentro vêm junto).
          </p>
          <Button onClick={olhar} disabled={olhando || !temChave}>
            <RefreshCw size={13} className={olhando ? 'animate-spin' : ''} /> {olhando ? 'Olhando…' : 'Olhar de novo'}
          </Button>
          {enxerga && (
            <p className="rounded border border-accent/40 bg-accent/10 p-2 text-accent">
              Enxergo {n?.total} página(s)/banco(s){n?.paginas?.length ? `: ${n.paginas.join(', ')}` : ''}.
            </p>
          )}
          {temChave && !enxerga && n?.erro && <p className="text-warn">{n.erro}</p>}
        </Passo>
      </ol>
      <ErrorNote error={erro} />
    </Cartao>
  );
}

// ── NotebookLM ───────────────────────────────────────────────────────────────

function CartaoNotebookLM({ fontes, olhando, olhar }: { fontes: FontesEstado | null; olhando: boolean; olhar: () => void }) {
  const b = fontes?.notebooklm;
  const [inst, setInst] = useState<Instalacao | null>(null);
  const [login, setLogin] = useState<Login | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  // Enquanto instala, pergunta ao servidor em que passo está.
  useEffect(() => {
    if (inst?.fase !== 'rodando') return;
    const t = setInterval(async () => {
      const novo = await api<Instalacao>('/api/notebooklm/instalar').catch(() => null);
      if (!novo) return;
      setInst(novo);
      if (novo.fase === 'pronto') olhar();
    }, 2000);
    return () => clearInterval(t);
  }, [inst?.fase, olhar]);

  // Enquanto a janela do Google está aberta, também.
  useEffect(() => {
    if (login?.fase !== 'janela' && login?.fase !== 'capturando') return;
    const t = setInterval(async () => {
      const novo = await api<Login>('/api/notebooklm/entrar').catch(() => null);
      if (!novo) return;
      setLogin(novo);
      if (novo.fase === 'pronto') olhar();
    }, 2000);
    return () => clearInterval(t);
  }, [login?.fase, olhar]);

  const instalar = async () => {
    setErro(null);
    try {
      setInst(await api<Instalacao>('/api/notebooklm/instalar', {}));
    } catch (e) {
      setErro(msg(e));
    }
  };
  const entrar = async () => {
    setErro(null);
    try {
      setLogin(await api<Login>('/api/notebooklm/entrar', {}));
    } catch (e) {
      setErro(msg(e));
    }
  };

  const instalado = !!b?.instalado || inst?.fase === 'pronto';
  const instalando = inst?.fase === 'rodando';
  const entrando = login?.fase === 'janela' || login?.fase === 'capturando';
  const agora = b?.conectado ? 'Nada. Está conectado.' : !instalado ? 'Aperte "Instalar o NotebookLM" e espere (uns 3 a 5 minutos, só uma vez).' : 'Aperte "Entrar no Google" e entre na sua conta na janela que abrir.';

  return (
    <Cartao titulo="NotebookLM (Google)" ok={!!b?.conectado} agora={agora}>
      <p className="text-xs leading-relaxed text-muted">
        O NotebookLM guarda os slides e materiais de cada matéria em "cadernos". Conectando, o professor lê o conteúdo real das suas aulas. Dica: crie um caderno por matéria.
      </p>

      {b?.conectado && (
        <p className="rounded border border-accent/40 bg-accent/10 p-2 text-xs text-accent">
          {b.cadernos?.length ?? 0} caderno(s){b.cadernos?.length ? `: ${b.cadernos.map((c) => c.titulo).join(', ')}` : '. Crie um no site do NotebookLM e aperte "Olhar de novo".'}
        </p>
      )}

      {!instalado && (
        <div className="space-y-2 text-xs">
          <p className="text-muted">
            <b className="text-fg">Passo 1 de 2: instalar.</b> O app precisa de uma peça no seu computador (cria uma pasta só dele dentro do projeto e baixa um navegador pro login; precisa do Python 3.10 ou mais novo e de internet).
          </p>
          <Button variant="primary" onClick={instalar} disabled={instalando}>
            <Download size={14} /> {instalando ? 'Instalando…' : 'Instalar o NotebookLM'}
          </Button>
          {instalando && inst && (
            <div className="space-y-1">
              <div className="h-1.5 overflow-hidden rounded bg-panel-2">
                <div className="h-full bg-accent transition-all" style={{ width: `${((inst.passoN ?? 1) / inst.total) * 100}%` }} />
              </div>
              <p className="text-muted">
                Passo {inst.passoN} de {inst.total}: {inst.passo}. Pode deixar essa janela aberta.
              </p>
            </div>
          )}
          {inst?.fase === 'erro' && <ErrorNote error={inst.erro} />}
        </div>
      )}

      {instalado && !b?.conectado && (
        <div className="space-y-2 text-xs">
          <p className="text-muted">
            <b className="text-fg">Passo 2 de 2: entrar na sua conta Google.</b> Uma janela de navegador vai abrir: entre normalmente (o app nunca vê a sua senha). Quando o NotebookLM aparecer, a janela fecha sozinha.
          </p>
          <Button variant="primary" onClick={entrar} disabled={entrando}>
            <LogIn size={14} /> {entrando ? 'Esperando você entrar na janela…' : 'Entrar no Google'}
          </Button>
          {login?.fase === 'erro' && <p className="text-warn">{login.erro}</p>}
          {b?.erro && !/login|auth|expired|cookie|storage|sign/i.test(b.erro) && <p className="text-warn">{b.erro}</p>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={olhar} disabled={olhando}>
          <RefreshCw size={13} className={olhando ? 'animate-spin' : ''} /> {olhando ? 'Olhando…' : 'Olhar de novo'}
        </Button>
        {b?.conectado && <span className="text-[11px] text-muted">Se a sessão do Google vencer, é só entrar de novo aqui.</span>}
      </div>
      <ErrorNote error={erro} />
    </Cartao>
  );
}
