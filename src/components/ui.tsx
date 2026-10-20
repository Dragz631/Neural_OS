import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { X } from 'lucide-react';
import { cn } from '../lib/utils';

// Kit mínimo de interface. Uma versão de cada coisa, usada em todas as abas.

/** Título no estilo do Neural-OS: "NOME // DESCRIÇÃO" (a parte depois de // fica apagada). */
function PanelTitle({ title }: { title: ReactNode }) {
  if (typeof title !== 'string' || !title.includes('//')) return <>{title}</>;
  const [nome, ...resto] = title.split('//');
  return (
    <>
      <span className="text-fg">{nome.trim()}</span>
      <span className="text-muted/70"> // {resto.join('//').trim()}</span>
    </>
  );
}

export function Panel({
  title,
  actions,
  children,
  className,
  accent,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Cartão em destaque (borda e brilho na cor de destaque). */
  accent?: boolean;
}) {
  return (
    <section className={cn('relative rounded border bg-panel p-4', accent ? 'glow border-accent/70' : 'border-line', className)}>
      {(title || actions) && (
        <header className="mb-3 flex items-center justify-between gap-2 border-b border-line pb-2">
          <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
            <span className="pulse-dot" aria-hidden />
            <span>
              <PanelTitle title={title} />
            </span>
          </h2>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

type ButtonVariant = 'primary' | 'ghost' | 'danger';

export function Button({ variant = 'ghost', className, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded border px-3 py-1.5 text-xs font-bold uppercase tracking-wider transition disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary' && 'border-accent bg-accent text-black hover:brightness-110',
        variant === 'ghost' && 'border-line text-fg hover:border-accent hover:text-accent',
        variant === 'danger' && 'border-danger/50 text-danger hover:bg-danger hover:text-black',
        className,
      )}
    />
  );
}

const fieldClass = 'w-full rounded border border-line bg-bg px-2.5 py-1.5 text-sm text-fg outline-none placeholder:text-muted/60 focus:border-accent';

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldClass, className)} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(fieldClass, 'resize-y leading-relaxed', className)} />;
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={cn(fieldClass, 'cursor-pointer', className)} />;
}

export function Label({ children }: { children: ReactNode }) {
  return <span className="mb-1 block text-[10px] uppercase tracking-widest text-muted">{children}</span>;
}

export function Badge({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
      style={{ borderColor: color ?? 'var(--color-line)', color: color ?? 'var(--color-muted)' }}
    >
      {children}
    </span>
  );
}

export function ProgressBar({ value, color = 'var(--color-accent)' }: { value: number; color?: string }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded bg-bg">
      <div className="h-full transition-all duration-500" style={{ width: `${Math.min(100, Math.max(0, value))}%`, background: color }} />
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded border border-dashed border-line p-4 text-center text-xs leading-relaxed text-muted">{children}</div>;
}

export function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 pt-[8vh]" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-label={title}
        className={cn('w-full rounded border border-line bg-panel p-5 shadow-2xl', wide ? 'max-w-3xl' : 'max-w-lg')}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-accent">{title}</h2>
          <button type="button" onClick={onClose} className="text-muted hover:text-fg" aria-label="Fechar">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/** Aviso padrão pra erros da IA (nunca esconder falha). */
export function ErrorNote({ error }: { error?: string | null }) {
  if (!error) return null;
  return <p className="rounded border border-danger/40 bg-danger/10 p-2 text-xs text-danger">{error}</p>;
}
