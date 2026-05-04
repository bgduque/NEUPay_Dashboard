import { api } from './client';
import type { AdminTopUpRequest, CashTopUpRequest, TransactionResult } from './types';

/**
 * Direct top-up by user id. Requires a valid step-up token; the caller must
 * obtain one via {@link passwordStepUp} *before* invoking this. We swap the
 * bearer token via the per-request `useStepUp` flag.
 */
export async function adminTopUp(
  req: AdminTopUpRequest,
  idempotencyKey: string,
): Promise<TransactionResult> {
  const { data } = await api.post<TransactionResult>('/admin/topup', req, {
    headers: { 'X-Idempotency-Key': idempotencyKey },
    useStepUp: true,
  });
  return data;
}

/** QR-based cash-in: student presents a CASH_IN QR token from the mobile app. */
export async function cashTopUp(
  req: CashTopUpRequest,
  idempotencyKey: string,
): Promise<TransactionResult> {
  const { data } = await api.post<TransactionResult>('/payments/cash-topup', req, {
    headers: { 'X-Idempotency-Key': idempotencyKey },
  });
  return data;
}
