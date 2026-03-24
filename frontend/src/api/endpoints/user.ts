import { http } from '@/api/client/http';
import type { ApiEnvelope, AuthUser } from '@/types/auth';

export interface UpdateProfileReq {
  email: string;
  avatar_url: string;
  signature: string;
  gender: string;
  age: number;
}

export interface ResetPasswordReq {
  old_password: string;
  new_password: string;
}

export interface ChangePhoneReq {
  old_phone_code: string;
  new_phone: string;
  new_phone_code: string;
}

export async function getProfile(): Promise<AuthUser> {
  const { data } = await http.get<ApiEnvelope<AuthUser>>('/user/profile');
  return data.data;
}

export async function updateProfile(payload: UpdateProfileReq): Promise<AuthUser> {
  const { data } = await http.put<ApiEnvelope<AuthUser>>('/user/profile', payload);
  return data.data;
}

export async function resetPassword(payload: ResetPasswordReq): Promise<void> {
  await http.post('/user/password/reset', payload);
}

export async function changePhone(payload: ChangePhoneReq): Promise<void> {
  await http.post('/user/phone/change', payload);
}

export async function uploadAvatar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  const { data } = await http.post<ApiEnvelope<{ avatar_url: string }>>('/user/avatar/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data.data.avatar_url;
}
