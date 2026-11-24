import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  Crown,
  Eye,
  History,
  Loader2,
  Lock,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { formatPoints } from '../../utils/formatters';

function formatBrasiliaDateTime(ms: number | null): string {
  if (!ms) return '—';
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(ms));
}

function formatIsoBrasilia(iso?: string | null): string {
  if (!iso) return '—';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return formatBrasiliaDateTime(ms);
}

interface HomologationModalTarget {
  scope: 'GERAL' | 'DIARIO';
  eventDate: string | null;
  label: string;
  participantId: string;
  participantName: string;
  points: number;
  position: number;
}

export const AdminRankingPage: React.FC = () => {
  const {
    publicRanking,
    dailyRankings = [],
    homologations = [],
    validationQueue,
    pointsTransactions,
    allParticipants,
    adjustParticipantPointsAdmin,
    homologateWinnerAdmin,
    refreshRanking,
    isRefreshingRanking,
  } = useAppStore();

  const [selectedDailyIdx, setSelectedDailyIdx] = useState(0);
  const selectedDaily = dailyRankings[selectedDailyIdx] || dailyRankings[0] || null;

  const [selectedParticipantId, setSelectedParticipantId] = useState(
    allParticipants[0]?.id || ''
  );

  // Modal de homologação oficial
  const [homologateTarget, setHomologateTarget] = useState<HomologationModalTarget | null>(null);
  const [conferenceChecked, setConferenceChecked] = useState(false);
  const [homologateError, setHomologateError] = useState<string | null>(null);
  const [isSubmittingHomologation, setIsSubmittingHomologation] = useState(false);

  const didInitialSyncRef = useRef(false);
  useEffect(() => {
    if (didInitialSyncRef.current) return;
    didInitialSyncRef.current = true;
    void refreshRanking();
  }, [refreshRanking]);

  useEffect(() => {
    if (allParticipants.length === 0) {
      if (selectedParticipantId !== '') setSelectedParticipantId('');
    } else if (!allParticipants.some((p) => p.id === selectedParticipantId)) {
      setSelectedParticipantId(allParticipants[0].id);
    }
  }, [allParticipants, selectedParticipantId]);

  const [pointsDelta, setPointsDelta] = useState(100);
  const [reason, setReason] = useState('Validação presencial de missão no estande');

  const handleManualAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedParticipantId) return;
    adjustParticipantPointsAdmin(selectedParticipantId, Number(pointsDelta), reason);
  };

  // Homologações ativas e invalidadas (Geral e Diário independentes)
  const activeGeneralHomologation =
    homologations.find((h) => h.scope === 'GERAL' && h.status === 'Homologado') || null;
  const lastInvalidatedGeneral = !activeGeneralHomologation
    ? homologations.find((h) => h.scope === 'GERAL' && h.status === 'Invalidado') || null
    : null;

  const getActiveDailyHomologation = (eventDate: string) =>
    homologations.find(
      (h) => h.scope === 'DIARIO' && h.eventDate === eventDate && h.status === 'Homologado'
    ) || null;

  const getLastInvalidatedDaily = (eventDate: string) => {
    if (getActiveDailyHomologation(eventDate)) return null;
    return (
      homologations.find(
        (h) => h.scope === 'DIARIO' && h.eventDate === eventDate && h.status === 'Invalidado'
      ) || null
    );
  };

  const selectedDailyHomologation = selectedDaily
    ? getActiveDailyHomologation(selectedDaily.eventDate)
    : null;
  const selectedDailyInvalidated = selectedDaily
    ? getLastInvalidatedDaily(selectedDaily.eventDate)
    : null;

  const generalLeader = publicRanking[0] || null;
  const selectedDailyLeader = selectedDaily?.ranking[0] || null;

  const getEvidenceSummaryForParticipant = (participantId: string) => {
    const subs = validationQueue.filter((v) => v.participantId === participantId);
    return {
      total: subs.length,
      approved: subs.filter((v) => v.status === 'Aprovada').length,
      pending: subs.filter((v) => v.status === 'Pendente').length,
      rejected: subs.filter((v) => v.status === 'Rejeitada').length,
    };
  };

  const openHomologationModal = (target: HomologationModalTarget) => {
    setHomologateTarget(target);
    setConferenceChecked(false);
    setHomologateError(null);
  };

  const handleConfirmHomologation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homologateTarget) return;
    if (!conferenceChecked) {
      setHomologateError('Confirme que a conferência das evidências foi concluída antes de homologar.');
      return;
    }

    setIsSubmittingHomologation(true);
    setHomologateError(null);
    const res = await homologateWinnerAdmin({
      scope: homologateTarget.scope,
      eventDate: homologateTarget.eventDate,
      participantId: homologateTarget.participantId,
      conferenceCompleted: conferenceChecked,
    });
    setIsSubmittingHomologation(false);

    if (res.ok) {
      setHomologateTarget(null);
      setConferenceChecked(false);
      setHomologateError(null);
    } else {
      setHomologateError(res.error || 'Não foi possível concluir a homologação.');
    }
  };

  const modalEvidenceSummary = homologateTarget
    ? getEvidenceSummaryForParticipant(homologateTarget.participantId)
    : null;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
              Auditoria de Pontos & Homologação • Seção 6.7
            </span>
            {activeGeneralHomologation ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-tutu-lime text-tutu-dark text-[11px] font-bold uppercase">
                <Crown className="w-3 h-3 shrink-0" />
                <span>Vencedor Geral Homologado</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/40 text-[11px] font-bold uppercase">
                <AlertCircle className="w-3 h-3 shrink-0" />
                <span>Ranking Provisório — Sujeito à Conferência Final</span>
              </span>
            )}
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
            Ranking Administrativo & Homologação
          </h1>
          <p className="text-xs sm:text-sm text-tutu-light/80 leading-relaxed max-w-3xl">
            Confira as evidências do 1º colocado provisório (ou dos próximos colocados em caso de estorno/desclassificação) e homologue oficialmente o vencedor geral e os vencedores diários de forma independente.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refreshRanking()}
          disabled={isRefreshingRanking}
          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-tutu-secondary/30 hover:bg-tutu-secondary/50 border border-tutu-secondary/60 text-xs text-tutu-light font-medium inline-flex items-center gap-2 shrink-0 self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-tutu-lime ${isRefreshingRanking ? 'animate-spin' : ''}`} />
          <span>{isRefreshingRanking ? 'Atualizando...' : 'Atualizar'}</span>
        </button>
      </div>

      {/* Painel de Homologação do Ranking Geral */}
      <div className="tutu-card p-5 sm:p-6 space-y-4 border-2 border-tutu-lime/50">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-widest text-tutu-lime flex items-center gap-1.5">
              <Award className="w-4 h-4 shrink-0" />
              <span>Homologação do Ranking Geral Acumulado</span>
            </span>
            {activeGeneralHomologation ? (
              <>
                <h2 className="font-display font-bold text-xl sm:text-2xl text-tutu-light">
                  VENCEDOR HOMOLOGADO: {activeGeneralHomologation.participantName} (
                  {formatPoints(activeGeneralHomologation.points)})
                </h2>
                <p className="text-xs text-tutu-light/75">
                  Homologado por <strong>{activeGeneralHomologation.homologatedBy}</strong> em{' '}
                  <strong>{formatBrasiliaDateTime(activeGeneralHomologation.homologatedAtMs)}</strong> •
                  Evidências conferidas: {activeGeneralHomologation.evidenceSummary.approved}/
                  {activeGeneralHomologation.evidenceSummary.total} aprovadas.
                </p>
              </>
            ) : generalLeader ? (
              <>
                <h2 className="font-display font-bold text-xl sm:text-2xl text-tutu-light">
                  1º Colocado Provisório: {generalLeader.displayName} (
                  {formatPoints(generalLeader.points)})
                </h2>
                <p className="text-xs text-tutu-light/75">
                  {(() => {
                    const sum = getEvidenceSummaryForParticipant(generalLeader.participantId);
                    return `Evidências do 1º colocado: ${sum.approved} aprovada(s), ${sum.pending} pendente(s), ${sum.rejected} rejeitada(s). Confira antes de homologar.`;
                  })()}
                </p>
              </>
            ) : (
              <p className="text-xs text-tutu-light/70 italic">
                Nenhum participante elegível no Ranking Geral até o momento.
              </p>
            )}
          </div>

          {generalLeader && (
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                to={`/admin/validacao?participant=${generalLeader.participantId}`}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-tutu-dark hover:bg-tutu-secondary/40 border border-tutu-lime/40 text-tutu-lime text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Eye className="w-4 h-4 shrink-0" />
                <span>Conferir Evidências</span>
              </Link>

              <button
                type="button"
                onClick={() =>
                  openHomologationModal({
                    scope: 'GERAL',
                    eventDate: null,
                    label: 'Ranking Geral Acumulado',
                    participantId: generalLeader.participantId,
                    participantName: generalLeader.displayName,
                    points: generalLeader.points,
                    position: generalLeader.position,
                  })
                }
                className="min-h-[42px] px-4 py-2 rounded-xl btn-tutu-lime text-xs font-bold inline-flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>HOMOLOGAR VENCEDOR</span>
              </button>
            </div>
          )}
        </div>

        {lastInvalidatedGeneral && (
          <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-400/50 text-xs text-amber-100 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <strong className="text-amber-200 block">
                Homologação anterior invalidada — nova conferência necessária
              </strong>
              <p>
                A homologação de <strong>{lastInvalidatedGeneral.participantName}</strong> (
                {formatPoints(lastInvalidatedGeneral.points)}, feita em{' '}
                {formatBrasiliaDateTime(lastInvalidatedGeneral.homologatedAtMs)}) foi invalidada em{' '}
                {formatIsoBrasilia(lastInvalidatedGeneral.invalidatedAt)}.
                {lastInvalidatedGeneral.invalidatedReason
                  ? ` Motivo: ${lastInvalidatedGeneral.invalidatedReason}.`
                  : ''}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Premiação Diária Provisória e Homologação Diária Independente */}
      {dailyRankings.length > 0 && selectedDaily && (
        <div className="tutu-card p-5 sm:p-6 space-y-5 border border-tutu-lime/40">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 shrink-0" />
                <span>Premiação Diária • Homologação Independente por Dia</span>
              </span>
              <h2 className="font-display font-bold text-xl text-tutu-light mt-0.5">
                Classificação Diária Provisória & Conferência
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              {dailyRankings.map((day, idx) => (
                <button
                  key={day.eventDate}
                  type="button"
                  onClick={() => setSelectedDailyIdx(idx)}
                  className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                    idx === selectedDailyIdx
                      ? 'bg-tutu-lime text-tutu-dark'
                      : 'bg-tutu-dark/80 text-tutu-light/80 border border-tutu-secondary/50'
                  }`}
                >
                  {day.dayLabel}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
            {dailyRankings.map((day) => {
              const dayHom = getActiveDailyHomologation(day.eventDate);
              return (
                <div
                  key={day.eventDate}
                  className="p-4 rounded-xl bg-tutu-dark/75 border border-tutu-secondary/40 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-tutu-light">{day.dayLabel}</span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        dayHom
                          ? 'bg-tutu-lime text-tutu-dark'
                          : day.status === 'Encerrado'
                          ? 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                          : 'bg-tutu-secondary text-tutu-lime'
                      }`}
                    >
                      {dayHom ? (
                        <Crown className="w-3 h-3" />
                      ) : day.status === 'Encerrado' ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        <Clock className="w-3 h-3" />
                      )}
                      {dayHom ? 'Homologado' : day.status === 'Encerrado' ? 'Em conferência' : 'Provisório'}
                    </span>
                  </div>
                  <p className="text-[11px] text-tutu-light/65">
                    Fechamento: {day.scheduledCloseLabel}
                  </p>
                  <div className="pt-1 border-t border-tutu-secondary/30">
                    {dayHom ? (
                      <p className="font-bold text-tutu-lime flex items-center gap-1.5">
                        <Crown className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          Homologado: {dayHom.participantName} • {formatPoints(dayHom.points)}
                        </span>
                      </p>
                    ) : day.ranking[0] ? (
                      <p className="text-amber-200 font-semibold truncate">
                        1º Provisório: {day.ranking[0].displayName} •{' '}
                        {formatPoints(day.ranking[0].dailyPoints)}
                      </p>
                    ) : (
                      <p className="text-tutu-light/60 italic">Sem pontuação registrada no dia</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Barra de homologação do dia selecionado */}
          <div className="p-4 rounded-xl bg-tutu-dark/80 border border-tutu-secondary/50 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
            <div className="space-y-1 min-w-0">
              {selectedDailyHomologation ? (
                <>
                  <span className="text-[11px] font-bold uppercase text-tutu-lime block">
                    VENCEDOR HOMOLOGADO — {selectedDaily.dayLabel}
                  </span>
                  <p className="text-sm font-bold text-tutu-light">
                    {selectedDailyHomologation.participantName} •{' '}
                    {formatPoints(selectedDailyHomologation.points)}
                  </p>
                  <p className="text-[11px] text-tutu-light/70">
                    Responsável: <strong>{selectedDailyHomologation.homologatedBy}</strong> em{' '}
                    {formatBrasiliaDateTime(selectedDailyHomologation.homologatedAtMs)}
                  </p>
                </>
              ) : (
                <>
                  <span className="text-[11px] font-bold uppercase text-amber-200 block">
                    RANKING DIÁRIO PROVISÓRIO — SUJEITO À CONFERÊNCIA FINAL ({selectedDaily.dayLabel})
                  </span>
                  {selectedDailyLeader ? (
                    <p className="text-tutu-light/85">
                      1º Colocado Provisório: <strong>{selectedDailyLeader.displayName}</strong> (
                      {formatPoints(selectedDailyLeader.dailyPoints)}). Confira as evidências antes de homologar.
                    </p>
                  ) : (
                    <p className="text-tutu-light/65 italic">
                      Nenhum participante pontuou neste dia até o momento.
                    </p>
                  )}
                </>
              )}
            </div>

            {selectedDailyLeader && (
              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <Link
                  to={`/admin/validacao?participant=${selectedDailyLeader.participantId}`}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-tutu-secondary/30 hover:bg-tutu-secondary/50 border border-tutu-lime/40 text-tutu-lime font-bold inline-flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 shrink-0" />
                  <span>Conferir Evidências</span>
                </Link>
                <button
                  type="button"
                  onClick={() =>
                    openHomologationModal({
                      scope: 'DIARIO',
                      eventDate: selectedDaily.eventDate,
                      label: `Ranking Diário (${selectedDaily.dayLabel})`,
                      participantId: selectedDailyLeader.participantId,
                      participantName: selectedDailyLeader.displayName,
                      points: selectedDailyLeader.dailyPoints,
                      position: selectedDailyLeader.position,
                    })
                  }
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl btn-tutu-lime font-bold inline-flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span>HOMOLOGAR VENCEDOR DO DIA</span>
                </button>
              </div>
            )}
          </div>

          {selectedDailyInvalidated && (
            <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/45 text-xs text-amber-100 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <span>
                Homologação diária anterior de{' '}
                <strong>{selectedDailyInvalidated.participantName}</strong> invalidada em{' '}
                {formatIsoBrasilia(selectedDailyInvalidated.invalidatedAt)}
                {selectedDailyInvalidated.invalidatedReason
                  ? ` (${selectedDailyInvalidated.invalidatedReason})`
                  : ''}
                . Realize nova conferência antes de homologar novamente.
              </span>
            </div>
          )}

          {/* Lista do dia selecionado */}
          <div className="space-y-2.5">
            {selectedDaily.ranking.length === 0 ? (
              <p className="text-xs text-tutu-light/65 italic">
                Nenhum participante pontuou neste dia até o momento.
              </p>
            ) : (
              <div className="space-y-2">
                {selectedDaily.ranking.map((row) => (
                  <div
                    key={row.participantId}
                    className="p-3 rounded-xl bg-tutu-dark/75 border border-tutu-secondary/40 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-tutu-secondary text-tutu-lime font-display font-bold flex items-center justify-center shrink-0">
                        #{row.position}
                      </span>
                      <div className="min-w-0">
                        <p className="font-bold text-tutu-light truncate">{row.displayName}</p>
                        <p className="text-[11px] text-tutu-light/65">
                          Última conclusão: {formatBrasiliaDateTime(row.lastMissionCompletedAtMs)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Link
                        to={`/admin/validacao?participant=${row.participantId}`}
                        className="px-2.5 py-1 rounded-lg bg-tutu-secondary/30 border border-tutu-lime/35 text-tutu-lime hover:bg-tutu-lime/10 text-[11px] font-semibold inline-flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Evidências</span>
                      </Link>
                      <span className="font-display font-bold text-sm text-tutu-lime">
                        {formatPoints(row.dailyPoints)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Ranking Geral Provisório */}
        <div className="lg:col-span-7 space-y-5">
          <div className="tutu-card p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display font-bold text-lg sm:text-xl text-tutu-light flex items-center gap-2">
                <Trophy className="w-5 h-5 text-tutu-lime shrink-0" />
                <span>Classificação Geral {activeGeneralHomologation ? '(Homologada)' : '(Provisória)'}</span>
              </h2>
              <span className="text-xs text-tutu-light/70 font-mono">
                {publicRanking.length} elegível(is)
              </span>
            </div>

            {publicRanking.length === 0 ? (
              <p className="text-xs text-tutu-light/65 italic py-2">
                Nenhum participante elegível no ranking no momento.
              </p>
            ) : (
              <div className="space-y-2.5">
                {publicRanking.map((row) => (
                  <div
                    key={row.participantId}
                    className="p-3.5 rounded-xl bg-tutu-dark/75 border border-tutu-secondary/40 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`w-7 h-7 rounded-lg font-display font-bold text-xs flex items-center justify-center shrink-0 ${
                          row.position <= 3
                            ? 'bg-tutu-lime text-tutu-dark'
                            : 'bg-tutu-secondary/40 text-tutu-light'
                        }`}
                      >
                        #{row.position}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-tutu-light truncate">{row.displayName}</p>
                        <p className="text-[11px] text-tutu-light/70">
                          {row.completedMissionsCount} missões concluídas
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Link
                        to={`/admin/validacao?participant=${row.participantId}`}
                        className="px-2.5 py-1.5 rounded-lg bg-tutu-secondary/30 border border-tutu-lime/35 text-tutu-lime hover:bg-tutu-lime/10 text-[11px] font-semibold inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Conferir Evidências</span>
                      </Link>
                      <span className="font-display font-bold text-sm sm:text-base text-tutu-lime flex items-center gap-1">
                        <Zap className="w-4 h-4 shrink-0" />
                        {formatPoints(row.points)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Histórico Auditável de Homologações */}
          <div className="tutu-card p-5 sm:p-6 space-y-4">
            <h2 className="font-display font-bold text-lg text-tutu-light flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-tutu-lime shrink-0" />
              <span>Histórico Auditável de Homologações</span>
            </h2>
            {homologations.length === 0 ? (
              <p className="text-xs text-tutu-light/65 italic">
                Nenhuma homologação registrada até o momento.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1 text-xs">
                {homologations.map((h) => (
                  <div
                    key={h.id}
                    className="p-3.5 rounded-xl bg-tutu-dark/75 border border-tutu-secondary/40 space-y-1"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-tutu-light">
                        {h.scope === 'GERAL' ? 'Ranking Geral' : `Diário (${h.eventDate})`} —{' '}
                        {h.participantName} ({formatPoints(h.points)})
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          h.status === 'Homologado'
                            ? 'bg-tutu-lime text-tutu-dark'
                            : 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                        }`}
                      >
                        {h.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-tutu-light/70">
                      Homologado por <strong>{h.homologatedBy}</strong> em{' '}
                      {formatBrasiliaDateTime(h.homologatedAtMs)} • Evidências:{' '}
                      {h.evidenceSummary.approved}/{h.evidenceSummary.total} aprovadas
                    </p>
                    {h.status === 'Invalidado' && (
                      <p className="text-[11px] text-amber-200">
                        Invalidada em {formatIsoBrasilia(h.invalidatedAt)}
                        {h.invalidatedReason ? ` — ${h.invalidatedReason}` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Manual Adjustment Form & Audit Log */}
        <div className="lg:col-span-5 space-y-5 sm:space-y-6">
          <form onSubmit={handleManualAdjustment} className="tutu-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-tutu-lime">
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Registrar Lançamento no Histórico</span>
            </div>

            <div>
              <label
                htmlFor="admin-adjust-participant"
                className="block text-xs text-tutu-light/80 mb-1"
              >
                Participante
              </label>
              <select
                id="admin-adjust-participant"
                value={selectedParticipantId}
                onChange={(e) => setSelectedParticipantId(e.target.value)}
                className="input-tutu text-xs"
              >
                {allParticipants.length === 0 ? (
                  <option value="">Nenhum participante cadastrado</option>
                ) : (
                  allParticipants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({formatPoints(p.points)}){p.status === 'Desclassificado' ? ' [Desclassificado]' : ''}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="admin-adjust-points"
                  className="block text-xs text-tutu-light/80 mb-1"
                >
                  Pontos (+/-)
                </label>
                <input
                  id="admin-adjust-points"
                  type="number"
                  step={10}
                  required
                  value={pointsDelta}
                  onChange={(e) => setPointsDelta(Number(e.target.value))}
                  className="input-tutu text-xs"
                />
              </div>
              <div>
                <label
                  htmlFor="admin-adjust-reason"
                  className="block text-xs text-tutu-light/80 mb-1"
                >
                  Justificativa
                </label>
                <input
                  id="admin-adjust-reason"
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input-tutu text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={!selectedParticipantId}
              className="min-h-[44px] w-full py-2.5 rounded-xl btn-tutu-lime text-xs disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Registrar Transação
            </button>
          </form>

          {/* Points Transactions History (com sinal correto para estornos e créditos) */}
          <div className="tutu-card p-5 sm:p-6 space-y-4">
            <h2 className="font-display font-bold text-lg text-tutu-light flex items-center gap-2">
              <History className="w-5 h-5 text-tutu-lime shrink-0" />
              <span>Histórico Financeiro de Pontos</span>
            </h2>

            {pointsTransactions.length === 0 ? (
              <p className="text-xs text-tutu-light/65 italic">
                Nenhuma transação de pontuação registrada até o momento.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {pointsTransactions.map((tx) => {
                  const isNegative = tx.pointsDelta < 0;
                  const formattedDelta = isNegative
                    ? `${tx.pointsDelta} pts`
                    : `+${tx.pointsDelta} pts`;

                  return (
                    <div
                      key={tx.id}
                      className="p-3 rounded-xl bg-tutu-dark/75 border border-tutu-secondary/40 text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-tutu-light truncate">
                          {tx.participantName}
                        </span>
                        <span
                          className={`font-bold shrink-0 ${
                            isNegative ? 'text-red-300' : 'text-tutu-lime'
                          }`}
                        >
                          {formattedDelta}
                        </span>
                      </div>
                      <p className="text-tutu-light/80 break-words">
                        [{tx.sourceType}] {tx.sourceTitle}
                      </p>
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-tutu-light/60">
                        <span>
                          Saldo: {tx.previousBalance} → {tx.newBalance} pts
                        </span>
                        <span>{tx.createdAt}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Confirmação de Homologação Oficial */}
      {homologateTarget && modalEvidenceSummary && (
        <div className="fixed inset-0 z-50 bg-tutu-dark/90 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={(e) => void handleConfirmHomologation(e)}
            className="tutu-card max-w-lg w-full p-5 sm:p-6 space-y-4 border-2 border-tutu-lime"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-tutu-lime block">
                  Confirmação de Homologação Oficial
                </span>
                <h3 className="font-display font-bold text-lg text-tutu-light">
                  {homologateTarget.label}
                </h3>
              </div>
              <button
                type="button"
                disabled={isSubmittingHomologation}
                onClick={() => setHomologateTarget(null)}
                className="p-2 rounded-lg bg-tutu-secondary/30 text-tutu-light hover:text-tutu-lime disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-tutu-dark/80 border border-tutu-secondary/50 space-y-2 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-tutu-light/70">Participante:</span>
                <strong className="text-tutu-light">{homologateTarget.participantName}</strong>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-tutu-light/70">Posição no ranking:</span>
                <strong className="text-tutu-lime">#{homologateTarget.position}º Lugar</strong>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-tutu-light/70">Pontuação final:</span>
                <strong className="text-tutu-lime">{formatPoints(homologateTarget.points)}</strong>
              </div>
              <div className="pt-2 border-t border-tutu-secondary/40 flex flex-wrap gap-2">
                <span className="px-2 py-0.5 rounded bg-tutu-lime/15 text-tutu-lime font-semibold">
                  {modalEvidenceSummary.approved} aprovada(s)
                </span>
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-200 font-semibold">
                  {modalEvidenceSummary.pending} pendente(s)
                </span>
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-200 font-semibold">
                  {modalEvidenceSummary.rejected} rejeitada(s)
                </span>
              </div>
            </div>

            {modalEvidenceSummary.pending > 0 && (
              <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-400/45 text-xs text-amber-100 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                <span>
                  Atenção: existem {modalEvidenceSummary.pending} evidência(s) ainda pendente(s) de conferência para este participante. Recomendamos conferi-las antes de homologar.
                </span>
              </div>
            )}

            <label className="flex items-start gap-2.5 text-xs text-tutu-light/90 cursor-pointer p-3 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40">
              <input
                type="checkbox"
                checked={conferenceChecked}
                onChange={(e) => setConferenceChecked(e.target.checked)}
                className="mt-0.5 accent-[#C8FFD2]"
              />
              <span>
                Declaro que a conferência das evidências foi concluída e confirmo a homologação oficial deste vencedor (registrada com meu usuário e data/hora).
              </span>
            </label>

            {homologateError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-400/40 text-xs text-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-300" />
                <span>{homologateError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSubmittingHomologation}
                onClick={() => setHomologateTarget(null)}
                className="min-h-[40px] px-4 py-2 rounded-xl btn-tutu-outline text-xs disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmittingHomologation || !conferenceChecked}
                className="min-h-[40px] px-4 py-2 rounded-xl btn-tutu-lime text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingHomologation ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Confirmar Homologação</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
