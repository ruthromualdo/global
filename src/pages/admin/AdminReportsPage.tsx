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
  const { adminMetrics, missions, publicRanking, notify } = useAppStore();

  const handleSimulatedExport = (format: 'CSV' | 'PDF', reportName: string) => {
    notify(
      `Exportação ${format} Preparada (Demonstração)`,
      `Relatório "${reportName}" estruturado para futura integração com API/SQLite.`,
      'info'
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
            Inteligência de Dados • Seção 6.9
          </span>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-tutu-light">
            Relatórios & Exportação
          </h1>
          <p className="text-sm text-tutu-light/80">
            Consulte os relatórios consolidados do evento. Os botões de exportação CSV e PDF estão preparados para a futura integração com backend/SQLite.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => handleSimulatedExport('CSV', 'Consolidado Geral Desafio Global 2026')}
            className="px-4 py-2.5 rounded-xl btn-tutu-lime text-xs flex items-center gap-2"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar CSV (Demonstração)</span>
          </button>
          <button
            onClick={() => handleSimulatedExport('PDF', 'Relatório Executivo Brasil Global Summit')}
            className="px-4 py-2.5 rounded-xl btn-tutu-primary text-xs flex items-center gap-2"
          >
            <FileText className="w-4 h-4" />
            <span>Exportar PDF (Demonstração)</span>
          </button>
        </div>
      </div>

      {/* 1. Participação Geral & Evolução do Engajamento */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="tutu-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl text-tutu-light flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-tutu-lime" />
              <span>1. Participação Geral & Evolução</span>
            </h2>
            <button
              onClick={() => handleSimulatedExport('CSV', 'Participação Geral')}
              className="text-xs text-tutu-lime hover:underline flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40">
              <span className="text-tutu-light/70">Taxa de Ativação</span>
              <p className="font-display font-bold text-2xl text-tutu-lime mt-0.5">
                {adminMetrics.participationRate}%
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40">
              <span className="text-tutu-light/70">Total de Leituras QR</span>
              <p className="font-display font-bold text-2xl text-tutu-light mt-0.5">
                {formatNumber(adminMetrics.qrCodesScanned)}
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {adminMetrics.engagementByDay.map((d) => (
              <div
                key={d.day}
                className="p-3 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/30 flex items-center justify-between text-xs"
              >
                <span className="font-semibold text-tutu-light">{d.day}</span>
                <span className="text-tutu-light/80">
                  {d.scans} leituras • {d.missions} missões •{' '}
                  <strong className="text-tutu-lime">{d.activeUsers} ativos</strong>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. Participação por Startup */}
        <div className="tutu-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl text-tutu-light flex items-center gap-2">
              <Building2 className="w-5 h-5 text-tutu-lime" />
              <span>2. Participação por Startup</span>
            </h2>
            <button
              onClick={() => handleSimulatedExport('PDF', 'Participação por Startup')}
              className="text-xs text-tutu-lime hover:underline flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
          </div>

          <div className="space-y-2.5">
            {adminMetrics.participationByStartup.map((s) => (
              <div
                key={s.startupName}
                className="p-3.5 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 flex items-center justify-between text-xs"
              >
                <div>
                  <p className="font-bold text-sm text-tutu-light">{s.startupName}</p>
                  <p className="text-tutu-light/70">
                    {formatNumber(s.visits)} visitas • {formatNumber(s.missionsCompleted)} missões
                  </p>
                </div>
                <span className="font-display font-bold text-sm text-tutu-lime">
                  {formatNumber(s.pointsIssued)} pts
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Missões Mais Realizadas & 4. Pontuação por Participante */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="tutu-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl text-tutu-light flex items-center gap-2">
              <Compass className="w-5 h-5 text-tutu-lime" />
              <span>3. Missões Mais Realizadas</span>
            </h2>
            <button
              onClick={() => handleSimulatedExport('CSV', 'Missões Mais Realizadas')}
              className="text-xs text-tutu-lime hover:underline flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>

          <div className="space-y-2.5">
            {missions.slice(0, 5).map((m, idx) => (
              <div
                key={m.id}
                className="p-3 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-tutu-lime mr-2">#{idx + 1}</span>
                  <span className="font-semibold text-tutu-light">{m.title}</span>
                  <p className="text-[11px] text-tutu-light/65 mt-0.5">
                    {m.startupName} • Categoria: {m.category}
                  </p>
                </div>
                <span className="font-bold text-tutu-lime">{formatPoints(m.points)}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="tutu-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-bold text-xl text-tutu-light flex items-center gap-2">
              <Users className="w-5 h-5 text-tutu-lime" />
              <span>4. Pontuação por Participante</span>
            </h2>
            <button
              onClick={() => handleSimulatedExport('CSV', 'Pontuação por Participante')}
              className="text-xs text-tutu-lime hover:underline flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>

          <div className="space-y-2.5">
            {publicRanking.slice(0, 5).map((p) => (
              <div
                key={p.participantId}
                className="p-3 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-tutu-lime mr-2">#{p.position}</span>
                  <span className="font-semibold text-tutu-light">{p.displayName}</span>
                  <span className="text-tutu-light/65 ml-2">
                    ({p.completedMissionsCount} missões)
                  </span>
                </div>
                <span className="font-display font-bold text-sm text-tutu-lime">
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
