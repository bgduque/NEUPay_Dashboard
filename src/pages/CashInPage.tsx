import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDebounce } from '@/lib/useDebounce';
import {
  AlertTriangle,
  Coins,
  KeyRound,
  Lock,
  Search,
  Sparkles,
  UserCheck,
  Wallet,
} from 'lucide-react';
import { searchUsers, userDetails } from '@/api/users';
import { adminTopUp, cashTopUp } from '@/api/payments';
import { passwordStepUp } from '@/api/auth';
import { hasStepUp } from '@/api/client';
import { useAuth } from '@/auth/store';
import { Section, Card } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Empty, Spinner } from '@/components/ui/Empty';
import { RoleBadge, StatusBadge } from '@/components/RoleBadge';
import { toast } from '@/components/ui/Toast';
import { usePageHeader } from '@/components/Layout';
import { formatPHP, initials } from '@/lib/format';
import type { UserSummary } from '@/api/types';
import { isStaffRole } from '@/lib/roles';

type Mode = 'direct' | 'qr';

export default function CashInPage() {
  const setHeader = usePageHeader((s) => s.set);
  useEffect(() => {
    setHeader({
      title: 'Cash In a Wallet',
      description: 'Credit a student, faculty, or staff wallet. Funds go up — never down.',
    });
  }, [setHeader]);

  const [mode, setMode] = useState<Mode>('direct');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query.trim(), 250);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const search = useQuery({
    queryKey: ['users-search', debouncedQuery],
    queryFn: () => searchUsers(debouncedQuery || undefined, 0, 8),
    enabled: debouncedQuery.length === 0 || debouncedQuery.length >= 1,
  });

  const detail = useQuery({
    queryKey: ['user-detail', selectedId],
    queryFn: () => userDetails(selectedId!),
    enabled: !!selectedId,
  });

  const results: UserSummary[] = useMemo(
    () => search.data?.content.filter((u) => !isStaffRole(u.role)) ?? [],
    [search.data],
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] gap-6 items-start">
      <Section
        title="Find the recipient"
        description="Search by name, NEU email, or ID number. Staff (cashiers / admins) are excluded."
      >
        <Input
          aria-label="Search users"
          placeholder="e.g. Sol, sol@neu.edu.ph, NEU-2023-..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leftIcon={<Search className="size-4" />}
        />
        {search.isLoading ? (
          <div className="flex justify-center py-10"><Spinner /></div>
        ) : results.length === 0 ? (
          <Empty
            title="No matches"
            description="Try a different name, email, or ID. Note: only students and faculty appear here — staff cannot be cashed in."
          />
        ) : (
          <ul className="divide-y divide-border-subtle">
            {results.map((u) => (
              <li key={u.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(u.id)}
                  className={
                    'w-full flex items-center gap-3 py-3 px-2 row-hover rounded-lg text-left ' +
                    (selectedId === u.id ? 'bg-brand-50 dark:bg-brand-900/30' : '')
                  }
                >
                  <span className="size-10 rounded-xl bg-surface-muted text-text-secondary grid place-items-center text-xs font-bold">
                    {initials(u.fullName)}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-text-primary truncate">
                        {u.fullName}
                      </span>
                      <RoleBadge role={u.role} />
                      <StatusBadge status={u.status} />
                    </div>
                    <div className="text-xs text-text-tertiary mt-0.5 truncate">
                      ID {u.idNumber} · {u.email}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Card className="flex flex-col gap-5">
        <div>
          <h2 className="text-base font-semibold text-text-primary">Top up</h2>
          <p className="text-xs text-text-tertiary mt-1">
            Cashiers can <span className="font-semibold text-emerald-700 dark:text-emerald-400">add funds</span> only.
            Removing funds requires a higher office (mobile / Face ID flow).
          </p>
        </div>
        <ModeToggle mode={mode} onChange={setMode} />
        {selectedId ? (
          detail.isLoading || !detail.data ? (
            <div className="flex justify-center py-10"><Spinner /></div>
          ) : mode === 'direct' ? (
            <DirectTopUpForm userId={detail.data.id} userName={detail.data.fullName} idNumber={detail.data.idNumber} balance={detail.data.walletBalance} />
          ) : (
            <QrTopUpForm userId={detail.data.id} userName={detail.data.fullName} idNumber={detail.data.idNumber} balance={detail.data.walletBalance} />
          )
        ) : (
          <Empty
            icon={<Wallet className="size-8" />}
            title="Select someone to cash in"
            description="Pick a student or faculty member on the left, then choose the credit method."
          />
        )}
      </Card>
    </div>
  );
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-surface-muted">
      <ToggleButton active={mode === 'direct'} onClick={() => onChange('direct')} icon={<Lock className="size-3.5" />} label="Direct top-up" sub="Password step-up" />
      <ToggleButton active={mode === 'qr'}     onClick={() => onChange('qr')}     icon={<KeyRound className="size-3.5" />} label="By QR token"    sub="Student presents QR" />
    </div>
  );
}

function ToggleButton({
  active, onClick, icon, label, sub,
}: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; sub: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'flex flex-col items-start text-left gap-0.5 px-3 py-2 rounded-lg ' +
        (active
          ? 'bg-surface-elevated shadow-soft text-text-primary'
          : 'text-text-secondary hover:text-text-primary')
      }
    >
      <div className="flex items-center gap-1.5 text-xs font-semibold">{icon}{label}</div>
      <div className="text-[11px] text-text-tertiary">{sub}</div>
    </button>
  );
}

