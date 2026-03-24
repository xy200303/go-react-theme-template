import { Suspense } from 'react';
import { Spin } from 'antd';
import { useRoutes } from 'react-router-dom';
import RouterGuard from './RouterGuard';
import { appRoutes } from './routes';

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spin size="large" />
    </div>
  );
}

export default function AppRouter() {
  const element = useRoutes(
    appRoutes.map((route) => {
      const Component = route.component;
      return {
        path: route.path,
        element: (
          <RouterGuard requireAuth={route.requireAuth} requireAdmin={route.requireAdmin}>
            <Suspense fallback={<RouteFallback />}>
              <Component />
            </Suspense>
          </RouterGuard>
        )
      };
    })
  );

  return element;
}
