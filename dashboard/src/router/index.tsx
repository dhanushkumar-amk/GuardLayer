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
import Register from '../pages/Register';
import Landing from '../pages/Landing';

const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to={ROUTES.LOGIN} replace />;
};

const PublicGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return !isAuthenticated ? <>{children}</> : <Navigate to={ROUTES.OVERVIEW} replace />;
};

const isStandaloneLanding = import.meta.env.VITE_STANDALONE_LANDING === 'true';

export const routes: RouteObject[] = isStandaloneLanding
  ? [
      {
        path: ROUTES.LANDING,
        element: (
          <PublicGuard>
            <Landing />
          </PublicGuard>
        ),
      },
      {
        path: '*',
        element: <Navigate to={ROUTES.LANDING} replace />,
      },
    ]
  : [
      {
        path: ROUTES.LANDING,
        element: <Navigate to={ROUTES.LOGIN} replace />,
      },
      {
        path: ROUTES.LOGIN,
        element: (
          <PublicGuard>
            <Login />
          </PublicGuard>
        ),
      },
      {
        path: ROUTES.REGISTER,
        element: (
          <PublicGuard>
            <Register />
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
