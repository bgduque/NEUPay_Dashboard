import { api } from './client';
import type {
  CashInStats,
  TransactionCategory,
  TransactionLogPage,
} from './types';

export async function adminTransactions(
  category: TransactionCategory | undefined,
  page = 0,
  size = 25,
): Promise<TransactionLogPage> {
  const { data } = await api.get<TransactionLogPage>('/admin/transactions', {
    params: { category, page, size },
  });
  return data;
}

export async function cashInStats(days = 30): Promise<CashInStats> {
  const { data } = await api.get<CashInStats>('/admin/transactions/stats', {
    params: { days },
  });
  return data;
}
