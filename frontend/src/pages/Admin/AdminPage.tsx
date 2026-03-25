import { useState, type ReactNode } from 'react';
import { DashboardOutlined, DatabaseOutlined, SafetyCertificateOutlined, SettingOutlined, TeamOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import MainNavbar from '@/components/layout/MainNavbar';
import SidebarLayout from '@/components/layout/SidebarLayout';
import { useI18n } from '@/i18n';

const adminSectionPaths = {
  dashboard: '/admin/home',
  users: '/admin/system/users',
  roles: '/admin/system/role',
  configs: '/admin/system/config'
} as const;

export type AdminSectionKey = keyof typeof adminSectionPaths;

type AdminPageProps = {
  activeKey: AdminSectionKey;
  children: ReactNode;
};

export default function AdminPage({ activeKey, children }: AdminPageProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { t } = useI18n();

  return (
    <div className="app-shell p-3 pb-8">
      <MainNavbar />
      <SidebarLayout
        title={t('nav.admin')}
        items={[
          {
            key: 'dashboard',
            label: t('nav.home'),
            icon: <DashboardOutlined />
          },
          {
            key: 'system',
            label: t('nav.admin'),
            icon: <SettingOutlined />,
            children: [
              { key: 'users', label: t('admin.menuUsers'), icon: <TeamOutlined /> },
              { key: 'roles', label: t('admin.menuRoles'), icon: <SafetyCertificateOutlined /> },
              { key: 'configs', label: t('admin.menuConfigs'), icon: <DatabaseOutlined /> }
            ]
          }
        ]}
        activeKey={activeKey}
        onChange={(key) => navigate(adminSectionPaths[key])}
        collapsed={collapsed}
        onToggle={() => setCollapsed((value) => !value)}
        collapseLabel={t('admin.menuCollapse')}
        expandLabel={t('admin.menuExpand')}
      >
        {children}
      </SidebarLayout>
    </div>
  );
}
