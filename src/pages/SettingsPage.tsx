import { useEffect, useState } from 'react';
import { Moon, Sun, Smartphone, ShieldCheck, ExternalLink } from 'lucide-react';
import { Card, Section } from '@/components/ui/Card';
import { useAuth } from '@/auth/store';
import { usePageHeader } from '@/components/Layout';
import { getActiveTheme, setTheme, type Theme } from '@/lib/theme';
import { personaFor, personaLabel } from '@/lib/roles';
import { cn } from '@/lib/cn';

const API_BASE = import.meta.env.VITE_NEU_API_BASE ?? 'http://localhost:8080';

export default function SettingsPage() {
  const session = useAuth((s) => s.session);
  const setHeader = usePageHeader((s) => s.set);
  const [theme, setLocalTheme] = useState<Theme>(getActiveTheme());

  useEffect(() => {
    setHeader({
      title: 'Settings',
      description: 'Theme, profile, and environment for this dashboard session.',
    });
  }, [setHeader]);

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ theme: Theme }>).detail;
      if (detail?.theme) setLocalTheme(detail.theme);
    };
    window.addEventListener('neu-theme-change', onChange);
    return () => window.removeEventListener('neu-theme-change', onChange);
  }, []);

  if (!session) return null;
  const persona = personaFor(session.user.role, session.user.program);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <Section title="Appearance" description="Choose how the dashboard looks. Persists per-browser.">
        <div className="grid grid-cols-2 gap-3">
          <ThemeOption
            active={theme === 'light'}
            onClick={() => { setTheme('light'); setLocalTheme('light'); }}
            icon={<Sun className="size-4" />}
            label="Light"
            description="Bright surfaces, dark text. Best in well-lit cashier offices."
          />
          <ThemeOption
            active={theme === 'dark'}
            onClick={() => { setTheme('dark'); setLocalTheme('dark'); }}
            icon={<Moon className="size-4" />}
            label="Dark"
            description="Easier on the eyes for long evening shifts."
          />
        </div>
      </Section>

      <Section title="Operator profile" description="Read-only — change these in your NEU directory record.">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-y-3 gap-x-4 text-sm">
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-text-tertiary">Full name</dt>
            <dd className="text-text-primary mt-0.5">{session.user.fullName}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-text-tertiary">Persona</dt>
            <dd className="text-text-primary mt-0.5">{personaLabel(persona)}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-text-tertiary">Email</dt>
            <dd className="text-text-primary mt-0.5">{session.user.email}</dd>
          </div>
          <div>
            <dt className="text-[10px] uppercase tracking-wider text-text-tertiary">Faculty / Staff ID</dt>
            <dd className="text-text-primary mt-0.5 font-mono">{session.user.idNumber}</dd>
          </div>
        </dl>
      </Section>

      <Section title="Environment" description="What this build is talking to.">
        <Card padding="sm" className="bg-surface-canvas/60 flex items-center gap-3">
          <ShieldCheck className="size-4 text-brand-500" />
          <div className="text-xs">
            <div className="font-semibold text-text-primary">API base</div>
            <div className="text-text-tertiary font-mono break-all">{API_BASE}</div>
          </div>
        </Card>
        <a
          href={`${API_BASE}/swagger-ui.html`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-2 text-xs font-semibold text-brand-700 dark:text-brand-300 hover:underline"
        >
          Open Swagger UI <ExternalLink className="size-3" />
        </a>
      </Section>

      <Section title="Mobile app reminder" description="The dashboard is for staff. Students and faculty should use NeuPay on iOS.">
        <div className="flex gap-3 items-start">
          <Smartphone className="size-5 text-brand-500 mt-0.5 shrink-0" />
          <p className="text-sm text-text-secondary leading-relaxed">
            All payments and balance changes happen on the iOS app. This console exists so the cashier
            and CS-Infrastructure teams can credit wallets, look up balances, and review activity —
            <span className="font-semibold"> never to deduct funds.</span>
          </p>
        </div>
      </Section>
    </div>
  );
}

function ThemeOption({
  active, onClick, icon, label, description,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-xl border p-4 text-left transition-colors',
        active
          ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-900/30 ring-2 ring-brand-500/40'
          : 'border-border-subtle hover:bg-surface-muted',
      )}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
        {icon}{label}
      </div>
      <p className="text-xs text-text-tertiary mt-1.5">{description}</p>
      {active && (
        <div className="mt-2 text-[10px] uppercase tracking-wider font-bold text-brand-700 dark:text-brand-300">
          Active
        </div>
      )}
    </button>
  );
}
