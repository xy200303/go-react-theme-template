import { useEffect, useMemo, useState } from 'react';
import { isAxiosError } from 'axios';
import { DashboardOutlined, DatabaseOutlined, SafetyCertificateOutlined, SettingOutlined, TeamOutlined } from '@ant-design/icons';
import { Button, Checkbox, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Spin, Switch, Table, Tag } from 'antd';
import MainNavbar from '@/components/layout/MainNavbar';
import SidebarLayout from '@/components/layout/SidebarLayout';
import TechStatCard from '@/components/ui/TechStatCard';
import {
  createRole,
  createUser,
  deleteRole,
  deleteUser,
  getRolePolicies,
  getStats,
  listPolicyTemplates,
  listRoles,
  listSystemConfigs,
  listUsers,
  resetUserPassword,
  setRolePolicies,
  updateRole,
  updateUser,
  updateUserRoles,
  upsertSystemConfig,
  type CreateAdminUserPayload,
  type PolicyTemplateItem,
  type RolePolicy,
  type RoleItem,
  type SystemConfigItem,
  type UpdateAdminUserPayload
} from '@/api/endpoints/admin';
import type { AuthUser } from '@/types/auth';
import { useI18n } from '@/i18n';
import { notifyError, notifySuccess } from '@/lib/notify';
import { useAuthStore } from '@/stores';

type UserFormValues = {
  username: string;
  phone: string;
  password?: string;
  email: string;
  signature: string;
  gender: string;
  age?: number | null;
  is_active: boolean;
};

type PasswordFormValues = {
  password: string;
};

type RoleFormValues = {
  name: string;
  display_name: string;
  description: string;
};

type ConfigFormValues = {
  config_group: string;
  config_key: string;
  config_val: string;
  remark: string;
};

type PolicyTemplate = {
  key: string;
  menuKey: string;
  menuLabel: string;
  actionLabel: string;
  description?: string;
  method: string;
  path: string;
};

type PolicyTemplateSection = {
  menuKey: string;
  menuLabel: string;
  items: PolicyTemplate[];
};

const formLabelClassName = 'mb-1 block text-sm font-medium text-slate-600';
const usernamePattern = /^[A-Za-z0-9_]+$/;

function createEmptyUserFormValues(): UserFormValues {
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

function mapUserToFormValues(user: AuthUser): UserFormValues {
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

function createEmptyPasswordFormValues(): PasswordFormValues {
  return {
    password: ''
  };
}

function createEmptyRoleFormValues(): RoleFormValues {
  return {
    name: '',
    display_name: '',
    description: ''
  };
}

function createEmptyConfigFormValues(): ConfigFormValues {
  return {
    config_group: '',
    config_key: '',
    config_val: '',
    remark: ''
  };
}

function mapRoleToFormValues(role: RoleItem): RoleFormValues {
  return {
    name: role.name,
    display_name: role.display_name,
    description: role.description
  };
}

function mapConfigToFormValues(config: SystemConfigItem): ConfigFormValues {
  return {
    config_group: config.config_group ?? '',
    config_key: config.config_key,
    config_val: config.config_val,
    remark: config.remark ?? ''
  };
}

function formatDateTime(value?: string): string {
  if (!value) return '-';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }
  return parsed.toLocaleString();
}

function extractApiErrorMessage(error: unknown): string | null {
  if (isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message ?? null;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return null;
}

function getPolicyMethodColor(method: string): string {
  if (method === 'GET') return 'blue';
  if (method === 'POST') return 'green';
  if (method === 'PUT') return 'gold';
  if (method === 'DELETE') return 'red';
  return 'default';
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values));
}

