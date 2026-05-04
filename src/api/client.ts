import axios, {
  AxiosError,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import type { AuthResponse } from './types';

declare module 'axios' {
  // Per-request opt-in flag: if set, the request interceptor swaps the
  // bearer for the step-up JWT instead of the regular access token.
  export interface AxiosRequestConfig {
    useStepUp?: boolean;
  }
  export interface InternalAxiosRequestConfig {
    useStepUp?: boolean;
  }
}

const API_BASE = (import.meta.env.VITE_NEU_API_BASE ?? 'http://localhost:8080').replace(/\/$/, '');

interface DeviceContext {
  deviceId: string;
}

const DEVICE_KEY = 'neu-device-id';

function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_KEY);
    if (existing) return existing;
    const fresh = `web-${crypto.randomUUID()}`;
    localStorage.setItem(DEVICE_KEY, fresh);
    return fresh;
  } catch {
    return `web-ephemeral-${Math.random().toString(36).slice(2)}`;
  }
}

const device: DeviceContext = { deviceId: getOrCreateDeviceId() };

interface TokenSlot {
  access: string | null;
  refresh: string | null;
  step: string | null;
  stepExpires: number | null; // epoch ms
}

const tokens: TokenSlot = { access: null, refresh: null, step: null, stepExpires: null };

export interface AuthTokenSink {
  onLogout(): void;
  onRefreshed(next: AuthResponse): void;
}

let sink: AuthTokenSink | null = null;
export function bindAuthSink(s: AuthTokenSink) { sink = s; }

export function setAuthTokens(access: string | null, refresh: string | null) {
  tokens.access = access;
  tokens.refresh = refresh;
}

export function setStepUpToken(token: string | null, expiresAtIso: string | null) {
  tokens.step = token;
  tokens.stepExpires = expiresAtIso ? new Date(expiresAtIso).getTime() : null;
}

export function hasStepUp(): boolean {
  if (!tokens.step || !tokens.stepExpires) return false;
  return tokens.stepExpires - Date.now() > 5_000; // 5s safety margin
}

export const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 20_000,
});

// Request interceptor: bearer + device id, plus optional step-up override
// for one-shot privileged calls.
api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  config.headers = config.headers ?? {};
  if (!('X-Device-Id' in config.headers)) {
    config.headers['X-Device-Id'] = device.deviceId;
  }

  // If the caller asks for a step-up, swap the bearer for the step-up token.
  if (config.useStepUp && tokens.step) {
    config.headers.Authorization = `Bearer ${tokens.step}`;
  } else if (tokens.access) {
    config.headers.Authorization = `Bearer ${tokens.access}`;
  }
  return config;
});

// Response interceptor: refresh-on-401, then replay once.
let pendingRefresh: Promise<AuthResponse> | null = null;

async function performRefresh(): Promise<AuthResponse> {
  if (!tokens.refresh) throw new Error('No refresh token');
  if (pendingRefresh) return pendingRefresh;

  pendingRefresh = axios
    .post<AuthResponse>(
      `${API_BASE}/api/v1/auth/refresh`,
      { refreshToken: tokens.refresh },
      { headers: { 'Content-Type': 'application/json', 'X-Device-Id': device.deviceId } },
    )
    .then((res) => {
      const next = res.data;
      tokens.access = next.accessToken;
      tokens.refresh = next.refreshToken;
      sink?.onRefreshed(next);
      return next;
    })
    .finally(() => {
      pendingRefresh = null;
    });

  return pendingRefresh;
}

api.interceptors.response.use(
  (res: AxiosResponse) => res,
  async (error: AxiosError) => {
    const original = error.config as
      | (InternalAxiosRequestConfig & { __retried?: boolean })
      | undefined;

    if (!original || !error.response) throw error;

    // Don't auto-refresh login/refresh failures themselves.
    const path = original.url ?? '';
    const isAuthEndpoint = path.startsWith('/auth/login') || path.startsWith('/auth/refresh');

    if (error.response.status === 401 && !original.__retried && !isAuthEndpoint && tokens.refresh) {
      original.__retried = true;
      try {
        await performRefresh();
        // Replay with the new bearer.
        original.headers = original.headers ?? {};
        original.headers.Authorization = `Bearer ${tokens.access}`;
        return api.request(original);
      } catch {
        sink?.onLogout();
        throw error;
      }
    }

    if (error.response.status === 401) {
      sink?.onLogout();
    }
    throw error;
  },
);

export interface ApiCallError {
  status: number;
  message: string;
  raw: unknown;
}

export function toApiError(err: unknown): ApiCallError {
  if (axios.isAxiosError(err)) {
    const status = err.response?.status ?? 0;
    const data = err.response?.data as { message?: string; error?: string } | undefined;
    return {
      status,
      message: data?.message || data?.error || err.message || 'Request failed',
      raw: err.response?.data ?? err.message,
    };
  }
  return { status: 0, message: (err as Error)?.message ?? 'Unexpected error', raw: err };
}
