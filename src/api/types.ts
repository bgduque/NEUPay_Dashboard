// Mirrors the Spring Boot DTOs in
// ph.edu.neu.payment.api.dto.{AuthDtos,AdminDtos,WalletDtos,PaymentDtos}.

export type UserRole = 'STUDENT' | 'FACULTY' | 'CASHIER' | 'ADMIN';

export type VerificationStatus = 'VERIFIED' | 'PENDING' | 'SUSPENDED';

export type TransactionCategory =
  | 'DINING' | 'TOP_UP' | 'LIBRARY' | 'REGISTRAR'
  | 'TRANSFER' | 'PAYMENT' | 'REFUND' | 'ADJUSTMENT';

export type WalletStatus = 'ACTIVE' | 'FROZEN' | 'CLOSED';

export interface ProfileSummary {
  id: string;
  fullName: string;
  email: string;
  idNumber: string;
  program: string | null;
  role: UserRole;
  status: string;
}

export interface AuthResponse {
  accessToken: string;
  accessTokenExpiresAt: string;
  refreshToken: string;
  refreshTokenExpiresAt: string;
  user: ProfileSummary;
}

export interface StepUpResponse {
  accessToken: string;
  expiresAt: string;
}

export interface UserSummary {
  id: string;
  fullName: string;
  email: string;
  idNumber: string;
  role: UserRole;
  status: VerificationStatus;
}

export interface UserDetails {
  id: string;
  fullName: string;
  email: string;
  idNumber: string;
  program: string | null;
  role: UserRole;
  status: VerificationStatus;
  walletBalance: string;
  walletCardNumber: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface WalletView {
  id: string;
  userId: string;
  balance: string;
  cardNumber: string;
  status: WalletStatus;
  validUntilYear: number;
}

export interface TransactionLogEntry {
  id: string;
  reference: string;
  title: string;
  amount: string;
  balanceAfter: string;
  category: TransactionCategory;
  occurredAt: string;
  recipientId: string;
  recipientName: string;
  recipientRole: UserRole;
  cashierId: string | null;
  cashierName: string | null;
}

export interface TransactionLogPage {
  items: TransactionLogEntry[];
  page: number;
  size: number;
  totalElements: number;
}

export interface CashInStatsBucket {
  date: string;        // ISO date "yyyy-MM-dd"
  role: UserRole;
  count: number;
  totalAmount: string; // BigDecimal serialised as string
}

export interface CashInStats {
  days: number;
  buckets: CashInStatsBucket[];
}

// Spring Data Page<T> shape for the user list endpoint.
export interface SpringPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export interface CreateStaffRequest {
  fullName: string;
  email: string;
  idNumber: string;
  temporaryPassword: string;
  role: 'CASHIER' | 'ADMIN';
}

export interface CreateUserRequest {
  fullName: string;
  email: string;
  idNumber: string;
  temporaryPassword: string;
  role: UserRole;
  /** Free-form program / department label, optional. */
  program?: string | null;
  /** Optional opening wallet balance in PHP. Recorded as a TOP_UP transaction. */
  initialBalance?: string | null;
  initialBalanceNote?: string | null;
}

export interface ChangeRoleRequest {
  role: UserRole;
}

export interface AdminTopUpRequest {
  userId: string;
  amount: string;   // BigDecimal as string
  note: string;
}

export interface TransactionResult {
  transactionId: string;
  reference: string;
  amount: string;
  balanceAfter: string;
  occurredAt: string;
}

export interface CashTopUpRequest {
  qrToken: string;
  amount: string;
  note: string;
}

export interface ApiError {
  status: number;
  error: string;
  message: string;
  path?: string;
  timestamp?: string;
}