function uniquePolicies(policies: RolePolicy[]): RolePolicy[] {
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

function matchesPolicyTemplate(policy: RolePolicy, template: PolicyTemplate): boolean {
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

function buildSectionAggregatePolicies(menuKey: string): RolePolicy[] {
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

function buildPoliciesFromSelection(selectedKeys: string[], sections: PolicyTemplateSection[]): RolePolicy[] {
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

export default function AdminPage() {
  const [passwordForm] = Form.useForm<PasswordFormValues>();
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState<'dashboard' | 'users' | 'roles' | 'configs'>('dashboard');
  const [loading, setLoading] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userModalSubmitting, setUserModalSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [roleModalSubmitting, setRoleModalSubmitting] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleItem | null>(null);
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configModalSubmitting, setConfigModalSubmitting] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SystemConfigItem | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordModalSubmitting, setPasswordModalSubmitting] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<AuthUser | null>(null);
  const [userKeyword, setUserKeyword] = useState('');
  const [userFormData, setUserFormData] = useState<UserFormValues>(createEmptyUserFormValues());
  const [roleFormData, setRoleFormData] = useState<RoleFormValues>(createEmptyRoleFormValues());
  const [configFormData, setConfigFormData] = useState<ConfigFormValues>(createEmptyConfigFormValues());

  const [stats, setStats] = useState({ user_count: 0, role_count: 0, system_config_count: 0, redis_online: false });
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [configs, setConfigs] = useState<SystemConfigItem[]>([]);
  const [policyTemplateItems, setPolicyTemplateItems] = useState<PolicyTemplateItem[]>([]);

  const [policyModalOpen, setPolicyModalOpen] = useState(false);
  const [policyRole, setPolicyRole] = useState<RoleItem | null>(null);
  const [selectedPolicyKeys, setSelectedPolicyKeys] = useState<string[]>([]);
  const [unmatchedPolicies, setUnmatchedPolicies] = useState<RolePolicy[]>([]);

  const { t } = useI18n();
  const currentUser = useAuthStore((state) => state.user);

  const roleNames = useMemo(() => roles.map((r) => r.name), [roles]);
  const policyTemplates = useMemo(
    () =>
      policyTemplateItems.map((item) => ({
        key: item.key,
        menuKey: item.menu_key,
        menuLabel: item.menu_label,
        actionLabel: item.action_label,
        description: item.description,
        method: item.method,
        path: item.path
      })),
    [policyTemplateItems]
  );
  const policyTemplateByIdentity = useMemo(
    () =>
      new Map(policyTemplates.map((item) => [`${item.method} ${item.path}`, item])),
    [policyTemplates]
  );
  const policyTemplatesByMenu = useMemo(() => {
    const grouped = new Map<string, { menuLabel: string; items: PolicyTemplate[] }>();
    policyTemplates.forEach((item) => {
      const existing = grouped.get(item.menuKey);
      if (existing) {
        existing.items.push(item);
        return;
      }
      grouped.set(item.menuKey, { menuLabel: item.menuLabel, items: [item] });
    });
    return Array.from(grouped.entries()).map(([menuKey, value]) => ({ menuKey, ...value }));
  }, [policyTemplates]);
  const selectedPolicyKeySet = useMemo(() => new Set(selectedPolicyKeys), [selectedPolicyKeys]);
  const isReservedRole = (roleName?: string) => roleName === 'admin';
  const loadAll = async (keyword = userKeyword.trim()) => {
    setLoading(true);
    try {
      const [s, u, r, c] = await Promise.all([getStats(), listUsers(keyword), listRoles(), listSystemConfigs()]);
      setStats(s);
      setUsers(u);
      setRoles(r);
      setConfigs(c);
    } catch {
      notifyError(t('admin.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAll('');
  }, []);

  useEffect(() => {
    listPolicyTemplates()
      .then(setPolicyTemplateItems)
      .catch(() => notifyError(t('admin.policyTemplateLoadFailed')));
  }, [t]);

  const normalizeCreateUserPayload = (values: UserFormValues): CreateAdminUserPayload => ({
    username: values.username.trim(),
    phone: values.phone.trim(),
    password: values.password?.trim() || '',
    email: values.email.trim(),
    avatar_url: undefined,
    signature: values.signature.trim(),
    gender: values.gender,
    age: Number(values.age ?? 0),
    is_active: values.is_active,
    role_names: ['user']
  });

  const isReservedAdminUser = editingUser?.username === 'admin';

  const updateUserFormData = (patch: Partial<UserFormValues>) => {
    setUserFormData((prev) => ({ ...prev, ...patch }));
  };

  const normalizeUpdateUserPayload = (values: UserFormValues): UpdateAdminUserPayload => ({
    username: values.username.trim(),
    phone: values.phone.trim(),
    email: values.email.trim(),
    avatar_url: editingUser?.avatar_url?.trim() || undefined,
    signature: values.signature.trim(),
    gender: values.gender,
    age: Number(values.age ?? 0),
    is_active: values.is_active
  });

  const updateRoleFormData = (patch: Partial<RoleFormValues>) => {
    setRoleFormData((prev) => ({ ...prev, ...patch }));
  };

  const updateConfigFormData = (patch: Partial<ConfigFormValues>) => {
    setConfigFormData((prev) => ({ ...prev, ...patch }));
  };

  const openCreateUserModal = () => {
    setEditingUser(null);
    setUserFormData(createEmptyUserFormValues());
    setUserModalOpen(true);
  };

  const openEditUserModal = (user: AuthUser) => {
    setEditingUser(user);
    setUserFormData(mapUserToFormValues(user));
    setUserModalOpen(true);
  };

  const closeUserModal = () => {
    setUserModalOpen(false);
    setEditingUser(null);
    setUserFormData(createEmptyUserFormValues());
  };

  const openCreateRoleModal = () => {
    setEditingRole(null);
    setRoleFormData(createEmptyRoleFormValues());
    setRoleModalOpen(true);
  };

  const openEditRoleModal = (role: RoleItem) => {
    setEditingRole(role);
    setRoleFormData(mapRoleToFormValues(role));
    setRoleModalOpen(true);
  };

  const closeRoleModal = () => {
    setRoleModalOpen(false);
    setEditingRole(null);
    setRoleFormData(createEmptyRoleFormValues());
  };

  const openCreateConfigModal = () => {
    setEditingConfig(null);
    setConfigFormData(createEmptyConfigFormValues());
    setConfigModalOpen(true);
  };

  const openEditConfigModal = (config: SystemConfigItem) => {
    setEditingConfig(config);
    setConfigFormData(mapConfigToFormValues(config));
    setConfigModalOpen(true);
  };

  const closeConfigModal = () => {
    setConfigModalOpen(false);
    setEditingConfig(null);
    setConfigFormData(createEmptyConfigFormValues());
  };

  const openPasswordModal = (user: AuthUser) => {
    setPasswordTargetUser(user);
    passwordForm.resetFields();
    passwordForm.setFieldsValue(createEmptyPasswordFormValues());
    setPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    setPasswordTargetUser(null);
    passwordForm.resetFields();
  };

  const submitUserModal = async () => {
    const values = {
      ...userFormData,
      username: userFormData.username.trim(),
      phone: userFormData.phone.trim(),
      email: userFormData.email.trim(),
      signature: userFormData.signature.trim(),
      gender: userFormData.gender.trim(),
      password: userFormData.password?.trim() || ''
    };

    if (!values.username) {
      notifyError(t('auth.usernameRequired'));
      return;
    }
    if (!usernamePattern.test(values.username)) {
      notifyError(t('auth.usernameRule'));
      return;
    }
    if (!values.phone) {
      notifyError(t('auth.phoneRequired'));
      return;
    }
    if (values.phone.length < 11 || values.phone.length > 20) {
      notifyError(t('auth.phoneInvalid'));
      return;
    }
    if (!editingUser && !values.password) {
      notifyError(t('admin.userPasswordRequired'));
      return;
    }
    if (!editingUser && values.password.length < 8) {
      notifyError(t('auth.passwordRule'));
      return;
    }

    setUserModalSubmitting(true);
    try {
      if (editingUser) {
        await updateUser(editingUser.id, normalizeUpdateUserPayload(values));
        notifySuccess(t('admin.userUpdated'));
      } else {
        await createUser(normalizeCreateUserPayload(values));
        notifySuccess(t('admin.userCreated'));
      }
      closeUserModal();
      await loadAll(userKeyword.trim());
    } catch (error) {
      notifyError(extractApiErrorMessage(error) ?? (editingUser ? t('admin.userUpdateFailed') : t('admin.userCreateFailed')));
    } finally {
      setUserModalSubmitting(false);
    }
  };

  const submitPasswordModal = async () => {
    if (!passwordTargetUser) return;

    let values: PasswordFormValues;
    try {
      values = await passwordForm.validateFields();
    } catch {
      return;
    }

    if (values.password.trim().length < 8) {
      notifyError(t('auth.passwordRule'));
      return;
    }

    setPasswordModalSubmitting(true);
    try {
      await resetUserPassword(passwordTargetUser.id, values.password.trim());
      notifySuccess(t('admin.userPasswordResetSuccess'));
      closePasswordModal();
    } catch (error) {
      notifyError(extractApiErrorMessage(error) ?? t('admin.userPasswordResetFailed'));
    } finally {
      setPasswordModalSubmitting(false);
    }
  };

  const onDeleteUser = async (user: AuthUser) => {
    try {
      await deleteUser(user.id);
      notifySuccess(t('admin.userDeleted'));
      await loadAll(userKeyword.trim());
    } catch (error) {
      notifyError(extractApiErrorMessage(error) ?? t('admin.userDeleteFailed'));
    }
  };

  const onSearchUsers = async () => {
    await loadAll(userKeyword.trim());
  };

  const onResetUserSearch = async () => {
    setUserKeyword('');
    await loadAll('');
  };

  const onUpdateUserRoles = async (userId: number, names: string[]) => {
    try {
      await updateUserRoles(userId, names);
      notifySuccess(t('admin.usersUpdated'));
      await loadAll(userKeyword.trim());
    } catch (error) {
      notifyError(extractApiErrorMessage(error) ?? t('admin.usersUpdateFailed'));
    }
  };

  const onCreateRole = async () => {
    const values = {
      name: roleFormData.name.trim(),
      display_name: roleFormData.display_name.trim(),
      description: roleFormData.description.trim()
    };

    if (!values.name || !values.display_name) {
      notifyError(t('admin.roleRequired'));
      return;
    }

    setRoleModalSubmitting(true);
    try {
      if (editingRole) {
        await updateRole(editingRole.id, { display_name: values.display_name, description: values.description });
        notifySuccess(t('admin.roleUpdated'));
      } else {
        await createRole(values);
        notifySuccess(t('admin.roleCreated'));
      }
      closeRoleModal();
      await loadAll(userKeyword.trim());
    } catch (error) {
      notifyError(extractApiErrorMessage(error) ?? (editingRole ? t('admin.roleUpdateFailed') : t('admin.roleCreateFailed')));
    } finally {
      setRoleModalSubmitting(false);
    }
  };

  const onDeleteRole = async (role: RoleItem) => {
    try {
      await deleteRole(role.id);
      notifySuccess(t('admin.roleDeleted'));
      await loadAll(userKeyword.trim());
    } catch (error) {
      notifyError(extractApiErrorMessage(error) ?? t('admin.roleDeleteFailed'));
    }
  };

  const openPolicies = async (role: RoleItem) => {
    try {
      const policies = await getRolePolicies(role.id);
      const matchedKeys = new Set<string>();
      const matchedPolicyIndexes = new Set<number>();
      const legacyPolicies: RolePolicy[] = [];

      policyTemplatesByMenu.forEach((section) => {
        const aggregatePolicies = buildSectionAggregatePolicies(section.menuKey);
        if (!aggregatePolicies.length) {
          return;
        }

        const matchedIndexes: number[] = [];
        const allMatched = aggregatePolicies.every((aggregatePolicy) => {
          const matchedIndex = policies.findIndex(
            (policy, index) =>
              !matchedPolicyIndexes.has(index) &&
              policy.method === aggregatePolicy.method &&
              policy.path === aggregatePolicy.path
          );
          if (matchedIndex === -1) {
            return false;
          }
          matchedIndexes.push(matchedIndex);
          return true;
        });

        if (allMatched) {
          section.items.forEach((item) => matchedKeys.add(item.key));
          matchedIndexes.forEach((index) => matchedPolicyIndexes.add(index));
        }
      });

      policies.forEach((policy, index) => {
        if (matchedPolicyIndexes.has(index)) {
          return;
        }
        const matched = policyTemplateByIdentity.get(`${policy.method} ${policy.path}`);
        if (matched) {
          matchedKeys.add(matched.key);
          matchedPolicyIndexes.add(index);
          return;
        }

        policyTemplates.forEach((template) => {
          if (matchesPolicyTemplate(policy, template)) {
            matchedKeys.add(template.key);
            matchedPolicyIndexes.add(index);
          }
        });
      });

      policies.forEach((policy, index) => {
        if (!matchedPolicyIndexes.has(index)) {
          legacyPolicies.push(policy);
        }
      });

      setSelectedPolicyKeys(Array.from(matchedKeys));
      setUnmatchedPolicies(legacyPolicies);
      setPolicyRole(role);
      setPolicyModalOpen(true);
    } catch {
      notifyError(t('admin.policyLoadFailed'));
    }
  };

  const savePolicies = async () => {
    if (!policyRole) return;
    const templatePolicies = buildPoliciesFromSelection(selectedPolicyKeys, policyTemplatesByMenu);
    const policies = uniquePolicies([...templatePolicies, ...unmatchedPolicies]);

    try {
      await setRolePolicies(policyRole.id, policies);
      notifySuccess(t('admin.policySaved'));
      setPolicyModalOpen(false);
    } catch (error) {
      notifyError(extractApiErrorMessage(error) ?? t('admin.policySaveFailed'));
    }
  };

  const onSaveConfig = async () => {
    const values = {
      config_group: configFormData.config_group.trim(),
      config_key: configFormData.config_key.trim(),
      config_val: configFormData.config_val.trim(),
      remark: configFormData.remark.trim()
    };

    if (!values.config_group || !values.config_key || !values.config_val) {
      notifyError(t('admin.configRequired'));
      return;
    }

    setConfigModalSubmitting(true);
    try {
      await upsertSystemConfig(values);
      notifySuccess(t('admin.configSaved'));
      closeConfigModal();
      await loadAll(userKeyword.trim());
    } catch (error) {
      notifyError(extractApiErrorMessage(error) ?? t('admin.configSaveFailed'));
    } finally {
      setConfigModalSubmitting(false);
    }
  };

  return (
    <div className="app-shell p-3 pb-8">
      <MainNavbar />
      <SidebarLayout
        title={t('nav.admin')}
        items={[
          {
            key: 'dashboard',
            label: t('nav.home'),
            icon: <DashboardOutlined />
          },
          {
            key: 'system',
            label: t('nav.admin'),
            icon: <SettingOutlined />,
            children: [
              { key: 'users', label: t('admin.menuUsers'), icon: <TeamOutlined /> },
              { key: 'roles', label: t('admin.menuRoles'), icon: <SafetyCertificateOutlined /> },
              { key: 'configs', label: t('admin.menuConfigs'), icon: <DatabaseOutlined /> }
            ]
          }
        ]}
        activeKey={active}
        onChange={setActive}
        collapsed={collapsed}
        onToggle={() => setCollapsed((v) => !v)}
        collapseLabel={t('admin.menuCollapse')}
        expandLabel={t('admin.menuExpand')}
      >
        {loading ? (
          <div className="flex justify-center py-10">
            <Spin size="large" />
          </div>
        ) : null}

        {!loading && active === 'dashboard' && (
          <div className="space-y-5">
            <section className="tech-card p-6">
              <h2 className="text-2xl font-semibold text-sky-900">{t('nav.home')}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{t('home.panel.statusDesc')}</p>
            </section>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <TechStatCard title={t('admin.statsUsers')} value={stats.user_count} />
              <TechStatCard title={t('admin.statsRoles')} value={stats.role_count} />
              <TechStatCard title={t('admin.statsConfigs')} value={stats.system_config_count} />
              <article className="tech-card h-full p-5">
                <p className="mb-2 text-sm text-slate-500">{t('admin.redis')}</p>
                <Tag color={stats.redis_online ? 'green' : 'red'}>{stats.redis_online ? t('admin.online') : t('admin.offline')}</Tag>
              </article>
            </div>

            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <section className="tech-card p-6">
                <h3 className="mb-3 text-lg font-semibold text-sky-900">{t('home.panel.archTitle')}</h3>
                <p className="text-sm leading-7 text-slate-600">{t('home.panel.archDesc')}</p>
              </section>

              <section className="tech-card p-6">
                <h3 className="mb-3 text-lg font-semibold text-sky-900">{t('home.panel.statusTitle')}</h3>
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <span>{t('admin.statsUsers')}</span>
                    <span className="font-semibold text-slate-900">{stats.user_count}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <span>{t('admin.statsRoles')}</span>
                    <span className="font-semibold text-slate-900">{stats.role_count}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <span>{t('admin.statsConfigs')}</span>
                    <span className="font-semibold text-slate-900">{stats.system_config_count}</span>
                  </div>
                </div>
              </section>
            </div>
          </div>
        )}

        {!loading && active === 'users' && (
          <div className="space-y-5">
            <section className="rounded-2xl border border-blue-200/60 bg-white/70 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-sky-900">{t('admin.userPanelTitle')}</h3>
                  <p className="mt-1 text-sm text-slate-500">{t('admin.userPanelDesc')}</p>
                </div>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
                    <Input
                      allowClear
                      className="ant-surface-input min-w-[240px] sm:min-w-[280px]"
                      placeholder={t('admin.userSearchPlaceholder')}
                      value={userKeyword}
                      onChange={(e) => setUserKeyword(e.target.value)}
                      onPressEnter={() => void onSearchUsers()}
                    />
                    <Button className="ant-surface-btn-primary !h-11" onClick={() => void onSearchUsers()} type="primary">
                      {t('admin.searchButton')}
                    </Button>
                    <Button className="ant-surface-btn-outline !h-11" onClick={() => void onResetUserSearch()}>
                      {t('admin.resetButton')}
                    </Button>
                    <Button className="ant-surface-btn-primary !h-11" onClick={openCreateUserModal} type="primary">
                      {t('admin.createUserButton')}
                    </Button>
                  </div>
              </div>
            </section>

            <Table
              pagination={false}
              rowKey="id"
              scroll={{ x: 1180 }}
              dataSource={users}
              columns={[
                { title: t('admin.tableId'), dataIndex: 'id', width: 72 },
                { title: t('admin.tableUsername'), dataIndex: 'username', width: 160 },
                { title: t('admin.tablePhone'), dataIndex: 'phone', width: 160 },
                {
                  title: t('admin.tableEmail'),
                  dataIndex: 'email',
                  width: 220,
                  render: (value?: string) => value || '-'
                },
                {
                  title: t('admin.tableStatus'),
                  dataIndex: 'is_active',
                  width: 110,
                  render: (value?: boolean) => (
                    <Tag color={value === false ? 'red' : 'green'}>{value === false ? t('admin.inactive') : t('admin.active')}</Tag>
                  )
                },
                {
                  title: t('admin.tableRoles'),
                  width: 280,
                  render: (_, record: AuthUser) => (
                    <Select
                      className="w-full min-w-[220px]"
                      disabled={record.username === 'admin'}
                      mode="multiple"
                      value={record.roles ?? []}
                      onChange={(values) => void onUpdateUserRoles(record.id, values)}
                      options={roleNames.map((name) => ({ value: name, label: name }))}
                    />
                  )
                },
                {
                  title: t('admin.tableCreatedAt'),
                  dataIndex: 'created_at',
                  width: 190,
                  render: (value?: string) => formatDateTime(value)
                },
                {
                  title: t('admin.tableActions'),
                  width: 280,
                  fixed: 'right',
                  render: (_, record: AuthUser) => (
                    <Space wrap>
                      <Button className="ant-surface-btn-primary !h-9" onClick={() => openEditUserModal(record)} type="primary">
                        {t('admin.editButton')}
                      </Button>
                      <Button className="ant-surface-btn-outline !h-9" onClick={() => openPasswordModal(record)} type="default">
                        {t('admin.resetPasswordButton')}
                      </Button>
                      <Popconfirm
                        cancelText={t('admin.cancelButton')}
                        okText={t('admin.confirmButton')}
                        title={t('admin.deleteUserConfirm', { name: record.username })}
                        onConfirm={() => void onDeleteUser(record)}
                      >
                        <Button danger disabled={currentUser?.id === record.id} type="default">
                          {t('admin.deleteButton')}
                        </Button>
                      </Popconfirm>
                    </Space>
                  )
                }
              ]}
            />
          </div>
        )}

        {!loading && active === 'roles' && (
          <div className="space-y-5">
            <section className="rounded-2xl border border-blue-200/60 bg-white/70 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-sky-900">{t('admin.rolePanelTitle')}</h3>
                  <p className="mt-1 text-sm text-slate-500">{t('admin.rolePanelDesc')}</p>
                </div>
                <Button className="ant-surface-btn-primary !h-11" onClick={openCreateRoleModal} type="primary">
                  {t('admin.createRoleButton')}
                </Button>
              </div>
            </section>

            <Table
              pagination={false}
              rowKey="id"
              dataSource={roles}
              columns={[
                { title: t('admin.tableCode'), dataIndex: 'name', width: 160 },
                {
                  title: t('admin.tableDisplayName'),
                  dataIndex: 'display_name'
                },
                {
                  title: t('admin.tableDescription'),
                  dataIndex: 'description'
                },
                {
                  title: t('admin.tableActions'),
                  width: 260,
                  render: (_, role) => (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        className="ant-surface-btn-primary !h-9"
                        disabled={isReservedRole(role.name)}
                        onClick={() => openEditRoleModal(role)}
                        type="primary"
                      >
                        {t('admin.editButton')}
                      </Button>
                      <Button
                        className="ant-surface-btn-outline !h-9"
                        disabled={isReservedRole(role.name)}
                        onClick={() => void openPolicies(role)}
                        type="default"
                      >
                        {t('admin.policiesButton')}
                      </Button>
                      <Button
                        className="!h-9"
                        danger
                        disabled={isReservedRole(role.name)}
                        onClick={() => void onDeleteRole(role)}
                        type="default"
                      >
                        {t('admin.deleteButton')}
                      </Button>
                    </div>
                  )
                }
              ]}
            />
          </div>
        )}

        {!loading && active === 'configs' && (
          <div className="space-y-5">
            <section className="rounded-2xl border border-blue-200/60 bg-white/70 p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-sky-900">{t('admin.createConfigTitle')}</h3>
                  <p className="mt-1 text-sm text-slate-500">{t('admin.configPanelDesc')}</p>
                </div>
                <Button className="ant-surface-btn-primary !h-11" onClick={openCreateConfigModal} type="primary">
                  {t('admin.createConfigButton')}
                </Button>
              </div>
            </section>

            <Table
              pagination={false}
              rowKey="id"
              dataSource={configs}
              columns={[
                { title: t('admin.tableGroup'), dataIndex: 'config_group', width: 180 },
                { title: t('admin.tableKey'), dataIndex: 'config_key' },
                { title: t('admin.tableValue'), dataIndex: 'config_val' },
                { title: t('admin.tableRemark'), dataIndex: 'remark' },
                {
                  title: t('admin.tableActions'),
                  width: 120,
                  render: (_, record: SystemConfigItem) => (
                    <Button className="ant-surface-btn-primary !h-9" onClick={() => openEditConfigModal(record)} type="primary">
                      {t('admin.editButton')}
                    </Button>
                  )
                }
              ]}
            />
          </div>
        )}
      </SidebarLayout>

      <Modal
        destroyOnHidden
        open={userModalOpen}
        confirmLoading={userModalSubmitting}
        onCancel={closeUserModal}
        onOk={() => void submitUserModal()}
        okText={editingUser ? t('admin.saveButton') : t('admin.createUserButton')}
        cancelText={t('admin.cancelButton')}
        title={editingUser ? t('admin.editUserTitle') : t('admin.createUserTitle')}
        width={760}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {!editingUser ? (
              <label className="block">
                <span className={formLabelClassName}>{t('admin.userPasswordField')}</span>
                <Input.Password
                  className="ant-surface-input"
                  placeholder={t('admin.userCreatePasswordPlaceholder')}
                  value={userFormData.password}
                  onChange={(e) => updateUserFormData({ password: e.target.value })}
                />
              </label>
            ) : null}

            <label className="block">
              <span className={formLabelClassName}>{t('admin.tableUsername')}</span>
              <Input
                className="ant-surface-input"
                disabled={isReservedAdminUser}
                placeholder={t('auth.usernamePlaceholder')}
                style={isReservedAdminUser ? { color: '#94a3b8' } : undefined}
                value={userFormData.username}
                onChange={(e) => updateUserFormData({ username: e.target.value })}
              />
            </label>

            <label className="block">
              <span className={formLabelClassName}>{t('admin.tablePhone')}</span>
              <Input
                className="ant-surface-input"
                placeholder={t('auth.phonePlaceholder')}
                value={userFormData.phone}
                onChange={(e) => updateUserFormData({ phone: e.target.value })}
              />
            </label>

            <label className="block">
              <span className={formLabelClassName}>{t('profile.email')}</span>
              <Input
                className="ant-surface-input"
                placeholder={t('profile.emailPlaceholder')}
                value={userFormData.email}
                onChange={(e) => updateUserFormData({ email: e.target.value })}
              />
            </label>

            <label className="block">
              <span className={formLabelClassName}>{t('profile.gender')}</span>
              <Select
                allowClear
                className="w-full"
                options={[
                  { value: 'male', label: t('profile.genderMale') },
                  { value: 'female', label: t('profile.genderFemale') },
                  { value: 'unknown', label: t('profile.genderUnknown') }
                ]}
                placeholder={t('admin.userGenderPlaceholder')}
                value={userFormData.gender || undefined}
                onChange={(value) => updateUserFormData({ gender: value ?? '' })}
              />
            </label>

            <label className="block">
              <span className={formLabelClassName}>{t('profile.age')}</span>
              <InputNumber
                className="!w-full"
                min={0}
                max={150}
                placeholder={t('profile.agePlaceholder')}
                value={userFormData.age}
                onChange={(value) => updateUserFormData({ age: value })}
              />
            </label>
          </div>

          <label className="block">
            <span className={formLabelClassName}>{t('profile.signature')}</span>
            <Input.TextArea
              className="ant-surface-textarea"
              placeholder={t('profile.signaturePlaceholder')}
              rows={3}
              value={userFormData.signature}
              onChange={(e) => updateUserFormData({ signature: e.target.value })}
            />
          </label>

          <div>
            <span className={`${formLabelClassName} mb-2`}>{t('admin.userStatusField')}</span>
            <Switch
              checked={userFormData.is_active}
              checkedChildren={t('admin.active')}
              unCheckedChildren={t('admin.inactive')}
              onChange={(checked) => updateUserFormData({ is_active: checked })}
            />
          </div>
        </div>
      </Modal>

      <Modal
        destroyOnHidden
        open={roleModalOpen}
        confirmLoading={roleModalSubmitting}
        onCancel={closeRoleModal}
        onOk={() => void onCreateRole()}
        okText={editingRole ? t('admin.saveButton') : t('admin.createRoleButton')}
        cancelText={t('admin.cancelButton')}
        title={editingRole ? t('admin.editRoleTitle') : t('admin.createRoleTitle')}
        width={640}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className={formLabelClassName}>{t('admin.tableCode')}</span>
              <Input
                className="ant-surface-input"
                disabled={Boolean(editingRole)}
                placeholder={t('admin.roleCodePlaceholder')}
                value={roleFormData.name}
                onChange={(e) => updateRoleFormData({ name: e.target.value })}
              />
            </label>

            <label className="block">
              <span className={formLabelClassName}>{t('admin.tableDisplayName')}</span>
              <Input
                className="ant-surface-input"
                placeholder={t('admin.roleDisplayNamePlaceholder')}
                value={roleFormData.display_name}
                onChange={(e) => updateRoleFormData({ display_name: e.target.value })}
              />
            </label>
          </div>

          <label className="block">
            <span className={formLabelClassName}>{t('admin.tableDescription')}</span>
            <Input.TextArea
              className="ant-surface-textarea"
              placeholder={t('admin.roleDescPlaceholder')}
              rows={4}
              value={roleFormData.description}
              onChange={(e) => updateRoleFormData({ description: e.target.value })}
            />
          </label>
        </div>
      </Modal>

      <Modal
        destroyOnHidden
        open={passwordModalOpen}
        confirmLoading={passwordModalSubmitting}
        onCancel={closePasswordModal}
        onOk={() => void submitPasswordModal()}
        okText={t('admin.resetPasswordButton')}
        cancelText={t('admin.cancelButton')}
        title={t('admin.resetPasswordTitle', { name: passwordTargetUser?.username ?? '' })}
        width={480}
      >
        <p className="pb-3 text-sm text-slate-500">{t('admin.resetPasswordHint')}</p>
        <Form form={passwordForm} initialValues={createEmptyPasswordFormValues()} layout="vertical" preserve={false}>
          <Form.Item
            label={t('admin.userPasswordField')}
            name="password"
            rules={[{ required: true, message: t('admin.userPasswordRequired') }]}
          >
            <Input.Password className="ant-surface-input" placeholder={t('admin.userResetPasswordPlaceholder')} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        destroyOnHidden
        open={configModalOpen}
        confirmLoading={configModalSubmitting}
        onCancel={closeConfigModal}
        onOk={() => void onSaveConfig()}
        okText={editingConfig ? t('admin.saveButton') : t('admin.createConfigButton')}
        cancelText={t('admin.cancelButton')}
        title={editingConfig ? t('admin.editConfigTitle') : t('admin.createConfigTitle')}
        width={680}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="block">
              <span className={formLabelClassName}>{t('admin.tableGroup')}</span>
              <Input
                className="ant-surface-input"
                placeholder={t('admin.configGroupPlaceholder')}
                value={configFormData.config_group}
                onChange={(e) => updateConfigFormData({ config_group: e.target.value })}
              />
            </label>

            <label className="block">
              <span className={formLabelClassName}>{t('admin.tableKey')}</span>
              <Input
                className="ant-surface-input"
                disabled={Boolean(editingConfig)}
                placeholder={t('admin.configKeyPlaceholder')}
                style={editingConfig ? { color: '#94a3b8' } : undefined}
                value={configFormData.config_key}
                onChange={(e) => updateConfigFormData({ config_key: e.target.value })}
              />
            </label>
          </div>

          <label className="block">
            <span className={formLabelClassName}>{t('admin.tableValue')}</span>
            <Input.TextArea
              className="ant-surface-textarea"
              placeholder={t('admin.configValuePlaceholder')}
              rows={4}
              value={configFormData.config_val}
              onChange={(e) => updateConfigFormData({ config_val: e.target.value })}
            />
          </label>

          <label className="block">
            <span className={formLabelClassName}>{t('admin.tableRemark')}</span>
            <Input.TextArea
              className="ant-surface-textarea"
              placeholder={t('admin.configRemarkPlaceholder')}
              rows={3}
              value={configFormData.remark}
              onChange={(e) => updateConfigFormData({ remark: e.target.value })}
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={policyModalOpen}
        onCancel={() => {
          setPolicyModalOpen(false);
          setSelectedPolicyKeys([]);
          setUnmatchedPolicies([]);
          setPolicyRole(null);
        }}
        onOk={() => void savePolicies()}
        okText={t('admin.confirmButton')}
        cancelText={t('admin.cancelButton')}
        title={t('admin.policyTitle', { name: policyRole?.display_name ?? '' })}
        width={860}
      >
        <p className="py-2 text-sm text-slate-500">{t('admin.policyHint')}</p>
        <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
          {policyTemplatesByMenu.map((section) => {
            const selectedCount = section.items.filter((item) => selectedPolicyKeySet.has(item.key)).length;
            const allSelected = section.items.length > 0 && selectedCount === section.items.length;

            return (
              <section key={section.menuKey} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <h4 className="text-sm font-semibold text-sky-900">{section.menuLabel}</h4>
                    <Tag color="blue">
                      {selectedCount}/{section.items.length}
                    </Tag>
                  </div>
                  <Button
                    className="ant-surface-btn-outline !h-8 !px-3"
                    onClick={() =>
                      setSelectedPolicyKeys((prev) => {
                        const next = new Set(prev);
                        section.items.forEach((item) => {
                          if (allSelected) {
                            next.delete(item.key);
                          } else {
                            next.add(item.key);
                          }
                        });
                        return Array.from(next);
                      })
                    }
                    type="default"
                  >
                    {allSelected ? t('admin.clearSelection') : t('admin.selectAll')}
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {section.items.map((item) => {
                    const checked = selectedPolicyKeySet.has(item.key);
                    return (
                      <label
                        key={item.key}
                        className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition ${
                          checked ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50'
                        } cursor-pointer`}
                      >
                        <Checkbox
                          checked={checked}
                          onChange={(e) =>
                            setSelectedPolicyKeys((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) {
                                next.add(item.key);
                              } else {
                                next.delete(item.key);
                              }
                              return Array.from(next);
                            })
                          }
                        />
                        <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-slate-800">{item.actionLabel}</span>
                          <Tag color={getPolicyMethodColor(item.method)}>{item.method}</Tag>
                        </div>
                        {item.description ? <p className="mt-1 text-xs leading-5 text-slate-500">{item.description}</p> : null}
                        <code className="mt-1 block break-all text-xs text-slate-500">{item.path}</code>
                      </div>
                    </label>
                    );
                  })}
                </div>
              </section>
            );
          })}

          {unmatchedPolicies.length ? (
            <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <h4 className="text-sm font-semibold text-amber-800">{t('admin.policyLegacyTitle')}</h4>
              <p className="mt-1 text-xs leading-6 text-amber-700">{t('admin.policyLegacyHint')}</p>
              <div className="mt-3 space-y-2">
                {unmatchedPolicies.map((policy, index) => (
                  <div key={`${policy.method}-${policy.path}-${index}`} className="rounded-lg border border-amber-200 bg-white px-3 py-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Tag color={getPolicyMethodColor(policy.method)}>{policy.method}</Tag>
                      <code className="break-all text-xs text-slate-600">{policy.path}</code>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </Modal>
    </div>
  );
}
