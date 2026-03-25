import { useEffect, useMemo, useState } from 'react';
import { Button, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Spin, Switch, Table, Tag } from 'antd';
import AdminPage from './AdminPage';
import {
  createEmptyPasswordFormValues,
  createEmptyUserFormValues,
  extractApiErrorMessage,
  formLabelClassName,
  formatDateTime,
  mapUserToFormValues,
  usernamePattern,
  type PasswordFormValues,
  type UserFormValues
} from './AdminCommon';
import {
  createUser,
  deleteUser,
  listRoles,
  listUsers,
  resetUserPassword,
  updateUser,
  updateUserRoles,
  type CreateAdminUserPayload,
  type RoleItem,
  type UpdateAdminUserPayload
} from '@/api/endpoints/admin';
import { useI18n } from '@/i18n';
import { notifyError, notifySuccess } from '@/lib/notify';
import { useAuthStore } from '@/stores';
import type { AuthUser } from '@/types/auth';

export default function AdminUsersPage() {
  const [passwordForm] = Form.useForm<PasswordFormValues>();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<AuthUser[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [userKeyword, setUserKeyword] = useState('');
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [userModalSubmitting, setUserModalSubmitting] = useState(false);
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [userFormData, setUserFormData] = useState<UserFormValues>(createEmptyUserFormValues());
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordModalSubmitting, setPasswordModalSubmitting] = useState(false);
  const [passwordTargetUser, setPasswordTargetUser] = useState<AuthUser | null>(null);
  const { t } = useI18n();
  const currentUser = useAuthStore((state) => state.user);

  const roleNames = useMemo(() => roles.map((role) => role.name), [roles]);
  const isReservedAdminUser = editingUser?.username === 'admin';

  const loadPageData = async (keyword = userKeyword.trim()) => {
    setLoading(true);
    try {
      const [userList, roleList] = await Promise.all([listUsers(keyword), listRoles()]);
      setUsers(userList);
      setRoles(roleList);
    } catch {
      notifyError(t('admin.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPageData('');
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

  const updateUserFormData = (patch: Partial<UserFormValues>) => {
    setUserFormData((previous) => ({ ...previous, ...patch }));
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
      await loadPageData(userKeyword.trim());
    } catch (error) {
      notifyError(extractApiErrorMessage(error) ?? (editingUser ? t('admin.userUpdateFailed') : t('admin.userCreateFailed')));
    } finally {
      setUserModalSubmitting(false);
    }
  };

  const submitPasswordModal = async () => {
    if (!passwordTargetUser) {
      return;
    }

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
      await loadPageData(userKeyword.trim());
    } catch (error) {
      notifyError(extractApiErrorMessage(error) ?? t('admin.userDeleteFailed'));
    }
  };

  const onSearchUsers = async () => {
    await loadPageData(userKeyword.trim());
  };

  const onResetUserSearch = async () => {
    setUserKeyword('');
    await loadPageData('');
  };

  const onUpdateUserRoles = async (userId: number, names: string[]) => {
    try {
      await updateUserRoles(userId, names);
      notifySuccess(t('admin.usersUpdated'));
      await loadPageData(userKeyword.trim());
    } catch (error) {
      notifyError(extractApiErrorMessage(error) ?? t('admin.usersUpdateFailed'));
    }
  };

  return (
    <AdminPage activeKey="users">
      {loading ? (
        <div className="flex justify-center py-10">
          <Spin size="large" />
        </div>
      ) : (
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
                  onChange={(event) => setUserKeyword(event.target.value)}
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
                render: (_: unknown, record: AuthUser) => (
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
                render: (_: unknown, record: AuthUser) => (
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
                  onChange={(event) => updateUserFormData({ password: event.target.value })}
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
                onChange={(event) => updateUserFormData({ username: event.target.value })}
              />
            </label>

            <label className="block">
              <span className={formLabelClassName}>{t('admin.tablePhone')}</span>
              <Input
                className="ant-surface-input"
                placeholder={t('auth.phonePlaceholder')}
                value={userFormData.phone}
                onChange={(event) => updateUserFormData({ phone: event.target.value })}
              />
            </label>

            <label className="block">
              <span className={formLabelClassName}>{t('profile.email')}</span>
              <Input
                className="ant-surface-input"
                placeholder={t('profile.emailPlaceholder')}
                value={userFormData.email}
                onChange={(event) => updateUserFormData({ email: event.target.value })}
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
              onChange={(event) => updateUserFormData({ signature: event.target.value })}
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
    </AdminPage>
  );
}
