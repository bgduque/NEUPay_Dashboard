import { useEffect, useState, type FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { IdCard, Mail, User, Lock, ShieldCheck, RefreshCw } from 'lucide-react';
import { Section } from '@/components/ui/Card';
import { Input, Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Toast';
import { createStaff } from '@/api/users';
import { usePageHeader } from '@/components/Layout';
import { useAuth } from '@/auth/store';
import { canCreateUsers, personaFor } from '@/lib/roles';

const ROLES = [
  { value: 'CASHIER', label: 'School Cashier' },
  { value: 'ADMIN',   label: 'Administrator (incl. CS Infra)' },
];

function generatePassword(): string {
  // 16 chars, mixed case + digits — comfortably above the 12-char backend minimum.
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  const buf = crypto.getRandomValues(new Uint32Array(16));
  let out = '';
  for (let i = 0; i < buf.length; i++) out += charset[buf[i] % charset.length];
  return out;
}

export default function NewStaffPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const session = useAuth((s) => s.session);
  const persona = session ? personaFor(session.user.role, session.user.program) : 'CASHIER';
  const setHeader = usePageHeader((s) => s.set);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [password, setPassword] = useState(generatePassword());
  const [role, setRole] = useState<'CASHIER' | 'ADMIN'>('CASHIER');

  useEffect(() => {
    setHeader({
      title: 'Provision a staff account',
      description: 'CS Infrastructure / Admin only. Issues a temporary password the new hire must rotate on first login.',
    });
  }, [setHeader]);

  useEffect(() => {
    if (!canCreateUsers(persona)) {
      navigate('/dashboard', { replace: true });
    }
  }, [persona, navigate]);

  const create = useMutation({
    mutationFn: () => createStaff({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      idNumber: idNumber.trim(),
      temporaryPassword: password,
      role,
    }),
    onSuccess: (created) => {
      toast.success(`${created.fullName} created as ${role}.`);
      qc.invalidateQueries({ queryKey: ['users'] });
      navigate(`/users/${created.id}`);
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Could not create the staff account.';
      toast.error(msg);
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !idNumber || password.length < 12) return;
    create.mutate();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-6">
      <Section title="New staff account" description="Cashier or admin. Both roles can credit wallets; only ADMIN can create users and freeze accounts.">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <Input
            label="Full name"
            required
            placeholder="Maria Soledad Reyes"
            maxLength={160}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            leftIcon={<User className="size-4" />}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="NEU email"
              type="email"
              required
              placeholder="m.reyes@neu.edu.ph"
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="size-4" />}
            />
            <Input
              label="Faculty / Staff ID"
              required
              placeholder="NEU-CASH-0014"
              minLength={6}
              maxLength={32}
              pattern="[A-Za-z0-9-]+"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              leftIcon={<IdCard className="size-4" />}
            />
          </div>
          <Select
            label="Role"
            value={role}
            onChange={(e) => setRole(e.target.value as 'CASHIER' | 'ADMIN')}
            options={ROLES}
          />
          <Input
            label="Temporary password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={12}
            maxLength={128}
            required
            leftIcon={<Lock className="size-4" />}
            hint="Must be at least 12 characters. The new staff member should change this on first login."
            rightSlot={
              <button
                type="button"
                onClick={() => setPassword(generatePassword())}
                className="px-2 py-1 rounded-md text-text-tertiary hover:bg-surface-muted hover:text-text-primary"
                aria-label="Regenerate password"
              >
                <RefreshCw className="size-3.5" />
              </button>
            }
          />
          <Button type="submit" loading={create.isPending} fullWidth size="lg">
            Create account
          </Button>
        </form>
      </Section>

      <Section title="Operator note" description="Read this before issuing the credentials.">
        <ul className="text-sm text-text-secondary space-y-3">
          <li className="flex gap-2"><ShieldCheck className="size-4 text-brand-500 mt-0.5 shrink-0" />
            <span>Hand the temporary password over a secure channel — never email or chat.</span>
          </li>
          <li className="flex gap-2"><ShieldCheck className="size-4 text-brand-500 mt-0.5 shrink-0" />
            <span>The new staff member should sign in immediately and rotate their password.</span>
          </li>
          <li className="flex gap-2"><ShieldCheck className="size-4 text-brand-500 mt-0.5 shrink-0" />
            <span>Cashiers can credit wallets and read balances; only Admins can create users and freeze / reinstate accounts.</span>
          </li>
          <li className="flex gap-2"><ShieldCheck className="size-4 text-brand-500 mt-0.5 shrink-0" />
            <span>Account creation is audited (action <code className="font-mono text-[11px]">STAFF_CREATE</code>) and tied back to your operator id.</span>
          </li>
        </ul>
      </Section>
    </div>
  );
}
