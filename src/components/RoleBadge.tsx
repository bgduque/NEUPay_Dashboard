import type { UserRole } from '@/api/types';
import { roleAccent, roleLabel } from '@/lib/roles';
import { cn } from '@/lib/cn';

export function RoleBadge({ role, className }: { role: UserRole; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        roleAccent(role),
        className,
      )}
    >
      {roleLabel(role)}
    </span>
  );
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = status === 'VERIFIED' || status === 'ACTIVE'
    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    : status === 'SUSPENDED' || status === 'FROZEN'
    ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';

  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase',
      tone,
      className,
    )}>
      {status.toLowerCase()}
    </span>
  );
}
