import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Search,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { Participant, ParticipantStatus } from '../../types';
import { downloadCsv } from '../../utils/csvExport';
import { formatBrazilianPhone, formatPoints } from '../../utils/formatters';

export const AdminParticipantsPage: React.FC = () => {
  const {
    allParticipants,
    updateParticipantStatus,
    resetParticipantPasswordAdmin,
    refreshRanking,
    isRefreshingRanking,
  } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | ParticipantStatus>('Todos');
  const didInitialSyncRef = useRef(false);

  // Sincroniza automaticamente a lista de participantes com o servidor ao abrir a tela
  useEffect(() => {
    if (didInitialSyncRef.current) return;
    didInitialSyncRef.current = true;
    void refreshRanking();
  }, [refreshRanking]);

  // Estado do modal de redefinição administrativa de senha
  const [resetTarget, setResetTarget] = useState<Participant | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const openResetModal = (p: Participant) => {
    setResetTarget(p);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setResetError(null);
  };

  const closeResetModal = () => {
    if (isResetting) return;
    setResetTarget(null);
    setNewPassword('');
    setConfirmPassword('');
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setResetError(null);
  };

  useEffect(() => {
    if (!resetTarget) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isResetting) {
        closeResetModal();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [resetTarget, isResetting]);

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetTarget || isResetting) return;
    setResetError(null);

    if (newPassword.length < 6) {
      setResetError('A nova senha deve conter pelo menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setResetError('A nova senha e a confirmação não coincidem.');
      return;
    }

    setIsResetting(true);
    try {
      const res = await resetParticipantPasswordAdmin(resetTarget.id, newPassword, confirmPassword);
      if (!res.ok) {
        setResetError(res.error || 'Não foi possível redefinir a senha.');
        return;
      }
      setResetTarget(null);
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setResetError(null);
    } finally {
      setIsResetting(false);
    }
  };

  const visibleParticipants = allParticipants.filter(
    (p) => String(p.role || 'PARTICIPANT').toUpperCase() !== 'ADMIN'
  );

  const filtered = visibleParticipants
    .filter((p) => (statusFilter === 'Todos' ? true : p.status === statusFilter))
    .filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (p.phone || '').includes(searchTerm.replace(/\D/g, '') || searchTerm)
    );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
            Base de Participantes • Seção 6.6
          </span>
          <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
            Gestão de Participantes
          </h1>
          <p className="text-xs sm:text-sm text-tutu-light/80 leading-relaxed">
            Consulte participantes cadastrados, e-mails, pontuação, missões concluídas e gerencie o status de cada conta.
          </p>
        </div>
        <button
          onClick={() =>
            downloadCsv(
              `participantes-${new Date().toISOString().slice(0, 10)}.csv`,
              ['Posição', 'Nome', 'Apelido', 'E-mail', 'Telefone', 'Status', 'Pontos', 'Missões Concluídas', 'Data Cadastro'],
              filtered.map((p) => [
                p.rankingPosition,
                p.name,
                p.nickname,
                p.email,
                p.phone || '',
                p.status,
                p.points,
                p.completedMissionsCount,
                p.registeredAt,
              ])
            )
          }
          className="min-h-[44px] px-4 py-2.5 rounded-xl btn-tutu-outline text-xs flex items-center justify-center gap-2 self-start shrink-0"
        >
          <Download className="w-4 h-4 shrink-0" />
          <span>Exportar Participantes CSV</span>
        </button>
      </div>

      {/* Search & Filter Controls */}
      <div className="tutu-card p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-tutu-light/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome, apelido, e-mail ou telefone..."
            aria-label="Pesquisar participantes"
            className="input-tutu pl-10 text-sm"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'Todos' | ParticipantStatus)}
            aria-label="Filtrar por status do participante"
            className="input-tutu text-sm"
          >
            <option value="Todos">Todos os Status ({visibleParticipants.length})</option>
            <option value="Ativo">Ativo</option>
            <option value="Pendente">Pendente</option>
            <option value="Inativo">Inativo</option>
          </select>
        </div>
      </div>

      {/* Responsive Container: Stacked Cards on Mobile (<768px) & Table on Tablet/Desktop (>=768px) */}
      <div className="tutu-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-tutu-secondary/40 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display font-bold text-lg text-tutu-light flex items-center gap-2">
            <Users className="w-5 h-5 text-tutu-lime shrink-0" />
            <span>Participantes Registrados ({filtered.length})</span>
          </h2>
          <button
            type="button"
            onClick={() => void refreshRanking()}
            disabled={isRefreshingRanking}
            className="min-h-[36px] px-3 py-1.5 rounded-xl bg-tutu-secondary/25 hover:bg-tutu-secondary/45 border border-tutu-secondary/50 text-xs font-semibold text-tutu-light inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
            title="Atualizar lista de participantes do servidor"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-tutu-lime ${isRefreshingRanking ? 'animate-spin' : ''}`}
            />
            <span>{isRefreshingRanking ? 'Atualizando...' : 'Atualizar'}</span>
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-tutu-light/70">
            Nenhum participante encontrado para os filtros aplicados.
          </div>
        ) : (
          <>
            {/* Mobile View (<768px): Cards */}
            <div className="md:hidden divide-y divide-tutu-secondary/30">
              {filtered.map((p) => (
                <div key={p.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-tutu-light break-words">
                        {p.name}{' '}
                        <span className="text-xs text-tutu-light/60 font-normal">
                          ({p.nickname})
                        </span>
                      </p>
                      <p className="text-xs text-tutu-light/80 font-mono break-all flex items-center gap-1.5 mt-1">
                        <Mail className="w-3.5 h-3.5 text-tutu-lime shrink-0" />
                        <span>{p.email}</span>
                      </p>
                      <p className="text-xs text-tutu-light/80 font-mono flex items-center gap-1.5 mt-1">
                        <Phone className="w-3.5 h-3.5 text-tutu-lime shrink-0" />
                        <span className={p.phone ? '' : 'text-tutu-light/50 italic font-sans'}>
                          {p.phone ? formatBrazilianPhone(p.phone) : 'Não informado'}
                        </span>
                      </p>
                    </div>
                    <span className="font-display font-bold text-sm text-tutu-lime inline-flex items-center gap-1 shrink-0">
                      <Zap className="w-3.5 h-3.5 shrink-0" />
                      {formatPoints(p.points)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-tutu-light/75">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-tutu-lime" />
                      {p.completedMissionsCount} missões
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        p.imagePublicityConsent
                          ? 'bg-tutu-lime/20 text-tutu-lime border border-tutu-lime/40'
                          : 'bg-tutu-dark/80 text-tutu-light/60 border border-tutu-secondary/40'
                      }`}
                    >
                      LGPD Imagem: {p.imagePublicityConsent ? 'Autorizada' : 'Não autorizada'}
                      {p.imagePublicityConsentVersion ? ` (${p.imagePublicityConsentVersion})` : ''}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-tutu-lime" />
                      {p.registeredAt}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-tutu-secondary/25 flex flex-wrap items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-tutu-light/70 font-medium">Status:</span>
                      <select
                        value={p.status}
                        onChange={(e) =>
                          updateParticipantStatus(p.id, e.target.value as ParticipantStatus)
                        }
                        aria-label={`Alterar status de ${p.name}`}
                        className="min-h-[40px] bg-tutu-dark border border-tutu-secondary/60 rounded-xl px-3 py-1.5 text-xs font-bold text-tutu-lime"
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Inativo">Inativo</option>
                      </select>
                    </div>
                    <button
                      type="button"
                      onClick={() => openResetModal(p)}
                      className="min-h-[40px] px-3 py-1.5 rounded-xl bg-tutu-secondary/25 border border-tutu-secondary/50 hover:border-tutu-lime text-xs font-semibold text-tutu-light hover:text-tutu-lime inline-flex items-center gap-1.5 transition-colors"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-tutu-lime shrink-0" />
                      <span>Redefinir senha</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Tablet & Desktop View (>=768px): Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-tutu-secondary/40 text-[11px] uppercase tracking-wider text-tutu-light/70 bg-tutu-dark/60">
                    <th className="py-3.5 px-4">Nome</th>
                    <th className="py-3.5 px-4">E-mail</th>
                    <th className="py-3.5 px-4">Telefone / WhatsApp</th>
                    <th className="py-3.5 px-4">Pontuação</th>
                    <th className="py-3.5 px-4">Missões Concluídas</th>
                    <th className="py-3.5 px-4">Data de Cadastro</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tutu-secondary/30 text-xs sm:text-sm">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-tutu-secondary/15">
                      <td className="py-3.5 px-4 font-semibold text-tutu-light">
                        <div>
                          {p.name}{' '}
                          <span className="text-xs text-tutu-light/60 font-normal">
                            ({p.nickname})
                          </span>
                        </div>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            p.imagePublicityConsent
                              ? 'bg-tutu-lime/20 text-tutu-lime border border-tutu-lime/40'
                              : 'bg-tutu-dark/80 text-tutu-light/55 border border-tutu-secondary/40'
                          }`}
                        >
                          LGPD: {p.imagePublicityConsent ? 'Imagem autorizada' : 'Sem autorização pública'}
                          {p.imagePublicityConsentVersion ? ` • ${p.imagePublicityConsentVersion}` : ''}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-tutu-light/80 font-mono text-xs">
                        {p.email}
                      </td>
                      <td className="py-3.5 px-4 text-tutu-light/80 font-mono text-xs whitespace-nowrap">
                        {p.phone ? (
                          formatBrazilianPhone(p.phone)
                        ) : (
                          <span className="text-tutu-light/50 italic font-sans">Não informado</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-display font-bold text-tutu-lime whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5" />
                          {formatPoints(p.points)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-tutu-light/85 whitespace-nowrap">
                        {p.completedMissionsCount} missões
                      </td>
                      <td className="py-3.5 px-4 text-tutu-light/75 text-xs whitespace-nowrap">
                        {p.registeredAt}
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={p.status}
                          onChange={(e) =>
                            updateParticipantStatus(p.id, e.target.value as ParticipantStatus)
                          }
                          aria-label={`Alterar status de ${p.name}`}
                          className="bg-tutu-dark border border-tutu-secondary/60 rounded-lg px-2.5 py-1.5 text-xs font-bold text-tutu-lime"
                        >
                          <option value="Ativo">Ativo</option>
                          <option value="Pendente">Pendente</option>
                          <option value="Inativo">Inativo</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openResetModal(p)}
                          className="px-3 py-1.5 rounded-lg bg-tutu-secondary/25 border border-tutu-secondary/50 hover:border-tutu-lime text-xs font-semibold text-tutu-light hover:text-tutu-lime inline-flex items-center gap-1.5 transition-colors"
                        >
                          <KeyRound className="w-3.5 h-3.5 text-tutu-lime shrink-0" />
                          <span>Redefinir senha</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal de Redefinição Administrativa de Senha */}
      {resetTarget && (
        <div
          className="fixed inset-0 z-50 bg-tutu-dark/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-reset-password-title"
        >
          <div className="tutu-card max-w-md w-full p-5 sm:p-7 space-y-5 border-2 border-tutu-lime">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-tutu-lime flex items-center gap-1.5">
                  <KeyRound className="w-3.5 h-3.5 shrink-0" />
                  <span>Ação Administrativa Segura</span>
                </span>
                <h2
                  id="admin-reset-password-title"
                  className="font-display font-bold text-xl text-tutu-light mt-1"
                >
                  Redefinir Senha
                </h2>
                <p className="text-xs text-tutu-light/75 mt-1 break-words">
                  Participante: <strong className="text-tutu-light">{resetTarget.name}</strong> ({resetTarget.email})
                </p>
              </div>
              <button
                type="button"
                onClick={closeResetModal}
                disabled={isResetting}
                aria-label="Fechar modal"
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-tutu-secondary/30 text-tutu-light/70 hover:text-tutu-light shrink-0 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleConfirmReset} className="space-y-4">
              <div>
                <label
                  htmlFor="admin-new-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-tutu-light/80 mb-1.5"
                >
                  Nova Senha (mínimo 6 caracteres)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-tutu-light/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                    className="input-tutu pl-10 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    aria-label={showNewPassword ? 'Ocultar nova senha' : 'Visualizar nova senha'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-tutu-light/60 hover:text-tutu-lime"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="admin-confirm-password"
                  className="block text-xs font-semibold uppercase tracking-wider text-tutu-light/80 mb-1.5"
                >
                  Confirmar Nova Senha
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-tutu-light/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="admin-confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repita a nova senha"
                    className="input-tutu pl-10 pr-10 text-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={
                      showConfirmPassword
                        ? 'Ocultar confirmação de senha'
                        : 'Visualizar confirmação de senha'
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-tutu-light/60 hover:text-tutu-lime"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <p className="text-[11px] text-tutu-light/65 leading-relaxed">
                Ao confirmar, a senha será salva com hash criptográfico seguro e todas as sessões anteriores deste participante serão encerradas automaticamente.
              </p>

              {resetError && (
                <div className="p-3 rounded-xl bg-red-500/15 border border-red-400/40 text-xs text-red-200 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-300" />
                  <span>{resetError}</span>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 pt-1">
                <button
                  type="button"
                  onClick={closeResetModal}
                  disabled={isResetting}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl btn-tutu-outline text-xs disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isResetting || !newPassword || !confirmPassword}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl btn-tutu-lime text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isResetting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>{isResetting ? 'Redefinindo...' : 'Confirmar redefinição'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
