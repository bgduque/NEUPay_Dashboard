import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function Card({
  className,
  padding = 'md',
  ...rest
}: CardProps) {
  const padCls =
    padding === 'none' ? '' :
    padding === 'sm'   ? 'p-4'  :
    padding === 'lg'   ? 'p-8'  :
                         'p-6';
  return <div className={cn('card', padCls, className)} {...rest} />;
}

interface SectionProps {
  title: string;
  description?: string;
  trailing?: ReactNode;
  children?: ReactNode;
  className?: string;
}

export function Section({ title, description, trailing, children, className }: SectionProps) {
  return (
    <Card className={cn('flex flex-col gap-4', className)}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="mt-1 h-5 w-1.5 rounded bg-brand-500" aria-hidden />
          <div>
            <h2 className="text-base font-semibold text-text-primary">{title}</h2>
            {description && (
              <p className="text-xs text-text-tertiary mt-0.5">{description}</p>
            )}
          </div>
        </div>
        {trailing}
      </div>
      {children}
    </Card>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon,
  accent = 'brand',
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
  accent?: 'brand' | 'gold' | 'emerald' | 'rose';
}) {
  const accentMap = {
    brand:   'bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-300',
    gold:    'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    rose:    'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
  } as const;

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold tracking-[0.16em] uppercase text-text-tertiary">
          {label}
        </span>
        {icon && (
          <span className={cn('inline-flex h-9 w-9 items-center justify-center rounded-xl', accentMap[accent])}>
            {icon}
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-text-primary tracking-tight">{value}</div>
      {hint && <div className="text-xs text-text-tertiary">{hint}</div>}
    </Card>
  );
}
