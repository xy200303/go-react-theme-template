import { lazy, type ComponentType } from 'react';

const HomePage = lazy(() => import('@/pages/Home/HomePage'));
const AboutPage = lazy(() => import('@/pages/About/AboutPage'));
const BlogPage = lazy(() => import('@/pages/Blog/BlogPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFound/NotFoundPage'));
const LoginPage = lazy(() => import('@/pages/Login/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/Register/RegisterPage'));
const ProfilePage = lazy(() => import('@/pages/Profile/ProfilePage'));
const AdminHomePage = lazy(() => import('@/pages/Admin/AdminHomePage'));
const AdminUsersPage = lazy(() => import('@/pages/Admin/AdminUsersPage'));
const AdminConfigsPage = lazy(() => import('@/pages/Admin/AdminConfigsPage'));
const AdminRolesPage = lazy(() => import('@/pages/Admin/AdminRolesPage'));

export const adminRoutePaths = {
  root: '/admin',
  home: '/admin/home',
  systemUsers: '/admin/system/users',
  systemConfig: '/admin/system/config',
  systemRole: '/admin/system/role'
} as const;

export interface AppRoute {
  path: string;
  component: ComponentType;
  requireAuth?: boolean;
  requireAdmin?: boolean;
}

export const appRoutes: AppRoute[] = [
  { path: '/login', component: LoginPage },
  { path: '/register', component: RegisterPage },
  { path: '/', component: HomePage, requireAuth: true },
  { path: '/profile', component: ProfilePage, requireAuth: true },
  { path: adminRoutePaths.root, component: AdminHomePage, requireAuth: true, requireAdmin: true },
  { path: adminRoutePaths.home, component: AdminHomePage, requireAuth: true, requireAdmin: true },
  { path: adminRoutePaths.systemUsers, component: AdminUsersPage, requireAuth: true, requireAdmin: true },
  { path: adminRoutePaths.systemConfig, component: AdminConfigsPage, requireAuth: true, requireAdmin: true },
  { path: adminRoutePaths.systemRole, component: AdminRolesPage, requireAuth: true, requireAdmin: true },
  { path: '/about', component: AboutPage },
  { path: '/blog', component: BlogPage },
  { path: '*', component: NotFoundPage }
];
