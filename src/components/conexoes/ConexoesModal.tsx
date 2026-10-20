import { KeyRound, Pencil, Plug, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { MOTORES, type ConexaoPublica, type Motor } from '../../domain/conexoes';
import { postConexoes, useConexoes } from '../../store/conexoes';
import { toast } from '../../store/toast';
import { Badge, Button, Empty, ErrorNote, Modal, Select } from '../ui';
import { FormConexao } from './FormConexao';

/** "Conexões": onde o Hugo liga modelos e escolhe qual faz cada parte do trabalho do professor. */
export function ConexoesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { conexoes, motores, recarregar } = useConexoes();
  const [form, setForm] = useState<'nova' | ConexaoPublica | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (open) void recarregar();
  }, [open, recarregar]);

  const trocarMotor = async (motor: Motor, id: string) => {
    setErro(null);
    try {
      await postConexoes('motores', { motores: { ...motores, [motor]: id || undefined } });
      await recarregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    }
  };

  // Conexão nova sem motor professor ainda: vira o professor (dá pra trocar depois).
  const pronto = async (id: string) => {
    setForm(null);
    if (!useConexoes.getState().motores.professor) await trocarMotor('professor', id);
    toast({ title: 'Conexão salva', description: 'Teste ela aqui embaixo.', variant: 'success' });
  };

  return (
    <Modal open={open} onClose={onClose} title="Conexões // a mente do Prof. A.Ilson" wide>
      <div className="space-y-5 text-sm">
        <p className="text-xs leading-relaxed text-muted">
          O professor tem <b className="text-fg">uma mente só</b>. Os motores são só quem faz a conta: tarefa leve no modelo barato, aula no modelo bom, e o difícil no Claude. Se um motor cair ou estourar o teto do dia, o próximo assume. As chaves ficam no <code>.env.local</code> deste PC, nunca no navegador.
        </p>

        <section className="space-y-2">
          <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Motores</h3>
          {(Object.keys(MOTORES) as Motor[]).map((m) => (
            <div key={m} className="grid items-center gap-2 rounded border border-line bg-bg p-2 sm:grid-cols-[1fr_220px]">
              <div>
                <p className="text-xs font-bold text-fg">{MOTORES[m].nome}</p>
                <p className="text-[11px] text-muted">{MOTORES[m].explica}</p>
              </div>
              <Select value={motores[m] ?? ''} onChange={(e) => trocarMotor(m, e.target.value)} aria-label={`Motor ${MOTORES[m].nome}`}>
                <option value="">— desligado —</option>
                {conexoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </Select>
            </div>
          ))}
          <ErrorNote error={erro} />
        </section>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent">Conexões</h3>
            {!form && (
              <Button onClick={() => setForm('nova')}>
                <Plus size={13} /> Conectar modelo
              </Button>
            )}
          </div>
          {form && <FormConexao key={form === 'nova' ? 'nova' : form.id} editando={form === 'nova' ? undefined : form} onPronto={pronto} onCancelar={() => setForm(null)} />}
          {conexoes.length === 0 && !form && <Empty>Nenhuma conexão ainda. Comece pelo "Conectar modelo".</Empty>}
          {conexoes.map((c) => (
            <CartaoConexao key={c.id} c={c} motoresDela={(Object.keys(MOTORES) as Motor[]).filter((m) => motores[m] === c.id)} onEditar={() => setForm(c)} />
          ))}
        </section>
      </div>
    </Modal>
  );
}

function CartaoConexao({ c, motoresDela, onEditar }: { c: ConexaoPublica; motoresDela: Motor[]; onEditar: () => void }) {
  const [teste, setTeste] = useState<string | null>(null);
  const [modelos, setModelos] = useState<string[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const acao = async (fn: () => Promise<void>) => {
    setErro(null);
    setOcupado(true);
    try {
      await fn();
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setOcupado(false);
    }
  };

  const testar = () =>
    acao(async () => {
      setTeste(null);
      const r = await postConexoes<{ texto: string; ms: number }>('testar', { id: c.id });
      setTeste(`${r.texto} (${(r.ms / 1000).toFixed(1)} s)`);
    });
  const buscarModelos = () => acao(async () => setModelos((await postConexoes<{ modelos: string[] }>('modelos', { id: c.id })).modelos));
  const usarModelo = (modelo: string) =>
    acao(async () => {
      await postConexoes('salvar', { conexao: { ...c, modelo } });
      await useConexoes.getState().recarregar();
    });
  const remover = () =>
    confirm(`Remover "${c.nome}"? A chave dela sai do .env.local.`) &&
    acao(async () => {
      await postConexoes('remover', { id: c.id });
      await useConexoes.getState().recarregar();
    });

  return (
    <div className="space-y-2 rounded border border-line bg-bg p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Plug size={14} className="text-accent" />
        <span className="font-bold">{c.nome}</span>
        <span className="text-xs text-muted">{c.modelo || 'sem modelo'}</span>
        {motoresDela.map((m) => (
          <Badge key={m} color="var(--color-accent)">
            {MOTORES[m].nome}
          </Badge>
        ))}
        <span className="ml-auto flex items-center gap-1 text-[11px] text-muted">
          {c.tipo === 'openai' && (
            <>
              <KeyRound size={11} className={c.temChave ? 'text-accent' : ''} /> {c.temChave ? 'chave ✓' : 'sem chave'} ·
            </>
          )}
          {c.usoHoje}
          {c.limiteDia ? `/${c.limiteDia}` : ''} hoje
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={testar} disabled={ocupado}>
          {ocupado ? 'Esperando…' : 'Testar'}
        </Button>
        <Button onClick={buscarModelos} disabled={ocupado}>
          <RefreshCw size={12} /> Modelos
        </Button>
        <Button onClick={onEditar} disabled={ocupado}>
          <Pencil size={12} /> Editar
        </Button>
        <Button variant="danger" onClick={remover} disabled={ocupado} aria-label={`Remover ${c.nome}`}>
          <Trash2 size={12} />
        </Button>
      </div>
      {modelos.length > 0 && (
        <Select value={c.modelo} onChange={(e) => usarModelo(e.target.value)} aria-label="Escolher modelo">
          {!modelos.includes(c.modelo) && <option value={c.modelo}>{c.modelo || '— escolha —'}</option>}
          {modelos.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
      )}
      {teste && <p className="rounded border border-accent/40 bg-accent/10 p-2 text-xs text-accent">{teste}</p>}
      <ErrorNote error={erro} />
    </div>
  );
}
