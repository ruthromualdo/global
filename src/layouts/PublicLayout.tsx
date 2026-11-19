import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { LogIn, Rocket, ShieldCheck } from 'lucide-react';
import { TutuBrandMark } from '../assets/logos';
import { useAppStore } from '../hooks/useAppStore';

export const PublicLayout: React.FC = () => {
  const { isAdminAuthenticated } = useAppStore();
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  return (
    <div className="min-h-screen bg-tutu-dark text-tutu-light flex flex-col">
      <header className="sticky top-0 z-30 bg-tutu-dark/90 backdrop-blur-md border-b border-tutu-secondary/35">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-16 sm:h-18 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <Link to="/" aria-label="EX-DEVEDOR + TUTU — Página inicial" className="shrink-0">
            <TutuBrandMark size="md" />
          </Link>

          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {isAdminAuthenticated && (
              <Link
                to="/admin/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-tutu-secondary/25 hover:bg-tutu-secondary/45 border border-tutu-secondary/60 text-xs font-semibold text-tutu-lime transition-colors whitespace-nowrap"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Painel Admin</span>
              </Link>
            )}

            <Link
              to="/login"
              className="px-3.5 py-2 rounded-xl btn-tutu-primary text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-tutu-lime"
            >
              <LogIn className="w-4 h-4 shrink-0" />
              <span>Entrar</span>
            </Link>

            <Link
              to="/cadastro"
              className="px-4 py-2 rounded-xl btn-tutu-lime text-xs sm:text-sm flex items-center gap-1.5 whitespace-nowrap focus-visible:outline focus-visible:outline-2 focus-visible:outline-tutu-lime"
            >
              <Rocket className="w-4 h-4 shrink-0" />
              <span>Comece sua jornada</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center min-w-0">
        <Outlet />
      </main>

      {!isLandingPage && (
        <footer className="border-t border-tutu-secondary/30 bg-tutu-dark py-6">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-tutu-light/70">
            <TutuBrandMark size="sm" />
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/termos" className="hover:text-tutu-lime underline underline-offset-4 py-1">
                Termos de Uso
              </Link>
              <Link to="/privacidade" className="hover:text-tutu-lime underline underline-offset-4 py-1">
                Política de Privacidade
              </Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
