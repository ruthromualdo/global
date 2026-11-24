import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  Building2,
  Compass,
  Home,
  ShieldCheck,
  Trophy,
  User,
  Zap,
} from 'lucide-react';
import { TutuBrandMark } from '../assets/logos';
import { useAppStore } from '../hooks/useAppStore';

export const ParticipantLayout: React.FC = () => {
  const { participant, isAdminAuthenticated } = useAppStore();

  const desktopLinks = [
    { to: '/app/dashboard', label: 'Início', icon: Home },
    { to: '/app/missoes', label: 'Missões', icon: Compass },
    { to: '/app/startups', label: 'Startups', icon: Building2 },
    { to: '/app/ranking', label: 'Ranking', icon: Trophy },
    { to: '/app/perfil', label: 'Perfil', icon: User },
  ];

  const mobileBottomLinks = [
    { to: '/app/dashboard', label: 'Início', icon: Home },
    { to: '/app/missoes', label: 'Missões', icon: Compass },
    { to: '/app/ranking', label: 'Ranking', icon: Trophy },
    { to: '/app/perfil', label: 'Perfil', icon: User },
  ];

  return (
    <div className="min-h-screen bg-tutu-dark text-tutu-light flex flex-col pb-28 lg:pb-10">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-tutu-dark/95 backdrop-blur-md border-b border-tutu-secondary/40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 min-h-16 py-2 flex items-center justify-between gap-2 sm:gap-4">
          <Link to="/" className="shrink-0">
            <TutuBrandMark size="sm" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Menu principal do participante">
            {desktopLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors whitespace-nowrap ${
                      isActive
                        ? 'bg-tutu-secondary/50 text-tutu-lime border border-tutu-blue/50'
                        : 'text-tutu-light/80 hover:text-tutu-light hover:bg-tutu-secondary/20'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User Points & Quick Links */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Indicador Permanente de Pontuação (Etapa 5) */}
            <div
              className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-tutu-secondary border border-tutu-lime/50 flex items-center gap-1.5 whitespace-nowrap shadow-sm select-none"
              title={`Pontuação oficial: ${participant.points.toLocaleString('pt-BR')} pts (Limite: 1.000 pts)`}
              aria-label={`Pontuação: ${participant.points} pontos`}
            >
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-tutu-lime fill-tutu-lime shrink-0" />
              <span className="font-display font-bold text-xs sm:text-sm text-tutu-lime tracking-tight">
                {participant.points.toLocaleString('pt-BR')}
              </span>
              <span className="text-[10px] sm:text-xs text-tutu-muted font-semibold lowercase">
                pts
              </span>
            </div>

            {isAdminAuthenticated && (
              <Link
                to="/admin/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tutu-secondary/25 hover:bg-tutu-secondary/50 border border-tutu-secondary/60 text-xs font-semibold text-tutu-light transition-colors whitespace-nowrap"
                title="Acessar Painel Administrativo"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-tutu-lime" />
                <span>Admin</span>
              </Link>
            )}

            <Link
              to="/app/perfil"
              className="w-10 h-10 rounded-xl bg-tutu-blue text-tutu-light font-display font-bold text-xs flex items-center justify-center border border-tutu-light/20 shrink-0"
              title={participant.name}
              aria-label={`Perfil de ${participant.name}`}
            >
              {participant.avatar}
            </Link>
          </div>
        </div>

        {/* Sub-bar on mobile/tablet for Startups & Admin access (only if ADMIN) */}
        <div className="lg:hidden border-t border-tutu-secondary/30 px-3 sm:px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <div className="flex items-center gap-2">
            <NavLink
              to="/app/startups"
              className={({ isActive }) =>
                `px-3 py-2 rounded-xl font-medium whitespace-nowrap inline-flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-tutu-blue text-tutu-light font-semibold'
                    : 'bg-tutu-secondary/25 text-tutu-light/85'
                }`
              }
            >
              <Building2 className="w-3.5 h-3.5 text-tutu-lime" />
              <span>Startups Expositoras</span>
            </NavLink>
          </div>
          {isAdminAuthenticated && (
            <Link
              to="/admin/dashboard"
              className="px-3 py-2 rounded-xl bg-tutu-secondary/30 border border-tutu-lime/30 text-tutu-lime font-semibold whitespace-nowrap flex items-center gap-1.5"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Painel Admin</span>
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 min-w-0">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar */}
      <nav
        aria-label="Navegação móvel do participante"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-tutu-dark/95 backdrop-blur-lg border-t border-tutu-secondary/60 px-1.5 sm:px-3 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      >
        <div className="max-w-md mx-auto grid grid-cols-4 items-end gap-1">
          {mobileBottomLinks.map((item) => {
            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `min-h-[48px] flex flex-col items-center justify-center py-1.5 px-1 rounded-xl transition-colors ${
                    isActive ? 'text-tutu-lime font-semibold' : 'text-tutu-light/70'
                  }`
                }
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="text-[10px] sm:text-[11px] mt-1 truncate max-w-full">
                  {item.label}
                </span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
