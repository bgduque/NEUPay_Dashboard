import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { getActiveTheme, toggleTheme, type Theme } from '@/lib/theme';
import { cn } from '@/lib/cn';

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setLocalTheme] = useState<Theme>(getActiveTheme());

  useEffect(() => {
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<{ theme: Theme }>).detail;
      if (detail?.theme) setLocalTheme(detail.theme);
    };
    window.addEventListener('neu-theme-change', onChange);
    return () => window.removeEventListener('neu-theme-change', onChange);
  }, []);

  return (
    <button
      onClick={() => setLocalTheme(toggleTheme())}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={cn(
        'inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border-subtle',
        'text-text-secondary hover:bg-surface-muted hover:text-text-primary',
        'transition-colors',
        className,
      )}
    >
      {theme === 'dark'
        ? <Sun className="size-4" aria-hidden />
        : <Moon className="size-4" aria-hidden />}
    </button>
  );
}
