import React from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Building2,
  CheckCircle2,
  QrCode,
  TrendingUp,
  Users,
  Zap,
  ArrowRight,
  FolderKanban,
} from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { formatNumber } from '../../utils/formatters';

export const AdminDashboardPage: React.FC = () => {
  const { adminMetrics, startups, missions, qrCodes, validationQueue } = useAppStore();

  const pendingValidations = validationQueue.filter((v) => v.status === 'Pendente').length;

  const kpis = [
    {
      label: 'Participantes Cadastrados',
      value: formatNumber(adminMetrics.registeredParticipants),
      sub: 'Passaportes emitidos',
      icon: Users,
    },
    {
      label: 'Participantes Ativos',
      value: formatNumber(adminMetrics.activeParticipants),
      sub: 'Interagiram nos pavilhões',
      icon: Activity,
    },
    {
      label: 'Missões Concluídas',
      value: formatNumber(adminMetrics.completedMissions),
      sub: `${missions.filter((m) => m.active).length} missões ativas`,
      icon: CheckCircle2,
    },
    {
      label: 'QR Codes Escaneados',
      value: formatNumber(adminMetrics.qrCodesScanned),
      sub: `${qrCodes.filter((q) => q.active).length} totens ativos`,
      icon: QrCode,
    },
    {
      label: 'Startups Cadastradas',
      value: String(startups.length).padStart(2, '0'),
      sub: `${startups.filter((s) => s.active).length} em exibição`,
      icon: Building2,
    },
    {
      label: 'Pontuação Distribuída',
      value: formatNumber(adminMetrics.totalPointsDistributed),
      sub: 'Pontos Tutu creditados',
      icon: Zap,
    },
    {
      label: 'Taxa de Participação',
      value: `${adminMetrics.participationRate}%`,
      sub: 'Conversão visitante → ativo',
      icon: TrendingUp,
      highlight: true,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
            Centro de Comando • Brasil Global Summit 2026
          </span>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-tutu-light">
            Dashboard Administrativo
          </h1>
          <p className="text-sm text-tutu-light/80">
            Monitoramento simulado em tempo real de engajamento, leituras de QR Code e desempenho das startups na Arena BRB.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to="/admin/validacao"
            className="px-4 py-2.5 rounded-xl btn-tutu-lime text-xs flex items-center gap-2"
          >
            <span>Fila de Validação ({pendingValidations} pendentes)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            to="/admin/governanca"
            className="px-4 py-2.5 rounded-xl btn-tutu-primary text-xs flex items-center gap-2"
          >
            <FolderKanban className="w-4 h-4" />
            <span>12 Planos de Governança</span>
          </Link>
        </div>
      </div>

      {/* KPIs Grid (Section 6.1) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className={`tutu-card p-5 space-y-2 ${
                item.highlight ? 'border-2 border-tutu-lime bg-tutu-secondary/25' : ''
              }`}
            >
              <div className="flex items-center justify-between text-xs text-tutu-light/75 font-medium">
                <span>{item.label}</span>
                <Icon className="w-4 h-4 text-tutu-lime" />
              </div>
              <p
                className={`font-display font-bold text-3xl ${
                  item.highlight ? 'text-tutu-lime' : 'text-tutu-light'
                }`}
              >
                {item.value}
              </p>
              <span className="text-[11px] text-tutu-light/65 block">{item.sub}</span>
            </div>
          );
        })}
      </div>

      {/* Demonstrative Engagement Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Daily Evolution Chart */}
        <div className="lg:col-span-6 tutu-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-tutu-lime">
                Gráfico Demonstrativo 01
              </span>
              <h2 className="font-display font-bold text-xl text-tutu-light mt-0.5">
                Evolução Diária de Engajamento (24 a 26/11)
              </h2>
            </div>
          </div>

          <div className="space-y-4">
            {adminMetrics.engagementByDay.map((day) => {
              const scanPct = Math.round((day.scans / 1600) * 100);
              const missionPct = Math.round((day.missions / 1600) * 100);
              return (
                <div
                  key={day.day}
                  className="p-4 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-tutu-light">{day.day}</span>
                    <span className="text-tutu-lime">{day.activeUsers} usuários ativos</span>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-tutu-light/80">
                      <span>QR Codes Escaneados</span>
                      <span className="font-bold">{day.scans}</span>
                    </div>
                    <div className="w-full h-2.5 bg-tutu-dark rounded-full overflow-hidden">
                      <div
                        className="h-full bg-tutu-lime rounded-full"
                        style={{ width: `${scanPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-[11px]">
                    <div className="flex justify-between text-tutu-light/80">
                      <span>Missões Concluídas</span>
                      <span className="font-bold">{day.missions}</span>
                    </div>
                    <div className="w-full h-2.5 bg-tutu-dark rounded-full overflow-hidden">
                      <div
                        className="h-full bg-tutu-blue rounded-full"
                        style={{ width: `${missionPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Startup Engagement Chart */}
        <div className="lg:col-span-6 tutu-card p-6 space-y-5">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-tutu-lime">
              Gráfico Demonstrativo 02
            </span>
            <h2 className="font-display font-bold text-xl text-tutu-light mt-0.5">
              Desempenho por Startup Expositora
            </h2>
          </div>

          <div className="space-y-4">
            {adminMetrics.participationByStartup.map((st) => {
              const pct = Math.min(100, Math.round((st.missionsCompleted / 1500) * 100));
              return (
                <div
                  key={st.startupName}
                  className="p-4 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-display font-bold text-sm text-tutu-light">
                      {st.startupName}
                    </span>
                    <span className="text-tutu-lime font-bold">
                      {formatNumber(st.pointsIssued)} pts emitidos
                    </span>
                  </div>

                  <div className="w-full h-3 bg-tutu-dark rounded-full overflow-hidden p-0.5 border border-tutu-secondary/50">
                    <div
                      className="h-full bg-tutu-lime rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-tutu-light/75">
                    <span>{formatNumber(st.visits)} visitas registradas</span>
                    <span>{formatNumber(st.missionsCompleted)} missões concluídas</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
