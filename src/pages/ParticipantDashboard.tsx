import React from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Compass,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { CategoryPill } from '../components/UI';
import { GlobalPointsIndicator } from '../components/GlobalPointsIndicator';
import { formatPoints } from '../utils/formatters';

export const ParticipantDashboard: React.FC = () => {
  const {
    participant,
    missions,
    publicRanking,
    homologations = [],
    validationQueue = [],
  } = useAppStore();

  const activeMissions = missions.filter((m) => m.active);
  const completedMissionsCount = participant.completedMissionsCount;
  const availableMissions = activeMissions.filter(
    (m) => m.status === 'Disponível' || m.status === 'Em andamento'
  );
  const recommendedMission = availableMissions[0] || activeMissions[0];

  const isAdminUser = String(participant.role || '').toUpperCase() === 'ADMIN';
  const isDisqualifiedUser = participant.status === 'Desclassificado';
  const hasGeneralHomologation = homologations.some(
    (h) => h.scope === 'GERAL' && h.status === 'Homologado'
  );
  const rejectedEvidencesCount = !isAdminUser
    ? validationQueue.filter(
        (v) => v.participantId === participant.id && v.status === 'Rejeitada'
      ).length
    : 0;
  const currentRankingEntry =
    !isAdminUser && !isDisqualifiedUser && participant.id
      ? publicRanking.find((r) => r.isCurrentUser || r.participantId === participant.id)
      : undefined;
  const displayRank = currentRankingEntry
    ? currentRankingEntry.position
    : !isAdminUser && !isDisqualifiedUser && publicRanking.length > 0 && participant.rankingPosition > 0
    ? participant.rankingPosition
    : null;

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
            to="/app/missoes"
            className="min-h-[48px] px-5 py-3 rounded-xl btn-tutu-primary text-sm flex items-center justify-center gap-2"
          >
            <Compass className="w-4 h-4 shrink-0" />
            <span>Central de Missões</span>
          </Link>
        </div>
      </div>

      {/* Aviso de conta desclassificada */}
      {isDisqualifiedUser && (
        <div className="tutu-card p-4 sm:px-5 border-2 border-red-400/60 bg-red-500/15 flex items-start gap-3 text-xs text-red-100">
          <AlertCircle className="w-5 h-5 text-red-300 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <strong className="text-red-200 block text-sm">
              Conta Desclassificada Administrativamente
            </strong>
            <p className="leading-relaxed">
              Sua participação competitiva foi encerrada pela organização. Novas missões e envios de evidência estão bloqueados, mas seu histórico permanece disponível para consulta.
              {participant.disqualificationReason
                ? ` Motivo registrado: ${participant.disqualificationReason}`
                : ''}
            </p>
          </div>
        </div>
      )}

      {/* Aviso de evidência rejeitada / pontos estornados */}
      {!isDisqualifiedUser && rejectedEvidencesCount > 0 && (
        <div className="tutu-card p-4 sm:px-5 border border-amber-400/50 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5 text-amber-100">
            <AlertCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="text-amber-200">
                {rejectedEvidencesCount} evidência(s) rejeitada(s) na conferência administrativa:
              </strong>{' '}
              os pontos correspondentes foram estornados. Consulte o histórico na Central de Missões para ver os detalhes.
            </p>
          </div>
          <Link
            to="/app/missoes"
            className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/50 text-amber-100 font-bold inline-flex items-center justify-center shrink-0"
          >
            Ver detalhes
          </Link>
        </div>
      )}

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
          {isAdminUser ? (
            <>
              <p className="font-display font-bold text-lg sm:text-xl text-tutu-light/80 pt-1">
                Não participante
              </p>
              <span className="text-[11px] text-tutu-light/60 block">
                Contas administrativas não entram no ranking
              </span>
            </>
          ) : isDisqualifiedUser ? (
            <>
              <p className="font-display font-bold text-lg sm:text-xl text-red-300 pt-1">
                Desclassificado
              </p>
              <span className="text-[11px] text-red-200/80 block">
                Conta removida da disputa competitiva
              </span>
            </>
          ) : (
            <>
              <p className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
                {displayRank !== null ? `#${displayRank}` : '—'}
              </p>
              <span className="text-[11px] text-tutu-light/65 block">
                {hasGeneralHomologation
                  ? 'Ranking homologado'
                  : 'Provisório • sujeito à conferência'}
              </span>
            </>
          )}
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
          </div>
        </div>
      )}
    </div>
  );
};
