import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Badge, Button } from './ui';

// "Fontes": o que o professor consegue ler agora da sua faculdade.
// Notion = grade, disciplinas, prazos e o Dashboard. NotebookLM = os slides
// de cada matéria (1 caderno por matéria).

interface Fontes {
  notion: { conectado: boolean; paginas?: string[]; total?: number; erro?: string };
  notebooklm: { conectado: boolean; cadernos?: { id: string; titulo: string }[]; erro?: string };
}

export function SecaoFontes({ onConexoes }: { onConexoes: () => void }) {
  const [fontes, setFontes] = useState<Fontes | null>(null);
  const [olhando, setOlhando] = useState(false);

  const olhar = useCallback(async (forcar = false) => {
    setOlhando(true);
    try {
      const r = await fetch(`/api/fontes${forcar ? '?forcar=1' : ''}`);
      setFontes(await r.json());
    } catch {
      setFontes(null);
    } finally {
      setOlhando(false);
    }
  }, []);

  useEffect(() => {
    void olhar();
  }, [olhar]);

  const n = fontes?.notion;
  const b = fontes?.notebooklm;
  return (
    <section className="space-y-3 border-t border-line pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-widest text-fg">Fontes da faculdade</h3>
        <Button className="px-2 py-1 text-[10px]" onClick={() => olhar(true)} disabled={olhando} aria-label="Olhar de novo">
          <RefreshCw size={12} className={olhando ? 'animate-spin' : ''} /> {olhando ? 'Olhando…' : 'Olhar de novo'}
        </Button>
      </div>

      <div className="space-y-1 text-xs">
        <p className="flex items-center gap-2">
          <Badge color={n?.conectado ? 'var(--color-accent)' : 'var(--color-warn)'}>{n?.conectado ? 'conectado' : 'falta'}</Badge>
          <b className="text-fg">Notion</b>
          {n?.conectado && <span className="text-muted">{n.total} página(s)/banco(s): {n.paginas?.join(', ')}</span>}
        </p>
        {n && !n.conectado && (
          <p className="pl-1 text-muted">
            {n.erro}{' '}
            {n.erro?.includes('compartilhada') ? (
              <>Abra "Faculdade CC - 2026" e "Dashboard Study" no Notion › ••• (canto de cima) › Conexões › + Adicionar conexão › Neural-OS.</>
            ) : (
              <button type="button" onClick={onConexoes} className="text-accent underline">
                Abrir Conexões
              </button>
            )}
          </p>
        )}
      </div>

      <div className="space-y-1 text-xs">
        <p className="flex items-center gap-2">
          <Badge color={b?.conectado ? 'var(--color-accent)' : 'var(--color-warn)'}>{b?.conectado ? 'conectado' : 'falta'}</Badge>
          <b className="text-fg">NotebookLM</b>
          {b?.conectado && <span className="text-muted">{b.cadernos?.length} caderno(s): {b.cadernos?.map((c) => c.titulo).join(', ')}</span>}
        </p>
        {b && !b.conectado && (
          <p className="pl-1 text-muted">
            {b.erro?.includes('login') || b.erro?.includes('Authentication')
              ? 'O login do Google venceu. Peça pro Claude abrir a janela de login do NotebookLM (você entra uma vez e ele renova sozinho depois).'
              : b.erro}
          </p>
        )}
      </div>
      {!fontes && !olhando && <p className="text-xs text-muted">Sem resposta do servidor do app. Ele está ligado?</p>}
    </section>
  );
}
