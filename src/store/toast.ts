import { create } from 'zustand';

// Avisos rápidos no canto da tela. Somem sozinhos depois de alguns segundos.

export type ToastVariant = 'default' | 'success' | 'destructive';

export interface ToastItem {
  id: number;
  title: string;
  description?: string;
  variant: ToastVariant;
}

const LIMIT = 3;
const DURATION_MS = 4000;
let nextId = 1;

export const useToasts = create<{ toasts: ToastItem[] }>(() => ({ toasts: [] }));

export function dismissToast(id: number) {
  useToasts.setState((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
}

export function toast({ title, description, variant = 'default' }: { title: string; description?: string; variant?: ToastVariant }) {
  const id = nextId++;
  useToasts.setState((s) => ({ toasts: [{ id, title, description, variant }, ...s.toasts].slice(0, LIMIT) }));
  setTimeout(() => dismissToast(id), DURATION_MS);
}
