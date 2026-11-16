import React, { useState } from 'react';
import {
  Award,
  CheckCircle2,
  History,
  Save,
  Shield,
  User,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { AchievementIcon, MissionStatusBadge } from '../components/UI';
import { formatPoints, getInitials } from '../utils/formatters';

export const ProfilePage: React.FC = () => {
  const { participant, missions, achievements, updateProfile } = useAppStore();

  const [name, setName] = useState(participant.name);
  const [nickname, setNickname] = useState(participant.nickname);
  const [showNickname, setShowNickname] = useState(
    participant.privacyPreferences.showNicknameInPublicRanking
  );
  const [allowNotifications, setAllowNotifications] = useState(
    participant.privacyPreferences.allowActivityNotifications
  );
  const [shareInterests, setShareInterests] = useState(
    participant.privacyPreferences.shareStartupInterests
  );

  const completedMissions = missions.filter((m) => m.status === 'Concluída');
  const unlockedMedals = achievements.filter((a) => a.unlocked);
  const eventProgress = Math.round(
    (completedMissions.length / Math.max(1, missions.filter((m) => m.active).length)) * 100
  );

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name,
      nickname,
      avatar: getInitials(name),
      privacyPreferences: {
        showNicknameInPublicRanking: showNickname,
        allowActivityNotifications: allowNotifications,
        shareStartupInterests: shareInterests,
      },
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="tutu-card p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-2 border-tutu-blue">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-3xl bg-tutu-lime text-tutu-dark font-display font-bold text-3xl flex items-center justify-center shrink-0 shadow-md">
            {participant.avatar}
          </div>
          <div className="space-y-1">
            <span className="px-2.5 py-0.5 rounded-full bg-tutu-secondary/50 text-tutu-lime text-xs font-bold">
              Passaporte #{participant.id.toUpperCase()}
            </span>
            <h1 className="font-display font-bold text-3xl text-tutu-light">{participant.name}</h1>
            <p className="text-xs text-tutu-light/75">
              Apelido no Ranking: <strong>{participant.nickname}</strong> • Cadastrado em{' '}
              {participant.registeredAt}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="p-4 rounded-2xl bg-tutu-dark/80 border border-tutu-lime/40 text-right">
            <span className="text-xs text-tutu-light/70 block">Saldo Total</span>
            <span className="font-display font-bold text-2xl sm:text-3xl text-tutu-lime flex items-center gap-1">
              <Zap className="w-5 h-5" />
              {formatPoints(participant.points)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Personal Data & Privacy Preferences */}
        <div className="lg:col-span-6 space-y-6">
          <form onSubmit={handleSaveProfile} className="tutu-card p-6 space-y-6">
            <div className="flex items-center gap-2 text-sm font-bold text-tutu-lime uppercase tracking-wider">
              <User className="w-4 h-4" />
              <span>Dados de Exibição & Privacidade</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-tutu-light/80 mb-1.5 font-medium">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-tutu text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-tutu-light/80 mb-1.5 font-medium">
                  Apelido Público (Exibido no Ranking)
                </label>
                <input
                  type="text"
                  required
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="input-tutu text-sm"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-tutu-secondary/40 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-tutu-lime">
                <Shield className="w-4 h-4" />
                <span>Preferências de Privacidade</span>
              </div>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={showNickname}
                  onChange={(e) => setShowNickname(e.target.checked)}
                  className="mt-0.5 accent-tutu-lime w-4 h-4"
                />
                <div>
                  <span className="font-semibold text-tutu-light block">
                    Usar apenas apelido no Ranking Geral
                  </span>
                  <span className="text-tutu-light/70">
                    Protege seu sobrenome na visualização pública da Arena BRB.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={allowNotifications}
                  onChange={(e) => setAllowNotifications(e.target.checked)}
                  className="mt-0.5 accent-tutu-lime w-4 h-4"
                />
                <div>
                  <span className="font-semibold text-tutu-light block">
                    Alertas de Missões Surpresa
                  </span>
                  <span className="text-tutu-light/70">
                    Receber avisos visuais na plataforma quando novas missões relâmpago abrirem.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 p-3 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 cursor-pointer text-xs">
                <input
                  type="checkbox"
                  checked={shareInterests}
                  onChange={(e) => setShareInterests(e.target.checked)}
                  className="mt-0.5 accent-tutu-lime w-4 h-4"
                />
                <div>
                  <span className="font-semibold text-tutu-light block">
                    Conexão com Startups Visitadas
                  </span>
                  <span className="text-tutu-light/70">
                    Autorizar compartilhamento de interesse institucional com as startups escaneadas.
                  </span>
                </div>
              </label>
            </div>

            <button
              type="submit"
              className="w-full py-3 px-4 rounded-xl btn-tutu-lime text-xs flex items-center justify-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Salvar Alterações do Perfil</span>
            </button>
          </form>
        </div>

        {/* Right: Event Progress, Medals & Mission History */}
        <div className="lg:col-span-6 space-y-6">
          {/* Progresso no Evento */}
          <div className="tutu-card p-6 space-y-4">
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

            {/* Medalhas */}
            <div className="pt-3 border-t border-tutu-secondary/40 space-y-2.5">
              <span className="text-xs font-semibold text-tutu-light/85 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-tutu-lime" />
                <span>Medalhas Desbloqueadas ({unlockedMedals.length})</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {unlockedMedals.map((ach) => (
                  <div
                    key={ach.id}
                    className="p-2.5 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 flex items-center gap-3"
                  >
                    <AchievementIcon iconName={ach.iconName} unlocked={true} />
                    <div>
                      <p className="font-display font-bold text-sm text-tutu-light">{ach.name}</p>
                      <p className="text-[11px] text-tutu-lime">+{ach.pointsBonus} pts</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Histórico de Missões */}
          <div className="tutu-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-xl text-tutu-light flex items-center gap-2">
                <History className="w-5 h-5 text-tutu-lime" />
                <span>Histórico de Missões</span>
              </h2>
              <span className="text-xs text-tutu-light/70">
                {completedMissions.length} concluídas
              </span>
            </div>

            <div className="space-y-2.5">
              {missions.map((m) => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-tutu-light truncate flex items-center gap-1.5">
                      {m.status === 'Concluída' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-tutu-lime shrink-0" />
                      )}
                      <span>{m.title}</span>
                    </p>
                    <p className="text-[11px] text-tutu-light/70 mt-0.5">
                      {m.startupName} • {m.category}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-tutu-lime">+{m.points} pts</span>
                    <MissionStatusBadge status={m.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
