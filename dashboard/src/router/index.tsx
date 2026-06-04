import React from 'react';
import { Navigate, createBrowserRouter } from 'react-router-dom';
import type { RouteObject } from 'react-router-dom';
import { useAuthStore } from '../store/auth.store';
import { ROUTES } from '../lib/constants';

// Pages
import Overview from '../pages/Overview';
import Threats from '../pages/Threats';
import AuditLog from '../pages/AuditLog';
import ApiKeys from '../pages/ApiKeys';
import Config from '../pages/Config';
import Analytics from '../pages/Analytics';
import Settings from '../pages/Settings';
import Login from '../pages/Login';

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to={ROUTES.LOGIN} replace />;
};

const PublicGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return !isAuthenticated ? <>{children}</> : <Navigate to={ROUTES.OVERVIEW} replace />;
};

export const routes: RouteObject[] = [
  {
    path: ROUTES.LOGIN,
    element: (
      <PublicGuard>
        <Login />
      </PublicGuard>
    ),
  },
  {
    path: ROUTES.OVERVIEW,
    element: (
      <AuthGuard>
        <Overview />
      </AuthGuard>
    ),
  },
  {
    path: ROUTES.THREATS,
    element: (
      <AuthGuard>
        <Threats />
      </AuthGuard>
    ),
  },
  {
    path: ROUTES.AUDIT,
    element: (
      <AuthGuard>
        <AuditLog />
      </AuthGuard>
    ),
  },
  {
    path: ROUTES.KEYS,
    element: (
      <AuthGuard>
        <ApiKeys />
      </AuthGuard>
    ),
  },
  {
    path: ROUTES.CONFIG,
    element: (
      <AuthGuard>
        <Config />
      </AuthGuard>
    ),
  },
  {
    path: ROUTES.ANALYTICS,
    element: (
      <AuthGuard>
        <Analytics />
      </AuthGuard>
    ),
  },
  {
    path: ROUTES.SETTINGS,
    element: (
      <AuthGuard>
        <Settings />
      </AuthGuard>
    ),
  },
  {
    path: '*',
    element: <Navigate to={ROUTES.OVERVIEW} replace />,
  },
];

export const router = createBrowserRouter(routes);
export default router;
