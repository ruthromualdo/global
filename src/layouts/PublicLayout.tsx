import React from 'react';
import { Link, Outlet } from 'react-router-dom';
import { LogIn, Rocket, ShieldCheck, Trophy } from 'lucide-react';
import { TutuBrandMark } from '../assets/logos';
import { useAppStore } from '../hooks/useAppStore';

export const PublicLayout: React.FC = () => {
  const { isAdminAuthenticated } = useAppStore();

  return (
    <div className="min-h-screen bg-tutu-dark text-tutu-light flex flex-col">
      <header className="sticky top-0 z-30 bg-tutu-dark/90 backdrop-blur-md border-b border-tutu-secondary/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 py-3 flex items-center justify-between gap-4">
          <Link to="/">
            <TutuBrandMark size="md" />
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-tutu-light/85">
            <Link to="/app/missoes" className="hover:text-tutu-lime transition-colors">
              Central de Missões
            </Link>
            <Link to="/app/startups" className="hover:text-tutu-lime transition-colors">
              Startups
            </Link>
            <Link to="/app/ranking" className="hover:text-tutu-lime transition-colors flex items-center gap-1.5">
              <Trophy className="w-4 h-4 text-tutu-lime" />
              <span>Ranking Geral</span>
            </Link>
            {isAdminAuthenticated && (
              <Link
                to="/admin/dashboard"
                className="hover:text-tutu-lime transition-colors flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 text-tutu-lime" />
                <span>Painel Admin</span>
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2.5">
            <Link
              to="/login"
              className="px-3.5 py-2 rounded-xl btn-tutu-outline text-xs sm:text-sm flex items-center gap-1.5"
            >
              <LogIn className="w-4 h-4" />
              <span>Entrar</span>
            </Link>
            <Link
              to="/cadastro"
              className="px-4 py-2 rounded-xl btn-tutu-primary text-xs sm:text-sm flex items-center gap-1.5"
            >
              <Rocket className="w-4 h-4" />
              <span className="hidden sm:inline">Começar jornada</span>
              <span className="sm:hidden">Cadastrar</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-tutu-secondary/40 bg-tutu-dark py-10 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <TutuBrandMark size="sm" />
            <p className="text-xs text-tutu-light/70 mt-2 max-w-md">
              Brasil Global Summit 2026 • 24, 25 e 26 de novembro de 2026 • Arena BRB Mané Garrincha, Brasília/DF. Identidade visual oficial Tutu.
            </p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs text-tutu-light/80">
            <Link to="/termos" className="hover:text-tutu-lime underline underline-offset-4">
              Termos de Uso
            </Link>
            <Link to="/privacidade" className="hover:text-tutu-lime underline underline-offset-4">
              Política de Privacidade
            </Link>
            <Link to="/app/dashboard" className="hover:text-tutu-lime underline underline-offset-4">
              Área do Participante
            </Link>
            {isAdminAuthenticated && (
              <Link to="/admin/dashboard" className="hover:text-tutu-lime underline underline-offset-4">
                Área Administrativa
              </Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};
