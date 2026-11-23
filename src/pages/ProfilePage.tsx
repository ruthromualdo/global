import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  History,
  Lock,
  LogOut,
  Mail,
  Pencil,
  Phone,
  Save,
  User,
  X,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { MissionStatusBadge } from '../components/UI';
import {
  formatBrazilianPhone,
  formatPoints,
  getInitials,
  maskBrazilianPhoneInput,
  validateBrazilianPhone,
} from '../utils/formatters';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ProfilePage: React.FC = () => {
  const { participant, missions, updateProfile, updateImagePublicityConsent, logoutSession } =
    useAppStore();
  const navigate = useNavigate();
  const [isUpdatingConsent, setIsUpdatingConsent] = useState(false);

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [nameInput, setNameInput] = useState(participant.name);
  const [emailInput, setEmailInput] = useState(participant.email);
  const [phoneInput, setPhoneInput] = useState(formatBrazilianPhone(participant.phone));
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const initials = getInitials(participant.name || participant.avatar || 'PS');
  const completedMissionsCount = participant.completedMissionsCount;
  const eventProgress = Math.round(
    (completedMissionsCount / Math.max(1, missions.filter((m) => m.active).length)) * 100
  );

  const openEditModal = () => {
    setNameInput(participant.name);
    setEmailInput(participant.email);
    setPhoneInput(formatBrazilianPhone(participant.phone));
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setFormError(null);
    setIsEditModalOpen(true);
  };

  const closeEditModal = () => {
    if (isSaving) return;
    setIsEditModalOpen(false);
    setFormError(null);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
  };

  useEffect(() => {
    if (!isEditModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSaving) {
        setIsEditModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditModalOpen, isSaving]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = nameInput.trim();
    const cleanEmail = emailInput.trim().toLowerCase();

    if (cleanName.length < 2) {
      setFormError('Informe seu nome completo (mínimo 2 caracteres).');
      return;
    }

    if (!EMAIL_REGEX.test(cleanEmail)) {
      setFormError('Informe um endereço de e-mail válido.');
      return;
    }

    const shouldValidatePhone = Boolean(phoneInput.trim() || participant.phone);
    let normalizedPhone: string | undefined;
    if (shouldValidatePhone) {
      const phoneValidation = validateBrazilianPhone(phoneInput);
      if (!phoneValidation.valid) {
        setFormError(phoneValidation.error || 'Informe um telefone brasileiro válido com DDD.');
        return;
      }
      normalizedPhone = phoneValidation.normalized;
    }

    const wantsPasswordChange = Boolean(currentPassword || newPassword || confirmNewPassword);
    if (wantsPasswordChange) {
      if (!currentPassword) {
        setFormError('Informe sua senha atual para cadastrar uma nova senha.');
        return;
      }
      if (newPassword.length < 6) {
        setFormError('A nova senha deve conter pelo menos 6 caracteres.');
        return;
      }
      if (newPassword !== confirmNewPassword) {
        setFormError('A nova senha e a confirmação não coincidem.');
        return;
      }
    }

    setIsSaving(true);
    try {
      const result = await updateProfile({
        name: cleanName,
        email: cleanEmail,
        ...(normalizedPhone !== undefined ? { phone: normalizedPhone } : {}),
        ...(wantsPasswordChange
          ? { currentPassword, newPassword, confirmNewPassword }
          : {}),
      });

      if (!result.ok) {
        setFormError(result.error || 'Não foi possível salvar as alterações.');
        return;
      }

      setIsEditModalOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoutAccount = async () => {
    await logoutSession();
    navigate('/', { replace: true });
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* 1. Cabeçalho do Perfil */}
      <div className="tutu-card p-5 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5 sm:gap-6 border-2 border-tutu-blue">
        <div className="flex items-center gap-4 sm:gap-5 min-w-0">
          <div
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-tutu-lime text-tutu-dark font-display font-bold text-2xl sm:text-3xl flex items-center justify-center shrink-0 shadow-md ring-2 ring-tutu-lime/30"
            aria-hidden="true"
          >
            {initials}
          </div>
          <div className="space-y-1 min-w-0">
            <span className="inline-block px-2.5 py-0.5 rounded-full bg-tutu-secondary/50 text-tutu-lime text-[11px] font-bold truncate max-w-full">
              Participante • Desafio Global Summit 2026
            </span>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-tutu-light break-words">
              {participant.name}
            </h1>
            <p className="text-xs text-tutu-light/70 break-words">
              Cadastrado em {participant.registeredAt}
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
          <div className="p-3 sm:px-4 sm:py-2.5 rounded-2xl bg-tutu-dark/80 border border-tutu-lime/40 flex sm:block items-center justify-between sm:text-right">
            <span className="text-[11px] text-tutu-light/70 block">Saldo Total</span>
            <span className="font-display font-bold text-lg sm:text-2xl text-tutu-lime flex items-center gap-1">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              {formatPoints(participant.points)}
            </span>
          </div>

          <button
            type="button"
            onClick={openEditModal}
            className="min-h-[44px] px-4 py-2.5 rounded-xl btn-tutu-lime text-xs font-bold inline-flex items-center justify-center gap-2 shrink-0"
          >
            <Pencil className="w-4 h-4 shrink-0" />
            <span>Editar perfil</span>
          </button>
        </div>
      </div>

      {/* 2. Seção Meus Dados */}
      <div className="tutu-card p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display font-bold text-lg sm:text-xl text-tutu-light flex items-center gap-2">
            <User className="w-5 h-5 text-tutu-lime shrink-0" />
            <span>Meus Dados</span>
          </h2>
          <button
            type="button"
            onClick={openEditModal}
            className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-tutu-dark/80 hover:bg-tutu-secondary/30 text-tutu-lime border border-tutu-secondary/60 hover:border-tutu-lime/50 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5 shrink-0" />
            <span>Editar dados</span>
          </button>
        </div>

        {!participant.phone && (
          <div className="p-3.5 rounded-xl bg-tutu-secondary/25 border border-tutu-lime/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start gap-2.5 text-tutu-light/90">
              <AlertCircle className="w-4 h-4 text-tutu-lime shrink-0 mt-0.5" />
              <span>
                <strong>Complete seu cadastro:</strong> informe seu telefone/WhatsApp para facilitar o contato durante o evento.
              </span>
            </div>
            <button
              type="button"
              onClick={openEditModal}
              className="min-h-[36px] px-3.5 py-1.5 rounded-xl btn-tutu-lime text-xs font-bold shrink-0"
            >
              Cadastrar telefone
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          <div className="p-4 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-tutu-light/60 font-semibold flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-tutu-lime shrink-0" />
              <span>Nome completo</span>
            </span>
            <p className="text-sm font-semibold text-tutu-light break-words">
              {participant.name}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-tutu-light/60 font-semibold flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-tutu-lime shrink-0" />
              <span>E-mail cadastrado</span>
            </span>
            <p className="text-sm font-semibold text-tutu-light break-all">
              {participant.email}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-tutu-light/60 font-semibold flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-tutu-lime shrink-0" />
              <span>Telefone / WhatsApp</span>
            </span>
            <p
              className={`text-sm font-semibold break-words ${
                participant.phone ? 'text-tutu-light' : 'text-tutu-light/55 italic'
              }`}
            >
              {participant.phone ? formatBrazilianPhone(participant.phone) : 'Não cadastrado'}
            </p>
          </div>
        </div>
      </div>

      {/* 3. Progresso Geral no Evento & 4. Histórico de Missões */}
      <div className="space-y-6">
        {/* Progresso no Evento */}
        <div className="tutu-card p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-tutu-lime">
              Progresso Geral no Evento
            </span>
            <span className="font-display font-bold text-xl text-tutu-lime">
              {eventProgress}%
            </span>
          </div>
          <div className="w-full h-3 bg-tutu-dark rounded-full overflow-hidden p-0.5 border border-tutu-secondary/50">
            <div
              className="h-full bg-tutu-lime rounded-full"
              style={{ width: `${eventProgress}%` }}
            />
          </div>
        </div>

        {/* Histórico de Missões */}
        <div className="tutu-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display font-bold text-lg sm:text-xl text-tutu-light flex items-center gap-2">
              <History className="w-5 h-5 text-tutu-lime shrink-0" />
              <span>Histórico de Missões</span>
            </h2>
            <span className="text-xs text-tutu-light/70">
              {completedMissionsCount} concluídas
            </span>
          </div>

          <div className="space-y-2.5">
            {missions.map((m) => (
              <div
                key={m.id}
                className="p-3.5 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-tutu-light break-words flex items-center gap-1.5">
                    {m.status === 'Concluída' && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-tutu-lime shrink-0" />
                    )}
                    <span>{m.title}</span>
                  </p>
                  <p className="text-[11px] text-tutu-light/70 mt-0.5">
                    {m.startupName} • {m.category}
                  </p>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 pt-1.5 sm:pt-0 border-t sm:border-t-0 border-tutu-secondary/25">
                  <span className="text-xs font-bold text-tutu-lime">+{m.points} pts</span>
                  <MissionStatusBadge status={m.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4.5. Privacidade & Autorização Opcional de Divulgação de Imagem (LGPD) */}
      <div className="tutu-card p-5 sm:p-6 border border-tutu-secondary/40 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-1.5 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-display font-bold text-base text-tutu-light">
                Divulgação Pública de Imagem (LGPD — Opcional)
              </h2>
              <span
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                  participant.imagePublicityConsent
                    ? 'bg-tutu-lime text-tutu-dark'
                    : 'bg-tutu-secondary/35 text-tutu-light/80 border border-tutu-secondary/50'
                }`}
              >
                {participant.imagePublicityConsent ? 'Autorizada' : 'Não autorizada'}
              </span>
            </div>
            <p className="text-xs text-tutu-light/75 leading-relaxed">
              Esta autorização é <strong>totalmente opcional</strong> e refere-se apenas à eventual divulgação institucional de fotos do evento (LGPD, Art. 7º, I). O envio de evidências para validação interna de missões continua funcionando normalmente e permanece privado mesmo sem esta autorização.
            </p>
            {participant.imagePublicityConsentUpdatedAt && (
              <p className="text-[11px] text-tutu-light/55">
                Última decisão registrada em{' '}
                {new Date(participant.imagePublicityConsentUpdatedAt).toLocaleString('pt-BR')}
              </p>
            )}
          </div>

          <button
            type="button"
            disabled={isUpdatingConsent}
            onClick={async () => {
              setIsUpdatingConsent(true);
              await updateImagePublicityConsent(!Boolean(participant.imagePublicityConsent));
              setIsUpdatingConsent(false);
            }}
            className={`min-h-[42px] px-4 py-2 rounded-xl text-xs font-bold shrink-0 self-start disabled:opacity-50 ${
              participant.imagePublicityConsent ? 'btn-tutu-outline' : 'btn-tutu-lime'
            }`}
          >
            {isUpdatingConsent
              ? 'Salvando...'
              : participant.imagePublicityConsent
              ? 'Revogar Autorização'
              : 'Autorizar Divulgação'}
          </button>
        </div>
      </div>

      {/* 5. Sessão da Conta */}
      <div className="tutu-card p-5 sm:p-6 border border-tutu-secondary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-display font-bold text-base text-tutu-light">
            Sessão da Conta
          </h2>
          <p className="text-xs text-tutu-light/70 leading-relaxed">
            Encerre sua sessão atual com segurança neste dispositivo. Seus pontos e progresso permanecem salvos no seu passaporte.
          </p>
        </div>

        <button
          type="button"
          onClick={handleLogoutAccount}
          className="min-h-[44px] w-full sm:w-auto px-4 py-2.5 rounded-xl bg-tutu-dark/80 hover:bg-tutu-secondary/30 text-tutu-light/85 hover:text-tutu-lime border border-tutu-secondary/60 hover:border-tutu-lime/50 text-xs font-semibold inline-flex items-center justify-center gap-2 transition-all shrink-0"
        >
          <LogOut className="w-4 h-4 text-tutu-lime shrink-0" />
          <span>Sair da conta</span>
        </button>
      </div>

      {/* Modal de Edição de Perfil */}
      {isEditModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeEditModal();
          }}
        >
          <div className="tutu-card w-full max-w-lg p-5 sm:p-7 border-2 border-tutu-blue/80 shadow-2xl space-y-5 my-auto">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="edit-profile-modal-title"
                  className="font-display font-bold text-xl text-tutu-light"
                >
                  Editar Perfil
                </h2>
                <p className="text-xs text-tutu-light/70 mt-0.5">
                  Atualize seus dados cadastrais. A alteração de senha é opcional.
                </p>
              </div>
              <button
                type="button"
                onClick={closeEditModal}
                disabled={isSaving}
                className="p-2 rounded-xl text-tutu-light/70 hover:text-tutu-light hover:bg-tutu-secondary/30 transition-colors"
                aria-label="Fechar janela de edição"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-red-500/15 border border-red-400/50 text-xs text-red-100 flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 text-red-300 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label
                  htmlFor="edit-profile-name"
                  className="block text-xs text-tutu-light/85 mb-1.5 font-medium"
                >
                  Nome completo
                </label>
                <input
                  id="edit-profile-name"
                  type="text"
                  required
                  minLength={2}
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Seu nome completo"
                  className="input-tutu text-sm"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label
                  htmlFor="edit-profile-email"
                  className="block text-xs text-tutu-light/85 mb-1.5 font-medium"
                >
                  E-mail
                </label>
                <input
                  id="edit-profile-email"
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="seu.email@exemplo.com"
                  className="input-tutu text-sm"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label
                  htmlFor="edit-profile-phone"
                  className="block text-xs text-tutu-light/85 mb-1.5 font-medium"
                >
                  Telefone / WhatsApp
                </label>
                <input
                  id="edit-profile-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(maskBrazilianPhoneInput(e.target.value))}
                  placeholder="(61) 99999-9999"
                  className="input-tutu text-sm"
                  disabled={isSaving}
                />
              </div>

              <div className="pt-3 border-t border-tutu-secondary/40 space-y-3.5">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-tutu-lime">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>Alterar senha (opcional)</span>
                </div>

                <div>
                  <label
                    htmlFor="edit-profile-current-password"
                    className="block text-xs text-tutu-light/85 mb-1.5 font-medium"
                  >
                    Senha atual
                  </label>
                  <div className="relative">
                    <input
                      id="edit-profile-current-password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      autoComplete="current-password"
                      placeholder="Informe sua senha atual"
                      className="input-tutu text-sm pr-10"
                      disabled={isSaving}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-tutu-light/60 hover:text-tutu-lime"
                      aria-label={showCurrentPassword ? 'Ocultar senha atual' : 'Mostrar senha atual'}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label
                      htmlFor="edit-profile-new-password"
                      className="block text-xs text-tutu-light/85 mb-1.5 font-medium"
                    >
                      Nova senha
                    </label>
                    <div className="relative">
                      <input
                        id="edit-profile-new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="Mínimo 6 caracteres"
                        className="input-tutu text-sm pr-10"
                        disabled={isSaving}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-tutu-light/60 hover:text-tutu-lime"
                        aria-label={showNewPassword ? 'Ocultar nova senha' : 'Mostrar nova senha'}
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="edit-profile-confirm-password"
                      className="block text-xs text-tutu-light/85 mb-1.5 font-medium"
                    >
                      Confirmar nova senha
                    </label>
                    <div className="relative">
                      <input
                        id="edit-profile-confirm-password"
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmNewPassword}
                        onChange={(e) => setConfirmNewPassword(e.target.value)}
                        autoComplete="new-password"
                        placeholder="Repita a nova senha"
                        className="input-tutu text-sm pr-10"
                        disabled={isSaving}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-tutu-light/60 hover:text-tutu-lime"
                        aria-label={
                          showConfirmPassword
                            ? 'Ocultar confirmação de senha'
                            : 'Mostrar confirmação de senha'
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-3 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={isSaving}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-tutu-dark/80 hover:bg-tutu-secondary/30 text-tutu-light/85 border border-tutu-secondary/60 text-xs font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl btn-tutu-lime text-xs font-bold inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  <Save className="w-4 h-4 shrink-0" />
                  <span>{isSaving ? 'Salvando...' : 'Salvar alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
