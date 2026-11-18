import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../hooks/useAppStore';

export const RequireAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { authState, isCheckingAuth } = useAppStore();
  const location = useLocation();

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-tutu-dark text-tutu-light flex items-center justify-center p-6">
        <div className="tutu-card p-6 text-center space-y-2 max-w-sm w-full">
          <p className="font-display font-bold text-lg text-tutu-lime">
            Verificando Credenciais Administrativas...
          </p>
          <p className="text-xs text-tutu-light/75">
            Validando sessão RBAC junto ao servidor SQLite.
          </p>
        </div>
      </div>
    );
  }

  if (!authState.authenticated) {
    return (
      <Navigate
        to="/admin/login?reason=unauthenticated"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  if (authState.role !== 'ADMIN') {
    return (
      <Navigate
        to="/admin/login?reason=forbidden"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return <>{children}</>;
};
