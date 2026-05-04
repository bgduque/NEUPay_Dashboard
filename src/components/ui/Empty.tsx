import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface EmptyProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function Empty({ title, description, icon, action, className }: EmptyProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-12 gap-3', className)}>
      {icon && (
        <div className="text-text-tertiary mb-1">{icon}</div>
      )}
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="text-xs text-text-tertiary max-w-sm">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function Spinner({ className = 'size-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn('animate-spin text-brand-500', className)} aria-hidden>
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M22 12a10 10 0 0 1-10 10" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
