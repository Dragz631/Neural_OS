import { useEffect, useRef, useState } from 'react';
import { Download, Plug, Upload } from 'lucide-react';
import { MOTORES, type Motor } from '../domain/conexoes';
import { vaultStatus, type VaultStatus } from '../services/vault';
import { useConexoes } from '../store/conexoes';
import { useSettings } from '../store/settings';
import { gerarBackup, restaurarBackup } from '../store/backup';
import { toast } from '../store/toast';
import { Badge, Button, Label, Modal } from './ui';

export function SettingsModal({ open, onClose, onConexoes }: { open: boolean; onClose: () => void; onConexoes: () => void }) {
  const { temperature, setTemperature } = useSettings();
  const { conexoes, motores } = useConexoes();
  const [vault, setVault] = useState<VaultStatus | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) vaultStatus().then(setVault);
  }, [open]);

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
          <ul className="space-y-1 text-xs">
            {(Object.keys(MOTORES) as Motor[]).map((m) => (
              <li key={m} className="flex justify-between gap-2">
                <span className="text-muted">Motor {MOTORES[m].nome.toLowerCase()}</span>
                <span className={motores[m] ? 'text-accent' : 'text-muted'}>{conexoes.find((c) => c.id === motores[m])?.nome ?? 'desligado'}</span>
              </li>
            ))}
          </ul>
          <Button variant="primary" onClick={onConexoes}>
            <Plug size={14} /> Conexões (ligar modelos)
          </Button>
          <label className="block">
            <Label>Criatividade ({temperature.toFixed(1)})</Label>
            <input type="range" min={0} max={1} step={0.1} value={temperature} onChange={(e) => setTemperature(Number(e.target.value))} className="w-full accent-accent" />
          </label>
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
