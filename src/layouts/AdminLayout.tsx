import React, { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  CheckSquare,
  Compass,
  FileBarChart,
  FolderKanban,
  LayoutDashboard,
  Menu,
  QrCode,
  Settings,
  Trophy,
  Users,
  X,
  ArrowLeft,
} from 'lucide-react';
import { TutuBrandMark } from '../assets/logos';

export const AdminLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard Admin', icon: LayoutDashboard },
    { to: '/admin/startups', label: 'Gestão de Startups', icon: Building2 },
    { to: '/admin/missoes', label: 'Gestão de Missões', icon: Compass },
    { to: '/admin/qrcodes', label: 'Gestão de QR Codes', icon: QrCode },
    { to: '/admin/validacao', label: 'Validação de Missões', icon: CheckSquare },
    { to: '/admin/participantes', label: 'Participantes', icon: Users },
    { to: '/admin/ranking', label: 'Ranking Administrativo', icon: Trophy },
    { to: '/admin/configuracoes', label: 'Configurações do Evento', icon: Settings },
    { to: '/admin/relatorios', label: 'Relatórios & Exportação', icon: FileBarChart },
    { to: '/admin/governanca', label: 'Governança (12 Planos)', icon: FolderKanban },
  ];

  return (
    <div className="min-h-screen bg-tutu-dark text-tutu-light flex flex-col lg:flex-row">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex lg:w-72 lg:flex-col lg:fixed lg:inset-y-0 bg-tutu-dark border-r border-tutu-secondary/50 z-30">
        <div className="p-5 border-b border-tutu-secondary/40 flex items-center justify-between">
          <Link to="/">
            <TutuBrandMark size="sm" />
          </Link>
          <span className="px-2 py-0.5 rounded-md bg-tutu-lime text-tutu-dark font-bold text-[10px] uppercase tracking-wider">
            Admin
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-tutu-blue text-tutu-light shadow-sm border border-tutu-lime/40'
                      : 'text-tutu-light/80 hover:bg-tutu-secondary/25 hover:text-tutu-light'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 text-tutu-lime" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-tutu-secondary/40 space-y-2">
          <div className="p-3 rounded-xl bg-tutu-secondary/20 border border-tutu-secondary/40 text-xs text-tutu-light/80">
            <p className="font-semibold text-tutu-lime flex items-center gap-1.5">
              <BarChart3 className="w-3.5 h-3.5" /> Modo Simulação Ativo
            </p>
            <p className="mt-1 text-[11px] leading-relaxed">
              Camada de serviços preparada para futura conexão com API + SQLite.
            </p>
          </div>
          <Link
            to="/app/dashboard"
            className="w-full py-2.5 px-3 rounded-xl btn-tutu-outline text-xs flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Ir para Visão do Participante</span>
          </Link>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <div className="lg:hidden sticky top-0 z-30 bg-tutu-dark/95 backdrop-blur-md border-b border-tutu-secondary/50 px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TutuBrandMark size="sm" />
          <span className="px-2 py-0.5 rounded bg-tutu-lime text-tutu-dark font-bold text-[10px] uppercase">
            Admin
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-xl bg-tutu-secondary/30 text-tutu-light"
          aria-label="Abrir menu administrativo"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-16 z-40 bg-tutu-dark/98 p-4 overflow-y-auto">
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                      isActive
                        ? 'bg-tutu-blue text-tutu-light'
                        : 'text-tutu-light/80 hover:bg-tutu-secondary/30'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 text-tutu-lime" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
          <div className="mt-6 pt-4 border-t border-tutu-secondary/40">
            <Link
              to="/app/dashboard"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-3 px-4 rounded-xl btn-tutu-outline text-sm flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Voltar à Área do Participante</span>
            </Link>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
