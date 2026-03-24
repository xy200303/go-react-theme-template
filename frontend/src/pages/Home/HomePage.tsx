import { useEffect, useState } from 'react';
import { Tag } from 'antd';
import MainNavbar from '@/components/layout/MainNavbar';
import TechStatCard from '@/components/ui/TechStatCard';
import { getStats } from '@/api/endpoints/admin';
import { useAuthStore } from '@/stores';
import { useI18n } from '@/i18n';
import styles from './HomePage.module.css';

export default function HomePage() {
  const [stats, setStats] = useState<{ users: number | string; roles: number | string; configs: number | string }>({
    users: '-',
    roles: '-',
    configs: '-'
  });
  const { user, isAdmin } = useAuthStore();
  const { t } = useI18n();

  useEffect(() => {
    if (!isAdmin()) return;
    getStats()
      .then((res) => {
        setStats({
          users: res.user_count,
          roles: res.role_count,
          configs: res.system_config_count
        });
      })
      .catch(() => {
        setStats({ users: '-', roles: '-', configs: '-' });
      });
  }, [isAdmin]);

  return (
    <div className="app-shell p-3 pb-8">
      <MainNavbar />
      <main className="mx-auto flex w-[96%] flex-col gap-5 fade-in-up">
        <section className={`${styles.hero} tech-card`}>
          <div className={styles.heroGrid}>
            <div>
              <h1 className={styles.heroTitle}>{t('home.welcome', { name: user?.username ?? 'Guest' })}</h1>
              <p className={styles.heroDesc}>{t('home.description')}</p>
              <div className={styles.heroTags}>
                <Tag color="blue">{t('home.tag.theme')}</Tag>
                <Tag color="cyan">{t('home.tag.motion')}</Tag>
                <Tag color="geekblue">{t('home.tag.template')}</Tag>
              </div>
            </div>
            <div className={styles.heroPanels}>
              <article className={styles.panel}>
                <h3>{t('home.panel.archTitle')}</h3>
                <p>{t('home.panel.archDesc')}</p>
              </article>
              <article className={styles.panel}>
                <h3>{t('home.panel.statusTitle')}</h3>
                <p>{t('home.panel.statusDesc')}</p>
              </article>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <TechStatCard title={t('home.metric.users')} value={isAdmin() ? stats.users : t('home.metric.extensible')} />
          <TechStatCard title={t('home.metric.roles')} value={isAdmin() ? stats.roles : t('home.metric.casbin')} />
          <TechStatCard title={t('home.metric.configs')} value={isAdmin() ? stats.configs : t('home.metric.kv')} />
        </div>
      </main>
    </div>
  );
}
