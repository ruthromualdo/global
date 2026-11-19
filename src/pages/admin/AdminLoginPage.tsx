import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Lock,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Terminal,
} from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { TutuBrandMark } from '../../assets/logos';

export const AdminLoginPage: React.FC = () => {
  const { loginAdmin, authState } = useAppStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const reason = searchParams.get('reason');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    const res = await loginAdmin(email, password);
    setLoading(false);

    if (res.ok) {
      navigate('/admin/dashboard', { replace: true });
    } else {
      setErrorMessage(res.error || 'Acesso administrativo negado.');
    }
  };

  return (
    <div className="min-h-screen bg-tutu-dark text-tutu-light flex flex-col justify-center py-8 sm:py-12 px-3 sm:px-6 lg:px-8">
      <div className="max-w-md w-full mx-auto space-y-5 sm:space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Link to="/">
            <TutuBrandMark size="sm" />
          </Link>
          <span className="px-3 py-1 rounded-full bg-tutu-secondary/40 border border-tutu-lime/40 text-tutu-lime text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
            <span>Área Restrita</span>
          </span>
        </div>

        <div className="tutu-card p-5 sm:p-8 space-y-6 border-2 border-tutu-blue">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
              Controle de Acesso Baseado em Papéis (RBAC)
            </span>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-tutu-light">
              Autenticação Administrativa
            </h1>
            <p className="text-xs text-tutu-light/75 leading-relaxed">
              Acesso exclusivo para usuários com papel <strong>ADMIN</strong> validado no servidor SQLite. Contas de participantes comuns não possuem acesso a este módulo.
            </p>
          </div>

          {/* Alerta quando um PARTICIPANT tenta acessar /admin */}
          {reason === 'forbidden' && (
            <div className="p-4 rounded-xl bg-tutu-dark border-2 border-tutu-lime space-y-1.5 text-xs">
              <p className="font-bold text-tutu-lime flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>Acesso Negado (Perfil PARTICIPANT)</span>
              </p>
              <p className="text-tutu-light/85 leading-relaxed break-words">
                Sua sessão atual pertence a um participante comum ({authState.email || 'PARTICIPANT'}). Para acessar o Painel Administrativo, autentique-se abaixo com uma credencial administrativa autorizada.
              </p>
            </div>
          )}

          {reason === 'unauthenticated' && !errorMessage && (
            <div className="p-3.5 rounded-xl bg-tutu-secondary/25 border border-tutu-secondary/60 text-xs text-tutu-light/90 flex items-center gap-2.5">
              <Lock className="w-4 h-4 text-tutu-lime shrink-0" />
              <span>Identifique-se com sua conta administrativa para acessar a rota solicitada.</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-4 rounded-xl bg-tutu-dark border border-tutu-lime text-xs space-y-1">
              <p className="font-bold text-tutu-lime flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Falha de Autorização</span>
              </p>
              <p className="text-tutu-light/90 break-words">{errorMessage}</p>
            </div>
          )}

          {!authState.hasConfiguredAdmin && (
            <div className="p-4 rounded-xl bg-tutu-dark/90 border border-tutu-secondary/60 space-y-2 text-xs">
              <p className="font-bold text-tutu-lime flex items-center gap-1.5">
                <Terminal className="w-4 h-4 shrink-0" />
                <span>Primeira Conta Administrativa Pendente</span>
              </p>
              <p className="text-tutu-light/80 leading-relaxed">
                Nenhuma senha fixa foi incluída no código-fonte. Configure a primeira conta ADMIN no terminal executando:
              </p>
              <code className="block p-2.5 rounded-lg bg-tutu-secondary/25 text-tutu-lime font-mono text-[11px] break-all">
                npm.cmd run setup:admin -- seu.email@dominio.com SuaSenhaSegura
              </code>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="admin-email"
                className="block text-xs font-semibold uppercase tracking-wider text-tutu-light/80 mb-1.5"
              >
                E-mail Administrativo
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-tutu-light/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="admin-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@organizacao.com.br"
                  className="input-tutu pl-10 text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="admin-password"
                className="block text-xs font-semibold uppercase tracking-wider text-tutu-light/80 mb-1.5"
              >
                Senha Administrativa
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-tutu-light/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="admin-password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="input-tutu pl-10 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="min-h-[48px] w-full py-3.5 px-4 btn-tutu-lime text-sm flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Validando Credenciais...' : 'Acessar Painel Administrativo'}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </form>

          <div className="pt-4 border-t border-tutu-secondary/40 flex flex-wrap items-center justify-between gap-2 text-xs">
            <Link
              to="/app/dashboard"
              className="text-tutu-light/75 hover:text-tutu-lime flex items-center gap-1.5 py-1"
            >
              <ArrowLeft className="w-3.5 h-3.5 shrink-0" />
              <span>Voltar à Área do Participante</span>
            </Link>
            <Link to="/" className="text-tutu-light/75 hover:text-tutu-lime py-1">
              Início
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