interface FormCommonProps {
  userId: string;
  userName: string;
  idNumber: string;
  balance: string;
}

function DirectTopUpForm({ userId, userName, idNumber, balance }: FormCommonProps) {
  const qc = useQueryClient();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [stepUpOpen, setStepUpOpen] = useState(false);
  const [pendingSubmit, setPendingSubmit] = useState(false);

  const topUp = useMutation({
    mutationFn: () =>
      adminTopUp(
        { userId, amount: amount.trim(), note: note.trim() || `Cash in for ${userName}` },
        crypto.randomUUID(),
      ),
    onSuccess: (res) => {
      toast.success(`Credited ${formatPHP(res.amount)} — new balance ${formatPHP(res.balanceAfter)}`);
      setAmount('');
      setNote('');
      qc.invalidateQueries({ queryKey: ['user-detail', userId] });
      qc.invalidateQueries({ queryKey: ['admin-transactions'] });
      qc.invalidateQueries({ queryKey: ['cash-in-stats'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message ?? 'Top-up failed.';
      toast.error(msg);
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return;
    if (!hasStepUp()) {
      setStepUpOpen(true);
      setPendingSubmit(true);
      return;
    }
    topUp.mutate();
  };

  return (
    <>
      <RecipientSummary name={userName} idNumber={idNumber} balance={balance} />
      <form onSubmit={onSubmit} className="flex flex-col gap-3">
        <Input
          label="Amount (PHP)"
          inputMode="decimal"
          required
          placeholder="500.00"
          pattern="^\d+(\.\d{1,2})?$"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          leftIcon={<Coins className="size-4" />}
        />
        <Input
          label="Note"
          placeholder={`Cash in for ${userName}`}
          maxLength={160}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <div className="flex flex-col gap-2 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200/70 dark:border-amber-900/40 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-200">
            <AlertTriangle className="size-3.5" />
            Direct top-up requires step-up auth
          </div>
          <p className="text-[11px] text-amber-800/90 dark:text-amber-200/80">
            On submit you'll re-enter your password. The step-up token is good for ~5 minutes;
            after that you'll be asked again.
          </p>
        </div>
        <Button type="submit" loading={topUp.isPending} fullWidth size="lg">
          Credit Wallet
        </Button>
      </form>

      <StepUpModal
        open={stepUpOpen}
        onClose={() => { setStepUpOpen(false); setPendingSubmit(false); }}
        onVerified={() => {
          setStepUpOpen(false);
          if (pendingSubmit) {
            setPendingSubmit(false);
            topUp.mutate();
          }
        }}
      />
    </>
  );
}

function QrTopUpForm({ userId, userName, idNumber, balance }: FormCommonProps) {
  const qc = useQueryClient();
  const [qrToken, setQrToken] = useState('');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const topUp = useMutation({
    mutationFn: () =>
      cashTopUp(
        { qrToken: qrToken.trim(), amount: amount.trim(), note: note.trim() || `Cash in for ${userName}` },
        crypto.randomUUID(),
      ),
    onSuccess: (res) => {
      toast.success(`Credited ${formatPHP(res.amount)} — new balance ${formatPHP(res.balanceAfter)}`);
      setQrToken('');
      setAmount('');
      setNote('');
      qc.invalidateQueries({ queryKey: ['user-detail', userId] });
      qc.invalidateQueries({ queryKey: ['admin-transactions'] });
      qc.invalidateQueries({ queryKey: ['cash-in-stats'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } }; message?: string })
        ?.response?.data?.message ?? 'QR redemption failed.';
      toast.error(msg);
    },
  });

  return (
    <>
      <RecipientSummary name={userName} idNumber={idNumber} balance={balance} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!qrToken || !amount) return;
          topUp.mutate();
        }}
        className="flex flex-col gap-3"
      >
        <Input
          label="CASH_IN QR token"
          required
          placeholder="Paste the token from the student's iOS QR code"
          value={qrToken}
          onChange={(e) => setQrToken(e.target.value)}
          leftIcon={<KeyRound className="size-4" />}
          hint="The student opens NeuPay on iOS and shows their CASH_IN QR. Scan or paste the token."
        />
        <Input
          label="Amount (PHP)"
          inputMode="decimal"
          required
          placeholder="500.00"
          pattern="^\d+(\.\d{1,2})?$"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          leftIcon={<Coins className="size-4" />}
        />
        <Input
          label="Note"
          placeholder={`Cash in for ${userName}`}
          maxLength={160}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <Button type="submit" loading={topUp.isPending} fullWidth size="lg">
          Redeem &amp; Credit
        </Button>
      </form>
    </>
  );
}

function RecipientSummary({ name, idNumber, balance }: { name: string; idNumber: string; balance: string }) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-canvas/60 p-3 flex items-center gap-3">
      <span className="size-10 rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200 grid place-items-center font-bold">
        {initials(name)}
      </span>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-text-primary truncate">{name}</div>
        <div className="text-xs text-text-tertiary">ID {idNumber}</div>
      </div>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-wider text-text-tertiary">Current balance</div>
        <div className="text-sm font-semibold tabular-nums text-text-primary">{formatPHP(balance)}</div>
      </div>
    </div>
  );
}

