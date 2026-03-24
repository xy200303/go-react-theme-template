import { http } from '@/api/client/http';
import type { ApiEnvelope, LoginResponse } from '@/types/auth';

export interface SendSmsReq {
  phone: string;
  scene: 'register' | 'login' | 'change_phone_old' | 'change_phone_new';
}

export interface RegisterReq {
  username: string;
  phone: string;
  password: string;
  code?: string;
}

export interface PasswordLoginReq {
  account: string;
  password: string;
}

export interface SmsLoginReq {
  phone: string;
  code: string;
}

export async function sendSmsCode(payload: SendSmsReq): Promise<void> {
  await http.post<ApiEnvelope<{ sent: boolean }>>('/auth/sms/send', payload);
}

export async function register(payload: RegisterReq): Promise<LoginResponse> {
  const { data } = await http.post<ApiEnvelope<LoginResponse>>('/auth/register', payload);
  return data.data;
}

export async function loginByPassword(payload: PasswordLoginReq): Promise<LoginResponse> {
  const { data } = await http.post<ApiEnvelope<LoginResponse>>('/auth/login/password', payload);
  return data.data;
}

export async function loginBySms(payload: SmsLoginReq): Promise<LoginResponse> {
  const { data } = await http.post<ApiEnvelope<LoginResponse>>('/auth/login/sms', payload);
  return data.data;
}

export async function logout(refreshToken: string): Promise<void> {
  await http.post('/auth/logout', { refresh_token: refreshToken });
}
