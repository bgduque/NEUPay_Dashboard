import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronLeft,
  ChevronRight,
  Coins,
  Receipt,
  ArrowDownLeft,
  RefreshCcw,
} from 'lucide-react';
import { adminTransactions } from '@/api/transactions';
import { Card, Section } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Empty, Spinner } from '@/components/ui/Empty';
import { RoleBadge } from '@/components/RoleBadge';
import { formatPHP, formatRelative, formatDateTime } from '@/lib/format';
import { usePageHeader } from '@/components/Layout';
import type { TransactionCategory } from '@/api/types';

const CATEGORY_OPTIONS: Array<{ value: TransactionCategory | ''; label: string }> = [
  { value: '',           label: 'All transactions' },
  { value: 'TOP_UP',     label: 'Cash-ins (TOP_UP)' },
  { value: 'PAYMENT',    label: 'Payments' },
  { value: 'DINING',     label: 'Dining' },
  { value: 'LIBRARY',    label: 'Library' },
  { value: 'REGISTRAR',  label: 'Registrar' },
  { value: 'TRANSFER',   label: 'Transfers' },
  { value: 'REFUND',     label: 'Refunds' },
  { value: 'ADJUSTMENT', label: 'Adjustments' },
];

export default function TransactionsPage() {
  const setHeader = usePageHeader((s) => s.set);
  const [category, setCategory] = useState<TransactionCategory | ''>('TOP_UP');
  const [page, setPage] = useState(0);

  const list = useQuery({
    queryKey: ['admin-transactions', category, page],
    queryFn: () => adminTransactions(category || undefined, page, 25),
  });

  useEffect(() => {
    setHeader({
      title: 'Transaction log',
      description: 'Every credit and charge across the university, with the cashier responsible.',
      actions: (
        <Button
          variant="secondary"
          size="sm"
          onClick={() => list.refetch()}
        >
          <RefreshCcw className="size-3.5" />
          Refresh
        </Button>
      ),
    });
  }, [setHeader, list]);

  return (
    <div className="flex flex-col gap-4">
      <Card className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <div className="text-sm font-semibold text-text-primary">Filter</div>
          <div className="text-xs text-text-tertiary mt-1">
            {list.data ? `${list.data.totalElements.toLocaleString()} entries` : 'Loading…'}
          </div>
        </div>
        <Select
          aria-label="Category"
          value={category}
          onChange={(e) => { setCategory(e.target.value as TransactionCategory | ''); setPage(0); }}
          options={CATEGORY_OPTIONS}
          className="w-60"
        />
      </Card>

      <Section title="Entries">
        {list.isLoading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : !list.data || list.data.items.length === 0 ? (
          <Empty
            icon={<Receipt className="size-8" />}
            title="Nothing logged yet"
            description="Once activity flows through the platform, the log will populate here."
          />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
                  <th className="px-2 py-2 font-semibold">Recipient</th>
                  <th className="px-2 py-2 font-semibold">Category</th>
                  <th className="px-2 py-2 font-semibold text-right">Amount</th>
                  <th className="px-2 py-2 font-semibold">Cashier</th>
                  <th className="px-2 py-2 font-semibold">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {list.data.items.map((t) => {
                  const amt = Number(t.amount);
                  const isCredit = amt >= 0;
                  return (
                    <tr key={t.id} className="row-hover">
                      <td className="px-2 py-3 align-middle">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={
                            'size-8 rounded-lg grid place-items-center shrink-0 ' +
                            (isCredit
                              ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                              : 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300')
                          }>
                            {isCredit ? <Coins className="size-3.5" /> : <ArrowDownLeft className="size-3.5" />}
                          </span>
                          <div className="min-w-0">
                            <div className="font-semibold text-text-primary text-sm truncate">
                              {t.recipientName}
                            </div>
                            <div className="text-[11px] text-text-tertiary truncate">
                              {t.title}
                            </div>
                          </div>
                          <RoleBadge role={t.recipientRole} className="ml-1" />
                        </div>
                      </td>
                      <td className="px-2 py-3 align-middle">
                        <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[10px] uppercase font-bold tracking-wide">
                          {t.category}
                        </span>
                      </td>
                      <td className={
                        'px-2 py-3 text-right tabular-nums font-semibold ' +
                        (isCredit ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')
                      }>
                        {isCredit ? '+' : ''}{formatPHP(amt)}
                        <div className="text-[11px] text-text-tertiary font-normal">
                          bal · {formatPHP(t.balanceAfter)}
                        </div>
                      </td>
                      <td className="px-2 py-3 align-middle text-text-secondary">
                        {t.cashierName ?? <span className="text-text-tertiary">—</span>}
                      </td>
                      <td className="px-2 py-3 align-middle text-xs text-text-tertiary whitespace-nowrap">
                        <div className="text-text-secondary">{formatRelative(t.occurredAt)}</div>
                        <div>{formatDateTime(t.occurredAt)}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {list.data && list.data.totalElements > list.data.size && (
          <div className="flex items-center justify-between border-t border-border-subtle pt-3 mt-2">
            <div className="text-xs text-text-tertiary">
              Page {page + 1} of {Math.max(1, Math.ceil(list.data.totalElements / list.data.size))}
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={page === 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                <ChevronLeft className="size-3.5" /> Prev
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={(page + 1) * list.data.size >= list.data.totalElements}
                onClick={() => setPage((p) => p + 1)}
              >
                Next <ChevronRight className="size-3.5" />
              </Button>
            </div>
          </div>
        )}
      </Section>
    </div>
  );
}