function StepUpModal({
  open, onClose, onVerified,
}: {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
}) {
  const session = useAuth((s) => s.session);
  const setStepUp = useAuth((s) => s.setStepUp);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const verify = useMutation({
    mutationFn: () => passwordStepUp(password),
    onSuccess: (res) => {
      setStepUp(res.accessToken, res.expiresAt);
      setPassword('');
      setError(null);
      toast.info('Step-up verified — proceeding.');
      onVerified();
    },
    onError: (err: unknown) => {
      setError(
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
          ?? 'Verification failed.',
      );
    },
  });

  return (
    <Modal
      open={open}
      onClose={() => { setPassword(''); setError(null); onClose(); }}
      size="sm"
      title="Confirm with your password"
      description="The mobile app uses Face ID for this. On the web, we re-confirm your password instead."
      footer={
        <>
          <Button variant="ghost" onClick={() => { setPassword(''); setError(null); onClose(); }}>
            Cancel
          </Button>
          <Button
            loading={verify.isPending}
            disabled={!password}
            onClick={() => verify.mutate()}
          >
            <UserCheck className="size-4" />
            Verify
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-3">
        <div className="rounded-lg border border-border-subtle bg-surface-canvas/60 px-3 py-2 text-xs text-text-secondary">
          <div className="flex items-center gap-2 font-semibold text-text-primary">
            <Sparkles className="size-3.5 text-brand-500" />
            Signed in as {session?.user.fullName}
          </div>
          <div className="text-text-tertiary mt-0.5">{session?.user.email}</div>
        </div>
        <Input
          label="Password"
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={error ?? undefined}
          leftIcon={<Lock className="size-4" />}
        />
        <p className="text-[11px] text-text-tertiary">
          Step-up tokens last ~5 minutes. You won't be asked again for the next few transactions in this session.
        </p>
      </div>
    </Modal>
  );
}
