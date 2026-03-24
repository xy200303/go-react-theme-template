import MainNavbar from '@/components/layout/MainNavbar';
import { Tag } from 'antd';
import { useI18n } from '@/i18n';

export default function BlogPage() {
  const { t } = useI18n();

  const articles = [
    { title: t('blog.release'), tag: 'Release', desc: t('blog.releaseDesc') },
    { title: t('blog.rbac'), tag: 'Casbin', desc: t('blog.rbacDesc') },
    { title: t('blog.theme'), tag: 'UI', desc: t('blog.themeDesc') }
  ];

  return (
    <div className="app-shell p-3 pb-8">
      <MainNavbar />
      <div className="mx-auto w-[96%]">
        <section className="tech-card fade-in-up p-7">
          <h2 className="mb-5 text-3xl font-semibold text-sky-900">{t('blog.title')}</h2>
          <div className="space-y-3">
            {articles.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-blue-200/60 bg-white/70 p-4 shadow-[0_8px_18px_rgba(25,80,170,0.1)]"
              >
                <div className="mb-1 flex items-center gap-2">
                  <h3 className="text-lg font-semibold text-sky-900">{item.title}</h3>
                  <Tag color="blue">{item.tag}</Tag>
                </div>
                <p className="text-sm text-slate-600">{item.desc}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
