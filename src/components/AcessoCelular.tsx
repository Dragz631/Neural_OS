import { Copy, Download, Power, RefreshCw, Smartphone } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button, ErrorNote, Modal } from './ui';

// "Usar no celular": o PC abre um túnel (qualquer rede, até 5G) e mostra um PIN novo
// toda vez. Quem digita o PIN no celular entra; o PIN serve uma vez e vale 10 minutos.

interface Estado {
  cloudflared: 'ok' | 'faltando';
  instalacao: { fase: 'parado' | 'baixando' | 'pronto' | 'erro'; baixado?: number; total?: number; erro?: string };
  subindo: boolean;
  ativo: boolean;
  url?: string;
  pin?: string;
  pinExpiraEm?: number;
  aparelhos: number;
  erro?: string;
  podeInstalar: boolean;
}

async function chamar<T>(rota: string, post = false): Promise<T> {
  const r = await fetch(rota, post ? { method: 'POST' } : undefined);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.erro ?? `Erro ${r.status}`);
  return d as T;
}

export function AcessoCelular({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [e, setE] = useState<Estado | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);
  const [agora, setAgora] = useState(Date.now());

  const ler = useCallback(async () => {
    try {
      setE(await chamar<Estado>('/__acesso/estado'));
    } catch {
      setE(null);
    }
  }, []);

  // Enquanto aberto, olha o estado a cada 2 s (o túnel leva alguns segundos pra subir).
  useEffect(() => {
    if (!open) return;
    void ler();
    const id = setInterval(() => {
      void ler();
      setAgora(Date.now());
    }, 2000);
    return () => clearInterval(id);
  }, [open, ler]);

  const acao = async (rota: string) => {
    setErro(null);
    try {
      await chamar(rota, true);
    } catch (x) {
      setErro(x instanceof Error ? x.message : String(x));
    }
    await ler();
  };

  const copiar = async (texto: string, chave: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(chave);
      setTimeout(() => setCopiado(null), 1500);
    } catch {
      /* sem permissão da área de transferência: a pessoa copia na mão */
    }
  };

  const restaMin = e?.pinExpiraEm ? Math.max(0, Math.ceil((e.pinExpiraEm - agora) / 60_000)) : 0;
  const baixando = e?.instalacao.fase === 'baixando';
  const mb = (n?: number) => (n ? `${Math.round(n / 1_000_000)} MB` : '');

  return (
    <Modal open={open} onClose={onClose} title="Usar no celular // de qualquer rede">
      <div className="space-y-4 text-sm">
        <p className="text-xs leading-relaxed text-muted">
          O app continua rodando <b className="text-fg">no seu computador</b> (as chaves e o seu cofre ficam aqui). O celular abre a tela por um endereço temporário e entra com um <b className="text-fg">PIN novo a cada vez</b>. Funciona no 5G e em qualquer Wi-Fi. O <b className="text-fg">progresso é o mesmo</b> nos dois, ao vivo: o que você faz no celular aparece no PC, e vice-versa.
        </p>

        {!e && <ErrorNote error="Não consegui falar com o servidor do app. Ele está ligado (npm run dev)?" />}
        <ErrorNote error={erro ?? e?.erro} />

        {e && e.cloudflared === 'faltando' && (
          <section className="space-y-2 rounded border border-line bg-bg p-3">
            <p className="rounded border-l-2 border-accent bg-accent/5 px-2 py-1 text-xs">
              <b className="text-accent">Agora:</b> instale o túnel (uma vez só). É o <b>cloudflared</b> da Cloudflare, gratuito e sem conta, uns 40 MB. Ele fica só nesta pasta do app.
            </p>
            {e.podeInstalar ? (
              <Button variant="primary" onClick={() => void acao('/__acesso/instalar')} disabled={baixando}>
                <Download size={14} /> {baixando ? `Baixando… ${mb(e.instalacao.baixado)}${e.instalacao.total ? ` de ${mb(e.instalacao.total)}` : ''}` : 'Instalar o túnel'}
              </Button>
            ) : (
              <p className="text-xs">
                No Mac, abra o Terminal e rode: <code className="rounded bg-panel-2 px-1">brew install cloudflared</code>
              </p>
            )}
            {e.instalacao.fase === 'erro' && <ErrorNote error={e.instalacao.erro} />}
          </section>
        )}

        {e && e.cloudflared === 'ok' && !e.ativo && (
          <section className="space-y-2 rounded border border-line bg-bg p-3">
            <p className="rounded border-l-2 border-accent bg-accent/5 px-2 py-1 text-xs">
              <b className="text-accent">Agora:</b> aperte "Abrir acesso". Em poucos segundos aparecem o endereço e o PIN.
            </p>
            <Button variant="primary" onClick={() => void acao('/__acesso/abrir')} disabled={e.subindo}>
              <Smartphone size={14} /> {e.subindo ? 'Abrindo o túnel…' : 'Abrir acesso pelo celular'}
            </Button>
          </section>
        )}

        {e?.ativo && (
          <section className="space-y-3 rounded border border-accent/40 bg-bg p-3">
            <Badge color="var(--color-accent)">acesso aberto</Badge>
            <ol className="space-y-3 text-xs leading-relaxed">
              <li>
                <b className="text-accent">1.</b> No celular, abra este endereço:
                <div className="mt-1 flex items-center gap-2">
                  <code className="min-w-0 flex-1 break-all rounded bg-panel-2 px-2 py-1.5 text-fg">{e.url}</code>
                  <Button onClick={() => e.url && void copiar(e.url, 'url')} title="Copiar o endereço">
                    <Copy size={13} /> {copiado === 'url' ? 'ok' : ''}
                  </Button>
                </div>
              </li>
              <li>
                <b className="text-accent">2.</b> Digite este PIN quando ele pedir:
                {e.pin ? (
                  <div className="mt-1 flex items-center gap-3">
                    <span className="rounded border border-accent bg-accent/10 px-4 py-2 font-mono text-3xl font-bold tracking-[0.35em] text-accent">{e.pin}</span>
                    <span className="text-muted">vale mais {restaMin} min, e só uma vez</span>
                  </div>
                ) : (
                  <p className="mt-1 text-warn">O PIN já foi usado ou venceu. Gere outro abaixo (só se for entrar com outro aparelho).</p>
                )}
              </li>
              <li>
                <b className="text-accent">3.</b> Pronto. {e.aparelhos > 0 ? `${e.aparelhos} aparelho(s) conectado(s).` : 'Quando entrar, aparece aqui quantos aparelhos estão conectados.'}
              </li>
            </ol>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void acao('/__acesso/novo-pin')}>
                <RefreshCw size={13} /> Gerar outro PIN
              </Button>
              <Button variant="danger" onClick={() => void acao('/__acesso/fechar')}>
                <Power size={13} /> Fechar o acesso
              </Button>
            </div>
            <p className="text-[11px] text-muted">Fechar derruba o túnel e desconecta todos os celulares. Ao fechar o app no computador, o acesso fecha sozinho. Não compartilhe o endereço nem o PIN.</p>
          </section>
        )}
      </div>
    </Modal>
  );
}
