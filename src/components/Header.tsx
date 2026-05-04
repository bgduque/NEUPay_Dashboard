import { useState } from 'react';
import { LogOut, Menu, ChevronDown } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '@/auth/store';
import { initials } from '@/lib/format';
import { personaFor, personaLabel } from '@/lib/roles';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { useNavigate } from 'react-router-dom';

interface HeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  onMenuClick?: () => void;
}

export function Header({ title, description, actions, onMenuClick }: HeaderProps) {
  const session = useAuth((s) => s.session);
  const signOut = useAuth((s) => s.signOut);
  const [confirmingLogout, setConfirmingLogout] = useState(false);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  if (!session) return null;
  const persona = personaFor(session.user.role, session.user.program);

  return (
    <header className="sticky top-0 z-30 bg-surface-canvas/85 backdrop-blur border-b border-border-subtle">
      <div className="flex items-center gap-4 px-5 py-4 lg:px-8">
        {onMenuClick && (
          <button
            className="lg:hidden inline-flex items-center justify-center size-9 rounded-xl border border-border-subtle"
            onClick={onMenuClick}
            aria-label="Open navigation"
          >
            <Menu className="size-4" />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold tracking-tight text-text-primary truncate">{title}</h1>
          {description && (
            <p className="text-xs text-text-tertiary mt-0.5">{description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {actions}
          <ThemeToggle />
          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-border-subtle hover:bg-surface-muted pl-1 pr-3 h-9"
            >
              <span className="size-7 rounded-lg bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200 grid place-items-center text-[11px] font-bold">
                {initials(session.user.fullName)}
              </span>
              <span className="hidden sm:inline text-xs font-semibold text-text-primary">
                {session.user.fullName.split(' ')[0]}
              </span>
              <ChevronDown className="size-3 text-text-tertiary" />
            </button>
            {open && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-64 rounded-xl border border-border-subtle bg-surface-elevated shadow-card p-2 z-40"
                onMouseLeave={() => setOpen(false)}
              >
                <div className="px-3 py-2.5">
                  <div className="text-sm font-semibold text-text-primary truncate">{session.user.fullName}</div>
                  <div className="text-xs text-text-tertiary truncate">{session.user.email}</div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.16em] font-bold text-brand-700 dark:text-brand-300">
                    {personaLabel(persona)} • ID {session.user.idNumber}
                  </div>
                </div>
                <div className="h-px bg-border-subtle mx-2" />
                <button
                  onClick={() => { setOpen(false); navigate('/settings'); }}
                  className="block w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-surface-muted"
                >
                  Settings
                </button>
                <button
                  onClick={() => { setOpen(false); setConfirmingLogout(true); }}
                  className="flex items-center gap-2 w-full text-left text-xs px-3 py-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20 text-rose-600 dark:text-rose-300"
                >
                  <LogOut className="size-3.5" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal
        open={confirmingLogout}
        onClose={() => setConfirmingLogout(false)}
        title="Sign out?"
        description="You'll need to sign in again to use the dashboard."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirmingLogout(false)}>Cancel</Button>
            <Button
              variant="danger"
              onClick={async () => {
                await signOut();
                setConfirmingLogout(false);
                navigate('/login', { replace: true });
              }}
            >
              Sign out
            </Button>
          </>
        }
      >
        <p className="text-sm text-text-secondary">
          This will revoke your refresh token on this device.
        </p>
      </Modal>
    </header>
  );
}
