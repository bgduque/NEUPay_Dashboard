import { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { format, eachDayOfInterval, parseISO, subDays } from 'date-fns';
import type { CashInStats, UserRole } from '@/api/types';
import { Empty, Spinner } from './ui/Empty';
import { LineChart as LineChartIcon } from 'lucide-react';

const SERIES: Array<{ role: UserRole; label: string; color: string }> = [
  { role: 'STUDENT', label: 'Students', color: '#0891b2' }, // brand-600
  { role: 'FACULTY', label: 'Faculty',  color: '#e8a90b' }, // gold-500
  { role: 'CASHIER', label: 'Cashiers', color: '#10b981' }, // emerald-500
  { role: 'ADMIN',   label: 'Admins',   color: '#a855f7' }, // purple-500
];

interface ChartDatum {
  date: string;        // yyyy-MM-dd
  label: string;       // "MMM d"
  STUDENT: number;
  FACULTY: number;
  CASHIER: number;
  ADMIN: number;
}

interface CashInChartProps {
  data: CashInStats | undefined;
  isLoading: boolean;
  metric?: 'count' | 'amount';
}

export function CashInChart({ data, isLoading, metric = 'count' }: CashInChartProps) {
  const series = useMemo<ChartDatum[]>(() => {
    if (!data) return [];
    const days = data.days;
    const today = new Date();
    const start = subDays(today, days - 1);
    const skeleton = eachDayOfInterval({ start, end: today }).map((d) => ({
      date: format(d, 'yyyy-MM-dd'),
      label: format(d, 'MMM d'),
      STUDENT: 0,
      FACULTY: 0,
      CASHIER: 0,
      ADMIN: 0,
    }));
    const byDate = new Map(skeleton.map((s) => [s.date, s]));
    for (const b of data.buckets) {
      const row = byDate.get(b.date);
      if (!row) continue;
      const value = metric === 'amount' ? Number(b.totalAmount) : b.count;
      row[b.role] = value;
    }
    return skeleton;
  }, [data, metric]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-72">
        <Spinner className="size-6" />
      </div>
    );
  }

  const allEmpty = series.every(
    (d) => d.STUDENT === 0 && d.FACULTY === 0 && d.CASHIER === 0 && d.ADMIN === 0,
  );

  if (allEmpty) {
    return (
      <Empty
        icon={<LineChartIcon className="size-8" />}
        title="No cash-ins recorded yet"
        description="Cash-in totals will appear here as your team starts crediting wallets through the dashboard or the iOS app."
      />
    );
  }

  return (
    <div className="h-72 -mx-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={series} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            tickMargin={8}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            tickMargin={4}
            allowDecimals={metric === 'amount'}
          />
          <Tooltip
            cursor={{ stroke: 'rgb(var(--border-strong))', strokeWidth: 1 }}
            labelFormatter={(label, payload) => {
              if (payload?.[0]?.payload?.date) {
                return format(parseISO(payload[0].payload.date), 'PP');
              }
              return label as string;
            }}
            formatter={(value: number) =>
              metric === 'amount'
                ? new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value)
                : value.toString()
            }
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          />
          {SERIES.map((s) => (
            <Line
              key={s.role}
              type="monotone"
              dataKey={s.role}
              name={s.label}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
