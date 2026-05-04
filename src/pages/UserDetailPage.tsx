import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  ShieldOff,
  ShieldCheck as ShieldOn,
  Coins,
  CalendarClock,
  CreditCard,
  Mail,
  IdCard,
  Wallet,
} from 'lucide-react';
import { freezeUser, reinstateUser, userDetails, userWallet } from '@/api/users';
import { Card, Section } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Empty';
import { RoleBadge, StatusBadge } from '@/components/RoleBadge';
import { toast } from '@/components/ui/Toast';
import { useAuth } from '@/auth/store';
import { canFreezeUsers, isStaffRole, personaFor } from '@/lib/roles';
import { formatDateTime, formatPHP, formatRelative, initials } from '@/lib/format';
import { usePageHeader } from '@/components/Layout';

export default function UserDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const setHeader = usePageHeader((s) => s.set);

  const session = useAuth((s) => s.session);
  const persona = session ? personaFor(session.user.role, session.user.program) : 'CASHIER';
  const canFreeze = canFreezeUsers(persona);

  const detail = useQuery({
    queryKey: ['user-detail', id],
    queryFn: () => userDetails(id),
    enabled: !!id,
  });
  const wallet = useQuery({
    queryKey: ['user-wallet', id],
    queryFn: () => userWallet(id),
    enabled: !!id,
  });

  const freeze = useMutation({
    mutationFn: () => freezeUser(id),
    onSuccess: () => {
      toast.warn('Wallet frozen and account suspended.');
      qc.invalidateQueries({ queryKey: ['user-detail', id] });
      qc.invalidateQueries({ queryKey: ['user-wallet', id] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Could not freeze the account.'),
  });
  const reinstate = useMutation({
    mutationFn: () => reinstateUser(id),
    onSuccess: () => {
      toast.success('Account reinstated.');
      qc.invalidateQueries({ queryKey: ['user-detail', id] });
      qc.invalidateQueries({ queryKey: ['user-wallet', id] });
      qc.invalidateQueries({ queryKey: ['users'] });
    },
    onError: () => toast.error('Could not reinstate the account.'),
  });

  useEffect(() => {
    setHeader({
      title: detail.data?.fullName ?? 'User',
      description: detail.data ? `ID ${detail.data.idNumber} · ${detail.data.email}` : '—',
      actions: (
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="size-4" /> Back
        </Button>
      ),
    });
  }, [detail.data, navigate, setHeader]);

  if (detail.isLoading || !detail.data) {
    return <div className="flex justify-center py-20"><Spinner /></div>;
  }
  const u = detail.data;
  const isStaff = isStaffRole(u.role);
  const isSuspended = u.status === 'SUSPENDED';

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] gap-6">
      <Section title="Profile" description="Identity and verification status from the database.">
        <div className="flex items-center gap-4">
          <div className="size-14 rounded-2xl bg-brand-100 dark:bg-brand-900/40 text-brand-800 dark:text-brand-200 grid place-items-center font-bold text-base">
            {initials(u.fullName)}
          </div>
          <div className="min-w-0">
            <div className="text-base font-semibold text-text-primary truncate">{u.fullName}</div>
            <div className="text-xs text-text-tertiary mt-0.5">{u.program ?? 'No program on record'}</div>
            <div className="flex items-center gap-2 mt-2">
              <RoleBadge role={u.role} />
              <StatusBadge status={u.status} />
            </div>
          </div>
        </div>

        <dl className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-xs">
          <Field icon={<Mail className="size-3.5" />} label="Email" value={u.email} />
          <Field icon={<IdCard className="size-3.5" />} label="ID number" value={u.idNumber} />
          <Field icon={<CalendarClock className="size-3.5" />} label="Created" value={formatDateTime(u.createdAt)} />
          <Field icon={<CalendarClock className="size-3.5" />} label="Last login" value={u.lastLoginAt ? formatRelative(u.lastLoginAt) : 'Never'} />
        </dl>

        {!isStaff && canFreeze && (
          <div className="border-t border-border-subtle pt-4 mt-2">
            <div className="text-[10px] uppercase tracking-[0.16em] font-bold text-text-tertiary mb-2">
              Account control
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {isSuspended ? (
                <Button
                  variant="primary"
                  loading={reinstate.isPending}
                  onClick={() => reinstate.mutate()}
                >
                  <ShieldOn className="size-4" />
                  Reinstate
                </Button>
              ) : (
                <Button
                  variant="danger"
                  loading={freeze.isPending}
                  onClick={() => {
                    if (confirm(`Freeze ${u.fullName}'s wallet and suspend their account?`)) {
                      freeze.mutate();
                    }
                  }}
                >
                  <ShieldOff className="size-4" />
                  Freeze account
                </Button>
              )}
              <p className="text-[11px] text-text-tertiary">
                Freezes the wallet and prevents new sign-ins. Reversible.
              </p>
            </div>
          </div>
        )}
      </Section>

      <Section title="Wallet" description="Live balance and card. Only the mobile app can spend from this wallet.">
        {wallet.isLoading || !wallet.data ? (
          <Spinner />
        ) : (
          <>
            <Card padding="lg" className="bg-gradient-to-br from-brand-700 via-brand-800 to-brand-950 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-white/70">NeuPay Wallet</div>
                  <div className="mt-3 text-3xl font-bold tracking-tight tabular-nums">
                    {formatPHP(wallet.data.balance)}
                  </div>
                </div>
                <div className="flex flex-col items-end text-xs text-white/70">
                  <span className="inline-flex items-center gap-1">
                    <Wallet className="size-3.5 text-gold-400" />
                    {wallet.data.status}
                  </span>
                  <span>Valid {wallet.data.validUntilYear}</span>
                </div>
              </div>
              <div className="mt-8 flex items-center gap-3 text-sm font-mono tracking-widest">
                <CreditCard className="size-4 text-gold-400" />
                {wallet.data.cardNumber}
              </div>
            </Card>
            <div className="flex items-center gap-2 text-xs text-text-tertiary mt-1">
              <Coins className="size-3.5" />
              Cashiers can credit this wallet from <span className="text-brand-700 dark:text-brand-300 font-semibold">Cash In</span>.
            </div>
          </>
        )}
      </Section>
    </div>
  );
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1.5 text-text-tertiary text-[10px] uppercase tracking-wide">
        {icon}{label}
      </dt>
      <dd className="text-text-primary mt-0.5 truncate">{value}</dd>
    </div>
  );
}
