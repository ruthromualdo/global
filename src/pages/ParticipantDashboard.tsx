import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Compass,
  QrCode,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { CategoryPill } from '../components/UI';
import { GlobalPointsIndicator } from '../components/GlobalPointsIndicator';
import { formatPoints } from '../utils/formatters';

export const ParticipantDashboard: React.FC = () => {
  const { participant, missions } = useAppStore();

  const activeMissions = missions.filter((m) => m.active);
  const completedMissionsCount = participant.completedMissionsCount;
  const availableMissions = activeMissions.filter(
    (m) => m.status === 'Disponível' || m.status === 'Em andamento'
  );
  const recommendedMission = availableMissions[0] || activeMissions[0];

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Greeting + Quick Action Banner */}
      <div className="tutu-card p-5 sm:p-8 border-2 border-tutu-blue/60 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6">
        <div className="space-y-2 min-w-0">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tutu-secondary/40 text-tutu-lime text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Arena BRB Mané Garrincha </span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
            Olá, {participant.name.split(' ')[0]}! Pronto(a) para conquistar o desafio?
          </h1>
          <p className="text-xs sm:text-sm text-tutu-light/80 max-w-2xl leading-relaxed">
            Visite os estandes, escaneie códigos QR e complete missões para subir no Ranking Geral.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
          <Link
            to="/app/escanear"
            className="min-h-[48px] px-5 py-3 rounded-xl btn-tutu-lime text-sm flex items-center justify-center gap-2"
          >
            <QrCode className="w-4 h-4 shrink-0" />
            <span>Escanear QR Code</span>
          </Link>
          <Link
            to="/app/missoes"
            className="min-h-[48px] px-5 py-3 rounded-xl btn-tutu-primary text-sm flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4 shrink-0" />
            <span>Central de Missões</span>
          </Link>
        </div>
      </div>

      {/* Aviso discreto de complementação cadastral para participantes sem telefone */}
      {!participant.phone && (
        <div className="tutu-card p-4 sm:px-5 border border-tutu-lime/40 bg-tutu-secondary/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <p className="text-tutu-light/90 leading-relaxed">
            <strong className="text-tutu-lime">Complete seu cadastro:</strong> informe seu telefone/WhatsApp no seu perfil para contato durante o evento.
          </p>
          <Link
            to="/app/perfil"
            className="min-h-[38px] px-4 py-2 rounded-xl btn-tutu-lime text-xs font-bold inline-flex items-center justify-center shrink-0"
          >
            Informar telefone
          </Link>
        </div>
      )}

      {/* Indicador Global de Pontuação (Etapa 4) */}
      <GlobalPointsIndicator variant="hero" />

      {/* Key Indicator Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="tutu-card p-4 sm:p-5 space-y-1.5 sm:space-y-2 border-t-4 border-t-tutu-lime">
          <div className="flex items-center justify-between text-tutu-light/75 text-xs font-medium gap-1">
            <span>Pontuação Global</span>
            <Zap className="w-4 h-4 text-tutu-lime shrink-0" />
          </div>
          <p className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-lime">
            {participant.points.toLocaleString('pt-BR')}
          </p>
          <span className="text-[11px] text-tutu-light/70 block">Pontos validados</span>
        </div>

        <div className="tutu-card p-4 sm:p-5 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-tutu-light/75 text-xs font-medium gap-1">
            <span>Classificação no Ranking</span>
            <Trophy className="w-4 h-4 text-tutu-lime shrink-0" />
          </div>
          <p className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
            #{participant.rankingPosition}
          </p>
          <Link to="/app/ranking" className="text-[11px] text-tutu-lime hover:underline block py-0.5">
            Ver ranking →
          </Link>
        </div>

        <div className="tutu-card p-4 sm:p-5 space-y-1.5 sm:space-y-2">
          <div className="flex items-center justify-between text-tutu-light/75 text-xs font-medium gap-1">
            <span>Missões Concluídas</span>
            <CheckCircle2 className="w-4 h-4 text-tutu-lime shrink-0" />
          </div>
          <p className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
            {completedMissionsCount}/{activeMissions.length}
          </p>
          <span className="text-[11px] text-tutu-light/70 block">No circuito de 3 dias</span>
        </div>
      </div>

      {/* Next Recommended Mission */}
      {recommendedMission && (
        <div className="tutu-card p-5 sm:p-7 border border-tutu-lime/60 flex flex-col justify-between space-y-5">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="px-3 py-1 rounded-full bg-tutu-lime text-tutu-dark text-xs font-bold uppercase tracking-wider">
                Próxima Missão Recomendada
              </span>
              <span className="font-display font-bold text-xl text-tutu-lime">
                +{formatPoints(recommendedMission.points)}
              </span>
            </div>

            <h2 className="font-display font-bold text-xl sm:text-2xl text-tutu-light">
              {recommendedMission.title}
            </h2>
            <p className="text-xs sm:text-sm text-tutu-light/85 leading-relaxed">
              {recommendedMission.description}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-tutu-light/80">
            <CategoryPill category={recommendedMission.category} />
            <span className="px-2.5 py-1 rounded-lg bg-tutu-dark/70 border border-tutu-secondary/40">
              Startup: <strong>{recommendedMission.startupName}</strong>
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-tutu-dark/70 border border-tutu-secondary/40">
              <Clock className="w-3.5 h-3.5 text-tutu-lime shrink-0" />
              {recommendedMission.estimatedTime}
            </span>
          </div>

          <div className="pt-3 border-t border-tutu-secondary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-tutu-light/70">
              Critério: {recommendedMission.completionCriteria}
            </span>
            {recommendedMission.qrCodeRequired && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 shrink-0">
                <Link
                  to={`/app/escanear?code=${recommendedMission.qrCodeRequired}`}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl btn-tutu-lime text-xs flex items-center justify-center gap-1.5"
                >
                  <QrCode className="w-4 h-4 shrink-0" />
                  <span>Validar QR ({recommendedMission.qrCodeRequired})</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
