import { api } from './client';
import type { AuthResponse, StepUpResponse } from './types';

export interface LoginInput {
  /** NEU email or faculty/staff ID number. */
  principal: string;
  password: string;
}

export async function login({ principal, password }: LoginInput): Promise<AuthResponse> {
  // Backend kept the JSON field name `email` for iOS backward compatibility,
  // but the field accepts either email or ID number.
  const { data } = await api.post<AuthResponse>('/auth/login', {
    email: principal,
    password,
  });
  return data;
}

export async function refresh(refreshToken: string): Promise<AuthResponse> {
  const { data } = await api.post<AuthResponse>('/auth/refresh', { refreshToken });
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  await api.post('/auth/logout', { refreshToken });
}

export async function passwordStepUp(password: string): Promise<StepUpResponse> {
  const { data } = await api.post<StepUpResponse>('/auth/step-up/password', { password });
  return data;
}
