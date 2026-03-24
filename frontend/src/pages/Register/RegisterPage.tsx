import { useState, type FormEvent } from 'react';
import { Button, Input, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { register, sendSmsCode } from '@/api/endpoints/auth';
import { useAuthStore } from '@/stores';
import { useI18n } from '@/i18n';
import { notifyError, notifySuccess, notifyWarning } from '@/lib/notify';

const usernameReg = /^[A-Za-z0-9_]+$/;
const smsVerifyEnabled = (import.meta.env.VITE_SMS_VERIFY_ENABLED ?? 'true') === 'true';

type RegisterFormValues = {
  username: string;
  phone: string;
  password: string;
  code?: string;
};

const labelCls = 'mb-1 block text-sm font-medium text-slate-600';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setLogin } = useAuthStore();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [form, setForm] = useState<RegisterFormValues>({ username: '', phone: '', password: '', code: '' });

  const onSendCode = async () => {
    if (!smsVerifyEnabled) return;
    if (!form.phone) {
      notifyWarning(t('auth.inputPhoneFirst'));
      return;
    }
    setSmsLoading(true);
    try {
      await sendSmsCode({ phone: form.phone, scene: 'register' });
      notifySuccess(t('auth.codeSent'));
    } catch {
      notifyError(t('auth.codeSendFailed'));
    } finally {
      setSmsLoading(false);
    }
  };

  const onSubmit = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    if (!form.username || !form.phone || !form.password) {
      notifyWarning(t('auth.registerFailed'));
      return;
    }
    if (!usernameReg.test(form.username)) {
      notifyWarning(t('auth.usernameRule'));
      return;
    }
    if (smsVerifyEnabled && !form.code) {
      notifyWarning(t('auth.codeRequired'));
      return;
    }

    setLoading(true);
    try {
      const payload = smsVerifyEnabled ? form : { username: form.username, phone: form.phone, password: form.password };
      const resp = await register(payload);
      setLogin(resp.token, resp.user);
      notifySuccess(t('auth.registerSuccess'));
      navigate('/');
    } catch {
      notifyError(t('auth.registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-scene">
      <section className="auth-board fade-in-up">
        <aside className="auth-promo">
          <div className="mb-4 flex items-center">
            <span className="inline-flex rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-medium text-blue-700">BLUE NOVA</span>
          </div>
          <h1>{t('auth.heroTitle')}</h1>
          <p>{t('auth.heroSubtitle')}</p>
          <div className="space-y-2">
            <Tag color="blue">{t('auth.heroFeature1')}</Tag>
            <Tag color="cyan">{t('auth.heroFeature2')}</Tag>
            <Tag color="geekblue">{t('auth.heroFeature3')}</Tag>
          </div>
        </aside>

        <div className="auth-form-wrap">
          <div className="mx-auto w-full max-w-[420px]">
            <h2 className="mb-1 text-2xl font-semibold text-sky-900">{t('auth.signUp')}</h2>
            <p className="mb-5 text-sm text-slate-500">{t('auth.signUpSubtitle')}</p>

            <form className="space-y-3" onSubmit={onSubmit}>
              <label className="block">
                <span className={labelCls}>{t('auth.username')}</span>
                <Input
                  className="ant-surface-input"
                  placeholder={t('auth.usernamePlaceholder')}
                  value={form.username}
                  onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                />
                <p className="mt-1 text-xs text-slate-500">{t('auth.usernameRule')}</p>
              </label>
              <label className="block">
                <span className={labelCls}>{t('auth.phone')}</span>
                <Input
                  className="ant-surface-input"
                  placeholder={t('auth.phonePlaceholder')}
                  value={form.phone}
                  onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
                />
              </label>
              <label className="block">
                <span className={labelCls}>{t('auth.password')}</span>
                <Input.Password
                  className="ant-surface-input"
                  placeholder={t('auth.passwordRule')}
                  value={form.password}
                  onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
                />
              </label>
              {smsVerifyEnabled && (
                <label className="block">
                  <span className={labelCls}>{t('auth.code')}</span>
                  <div className="flex items-center gap-2">
                    <Input
                      className="ant-surface-input"
                      placeholder={t('auth.codePlaceholder')}
                      value={form.code ?? ''}
                      onChange={(e) => setForm((prev) => ({ ...prev, code: e.target.value }))}
                    />
                    <Button className="ant-surface-btn-outline !h-11 !w-[120px] !shrink-0" loading={smsLoading} onClick={onSendCode} type="default">
                      {t('auth.send')}
                    </Button>
                  </div>
                </label>
              )}

              <Button block className="ant-surface-btn-primary !h-11" htmlType="submit" loading={loading} type="primary">
                {t('auth.registerAndLogin')}
              </Button>
            </form>

            <p className="mt-5 text-sm text-slate-600">
              {t('auth.haveAccount')}{' '}
              <button className="font-medium text-blue-700 hover:text-blue-800 focus:outline-none" onClick={() => navigate('/login')} type="button">
                {t('auth.goLogin')}
              </button>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
