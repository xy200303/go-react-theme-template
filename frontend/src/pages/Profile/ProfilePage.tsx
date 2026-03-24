import { useEffect, useState, type FormEvent } from 'react';
import { CameraOutlined, LoadingOutlined, UserOutlined } from '@ant-design/icons';
import { Button, Input, Modal, Select, Upload } from 'antd';
import type { UploadProps } from 'antd';
import MainNavbar from '@/components/layout/MainNavbar';
import SidebarLayout from '@/components/layout/SidebarLayout';
import AppAvatar from '@/components/ui/AppAvatar';
import { changePhone, getProfile, resetPassword, updateProfile, uploadAvatar } from '@/api/endpoints/user';
import { sendSmsCode } from '@/api/endpoints/auth';
import { useAuthStore } from '@/stores';
import { useI18n } from '@/i18n';
import { notifyError, notifySuccess, notifyWarning } from '@/lib/notify';
import type { AuthUser } from '@/types/auth';

type ProfileForm = {
  email: string;
  avatar_url: string;
  signature: string;
  gender: string;
  age: number;
};

type PasswordForm = {
  old_password: string;
  new_password: string;
};

type PhoneForm = {
  old_phone_code: string;
  new_phone: string;
  new_phone_code: string;
};

const labelCls = 'mb-1 block text-sm font-medium text-slate-600';

function createEmptyProfileForm(): ProfileForm {
  return {
    email: '',
    avatar_url: '',
    signature: '',
    gender: 'unknown',
    age: 0
  };
}

function createEmptyPasswordForm(): PasswordForm {
  return {
    old_password: '',
    new_password: ''
  };
}

function createEmptyPhoneForm(): PhoneForm {
  return {
    old_phone_code: '',
    new_phone: '',
    new_phone_code: ''
  };
}

function mapUserToProfileForm(user: AuthUser): ProfileForm {
  return {
    email: user.email ?? '',
    avatar_url: user.avatar_url ?? '',
    signature: user.signature ?? '',
    gender: user.gender ?? 'unknown',
    age: user.age ?? 0
  };
}

