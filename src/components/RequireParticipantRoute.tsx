import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from '../hooks/useAppStore';

export const RequireParticipantRoute: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { authState, isCheckingAuth } = useAppStore();
  const location = useLocation();

  if (isCheckingAuth) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center p-6">
        <div className="tutu-card p-6 text-center space-y-2 max-w-sm w-full">
          <p className="font-display font-bold text-lg text-tutu-lime">
            Verificando Sessão...
          </p>
          <p className="text-xs text-tutu-light/75">
            Carregando seu passaporte no Desafio Global Summit 2026.
          </p>
        </div>
      </div>
    );
  }

  if (!authState.authenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: location.pathname }}
        replace
      />
    );
  }

  return <>{children}</>;
};
