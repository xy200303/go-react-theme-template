import { useState, type FormEvent } from 'react';
import { Button, Input, Segmented, Tag } from 'antd';
import { useNavigate } from 'react-router-dom';
import { loginByPassword, loginBySms, sendSmsCode } from '@/api/endpoints/auth';
import { useAuthStore } from '@/stores';
import { useI18n } from '@/i18n';
import { notifyError, notifySuccess, notifyWarning } from '@/lib/notify';

type PasswordForm = { account: string; password: string };
type SmsForm = { phone: string; code: string };

const labelCls = 'block text-sm font-medium text-slate-600';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setLogin } = useAuthStore();
  const { t } = useI18n();

  const [mode, setMode] = useState<'pwd' | 'sms'>('pwd');
  const [loading, setLoading] = useState(false);
  const [smsLoading, setSmsLoading] = useState(false);
  const [passwordForm, setPasswordForm] = useState<PasswordForm>({ account: '', password: '' });
  const [smsForm, setSmsForm] = useState<SmsForm>({ phone: '', code: '' });

  const submitPassword = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    if (!passwordForm.account || !passwordForm.password) {
      notifyWarning(t('auth.loginFailed'));
      return;
    }

    setLoading(true);
    try {
      const resp = await loginByPassword(passwordForm);
      setLogin(resp.token, resp.user);
      notifySuccess(t('auth.loginSuccess'));
      navigate('/');
    } catch {
      notifyError(t('auth.loginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const submitSms = async (evt: FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    if (!smsForm.phone || !smsForm.code) {
      notifyWarning(t('auth.codeRequired'));
      return;
    }

    setLoading(true);
    try {
      const resp = await loginBySms(smsForm);
      setLogin(resp.token, resp.user);
      notifySuccess(t('auth.loginSuccess'));
      navigate('/');
    } catch {
      notifyError(t('auth.smsLoginFailed'));
    } finally {
      setLoading(false);
    }
  };

  const handleSendCode = async () => {
    if (!smsForm.phone) {
      notifyWarning(t('auth.inputPhoneFirst'));
      return;
    }

    setSmsLoading(true);
    try {
      await sendSmsCode({ phone: smsForm.phone, scene: 'login' });
      notifySuccess(t('auth.codeSent'));
    } catch {
      notifyError(t('auth.codeSendFailed'));
    } finally {
      setSmsLoading(false);
    }
  };

  return (
    <div className="auth-scene">
      <section className="auth-board fade-in-up">
        <aside className="auth-promo">
          <span className="inline-flex rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-medium text-blue-700">BLUE NOVA</span>
          <h1 className="mt-4">{t('auth.heroTitle')}</h1>
          <p>{t('auth.heroSubtitle')}</p>
          <div className="space-y-2">
            <Tag color="blue">{t('auth.heroFeature1')}</Tag>
            <Tag color="cyan">{t('auth.heroFeature2')}</Tag>
            <Tag color="geekblue">{t('auth.heroFeature3')}</Tag>
          </div>
        </aside>

        <div className="auth-form-wrap">
          <div className="mx-auto w-full max-w-[420px]">
            <h2 className="mb-1 text-2xl font-semibold text-sky-900">{t('auth.signIn')}</h2>
            <p className="mb-5 text-sm text-slate-500">{t('auth.signInSubtitle')}</p>

            <div className="mb-6">
              <Segmented
                block
                className="ant-surface-segmented"
                options={[
                  { label: t('auth.passwordLogin'), value: 'pwd' },
                  { label: t('auth.smsLogin'), value: 'sms' }
                ]}
                value={mode}
                onChange={(v) => setMode(v as 'pwd' | 'sms')}
              />
            </div>

            {mode === 'pwd' ? (
              <form className="space-y-4" onSubmit={submitPassword}>
                <div className="space-y-1.5">
                  <label className={labelCls}>{t('auth.account')}</label>
                  <Input
                    className="ant-surface-input"
                    placeholder={t('auth.accountPlaceholder')}
                    value={passwordForm.account}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, account: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>{t('auth.password')}</label>
                  <Input.Password
                    className="ant-surface-input"
                    placeholder={t('auth.passwordPlaceholder')}
                    value={passwordForm.password}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, password: e.target.value }))}
                  />
                </div>
                <Button block className="ant-surface-btn-primary !h-11" htmlType="submit" loading={loading} type="primary">
                  {t('auth.signIn')}
                </Button>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={submitSms}>
                <div className="space-y-1.5">
                  <label className={labelCls}>{t('auth.phone')}</label>
                  <Input
                    className="ant-surface-input"
                    placeholder={t('auth.phonePlaceholder')}
                    value={smsForm.phone}
                    onChange={(e) => setSmsForm((prev) => ({ ...prev, phone: e.target.value }))}
                  />
                  <p className="text-xs text-slate-500">{t('auth.smsHint')}</p>
                </div>
                <div className="space-y-1.5">
                  <label className={labelCls}>{t('auth.code')}</label>
                  <div className="flex items-center gap-2">
                    <Input
                      className="ant-surface-input"
                      placeholder={t('auth.codePlaceholder')}
                      value={smsForm.code}
                      onChange={(e) => setSmsForm((prev) => ({ ...prev, code: e.target.value }))}
                    />
                    <Button className="ant-surface-btn-outline !h-11 !w-[120px] !shrink-0" loading={smsLoading} onClick={handleSendCode} type="default">
                      {t('auth.send')}
                    </Button>
                  </div>
                </div>
                <Button block className="ant-surface-btn-primary !h-11" htmlType="submit" loading={loading} type="primary">
                  {t('auth.signIn')}
                </Button>
              </form>
            )}

            <p className="mt-5 text-sm text-slate-600">
              {t('auth.noAccount')}
              <button className="ml-1 font-medium text-blue-700 hover:text-blue-800 focus:outline-none" onClick={() => navigate('/register')} type="button">
                {t('auth.createOne')}
              </button>
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
