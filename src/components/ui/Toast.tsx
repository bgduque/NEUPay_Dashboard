import { create } from 'zustand';
import { useEffect } from 'react';
import { CheckCircle2, AlertTriangle, Info, XCircle, X } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

interface ToastEntry {
  id: number;
  tone: ToastTone;
  message: string;
  durationMs: number;
}

interface ToastStore {
  toasts: ToastEntry[];
  push: (tone: ToastTone, message: string, durationMs?: number) => void;
  dismiss: (id: number) => void;
}

let nextId = 1;

const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (tone, message, durationMs = 4500) => {
    const id = nextId++;
    set({ toasts: [...get().toasts, { id, tone, message, durationMs }] });
  },
  dismiss: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },
}));

export const toast = {
  success: (m: string) => useToastStore.getState().push('success', m),
  error:   (m: string) => useToastStore.getState().push('error', m),
  info:    (m: string) => useToastStore.getState().push('info', m),
  warn:    (m: string) => useToastStore.getState().push('warning', m),
};

const toneCls: Record<ToastTone, string> = {
  success: 'border-emerald-500/30 bg-emerald-50 text-emerald-900 dark:bg-emerald-900/30 dark:text-emerald-100',
  error:   'border-rose-500/30 bg-rose-50 text-rose-900 dark:bg-rose-900/30 dark:text-rose-100',
  info:    'border-brand-500/30 bg-brand-50 text-brand-900 dark:bg-brand-900/30 dark:text-brand-100',
  warning: 'border-amber-500/30 bg-amber-50 text-amber-900 dark:bg-amber-900/30 dark:text-amber-100',
};

const ToneIcon = ({ tone }: { tone: ToastTone }) => {
  const cls = 'size-4 shrink-0';
  switch (tone) {
    case 'success': return <CheckCircle2 className={cls} />;
    case 'error':   return <XCircle className={cls} />;
    case 'warning': return <AlertTriangle className={cls} />;
    case 'info':    return <Info className={cls} />;
  }
};

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    const timers = toasts.map((t) =>
      window.setTimeout(() => dismiss(t.id), t.durationMs),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [toasts, dismiss]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={cn(
            'flex items-start gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm',
            toneCls[t.tone],
          )}
        >
          <ToneIcon tone={t.tone} />
          <div className="flex-1 text-sm font-medium leading-snug">{t.message}</div>
          <button
            aria-label="Dismiss"
            onClick={() => dismiss(t.id)}
            className="text-current/70 hover:text-current"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
