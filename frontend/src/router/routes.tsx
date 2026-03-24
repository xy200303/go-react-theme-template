import { lazy, type ComponentType } from 'react';

const HomePage = lazy(() => import('@/pages/Home/HomePage'));
const AboutPage = lazy(() => import('@/pages/About/AboutPage'));
const BlogPage = lazy(() => import('@/pages/Blog/BlogPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFound/NotFoundPage'));
const LoginPage = lazy(() => import('@/pages/Login/LoginPage'));
const RegisterPage = lazy(() => import('@/pages/Register/RegisterPage'));
const ProfilePage = lazy(() => import('@/pages/Profile/ProfilePage'));
const AdminPage = lazy(() => import('@/pages/Admin/AdminPage'));

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
  { path: '/admin', component: AdminPage, requireAuth: true, requireAdmin: true },
  { path: '/about', component: AboutPage },
  { path: '/blog', component: BlogPage },
  { path: '*', component: NotFoundPage }
];
