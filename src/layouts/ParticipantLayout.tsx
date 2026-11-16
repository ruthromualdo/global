import React from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  Award,
  Building2,
  Compass,
  Home,
  QrCode,
  ShieldCheck,
  Trophy,
  User,
  Zap,
} from 'lucide-react';
import { TutuBrandMark } from '../assets/logos';
import { useAppStore } from '../hooks/useAppStore';
import { formatPoints } from '../utils/formatters';

export const ParticipantLayout: React.FC = () => {
  const { participant } = useAppStore();

  const desktopLinks = [
    { to: '/app/dashboard', label: 'Início', icon: Home },
    { to: '/app/missoes', label: 'Missões', icon: Compass },
    { to: '/app/escanear', label: 'Escanear QR', icon: QrCode, highlight: true },
    { to: '/app/startups', label: 'Startups', icon: Building2 },
    { to: '/app/ranking', label: 'Ranking', icon: Trophy },
    { to: '/app/conquistas', label: 'Conquistas', icon: Award },
    { to: '/app/perfil', label: 'Perfil', icon: User },
  ];

  const mobileBottomLinks = [
    { to: '/app/dashboard', label: 'Início', icon: Home },
    { to: '/app/missoes', label: 'Missões', icon: Compass },
    { to: '/app/escanear', label: 'Escanear', icon: QrCode, centerHighlight: true },
    { to: '/app/ranking', label: 'Ranking', icon: Trophy },
    { to: '/app/perfil', label: 'Perfil', icon: User },
  ];

  return (
    <div className="min-h-screen bg-tutu-dark text-tutu-light flex flex-col pb-24 lg:pb-10">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-tutu-dark/95 backdrop-blur-md border-b border-tutu-secondary/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="shrink-0">
            <TutuBrandMark size="sm" />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {desktopLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    item.highlight
                      ? `px-3.5 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all mx-1 ${
                          isActive
                            ? 'bg-tutu-lime text-tutu-dark'
                            : 'bg-tutu-blue text-tutu-light hover:bg-tutu-secondary border border-tutu-lime/40'
                        }`
                      : `px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors ${
                          isActive
                            ? 'bg-tutu-secondary/50 text-tutu-lime border border-tutu-blue/50'
                            : 'text-tutu-light/80 hover:text-tutu-light hover:bg-tutu-secondary/20'
                        }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User Points & Quick Links */}
          <div className="flex items-center gap-2.5">
            <div className="px-3 py-1.5 rounded-xl bg-tutu-secondary/30 border border-tutu-lime/40 flex items-center gap-2">
              <Zap className="w-4 h-4 text-tutu-lime fill-tutu-lime" />
              <span className="font-display font-bold text-sm text-tutu-lime">
                {formatPoints(participant.points)}
              </span>
            </div>

            <Link
              to="/admin/dashboard"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tutu-secondary/25 hover:bg-tutu-secondary/50 border border-tutu-secondary/60 text-xs font-semibold text-tutu-light transition-colors"
              title="Acessar Painel Administrativo"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-tutu-lime" />
              <span>Admin</span>
            </Link>

            <Link
              to="/app/perfil"
              className="w-9 h-9 rounded-xl bg-tutu-blue text-tutu-light font-display font-bold text-xs flex items-center justify-center border border-tutu-light/20"
              title={participant.name}
            >
              {participant.avatar}
            </Link>
          </div>
        </div>

        {/* Sub-bar on mobile for Startups, Conquistas & Admin access */}
        <div className="lg:hidden border-t border-tutu-secondary/30 px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <div className="flex items-center gap-2">
            <NavLink
              to="/app/startups"
              className={({ isActive }) =>
                `px-2.5 py-1 rounded-lg font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-tutu-blue text-tutu-light'
                    : 'bg-tutu-secondary/25 text-tutu-light/80'
                }`
              }
            >
              Startups Expositoras
            </NavLink>
            <NavLink
              to="/app/conquistas"
              className={({ isActive }) =>
                `px-2.5 py-1 rounded-lg font-medium whitespace-nowrap ${
                  isActive
                    ? 'bg-tutu-blue text-tutu-light'
                    : 'bg-tutu-secondary/25 text-tutu-light/80'
                }`
              }
            >
              Medalhas & Conquistas
            </NavLink>
          </div>
          <Link
            to="/admin/dashboard"
            className="px-2.5 py-1 rounded-lg bg-tutu-secondary/30 border border-tutu-lime/30 text-tutu-lime font-semibold whitespace-nowrap flex items-center gap-1"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Painel Admin</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation Bar (Section 8.1) */}
      <nav
        aria-label="Navegação móvel do participante"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-tutu-dark/95 backdrop-blur-lg border-t border-tutu-secondary/60 px-2 py-1.5"
      >
        <div className="max-w-md mx-auto grid grid-cols-5 items-end">
          {mobileBottomLinks.map((item) => {
            const Icon = item.icon;
            if (item.centerHighlight) {
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className="flex flex-col items-center justify-center -mt-5"
                >
                  {({ isActive }) => (
                    <>
                      <div
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-transform ${
                          isActive
                            ? 'bg-tutu-lime text-tutu-dark scale-105 border-2 border-tutu-light'
                            : 'bg-tutu-blue text-tutu-light border-2 border-tutu-lime'
                        }`}
                      >
                        <Icon className="w-6 h-6" />
                      </div>
                      <span
                        className={`text-[11px] mt-1 font-bold ${
                          isActive ? 'text-tutu-lime' : 'text-tutu-light'
                        }`}
                      >
                        {item.label}
                      </span>
                    </>
                  )}
                </NavLink>
              );
            }

            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center py-1.5 rounded-xl transition-colors ${
                    isActive ? 'text-tutu-lime font-semibold' : 'text-tutu-light/70'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                <span className="text-[11px] mt-1">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
