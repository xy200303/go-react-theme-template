import { http } from '@/api/client/http';
import type { ApiEnvelope, AuthUser } from '@/types/auth';

export interface SystemStats {
  user_count: number;
  role_count: number;
  system_config_count: number;
  redis_online: boolean;
}

export interface CreateAdminUserPayload {
  username: string;
  phone: string;
  password: string;
  email: string;
  avatar_url?: string;
  signature: string;
  gender: string;
  age: number;
  is_active: boolean;
  role_names: string[];
}

export interface UpdateAdminUserPayload {
  username: string;
  phone: string;
  email: string;
  avatar_url?: string;
  signature: string;
  gender: string;
  age: number;
  is_active: boolean;
}

export interface RoleItem {
  id: number;
  name: string;
  display_name: string;
  description: string;
}

export interface RolePolicy {
  path: string;
  method: string;
}

export interface PolicyTemplateItem {
  key: string;
  menu_key: string;
  menu_label: string;
  action_label: string;
  description?: string;
  method: string;
  path: string;
}

export interface SystemConfigItem {
  id: number;
  config_group: string;
  config_key: string;
  config_val: string;
  remark: string;
}

export async function getStats(): Promise<SystemStats> {
  const { data } = await http.get<ApiEnvelope<SystemStats>>('/admin/stats');
  return data.data;
}

export async function listPolicyTemplates(): Promise<PolicyTemplateItem[]> {
  const { data } = await http.get<ApiEnvelope<PolicyTemplateItem[]>>('/admin/policy-templates');
  return data.data;
}

export async function listUsers(keyword?: string): Promise<AuthUser[]> {
  const { data } = await http.get<ApiEnvelope<AuthUser[]>>('/admin/users', {
    params: keyword ? { keyword } : undefined
  });
  return data.data;
}

export async function createUser(payload: CreateAdminUserPayload): Promise<AuthUser> {
  const { data } = await http.post<ApiEnvelope<AuthUser>>('/admin/users', payload);
  return data.data;
}

export async function updateUser(userId: number, payload: UpdateAdminUserPayload): Promise<AuthUser> {
  const { data } = await http.put<ApiEnvelope<AuthUser>>(`/admin/users/${userId}`, payload);
  return data.data;
}

export async function deleteUser(userId: number): Promise<void> {
  await http.delete(`/admin/users/${userId}`);
}

export async function resetUserPassword(userId: number, password: string): Promise<void> {
  await http.put(`/admin/users/${userId}/password`, { password });
}

export async function updateUserRoles(userId: number, roleNames: string[]): Promise<void> {
  await http.put(`/admin/users/${userId}/roles`, { role_names: roleNames });
}

export async function listRoles(): Promise<RoleItem[]> {
  const { data } = await http.get<ApiEnvelope<RoleItem[]>>('/admin/roles');
  return data.data;
}

export async function createRole(payload: Pick<RoleItem, 'name' | 'display_name' | 'description'>): Promise<void> {
  await http.post('/admin/roles', payload);
}

export async function updateRole(roleId: number, payload: Pick<RoleItem, 'display_name' | 'description'>): Promise<void> {
  await http.put(`/admin/roles/${roleId}`, payload);
}

export async function deleteRole(roleId: number): Promise<void> {
  await http.delete(`/admin/roles/${roleId}`);
}

export async function getRolePolicies(roleId: number): Promise<RolePolicy[]> {
  const { data } = await http.get<ApiEnvelope<RolePolicy[]>>(`/admin/roles/${roleId}/policies`);
  return data.data;
}

export async function setRolePolicies(roleId: number, policies: RolePolicy[]): Promise<void> {
  await http.put(`/admin/roles/${roleId}/policies`, { policies });
}

export async function listSystemConfigs(): Promise<SystemConfigItem[]> {
  const { data } = await http.get<ApiEnvelope<SystemConfigItem[]>>('/admin/system-configs');
  return data.data;
}

export async function upsertSystemConfig(payload: {
  config_group: string;
  config_key: string;
  config_val: string;
  remark: string;
}): Promise<void> {
  await http.put('/admin/system-configs', payload);
}
