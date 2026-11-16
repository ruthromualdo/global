import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Building2,
  CheckCircle2,
  Clock,
  Compass,
  QrCode,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { CategoryPill, MissionStatusBadge, AchievementIcon } from '../components/UI';
import { formatPoints } from '../utils/formatters';

export const ParticipantDashboard: React.FC = () => {
  const { participant, missions, startups, achievements, completeMissionInstant } = useAppStore();

  const activeMissions = missions.filter((m) => m.active);
  const completedMissions = activeMissions.filter((m) => m.status === 'Concluída');
  const availableMissions = activeMissions.filter(
    (m) => m.status === 'Disponível' || m.status === 'Em andamento'
  );
  const recommendedMission = availableMissions[0] || activeMissions[0];

  const unlockedMedals = achievements.filter((a) => a.unlocked);
  const progressPercentage = Math.round(
    (completedMissions.length / Math.max(1, activeMissions.length)) * 100
  );

  return (
    <div className="space-y-8">
      {/* Greeting + Quick Action Banner */}
      <div className="tutu-card p-6 sm:p-8 border-2 border-tutu-blue/60 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tutu-secondary/40 text-tutu-lime text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Arena BRB Mané Garrincha • Passaporte Ativo</span>
          </div>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-tutu-light">
            Olá, {participant.name.split(' ')[0]}! Pronto(a) para conquistar o Summit?
          </h1>
          <p className="text-sm text-tutu-light/80 max-w-2xl">
            Continue visitando os estandes, escaneando códigos QR e completando missões para subir no Ranking Geral.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Link
            to="/app/escanear"
            className="px-5 py-3 rounded-xl btn-tutu-lime text-sm flex items-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            <span>Escanear QR Code</span>
          </Link>
          <Link
            to="/app/missoes"
            className="px-5 py-3 rounded-xl btn-tutu-primary text-sm flex items-center gap-2"
          >
            <Compass className="w-4 h-4" />
            <span>Central de Missões</span>
          </Link>
        </div>
      </div>

      {/* Key Indicator Cards (Identidade Visual Tutu - Section 5.3) */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="tutu-card p-5 space-y-2 border-t-4 border-t-tutu-lime">
          <div className="flex items-center justify-between text-tutu-light/75 text-xs font-medium">
            <span>Pontuação Acumulada</span>
            <Zap className="w-4 h-4 text-tutu-lime" />
          </div>
          <p className="font-display font-bold text-3xl sm:text-4xl text-tutu-lime">
            {participant.points.toLocaleString('pt-BR')}
          </p>
          <span className="text-[11px] text-tutu-light/70 block">Pontos Tutu validados</span>
        </div>

        <div className="tutu-card p-5 space-y-2">
          <div className="flex items-center justify-between text-tutu-light/75 text-xs font-medium">
            <span>Posição no Ranking</span>
            <Trophy className="w-4 h-4 text-tutu-lime" />
          </div>
          <p className="font-display font-bold text-3xl sm:text-4xl text-tutu-light">
            #{participant.rankingPosition}
          </p>
          <Link to="/app/ranking" className="text-[11px] text-tutu-lime hover:underline block">
            Ver ranking completo →
          </Link>
        </div>

        <div className="tutu-card p-5 space-y-2">
          <div className="flex items-center justify-between text-tutu-light/75 text-xs font-medium">
            <span>Missões Concluídas</span>
            <CheckCircle2 className="w-4 h-4 text-tutu-lime" />
          </div>
          <p className="font-display font-bold text-3xl sm:text-4xl text-tutu-light">
            {completedMissions.length}/{activeMissions.length}
          </p>
          <span className="text-[11px] text-tutu-light/70 block">No circuito de 3 dias</span>
        </div>

        <div className="tutu-card p-5 space-y-2">
          <div className="flex items-center justify-between text-tutu-light/75 text-xs font-medium">
            <span>Startups Visitadas</span>
            <Building2 className="w-4 h-4 text-tutu-lime" />
          </div>
          <p className="font-display font-bold text-3xl sm:text-4xl text-tutu-light">
            {participant.visitedStartupsIds.length}/{startups.filter((s) => s.active).length}
          </p>
          <Link to="/app/startups" className="text-[11px] text-tutu-lime hover:underline block">
            Explorar estandes →
          </Link>
        </div>

        <div className="tutu-card p-5 space-y-2 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between text-tutu-light/75 text-xs font-medium">
            <span>Medalhas Conquistadas</span>
            <Award className="w-4 h-4 text-tutu-lime" />
          </div>
          <p className="font-display font-bold text-3xl sm:text-4xl text-tutu-light">
            {unlockedMedals.length}/{achievements.length}
          </p>
          <Link to="/app/conquistas" className="text-[11px] text-tutu-lime hover:underline block">
            Ver galeria de medalhas →
          </Link>
        </div>
      </div>

      {/* Progress Bar & Recommended Next Mission */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Progress Card */}
        <div className="lg:col-span-5 tutu-card p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-tutu-lime">
                Progresso da Jornada
              </span>
              <span className="font-display font-bold text-xl text-tutu-lime">
                {progressPercentage}%
              </span>
            </div>
            <h2 className="font-display font-bold text-xl text-tutu-light">
              Rumo à Medalha Desbravador
            </h2>
            <p className="text-xs text-tutu-light/75">
              Complete as missões pendentes das startups para liberar a Missão Surpresa de 500 pontos.
            </p>
          </div>

          <div className="space-y-2">
            <div className="w-full h-3.5 bg-tutu-dark rounded-full overflow-hidden border border-tutu-secondary/60 p-0.5">
              <div
                className="h-full bg-tutu-lime rounded-full transition-all duration-500"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-tutu-light/70">
              <span>{completedMissions.length} concluídas</span>
              <span>{activeMissions.length - completedMissions.length} restantes</span>
            </div>
          </div>

          {/* Unlocked Medals Preview */}
          <div className="pt-3 border-t border-tutu-secondary/40 space-y-2.5">
            <span className="text-xs font-semibold text-tutu-light/80 block">
              Últimas Medalhas Desbloqueadas
            </span>
            <div className="flex items-center gap-3">
              {achievements.slice(0, 4).map((ach) => (
                <AchievementIcon key={ach.id} iconName={ach.iconName} unlocked={ach.unlocked} />
              ))}
            </div>
          </div>
        </div>

        {/* Next Recommended Mission */}
        {recommendedMission && (
          <div className="lg:col-span-7 tutu-card p-6 border-2 border-tutu-lime/60 flex flex-col justify-between space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="px-3 py-1 rounded-full bg-tutu-lime text-tutu-dark text-xs font-bold uppercase tracking-wider">
                  Próxima Missão Recomendada
                </span>
                <span className="font-display font-bold text-xl text-tutu-lime">
                  +{formatPoints(recommendedMission.points)}
                </span>
              </div>

              <h2 className="font-display font-bold text-2xl text-tutu-light">
                {recommendedMission.title}
              </h2>
              <p className="text-sm text-tutu-light/85 leading-relaxed">
                {recommendedMission.description}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs text-tutu-light/80">
              <CategoryPill category={recommendedMission.category} />
              <span className="px-2.5 py-1 rounded-lg bg-tutu-dark/70 border border-tutu-secondary/40">
                Startup: <strong>{recommendedMission.startupName}</strong>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-tutu-dark/70 border border-tutu-secondary/40">
                <Clock className="w-3.5 h-3.5 text-tutu-lime" />
                {recommendedMission.estimatedTime}
              </span>
            </div>

            <div className="pt-3 border-t border-tutu-secondary/40 flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-tutu-light/70">
                Critério: {recommendedMission.completionCriteria}
              </span>
              <div className="flex items-center gap-2.5">
                {recommendedMission.qrCodeRequired && (
                  <Link
                    to={`/app/escanear?code=${recommendedMission.qrCodeRequired}`}
                    className="px-4 py-2.5 rounded-xl btn-tutu-lime text-xs flex items-center gap-1.5"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Validar QR ({recommendedMission.qrCodeRequired})</span>
                  </Link>
                )}
                <button
                  onClick={() => completeMissionInstant(recommendedMission.id)}
                  className="px-4 py-2.5 rounded-xl btn-tutu-primary text-xs flex items-center gap-1.5"
                >
                  <span>Simular Conclusão</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Available Missions List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-2xl text-tutu-light">
              Missões Disponíveis no Circuito
            </h2>
            <p className="text-xs text-tutu-light/75">
              Escolha uma missão abaixo para interagir com as startups expositoras
            </p>
          </div>
          <Link
            to="/app/missoes"
            className="text-xs font-bold text-tutu-lime hover:underline flex items-center gap-1"
          >
            <span>Ver todas ({activeMissions.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {availableMissions.slice(0, 3).map((mission) => (
            <div
              key={mission.id}
              className="tutu-card tutu-card-hover p-5 flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <CategoryPill category={mission.category} />
                  <MissionStatusBadge status={mission.status} />
                </div>
                <h3 className="font-display font-bold text-lg text-tutu-light">{mission.title}</h3>
                <p className="text-xs text-tutu-light/80 line-clamp-3 leading-relaxed">
                  {mission.description}
                </p>
              </div>

              <div className="pt-3 border-t border-tutu-secondary/40 flex items-center justify-between">
                <div>
                  <span className="block text-[11px] text-tutu-light/65">{mission.startupName}</span>
                  <span className="font-display font-bold text-sm text-tutu-lime">
                    +{formatPoints(mission.points)}
                  </span>
                </div>
                <Link
                  to="/app/missoes"
                  className="px-3.5 py-2 rounded-xl btn-tutu-primary text-xs flex items-center gap-1"
                >
                  <span>Acessar</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
