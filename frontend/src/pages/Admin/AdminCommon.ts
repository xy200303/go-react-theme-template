import { isAxiosError } from 'axios';
import type { RoleItem, RolePolicy, SystemConfigItem } from '@/api/endpoints/admin';
import type { AuthUser } from '@/types/auth';

export type UserFormValues = {
  username: string;
  phone: string;
  password?: string;
  email: string;
  signature: string;
  gender: string;
  age?: number | null;
  is_active: boolean;
};

export type PasswordFormValues = {
  password: string;
};

export type RoleFormValues = {
  name: string;
  display_name: string;
  description: string;
};

export type ConfigFormValues = {
  config_group: string;
  config_key: string;
  config_val: string;
  remark: string;
};

export type PolicyTemplate = {
  key: string;
  menuKey: string;
  menuLabel: string;
  actionLabel: string;
  description?: string;
  method: string;
  path: string;
};

export type PolicyTemplateSection = {
  menuKey: string;
  menuLabel: string;
  items: PolicyTemplate[];
};

export const formLabelClassName = 'mb-1 block text-sm font-medium text-slate-600';
export const usernamePattern = /^[A-Za-z0-9_]+$/;

export function createEmptyUserFormValues(): UserFormValues {
  return {
    username: '',
    phone: '',
    password: '',
    email: '',
    signature: '',
    gender: '',
    age: undefined,
    is_active: true
  };
}

export function mapUserToFormValues(user: AuthUser): UserFormValues {
  return {
    username: user.username,
    phone: user.phone,
    password: '',
    email: user.email ?? '',
    signature: user.signature ?? '',
    gender: user.gender ?? '',
    age: user.age,
    is_active: user.is_active ?? true
  };
}

export function createEmptyPasswordFormValues(): PasswordFormValues {
  return {
    password: ''
  };
}

export function createEmptyRoleFormValues(): RoleFormValues {
  return {
    name: '',
    display_name: '',
    description: ''
  };
}

export function mapRoleToFormValues(role: RoleItem): RoleFormValues {
  return {
    name: role.name,
    display_name: role.display_name,
    description: role.description
  };
}

export function createEmptyConfigFormValues(): ConfigFormValues {
  return {
    config_group: '',
    config_key: '',
    config_val: '',
    remark: ''
  };
}

export function mapConfigToFormValues(config: SystemConfigItem): ConfigFormValues {
  return {
    config_group: config.config_group ?? '',
    config_key: config.config_key,
    config_val: config.config_val,
    remark: config.remark ?? ''
  };
}

export function formatDateTime(value?: string): string {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString();
}

export function extractApiErrorMessage(error: unknown): string | null {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? null;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return null;
}

export function getPolicyMethodColor(method: string): string {
  if (method === 'GET') return 'blue';
  if (method === 'POST') return 'green';
  if (method === 'PUT') return 'gold';
  if (method === 'DELETE') return 'red';
  return 'default';
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

export function uniquePolicies(policies: RolePolicy[]): RolePolicy[] {
  const seen = new Set<string>();
  return policies.filter((policy) => {
    const key = `${policy.method} ${policy.path}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function buildMethodPattern(methods: string[]): string {
  const uniqueMethods = uniqueStrings(methods);
  if (uniqueMethods.length <= 1) {
    return uniqueMethods[0] ?? '';
  }
  return `(${uniqueMethods.join('|')})`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createPolicyPathPattern(path: string): RegExp {
  const escaped = escapeRegExp(path).replace(/\/:([a-zA-Z0-9_]+)/g, '/[^/]+').replace(/\\\*/g, '.*');
  return new RegExp(`^${escaped}$`);
}

export function matchesPolicyTemplate(policy: RolePolicy, template: PolicyTemplate): boolean {
  try {
    const methodMatched = new RegExp(`^${policy.method}$`).test(template.method);
    if (!methodMatched) {
      return false;
    }
  } catch {
    if (policy.method !== template.method) {
      return false;
    }
  }

  return createPolicyPathPattern(policy.path).test(template.path);
}

export function buildSectionAggregatePolicies(menuKey: string): RolePolicy[] {
  if (menuKey === 'dashboard') {
    return [{ method: 'GET', path: '/api/v1/admin/stats' }];
  }
  if (menuKey === 'users') {
    return [
      { method: '(GET|POST)', path: '/api/v1/admin/users' },
      { method: '(PUT|DELETE)', path: '/api/v1/admin/users/*' }
    ];
  }
  if (menuKey === 'roles') {
    return [
      { method: '(GET|POST)', path: '/api/v1/admin/roles' },
      { method: '(GET|PUT|DELETE)', path: '/api/v1/admin/roles/*' }
    ];
  }
  if (menuKey === 'configs') {
    return [{ method: '(GET|PUT)', path: '/api/v1/admin/system-configs' }];
  }
  if (menuKey === 'profile') {
    return [
      { method: '(GET|PUT)', path: '/api/v1/user/profile' },
      { method: 'POST', path: '/api/v1/user/*' }
    ];
  }
  return [];
}

export function buildPoliciesFromSelection(selectedKeys: string[], sections: PolicyTemplateSection[]): RolePolicy[] {
  const selectedKeySet = new Set(selectedKeys);
  const policies: RolePolicy[] = [];

  sections.forEach((section) => {
    if (section.items.length > 0 && section.items.every((item) => selectedKeySet.has(item.key))) {
      policies.push(...buildSectionAggregatePolicies(section.menuKey));
      return;
    }

    const groupedByPath = new Map<string, string[]>();
    section.items
      .filter((item) => selectedKeySet.has(item.key))
      .forEach((item) => {
        const existing = groupedByPath.get(item.path);
        if (existing) {
          existing.push(item.method);
          return;
        }
        groupedByPath.set(item.path, [item.method]);
      });

    groupedByPath.forEach((methods, path) => {
      policies.push({ path, method: buildMethodPattern(methods) });
    });
  });

  return uniquePolicies(policies);
}
