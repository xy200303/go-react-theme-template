import { useEffect, useState } from 'react';
import { Spin, Tag } from 'antd';
import AdminPage from './AdminPage';
import { getStats, type SystemStats } from '@/api/endpoints/admin';
import TechStatCard from '@/components/ui/TechStatCard';
import { useI18n } from '@/i18n';
import { notifyError } from '@/lib/notify';

const initialStats: SystemStats = {
  user_count: 0,
  role_count: 0,
  system_config_count: 0,
  redis_online: false
};

export default function AdminHomePage() {
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<SystemStats>(initialStats);
  const { t } = useI18n();

  useEffect(() => {
    const loadStatsData = async () => {
      setLoading(true);
      try {
        setStats(await getStats());
      } catch {
        notifyError(t('admin.loadFailed'));
      } finally {
        setLoading(false);
      }
    };

    void loadStatsData();
  }, [t]);

  return (
    <AdminPage activeKey="dashboard">
      {loading ? (
        <div className="flex justify-center py-10">
          <Spin size="large" />
        </div>
      ) : (
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
    </AdminPage>
  );
}
