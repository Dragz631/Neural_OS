import { create } from 'zustand';
import { persist } from '../lib/persistir';
import { copiarValores, corSobre, ehEscuro, FONTE_CORPO, FONTE_TITULOS, lerTema, presetPorId, TEMA_PADRAO, type TemaValores } from '../domain/tema';

// Tema escolhido (só aparência). Fica no navegador e no backup. Cada mudança vira
// variável CSS na hora; o Tailwind e o resto do app só leem as variáveis.

interface TemaState {
  /** Preset de onde a pessoa partiu (só pra mostrar e pra "voltar ao original"). */
  baseId: string;
  valores: TemaValores;
  escolher: (id: string) => void;
  ajustar: (patch: Partial<Omit<TemaValores, 'cores'>> & { cores?: Partial<TemaValores['cores']> }) => void;
  /** Volta o preset de partida, descartando os ajustes. */
  restaurar: () => void;
  importar: (json: unknown) => boolean;
  carregar: (dados: { baseId?: string; valores?: unknown }) => void;
}

const inicial = presetPorId(TEMA_PADRAO);

export const useTema = create<TemaState>()(
  persist(
    (set, get) => ({
      baseId: inicial.id,
      valores: copiarValores(inicial.valores),
      escolher: (id) => {
        const p = presetPorId(id);
        set({ baseId: p.id, valores: copiarValores(p.valores) });
      },
      ajustar: (patch) => {
        const v = get().valores;
        set({ valores: { ...v, ...patch, cores: { ...v.cores, ...patch.cores } } });
      },
      restaurar: () => set({ valores: copiarValores(presetPorId(get().baseId).valores) }),
      importar: (json) => {
        const v = lerTema(json, presetPorId(get().baseId).valores);
        if (!v) return false;
        set({ valores: v });
        return true;
      },
      carregar: (dados) => {
        const base = presetPorId(dados.baseId ?? TEMA_PADRAO);
        const v = lerTema(dados.valores, base.valores);
        set({ baseId: base.id, valores: v ?? copiarValores(base.valores) });
      },
    }),
    {
      name: 'neural-os.tema',
      version: 1,
      // Um tema salvo pode ser de uma versão antiga: completa o que faltar com o preset.
      merge: (salvo, atual) => {
        const s = (salvo ?? {}) as { baseId?: string; valores?: unknown };
        const base = presetPorId(s.baseId ?? TEMA_PADRAO);
        return { ...atual, baseId: base.id, valores: lerTema(s.valores, base.valores) ?? copiarValores(base.valores) };
      },
    },
  ),
);

/** Põe o tema na página: variáveis de cor e atributos que o CSS lê. */
export function aplicarTema(v: TemaValores) {
  if (typeof document === 'undefined') return;
  const raiz = document.documentElement;
  const c = v.cores;
  const set = (nome: string, valor: string) => raiz.style.setProperty(nome, valor);
  set('--color-bg', c.bg);
  set('--color-panel', c.panel);
  set('--color-panel-2', c.panel2);
  set('--color-line', c.line);
  set('--color-fg', c.fg);
  set('--color-muted', c.muted);
  set('--color-accent', c.accent);
  set('--color-on-accent', c.onAccent ?? corSobre(c.accent));
  set('--color-warn', c.warn);
  set('--color-danger', c.danger);
  set('--tema-danger', c.danger); // cópia: o Excalidraw redefine --color-danger dentro dele
  set('--color-info', c.info);
  set('--font-mono', FONTE_CORPO[v.corpo]);
  set('--font-titulo', FONTE_TITULOS[v.titulos]);
  set('--raio', `${v.raio}px`);
  const escuro = ehEscuro(v);
  set('--vinheta', escuro ? 'rgba(0,0,0,0.55)' : 'rgba(0,0,0,0.1)');
  raiz.style.colorScheme = escuro ? 'dark' : 'light';
  raiz.dataset.moldura = v.moldura;
  raiz.dataset.brilho = v.brilho ? 'on' : 'off';
  raiz.dataset.grade = v.grade ? 'on' : 'off';
  raiz.dataset.scan = v.scanline ? 'on' : 'off';
  raiz.dataset.cromo = v.cromo ? 'on' : 'off';
  raiz.dataset.mov = v.movimento;
}

aplicarTema(useTema.getState().valores);
useTema.subscribe((s, anterior) => {
  if (s.valores !== anterior.valores) aplicarTema(s.valores);
});
