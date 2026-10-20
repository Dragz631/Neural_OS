import type { KeyboardEvent } from 'react';
import { LANGUAGES } from '../../domain/catalog';

/** Editor simples: números de linha, Tab = 4 espaços, Ctrl+Enter = corrigir. */
export function EditorCodigo({ codigo, linguagem, onChange, onCorrigir }: { codigo: string; linguagem: string; onChange: (c: string) => void; onCorrigir: () => void }) {
  const linhas = Math.max(12, codigo.split('\n').length);

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const el = e.currentTarget;
      const { selectionStart: s, selectionEnd: fim } = el;
      onChange(`${codigo.slice(0, s)}    ${codigo.slice(fim)}`);
      requestAnimationFrame(() => el.setSelectionRange(s + 4, s + 4));
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      onCorrigir();
    }
  };

  return (
    <div className="overflow-hidden rounded border border-line bg-bg">
      <div className="flex items-center justify-between border-b border-line bg-panel px-3 py-1.5 text-[10px] uppercase tracking-widest text-muted">
        <span>{LANGUAGES.find((l) => l.id === linguagem)?.label || 'código'}</span>
        <span className="hidden sm:inline">Tab = 4 espaços · Ctrl+Enter = corrigir</span>
      </div>
      <div className="flex max-h-[60vh] overflow-auto">
        <pre aria-hidden className="select-none border-r border-line px-2 py-3 text-right text-[13px] leading-6 text-muted/50">
          {Array.from({ length: linhas }, (_, i) => i + 1).join('\n')}
        </pre>
        <textarea
          value={codigo}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          spellCheck={false}
          rows={linhas}
          aria-label="Editor de código"
          className="min-w-0 flex-1 resize-none bg-transparent px-3 py-3 text-[13px] leading-6 text-fg outline-none"
          placeholder="Escreva sua solução aqui…"
        />
      </div>
    </div>
  );
}
