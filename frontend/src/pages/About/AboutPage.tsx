import MainNavbar from '@/components/layout/MainNavbar';
import { useI18n } from '@/i18n';

export default function AboutPage() {
  const { t } = useI18n();

  return (
    <div className="app-shell p-3 pb-8">
      <MainNavbar />
      <div className="mx-auto w-[96%]">
        <section className="tech-card fade-in-up p-7">
          <h2 className="mb-3 text-3xl font-semibold text-sky-900">{t('about.title')}</h2>
          <p className="max-w-3xl leading-7 text-slate-600">{t('about.desc')}</p>
        </section>
      </div>
    </div>
  );
}
