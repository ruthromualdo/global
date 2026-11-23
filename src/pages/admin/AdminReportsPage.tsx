import React from 'react';
import {
  Download,
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Building2,
  Compass,
  Users,
} from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { formatNumber, formatPoints } from '../../utils/formatters';

export const AdminReportsPage: React.FC = () => {
  const { adminMetrics, publicRanking, notify } = useAppStore();

  const avgDurationLabel =
    adminMetrics.averageCompletionSeconds === null
      ? 'Sem dados'
      : adminMetrics.averageCompletionSeconds >= 60
      ? `${Math.floor(adminMetrics.averageCompletionSeconds / 60)}m ${String(
          adminMetrics.averageCompletionSeconds % 60
        ).padStart(2, '0')}s`
      : `${adminMetrics.averageCompletionSeconds}s`;

  const handleSimulatedExport = (format: 'CSV' | 'PDF', reportName: string) => {
    notify(
      `Exportação ${format} Preparada`,
      `Relatório "${reportName}" processado com os dados atuais do banco SQLite.`,
      'info'
    );
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
            Inteligência de Dados • Seção 6.9
          </span>
          <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
            Relatórios & Exportação
          </h1>
          <p className="text-xs sm:text-sm text-tutu-light/80 leading-relaxed">
            Consulte os relatórios consolidados do evento e acione a exportação em formato CSV ou PDF.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5 shrink-0">
          <button
            onClick={() => handleSimulatedExport('CSV', 'Consolidado Geral Desafio Global 2026')}
            className="min-h-[44px] px-4 py-2.5 rounded-xl btn-tutu-lime text-xs flex items-center justify-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={() => handleSimulatedExport('PDF', 'Relatório Executivo')}
            className="min-h-[44px] px-4 py-2.5 rounded-xl btn-tutu-primary text-xs flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* 1. Participação Geral & 2. Participação por Startup */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <div className="tutu-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display font-bold text-lg sm:text-xl text-tutu-light flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-tutu-lime shrink-0" />
              <span>1. Participação Geral & Evolução</span>
            </h2>
            <button
              onClick={() => handleSimulatedExport('CSV', 'Participação Geral')}
              className="min-h-[36px] px-2.5 py-1 rounded-lg bg-tutu-secondary/25 text-xs text-tutu-lime hover:underline flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5 shrink-0" /> CSV
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40">
              <span className="text-tutu-light/70">Taxa de Ativação Real</span>
              <p className="font-display font-bold text-xl sm:text-2xl text-tutu-lime mt-0.5">
                {adminMetrics.participationRate}%
              </p>
              <span className="text-[11px] text-tutu-light/60">
                {adminMetrics.activeParticipants} ativos / {adminMetrics.inactiveParticipants} sem atividade
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40">
              <span className="text-tutu-light/70">Conclusão & Tempo Médio</span>
              <p className="font-display font-bold text-xl sm:text-2xl text-tutu-light mt-0.5">
                {adminMetrics.missionCompletionRate}% • {avgDurationLabel}
              </p>
              <span className="text-[11px] text-tutu-light/60">
                {adminMetrics.startedMissions} iniciadas • {adminMetrics.expiredMissions} expiradas • Bônus: {formatNumber(adminMetrics.totalSpeedBonusAwarded)} pts
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {adminMetrics.engagementByDay.map((d) => (
              <div
                key={d.day}
                className="p-3 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs"
              >
                <span className="font-semibold text-tutu-light">{d.day}</span>
                <span className="text-tutu-light/80">
                  {d.missionsStarted} iniciadas • {d.missionsCompleted} concluídas • {d.missionsExpired} expiradas ({d.completionRate}%) •{' '}
                  <strong className="text-tutu-lime">
                    {d.activeUsers} ativos • {formatNumber(d.pointsAwarded)} pts
                  </strong>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Participação por Startup */}
        <div className="tutu-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display font-bold text-lg sm:text-xl text-tutu-light flex items-center gap-2">
              <Building2 className="w-5 h-5 text-tutu-lime shrink-0" />
              <span>2. Participação por Startup</span>
            </h2>
            <button
              onClick={() => handleSimulatedExport('PDF', 'Participação por Startup')}
              className="min-h-[36px] px-2.5 py-1 rounded-lg bg-tutu-secondary/25 text-xs text-tutu-lime hover:underline flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5 shrink-0" /> PDF
            </button>
          </div>

          <div className="space-y-2.5">
            {adminMetrics.participationByStartup.map((s) => (
              <div
                key={s.startupName}
                className="p-3.5 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-bold text-sm text-tutu-light break-words">{s.startupName}</p>
                  <p className="text-tutu-light/70">
                    {formatNumber(s.uniqueParticipants)} participantes únicos • {formatNumber(s.missionsStarted)} iniciadas • {formatNumber(s.missionsCompleted)} concluídas • {formatNumber(s.missionsPending)} pendentes ({s.completionRate}%)
                  </p>
                </div>
                <span className="font-display font-bold text-sm text-tutu-lime shrink-0">
                  {formatNumber(s.pointsIssued)} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Missões Mais Realizadas & 4. Pontuação por Participante */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        <div className="tutu-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display font-bold text-lg sm:text-xl text-tutu-light flex items-center gap-2">
              <Compass className="w-5 h-5 text-tutu-lime shrink-0" />
              <span>3. Missões do Circuito</span>
            </h2>
            <button
              onClick={() => handleSimulatedExport('CSV', 'Missões Mais Realizadas')}
              className="min-h-[36px] px-2.5 py-1 rounded-lg bg-tutu-secondary/25 text-xs text-tutu-lime hover:underline flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5 shrink-0" /> CSV
            </button>
          </div>

          <div className="space-y-2.5">
            {adminMetrics.missionPerformance.length === 0 ? (
              <p className="text-xs text-tutu-light/65 italic">
                Nenhuma missão ativa cadastrada para exibição.
              </p>
            ) : (
              adminMetrics.missionPerformance.map((m, idx) => (
                <div
                  key={m.missionId}
                  className="p-3 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0">
                    <span className="font-bold text-tutu-lime mr-2">#{idx + 1}</span>
                    <span className="font-semibold text-tutu-light break-words">{m.title}</span>
                    <p className="text-[11px] text-tutu-light/65 mt-0.5">
                      {m.startupName} • {formatNumber(m.starts)} inícios • {formatNumber(m.completions)} conclusões
                    </p>
                  </div>
                  <span className="font-bold text-tutu-lime shrink-0">
                    {formatNumber(m.completions)} concl.
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="tutu-card p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display font-bold text-lg sm:text-xl text-tutu-light flex items-center gap-2">
              <Users className="w-5 h-5 text-tutu-lime shrink-0" />
              <span>4. Pontuação por Participante</span>
            </h2>
            <button
              onClick={() => handleSimulatedExport('CSV', 'Pontuação por Participante')}
              className="min-h-[36px] px-2.5 py-1 rounded-lg bg-tutu-secondary/25 text-xs text-tutu-lime hover:underline flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5 shrink-0" /> CSV
            </button>
          </div>

          <div className="space-y-2.5">
            {publicRanking.slice(0, 5).map((p) => (
              <div
                key={p.participantId}
                className="p-3 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 flex items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <span className="font-bold text-tutu-lime mr-2">#{p.position}</span>
                  <span className="font-semibold text-tutu-light break-words">{p.displayName}</span>
                  <span className="text-tutu-light/65 ml-1.5">
                    ({p.completedMissionsCount} missões)
                  </span>
                </div>
                <span className="font-display font-bold text-sm text-tutu-lime shrink-0">
                  {formatPoints(p.points)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
