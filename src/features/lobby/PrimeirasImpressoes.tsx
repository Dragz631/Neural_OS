import { Palette, X } from 'lucide-react';
import { create } from 'zustand';
import { persist } from '../../lib/persistir';
import { useStudy } from '../../store/study';
import { useUI } from '../../store/ui';
import { Button } from '../../components/ui';

// Primeira vez no app: uma mensagem curta dizendo que o visual é da pessoa.
// Some ao dispensar (ou assim que ela cria a primeira matéria).

const useBoasVindas = create<{ visto: boolean; dispensar: () => void }>()(
  persist(
    (set) => ({
      visto: false,
      dispensar: () => set({ visto: true }),
    }),
    { name: 'neural-os.boasvindas', version: 1 },
  ),
);

export function PrimeirasImpressoes() {
  const visto = useBoasVindas((s) => s.visto);
  const dispensar = useBoasVindas((s) => s.dispensar);
  const primeiraVez = useStudy((s) => s.subjects.length === 0);
  const abrir = useUI((s) => s.abrir);
  if (visto || !primeiraVez) return null;

  return (
    <aside className="flex flex-wrap items-center gap-3 rounded border border-accent/40 bg-accent/5 p-3 text-sm" role="note">
      <Palette size={18} className="shrink-0 text-accent" />
      <p className="min-w-0 flex-1 leading-relaxed">
        <b className="text-fg">Bem-vindo ao Neural-OS.</b> Este é o visual padrão, mas ele é <b className="text-fg">seu</b>: no botão de paleta (canto de cima, ao lado da engrenagem) você muda cores, letras, cantos e efeitos, ou importa o tema de um amigo. Tudo muda na hora e nada troca sozinho.
      </p>
      <div className="flex gap-2">
        <Button
          variant="primary"
          onClick={() => {
            dispensar();
            abrir('tema');
          }}
        >
          Abrir Aparência
        </Button>
        <Button
          onClick={() => {
            dispensar();
            abrir('fontes');
          }}
          title="Obsidian, Notion, NotebookLM e outras pastas"
        >
          Conectar minhas fontes
        </Button>
        <Button onClick={dispensar} aria-label="Dispensar a mensagem">
          <X size={13} /> Entendi
        </Button>
      </div>
    </aside>
  );
}
