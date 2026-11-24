import React, { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Building2,
  CheckSquare,
  Compass,
  FileBarChart,
  FolderKanban,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Trophy,
  Users,
  X,
  ArrowLeft,
} from 'lucide-react';
import { TutuBrandMark } from '../assets/logos';
import { useAppStore } from '../hooks/useAppStore';

export const AdminLayout: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { sqliteConnected, authState, logoutSession } = useAppStore();
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    await logoutSession();
    navigate('/admin/login', { replace: true });
  };

  const navItems = [
    { to: '/admin/dashboard', label: 'Dashboard Admin', icon: LayoutDashboard },
    { to: '/admin/startups', label: 'Gestão de Startups', icon: Building2 },
    { to: '/admin/missoes', label: 'Gestão de Missões', icon: Compass },
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
        <div className="p-5 border-b border-tutu-secondary/40 flex items-center justify-between gap-2">
          <Link to="/">
            <TutuBrandMark size="sm" />
          </Link>
          <span className="px-2 py-0.5 rounded-md bg-tutu-lime text-tutu-dark font-bold text-[10px] uppercase tracking-wider shrink-0">
            Admin
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" aria-label="Menu administrativo">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
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
              <BarChart3 className="w-3.5 h-3.5 shrink-0" />{' '}
              <span>{sqliteConnected ? 'Banco SQLite + RBAC Ativo' : 'Modo Simulação em Memória'}</span>
            </p>
            <p className="mt-1 text-[11px] leading-relaxed truncate">
              Admin: {authState.email || 'Sessão Verificada'}
            </p>
          </div>
          <Link
            to="/app/dashboard"
            className="w-full py-2.5 px-3 rounded-xl btn-tutu-outline text-xs flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
            <span>Ir para Visão do Participante</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full py-2.5 px-3 rounded-xl bg-tutu-secondary/25 hover:bg-tutu-secondary/45 border border-tutu-lime/30 text-tutu-lime font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5 shrink-0" />
            <span>Encerrar Sessão Admin</span>
          </button>
        </div>
      </aside>

      {/* Mobile & Tablet Top Header */}
      <div className="lg:hidden sticky top-0 z-30 bg-tutu-dark/95 backdrop-blur-md border-b border-tutu-secondary/50 px-3 sm:px-4 h-16 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Link to="/" className="shrink-0">
            <TutuBrandMark size="sm" />
          </Link>
          <span className="px-2 py-0.5 rounded bg-tutu-lime text-tutu-dark font-bold text-[10px] uppercase shrink-0">
            Admin
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-tutu-secondary/30 text-tutu-light flex items-center justify-center shrink-0"
          aria-label={mobileMenuOpen ? 'Fechar menu administrativo' : 'Abrir menu administrativo'}
          aria-expanded={mobileMenuOpen}
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile & Tablet Drawer + Backdrop */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 top-16 z-40 bg-tutu-dark/80 backdrop-blur-sm overflow-y-auto"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="max-w-lg mx-auto bg-tutu-dark border-b border-tutu-secondary/50 p-4 space-y-4 pb-8 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-tutu-secondary/30">
              <span className="text-xs font-bold uppercase tracking-wider text-tutu-lime">
                Navegação Administrativa
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[38px] px-3 py-1.5 rounded-lg bg-tutu-secondary/30 text-xs text-tutu-light/85 hover:text-tutu-light inline-flex items-center gap-1.5"
              >
                <X className="w-4 h-4 text-tutu-lime" />
                <span>Fechar</span>
              </button>
            </div>

            <nav className="space-y-1.5" aria-label="Menu administrativo móvel">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={({ isActive }) =>
                      `min-h-[48px] flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${isActive
                        ? 'bg-tutu-blue text-tutu-light border border-tutu-lime/40'
                        : 'text-tutu-light/85 hover:bg-tutu-secondary/30'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4 text-tutu-lime shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
            <div className="pt-4 border-t border-tutu-secondary/40 space-y-2.5">
              <div className="p-3 rounded-xl bg-tutu-secondary/20 border border-tutu-secondary/40 text-xs text-tutu-light/80">
                <p className="font-semibold text-tutu-lime flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                  <span>{sqliteConnected ? 'Banco SQLite + RBAC Ativo' : 'Modo Simulação'}</span>
                </p>
                <p className="mt-1 text-[11px] truncate">
                  Admin: {authState.email || 'Sessão Verificada'}
                </p>
              </div>
              <Link
                to="/app/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="min-h-[48px] w-full py-3 px-4 rounded-xl btn-tutu-outline text-sm flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4 shrink-0" />
                <span>Voltar à Área do Participante</span>
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  void handleLogout();
                }}
                className="min-h-[48px] w-full py-3 px-4 rounded-xl bg-tutu-secondary/30 border border-tutu-lime/40 text-tutu-lime font-semibold text-sm flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Encerrar Sessão Admin</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area (min-w-0 evita overflow horizontal de tabelas/cards) */}
      <div className="flex-1 lg:pl-72 min-w-0">
        <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