export default function ProfilePage() {
  const { user, updateUser } = useAuthStore();
  const { t } = useI18n();
  const [active, setActive] = useState<'profile'>('profile');
  const [collapsed, setCollapsed] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [smsLoading, setSmsLoading] = useState<'old' | 'new' | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [phoneModalOpen, setPhoneModalOpen] = useState(false);
  const [phoneStep, setPhoneStep] = useState<'old' | 'new'>('old');

  const [profileFormData, setProfileFormData] = useState<ProfileForm>(createEmptyProfileForm());
  const [passwordFormData, setPasswordFormData] = useState<PasswordForm>(createEmptyPasswordForm());
  const [phoneFormData, setPhoneFormData] = useState<PhoneForm>(createEmptyPhoneForm());

  const updateProfileFormData = (patch: Partial<ProfileForm>) => {
    setProfileFormData((prev) => ({ ...prev, ...patch }));
  };

  const updatePasswordFormData = (patch: Partial<PasswordForm>) => {
    setPasswordFormData((prev) => ({ ...prev, ...patch }));
  };

  const updatePhoneFormData = (patch: Partial<PhoneForm>) => {
    setPhoneFormData((prev) => ({ ...prev, ...patch }));
  };

  useEffect(() => {
    getProfile()
      .then((profile) => {
        updateUser(profile);
        setProfileFormData(mapUserToProfileForm(profile));
      })
      .catch(() => notifyError(t('profile.loadFailed')));
  }, [t, updateUser]);

  const submitProfile = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    setProfileLoading(true);
    try {
      const profile = await updateProfile(profileFormData);
      updateUser(profile);
      setProfileFormData(mapUserToProfileForm(profile));
      notifySuccess(t('profile.profileUpdated'));
    } catch {
      notifyError(t('profile.updateFailed'));
    } finally {
      setProfileLoading(false);
    }
  };

  const submitPassword = async () => {
    if (!passwordFormData.old_password || !passwordFormData.new_password) {
      notifyWarning(t('profile.passwordIncomplete'));
      return;
    }

    setPasswordLoading(true);
    try {
      await resetPassword(passwordFormData);
      setPasswordModalOpen(false);
      setPasswordFormData(createEmptyPasswordForm());
      notifySuccess(t('profile.passwordResetSuccess'));
    } catch {
      notifyError(t('profile.passwordResetFailed'));
    } finally {
      setPasswordLoading(false);
    }
  };

  const submitPhoneChange = async () => {
    if (!phoneFormData.old_phone_code || !phoneFormData.new_phone || !phoneFormData.new_phone_code) {
      notifyWarning(t('profile.phoneFormIncomplete'));
      return;
    }

    setPhoneLoading(true);
    try {
      await changePhone(phoneFormData);
      updateUser({ phone: phoneFormData.new_phone });
      setPhoneModalOpen(false);
      setPhoneStep('old');
      setPhoneFormData(createEmptyPhoneForm());
      notifySuccess(t('profile.phoneUpdated'));
    } catch {
      notifyError(t('profile.phoneUpdateFailed'));
    } finally {
      setPhoneLoading(false);
    }
  };

  const sendCode = async (mode: 'old' | 'new') => {
    try {
      setSmsLoading(mode);
      if (mode === 'old') {
        if (!user?.phone) {
          notifyWarning(t('profile.currentPhoneEmpty'));
          return;
        }
        await sendSmsCode({ phone: user.phone, scene: 'change_phone_old' });
      } else {
        if (!phoneFormData.new_phone) {
          notifyWarning(t('profile.newPhoneFirst'));
          return;
        }
        await sendSmsCode({ phone: phoneFormData.new_phone, scene: 'change_phone_new' });
      }
      notifySuccess(t('auth.codeSent'));
    } catch {
      notifyError(t('profile.sendCodeFailed'));
    } finally {
      setSmsLoading(null);
    }
  };

  const avatarUrl = profileFormData.avatar_url || user?.avatar_url || '';
  const avatarLetter = (user?.username?.slice(0, 1) || 'U').toUpperCase();

  const openPhoneModal = () => {
    setPhoneFormData(createEmptyPhoneForm());
    setPhoneStep('old');
    setPhoneModalOpen(true);
  };

  const openPasswordModal = () => {
    setPasswordFormData(createEmptyPasswordForm());
    setPasswordModalOpen(true);
  };

  const closePasswordModal = () => {
    setPasswordModalOpen(false);
    setPasswordFormData(createEmptyPasswordForm());
  };

  const closePhoneModal = () => {
    setPhoneModalOpen(false);
    setPhoneStep('old');
    setPhoneFormData(createEmptyPhoneForm());
    setSmsLoading(null);
  };

  const onPhoneModalConfirm = async () => {
    if (phoneStep === 'old') {
      if (!phoneFormData.old_phone_code) {
        notifyWarning(t('profile.phoneFormIncomplete'));
        return;
      }
      setPhoneStep('new');
      return;
    }

    await submitPhoneChange();
  };

  const avatarUploadProps: UploadProps = {
    accept: 'image/*',
    maxCount: 1,
    showUploadList: false,
    customRequest: async ({ file, onSuccess, onError }) => {
      if (!(file instanceof File)) {
        onError?.(new Error('Invalid file'));
        return;
      }

      setAvatarUploading(true);
      try {
        const avatar = await uploadAvatar(file);
        updateUser({ avatar_url: avatar });
        updateProfileFormData({ avatar_url: avatar });
        notifySuccess(t('profile.avatarUploaded'));
        onSuccess?.({ avatar_url: avatar });
      } catch (error) {
        notifyError(t('profile.uploadFailed'));
        onError?.(error instanceof Error ? error : new Error('Upload failed'));
      } finally {
        setAvatarUploading(false);
      }
    }
  };

  return (
    <div className="app-shell p-3 pb-8">
      <MainNavbar />

      <SidebarLayout
        title={t('nav.profile')}
        items={[
          {
            key: 'profile',
            label: t('profile.menuProfile'),
            icon: <UserOutlined />
          }
        ]}
        activeKey={active}
        onChange={setActive}
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
        collapseLabel={t('profile.menuCollapse')}
        expandLabel={t('profile.menuExpand')}
      >
        <div className="flex min-h-full flex-col gap-4">
          <section>
            <div className="mb-8 flex flex-col items-center text-center">
              <Upload {...avatarUploadProps}>
                <button
                  className="group flex flex-col items-center gap-2 rounded-full border-0 bg-transparent p-0 text-inherit outline-none transition-transform hover:scale-[1.02]"
                  type="button"
                >
                  <div className="relative">
                    <AppAvatar
                      className="!h-24 !w-24 !bg-gradient-to-br !from-blue-100 !to-cyan-100 !text-xl !font-semibold !text-blue-700"
                      src={avatarUrl}
                      size={96}
                    >
                      {avatarLetter}
                    </AppAvatar>
                    <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-full bg-slate-900/0 text-white opacity-0 transition-all duration-200 group-hover:bg-slate-900/45 group-hover:opacity-100">
                      {avatarUploading ? <LoadingOutlined className="text-lg" /> : <CameraOutlined className="text-lg" />}
                      <span className="mt-1 text-[11px] font-medium">{avatarUploading ? t('profile.avatarUploading') : t('profile.avatarUploadTrigger')}</span>
                    </span>
                  </div>
                </button>
              </Upload>
              <div className="mt-4">
                <p className="mt-1 text-sm text-slate-500">{user?.username}</p>
              </div>
            </div>

            <form className="flex flex-col gap-5" onSubmit={submitProfile}>
              <div>
                <h2 className="text-xl font-semibold text-sky-900">{t('profile.titleBasic')}</h2>
              </div>

              <div className="sidebar-panel__body grid grid-cols-1 gap-4 md:grid-cols-2">
                <label className="block">
                  <span className={labelCls}>{t('profile.email')}</span>
                  <Input
                    className="ant-surface-input"
                    placeholder={t('profile.emailPlaceholder')}
                    value={profileFormData.email}
                    onChange={(e) => updateProfileFormData({ email: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className={labelCls}>{t('profile.gender')}</span>
                  <Select
                    className="ant-surface-select"
                    value={profileFormData.gender}
                    onChange={(value) => updateProfileFormData({ gender: value })}
                    options={[
                      { value: 'unknown', label: t('profile.genderUnknown') },
                      { value: 'male', label: t('profile.genderMale') },
                      { value: 'female', label: t('profile.genderFemale') }
                    ]}
                  />
                </label>
                <label className="block">
                  <span className={labelCls}>{t('profile.age')}</span>
                  <Input
                    className="ant-surface-input"
                    type="number"
                    min={0}
                    max={120}
                    placeholder={t('profile.agePlaceholder')}
                    value={String(profileFormData.age)}
                    onChange={(e) => updateProfileFormData({ age: Number(e.target.value || 0) })}
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className={labelCls}>{t('profile.signature')}</span>
                  <Input.TextArea
                    className="ant-surface-textarea"
                    rows={3}
                    placeholder={t('profile.signaturePlaceholder')}
                    value={profileFormData.signature}
                    onChange={(e) => updateProfileFormData({ signature: e.target.value })}
                  />
                </label>
              </div>

              <div className="flex items-center justify-start pt-4">
                <Button className="ant-surface-btn-primary !h-11" htmlType="submit" loading={profileLoading} type="primary">
                  {t('profile.saveProfile')}
                </Button>
              </div>

              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="mb-1 text-sm font-medium text-slate-600">{t('profile.currentPhone', { phone: user?.phone ?? '-' })}</p>
                    <p className="text-xs text-slate-500">{t('profile.phoneModalHint')}</p>
                  </div>
                  <Button className="ant-surface-btn-outline !h-10" onClick={openPhoneModal} type="default">
                    {t('profile.changePhoneAction')}
                  </Button>
                </div>
              </div>
            </form>

            <div className="my-8 border-t border-slate-200" />

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-sky-900">{t('profile.passwordTitle')}</h2>
                  <p className="mt-1 text-xs text-slate-500">{t('profile.passwordModalHint')}</p>
                </div>
                <Button className="ant-surface-btn-outline !h-10" onClick={openPasswordModal} type="default">
                  {t('profile.passwordTitle')}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </SidebarLayout>

      <Modal
        open={passwordModalOpen}
        onCancel={closePasswordModal}
        onOk={submitPassword}
        okText={t('profile.updatePassword')}
        cancelText={t('profile.cancel')}
        confirmLoading={passwordLoading}
        title={t('profile.passwordTitle')}
      >
        <div className="space-y-4 pt-2">
          <label className="block">
            <span className={labelCls}>{t('profile.oldPassword')}</span>
            <Input.Password
              className="ant-surface-input"
              placeholder={t('profile.oldPasswordPlaceholder')}
              value={passwordFormData.old_password}
              onChange={(e) => updatePasswordFormData({ old_password: e.target.value })}
            />
          </label>
          <label className="block">
            <span className={labelCls}>{t('profile.newPassword')}</span>
            <Input.Password
              className="ant-surface-input"
              placeholder={t('profile.newPasswordPlaceholder')}
              value={passwordFormData.new_password}
              onChange={(e) => updatePasswordFormData({ new_password: e.target.value })}
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={phoneModalOpen}
        onCancel={closePhoneModal}
        onOk={onPhoneModalConfirm}
        okText={phoneStep === 'old' ? t('profile.nextStep') : t('profile.confirmChange')}
        cancelText={t('profile.cancel')}
        confirmLoading={phoneStep === 'new' ? phoneLoading : false}
        title={phoneStep === 'old' ? t('profile.verifyCurrentPhone') : t('profile.verifyNewPhone')}
      >
        {phoneStep === 'old' ? (
          <div className="space-y-4 pt-2">
            <p className="text-sm leading-6 text-slate-500">{t('profile.currentPhone', { phone: user?.phone ?? '-' })}</p>
            <label className="block">
              <span className={labelCls}>{t('profile.oldPhoneCode')}</span>
              <div className="flex items-center gap-2">
                <Input
                  className="ant-surface-input"
                  placeholder={t('profile.oldPhoneCodePlaceholder')}
                  value={phoneFormData.old_phone_code}
                  onChange={(e) => updatePhoneFormData({ old_phone_code: e.target.value })}
                />
                <Button
                  className="ant-surface-btn-outline !h-11 !w-[120px] !shrink-0"
                  loading={smsLoading === 'old'}
                  onClick={() => sendCode('old')}
                  type="default"
                >
                  {t('profile.sendCode')}
                </Button>
              </div>
            </label>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <label className="block">
              <span className={labelCls}>{t('profile.newPhone')}</span>
              <Input
                className="ant-surface-input"
                placeholder={t('profile.newPhonePlaceholder')}
                value={phoneFormData.new_phone}
                onChange={(e) => updatePhoneFormData({ new_phone: e.target.value })}
              />
            </label>
            <label className="block">
              <span className={labelCls}>{t('profile.newPhoneCode')}</span>
              <div className="flex items-center gap-2">
                <Input
                  className="ant-surface-input"
                  placeholder={t('profile.newPhoneCodePlaceholder')}
                  value={phoneFormData.new_phone_code}
                  onChange={(e) => updatePhoneFormData({ new_phone_code: e.target.value })}
                />
                <Button
                  className="ant-surface-btn-outline !h-11 !w-[120px] !shrink-0"
                  loading={smsLoading === 'new'}
                  onClick={() => sendCode('new')}
                  type="default"
                >
                  {t('profile.sendCode')}
                </Button>
              </div>
            </label>
          </div>
        )}
      </Modal>
    </div>
  );
}
