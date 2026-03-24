import { Dropdown } from 'antd';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores';
import { logout } from '@/api/endpoints/auth';
import { useI18n, type Locale } from '@/i18n';
import AppAvatar from '@/components/ui/AppAvatar';

export default function MainNavbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, clearLogin, isAdmin } = useAuthStore();
  const { locale, setLocale, t } = useI18n();

  const onLogout = async () => {
    try {
      if (token?.refresh_token) {
        await logout(token.refresh_token);
      }
    } finally {
      clearLogin();
      navigate('/login');
    }
  };

  const linkClass = (path: string) =>
    `navbar-link ${location.pathname === path ? 'navbar-link--active' : ''}`.trim();

  return (
    <header className="main-navbar sticky top-3 z-20 mx-auto mb-6 w-[96%]">
      <div className="main-navbar__inner">
        <div className="main-navbar__left">
          <div className="brand-pill">
            <span className="brand-pill__dot" aria-hidden="true" />
            <span className="brand-text text-lg">{t('brand.name')}</span>
          </div>
          <nav className="main-navbar__menu">
            <Link className={linkClass('/')} to="/">
              {t('nav.home')}
            </Link>
            <Link className={linkClass('/about')} to="/about">
              {t('nav.about')}
            </Link>
            <Link className={linkClass('/blog')} to="/blog">
              {t('nav.news')}
            </Link>
          </nav>
        </div>

        <div className="main-navbar__right">
          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'lang-zh',
                  label: `${locale === 'zh-CN' ? '✓ ' : ''}${t('nav.lang.zh')}`,
                  onClick: () => setLocale('zh-CN' as Locale)
                },
                {
                  key: 'lang-en',
                  label: `${locale === 'en-US' ? '✓ ' : ''}${t('nav.lang.en')}`,
                  onClick: () => setLocale('en-US' as Locale)
                }
              ]
            }}
          >
            <button className="lang-icon-btn" aria-label={t('nav.switchLanguage')} type="button">
              <svg className="lang-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  d="M12 2a10 10 0 1 0 10 10A10.012 10.012 0 0 0 12 2Zm6.93 9h-3.07a15.71 15.71 0 0 0-1.14-5.02A8.03 8.03 0 0 1 18.93 11ZM12 4.04A13.66 13.66 0 0 1 13.86 11h-3.72A13.66 13.66 0 0 1 12 4.04ZM4.07 13h3.07a15.71 15.71 0 0 0 1.14 5.02A8.03 8.03 0 0 1 4.07 13ZM7.14 11H4.07a8.03 8.03 0 0 1 4.21-5.02A15.71 15.71 0 0 0 7.14 11ZM12 19.96A13.66 13.66 0 0 1 10.14 13h3.72A13.66 13.66 0 0 1 12 19.96ZM14.72 18.02A15.71 15.71 0 0 0 15.86 13h3.07a8.03 8.03 0 0 1-4.21 5.02Z"
                  fill="currentColor"
                />
              </svg>
            </button>
          </Dropdown>

          <Dropdown
            trigger={['click']}
            menu={{
              items: [
                {
                  key: 'profile',
                  label: t('nav.profile'),
                  onClick: () => navigate('/profile')
                },
                ...(isAdmin()
                  ? [
                      {
                        key: 'admin',
                        label: t('nav.admin'),
                        onClick: () => navigate('/admin')
                      }
                    ]
                  : []),
                {
                  type: 'divider'
                },
                {
                  key: 'logout',
                  label: t('nav.logout'),
                  onClick: onLogout
                }
              ]
            }}
          >
            <button className="navbar-avatar-btn" aria-label={t('nav.userMenu')} type="button">
              <AppAvatar className="navbar-user__avatar" src={user?.avatar_url} size={36}>
                {user?.username?.slice(0, 1).toUpperCase() ?? 'U'}
              </AppAvatar>
            </button>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
