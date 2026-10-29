import { BookOpen } from 'lucide-react';
import { useState } from 'react';
import { postConexoes, useConexoes } from '../../store/conexoes';
import { Button, ErrorNote, Input } from '../ui';

/**
 * Notion da faculdade: o Prof. A.Ilson lê a grade, as disciplinas, provas e o
 * Dashboard, e só escreve nas notas que ele mesmo cria. A chave vai pro
 * .env.local (NOTION_TOKEN) e nunca volta pra tela.
 */
export function CartaoNotion() {
  const temNotion = useConexoes((s) => s.temNotion);
  const [chave, setChave] = useState('');
  const [teste, setTeste] = useState<{ integracao: string; paginas: string[]; total: number } | null>(null);
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

  const salvar = () =>
    acao(async () => {
      await postConexoes('notion', { token: chave });
      setChave('');
      await useConexoes.getState().recarregar();
      setTeste(await postConexoes('notion/testar', {}));
    });
  const testar = () => acao(async () => setTeste(await postConexoes('notion/testar', {})));

  return (
    <div className="space-y-2 rounded border border-line bg-bg p-3">
      <div className="flex flex-wrap items-center gap-2">
        <BookOpen size={14} className="text-accent" />
        <span className="font-bold">Notion (faculdade)</span>
        <span className="ml-auto text-[11px] text-muted">{temNotion ? 'chave ✓' : 'não conectado'}</span>
      </div>
      <p className="text-[11px] text-muted">
        Lê a grade, as disciplinas, provas, trabalhos e o Dashboard Study. Só escreve nas notas que o professor cria (caminhos de estudo e a grade dele). Precisa da chave de uma integração interna, compartilhada com "Faculdade CC - 2026" e "Dashboard Study".
      </p>
      <div className="flex gap-2">
        <Input type="password" autoComplete="off" value={chave} onChange={(e) => setChave(e.target.value)} placeholder={temNotion ? 'configurada ✓ (cole outra pra trocar)' : 'cole a chave da integração (ntn_…)'} aria-label="Chave do Notion" />
        <Button variant="primary" onClick={salvar} disabled={ocupado || !chave.trim()}>
          Salvar
        </Button>
        {temNotion && (
          <Button onClick={testar} disabled={ocupado}>
            {ocupado ? 'Olhando…' : 'Testar'}
          </Button>
        )}
      </div>
      {teste && (
        <p className="rounded border border-accent/40 bg-accent/10 p-2 text-xs text-accent">
          Conectado como "{teste.integracao}". Enxerga {teste.total} página(s)/banco(s)
          {teste.paginas.length ? `: ${teste.paginas.join(', ')}` : '. Nenhuma página principal compartilhada ainda: no Notion, abra a página › ••• › Conexões › adicione a integração.'}
        </p>
      )}
      <ErrorNote error={erro} />
    </div>
  );
}
