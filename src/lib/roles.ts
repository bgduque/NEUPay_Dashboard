import type { UserRole } from '@/api/types';

/**
 * The dashboard exposes three operator personas. The backend only knows
 * CASHIER and ADMIN, so CS-Infrastructure is a UI-level distinction layered
 * on top of the ADMIN role. We treat any ADMIN as having full privileges
 * (incl. user creation), and label them based on their stored program /
 * department field if present.
 */
export type OperatorPersona = 'CASHIER' | 'ADMIN' | 'CS_INFRA';

export function personaFor(role: UserRole, program?: string | null): OperatorPersona {
  if (role === 'CASHIER') return 'CASHIER';
  if (role !== 'ADMIN') return 'CASHIER'; // STUDENT/FACULTY shouldn't reach the dashboard.
  const p = (program ?? '').toLowerCase();
  if (p.includes('cs') || p.includes('computer science') || p.includes('infra')) {
    return 'CS_INFRA';
  }
  return 'ADMIN';
}

export function personaLabel(p: OperatorPersona): string {
  switch (p) {
    case 'CASHIER':  return 'School Cashier';
    case 'ADMIN':    return 'Administrator';
    case 'CS_INFRA': return 'CS Infrastructure';
  }
}

export function personaShort(p: OperatorPersona): string {
  switch (p) {
    case 'CASHIER':  return 'Cashier';
    case 'ADMIN':    return 'Admin';
    case 'CS_INFRA': return 'CS Infra';
  }
}

export function canCreateUsers(p: OperatorPersona): boolean {
  return p === 'ADMIN' || p === 'CS_INFRA';
}

export function canFreezeUsers(p: OperatorPersona): boolean {
  return p === 'ADMIN' || p === 'CS_INFRA';
}

/** Cashiers cannot remove funds — this is a hard product rule. */
export function canRemoveFunds(_p: OperatorPersona): boolean {
  return false;
}

export function canAddFunds(p: OperatorPersona): boolean {
  return p === 'CASHIER' || p === 'ADMIN' || p === 'CS_INFRA';
}

export function isStaffRole(role: UserRole): boolean {
  return role === 'CASHIER' || role === 'ADMIN';
}

export function roleLabel(role: UserRole): string {
  switch (role) {
    case 'STUDENT': return 'Student';
    case 'FACULTY': return 'Faculty';
    case 'CASHIER': return 'Cashier';
    case 'ADMIN':   return 'Admin';
  }
}

export function roleAccent(role: UserRole): string {
  switch (role) {
    case 'STUDENT': return 'text-brand-700 bg-brand-100 dark:bg-brand-900/40 dark:text-brand-300';
    case 'FACULTY': return 'text-amber-800 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300';
    case 'CASHIER': return 'text-emerald-800 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300';
    case 'ADMIN':   return 'text-purple-800 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300';
  }
}
