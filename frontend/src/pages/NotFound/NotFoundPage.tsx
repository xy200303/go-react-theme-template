import { Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '@/i18n';

export default function NotFoundPage() {
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="tech-card w-full max-w-xl p-10 text-center">
          <p className="text-7xl font-bold text-blue-600">404</p>
          <p className="mt-3 text-slate-600">{t('notfound.subtitle')}</p>
          <Button className="mt-6" type="primary" onClick={() => navigate('/')}>
            {t('notfound.backHome')}
          </Button>
        </div>
      </div>
  );
}
