import { useEffect, useRef, useState } from 'react';
import { Download, RefreshCw, Upload } from 'lucide-react';
import { chat, listModels } from '../services/ai/client';
import { vaultStatus, type VaultStatus } from '../services/vault';
import { PROVIDER_LABEL, useSettings, type AIProvider } from '../store/settings';
import { gerarBackup, restaurarBackup } from '../store/backup';
import { toast } from '../store/toast';
import { useAI } from '../hooks/useAI';
import { Badge, Button, ErrorNote, Input, Label, Modal, Select } from './ui';

const HELP: Record<AIProvider, string> = {
  off: 'O app funciona inteiro sem IA: você escreve a aula, se autoavalia e usa a checagem básica de código.',
  hermes: 'Rode o Hermes Agent com o API server ligado (porta 8642). O modelo que ele usa (ex.: NVIDIA NIM) é configurado no próprio Hermes. Coloque HERMES_API_KEY no .env.local.',
  nvidia: 'Chama a NVIDIA direto, sem Hermes. Coloque NVIDIA_API_KEY (nvapi-...) no .env.local e reinicie o npm run dev.',
  ollama: 'Modelo rodando no seu PC com Ollama (ollama serve).',
};

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { provider, models, temperature, setProvider, setModel, setTemperature } = useSettings();
  const [available, setAvailable] = useState<string[]>([]);
  const [vault, setVault] = useState<VaultStatus | null>(null);
  const [testReply, setTestReply] = useState('');
  const { run, loading, error, clearError } = useAI();
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) vaultStatus().then(setVault);
  }, [open]);

  const refreshModels = () =>
    run(async () => {
      const list = await listModels(provider);
      setAvailable(list);
      if (list.length && !models[provider]) setModel(provider, list[0]);
    });

  const test = () =>
    run(async (signal) => {
      setTestReply('');
      const reply = await chat([{ role: 'user', content: 'Responda só: "Prof. A.Ilson online."' }], signal);
      setTestReply(reply);
    });

  const backup = () => {
    const blob = new Blob([JSON.stringify(gerarBackup(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neural-os-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const restore = async (file: File) => {
    try {
      restaurarBackup(JSON.parse(await file.text()));
      toast({ title: 'Backup restaurado', variant: 'success' });
    } catch (e) {
      toast({ title: 'Não deu pra restaurar', description: String(e), variant: 'destructive' });
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Configurações">
      <div className="space-y-5 text-sm">
        <section className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-widest text-fg">IA (Prof. A.Ilson)</h3>
          <label className="block">
            <Label>Provedor</Label>
            <Select
              value={provider}
              onChange={(e) => {
                setProvider(e.target.value as AIProvider);
                setAvailable([]);
                setTestReply('');
                clearError();
              }}
            >
              {(Object.keys(PROVIDER_LABEL) as AIProvider[]).map((p) => (
                <option key={p} value={p}>
                  {PROVIDER_LABEL[p]}
                </option>
              ))}
            </Select>
          </label>
          <p className="text-xs leading-relaxed text-muted">{HELP[provider]}</p>

          {provider !== 'off' && (
            <>
              <label className="block">
                <Label>Modelo</Label>
                <div className="flex gap-2">
                  <Input list="ai-models" value={models[provider] ?? ''} onChange={(e) => setModel(provider, e.target.value)} placeholder="nome do modelo" />
                  <datalist id="ai-models">
                    {available.map((m) => (
                      <option key={m} value={m} />
                    ))}
                  </datalist>
                  <Button onClick={refreshModels} disabled={loading} title="Buscar modelos disponíveis">
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                  </Button>
                </div>
                {available.length > 0 && <p className="mt-1 text-[11px] text-muted">{available.length} modelos encontrados — digite pra filtrar.</p>}
              </label>
              <label className="block">
                <Label>Criatividade ({temperature.toFixed(1)})</Label>
                <input type="range" min={0} max={1} step={0.1} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="w-full accent-accent" />
              </label>
              <Button onClick={test} disabled={loading} variant="primary">
                {loading ? 'Testando…' : 'Testar conexão'}
              </Button>
              {testReply && <p className="rounded border border-accent/40 bg-accent/10 p-2 text-xs text-accent">{testReply}</p>}
              <ErrorNote error={error} />
            </>
          )}
        </section>

        <section className="space-y-2 border-t border-line pt-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-fg">Obsidian</h3>
          {vault?.configured ? (
            <p className="text-xs text-muted">
              <Badge color="var(--color-accent)">conectado</Badge> <span className="break-all">{vault.folder}</span>
            </p>
          ) : (
            <p className="text-xs leading-relaxed text-muted">
              <Badge color="var(--color-warn)">desligado</Badge> Coloque <code>OBSIDIAN_VAULT_PATH</code> no <code>.env.local</code> (veja o <code>.env.example</code>) e reinicie o
              servidor.
            </p>
          )}
        </section>

        <section className="space-y-2 border-t border-line pt-4">
          <h3 className="text-xs font-bold uppercase tracking-widest text-fg">Seus dados</h3>
          <p className="text-xs text-muted">Ficam salvos neste navegador. Faça backup de vez em quando.</p>
          <div className="flex gap-2">
            <Button onClick={backup}>
              <Download size={14} /> Baixar backup
            </Button>
            <Button onClick={() => fileRef.current?.click()}>
              <Upload size={14} /> Restaurar
            </Button>
            <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && restore(e.target.files[0])} />
          </div>
        </section>
      </div>
    </Modal>
  );
}
