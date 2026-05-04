import { useState, type FormEvent } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import { IdCard, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/auth/store';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { ThemeToggle } from '@/components/ThemeToggle';
import { isStaffRole } from '@/lib/roles';

const APP_NAME = import.meta.env.VITE_NEU_APP_NAME ?? 'NEU Cashier Dashboard';
const ENV_LABEL = import.meta.env.VITE_NEU_ENV_LABEL ?? '';

export default function LoginPage() {
  const session = useAuth((s) => s.session);
  const signIn = useAuth((s) => s.signIn);
  const loading = useAuth((s) => s.loading);
  const error = useAuth((s) => s.loginError);

  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname ?? '/dashboard';

  const [principal, setPrincipal] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);

  if (session && isStaffRole(session.user.role)) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    try {
      await signIn(principal.trim(), password);
      // Read fresh session from store after successful sign-in.
      const next = useAuth.getState().session;
      if (next && !isStaffRole(next.user.role)) {
        await useAuth.getState().signOut();
        setLocalError('This account is mobile-only. The dashboard is reserved for staff.');
        return;
      }
      navigate(from, { replace: true });
    } catch {
      // store already populated `loginError`
    }
  };

  const shownError = localError ?? error;

  return (
    <div className="min-h-full grid lg:grid-cols-2 bg-surface-canvas">
      {/* Left: brand panel */}
      <aside className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 text-white relative overflow-hidden">
        <div className="absolute -top-32 -right-24 size-96 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -left-32 size-96 rounded-full bg-gold-500/15 blur-3xl" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <div className="size-12 rounded-2xl bg-white/10 grid place-items-center text-gold-400 font-bold text-lg">
              NEU
            </div>
            <div>
              <div className="text-base font-semibold">NeuPay Console</div>
              <div className="text-xs text-white/70 tracking-wide uppercase">
                Cashier &amp; Admin Dashboard
              </div>
            </div>
          </div>
          <h1 className="mt-16 text-4xl font-bold tracking-tight leading-tight">
            Add funds.<br />Read balances.<br />
            <span className="text-gold-400">Never deduct.</span>
          </h1>
          <p className="mt-6 text-sm text-white/80 max-w-sm leading-relaxed">
            The mediator console for the NeuPay platform. Students and faculty pay on the iOS app — cashiers use this dashboard to credit wallets and review office activity.
          </p>
        </div>
        <div className="relative flex items-center gap-3 text-xs text-white/70">
          <ShieldCheck className="size-4 text-gold-400" />
          <span>JWT auth · BCrypt hashed · audit-logged operations</span>
        </div>
      </aside>

      {/* Right: form */}
      <main className="flex flex-col justify-center px-6 py-10 lg:px-12">
        <div className="w-full max-w-md mx-auto">
          <div className="flex justify-end -mt-4 mb-4">
            <ThemeToggle />
          </div>
          <div className="lg:hidden mb-8 flex items-center gap-3">
            <div className="size-10 rounded-xl bg-gradient-to-br from-brand-600 to-brand-900 grid place-items-center text-gold-400 font-bold text-sm">
              NEU
            </div>
            <div>
              <div className="text-sm font-semibold text-text-primary">NeuPay Console</div>
              <div className="text-xs text-text-tertiary">Cashier &amp; Admin Dashboard</div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-text-primary tracking-tight">
            Sign in to {APP_NAME}
          </h2>
          <p className="text-sm text-text-tertiary mt-1">
            Use your NEU faculty / staff ID — or your NEU email.
          </p>

          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
            <Input
              label="Faculty / Staff ID"
              hint="You can also sign in with your NEU email."
              placeholder="NEU-ADMIN-0001"
              autoComplete="username"
              required
              value={principal}
              onChange={(e) => setPrincipal(e.target.value)}
              leftIcon={<IdCard className="size-4" />}
            />
            <Input
              label="Password"
              type="password"
              autoComplete="current-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="size-4" />}
            />
            {shownError && (
              <div
                role="alert"
                className="text-xs rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 px-3 py-2"
              >
                {shownError}
              </div>
            )}
            <Button type="submit" loading={loading} fullWidth size="lg">
              Sign in
            </Button>
          </form>

          <p className="mt-8 text-[11px] text-text-tertiary leading-relaxed">
            For students and faculty: top-ups happen at the cashier's window or the canteen kiosk —
            this dashboard isn't for you. {ENV_LABEL && (
              <span className="font-semibold text-brand-700 dark:text-brand-300">Environment: {ENV_LABEL}</span>
            )}
          </p>
        </div>
      </main>
    </div>
  );
}
