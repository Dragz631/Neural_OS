import { useState, type FormEvent } from 'react';
import { PRESETS, type ConexaoPublica, type Preset } from '../../domain/conexoes';
import { postConexoes, useConexoes } from '../../store/conexoes';
import { Button, ErrorNote, Input, Label, Select } from '../ui';

/**
 * Adicionar/editar uma conexão. A chave digitada vai pro servidor e direto pro
 * .env.local: o navegador não guarda, e nenhuma tela mostra de volta.
 */
export function FormConexao({ editando, onPronto, onCancelar }: { editando?: ConexaoPublica; onPronto: (id: string) => void; onCancelar: () => void }) {
  const temChaveBrazuka = useConexoes((s) => s.temChaveBrazuka);
  const presetInicial = PRESETS.find((p) => (editando ? p.baseUrl === editando.baseUrl || (editando.tipo === 'claude-cli' && p.tipo === 'claude-cli') : p.id === 'nvidia')) ?? PRESETS[PRESETS.length - 1];
  const [preset, setPreset] = useState<Preset>(presetInicial);
  const [nome, setNome] = useState(editando?.nome ?? presetInicial.nome);
  const [baseUrl, setBaseUrl] = useState(editando?.baseUrl ?? presetInicial.baseUrl);
  const [modelo, setModelo] = useState(editando?.modelo ?? presetInicial.modelo);
  const [limite, setLimite] = useState(String(editando?.limiteDia ?? presetInicial.limiteDia ?? ''));
  const [chave, setChave] = useState('');
  const [doBrazuka, setDoBrazuka] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const claude = preset.tipo === 'claude-cli';

  const escolher = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)!;
    setPreset(p);
    setNome(p.nome);
    setBaseUrl(p.baseUrl);
    setModelo(p.modelo);
    setLimite(String(p.limiteDia ?? ''));
    setDoBrazuka(false);
  };

  const salvar = async (e: FormEvent) => {
    e.preventDefault();
    setErro(null);
    setSalvando(true);
    try {
      const { id } = await postConexoes<{ id: string }>('salvar', {
        conexao: { id: editando?.id, nome, tipo: preset.tipo, baseUrl, modelo, limiteDia: Number(limite) || undefined },
        chave: doBrazuka ? '' : chave,
      });
      if (doBrazuka) await postConexoes('chave-brazuka', { id });
      setChave('');
      await useConexoes.getState().recarregar();
      onPronto(id);
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e));
    } finally {
      setSalvando(false);
    }
  };

  return (
    <form onSubmit={salvar} className="space-y-3 rounded border border-accent/40 bg-bg p-3">
      <label className="block">
        <Label>Tipo</Label>
        <Select value={preset.id} onChange={(e) => escolher(e.target.value)}>
          {PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Select>
      </label>
      <p className="text-[11px] text-muted">{preset.dica}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block">
          <Label>Nome</Label>
          <Input value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label className="block">
          <Label>Modelo</Label>
          <Input value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder={claude ? 'haiku, sonnet ou opus' : 'nome do modelo (ou salve e busque)'} />
        </label>
      </div>
      {!claude && (
        <label className="block">
          <Label>Endereço</Label>
          <Input value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} placeholder="https://…/v1" />
        </label>
      )}
      {!claude && (
        <label className="block">
          <Label>Chave {preset.precisaChave ? '' : '(se o serviço pedir)'}</Label>
          <Input
            type="password"
            autoComplete="off"
            value={chave}
            onChange={(e) => setChave(e.target.value)}
            disabled={doBrazuka}
            placeholder={editando?.temChave ? 'configurada ✓ (deixe vazio pra manter)' : 'cole aqui: vai só pro .env.local'}
          />
        </label>
      )}
      {preset.id === 'nvidia' && temChaveBrazuka && (
        <label className="flex items-center gap-2 text-xs">
          <input type="checkbox" checked={doBrazuka} onChange={(e) => setDoBrazuka(e.target.checked)} className="accent-accent" />
          Usar a chave da NVIDIA do Brazuka (copiada pelo servidor, não aparece na tela)
        </label>
      )}
      <label className="block">
        <Label>Teto de chamadas por dia (vazio = sem teto)</Label>
        <Input type="number" min={0} value={limite} onChange={(e) => setLimite(e.target.value)} className="max-w-40" />
      </label>
      <ErrorNote error={erro} />
      <div className="flex gap-2">
        <Button type="submit" variant="primary" disabled={salvando || !nome.trim() || (!claude && !baseUrl.trim())}>
          {salvando ? 'Salvando…' : editando ? 'Salvar' : 'Conectar'}
        </Button>
        <Button onClick={onCancelar}>Cancelar</Button>
      </div>
    </form>
  );
}
