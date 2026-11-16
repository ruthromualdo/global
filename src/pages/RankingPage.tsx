import React from 'react';
import { Award, CheckCircle2, Crown, ShieldCheck, Trophy, Zap } from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { formatPoints } from '../utils/formatters';

export const RankingPage: React.FC = () => {
  const { publicRanking, eventSettings } = useAppStore();

  const topThree = publicRanking.slice(0, 3);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
            Classificação em Tempo Real • Brasil Global Summit 2026
          </span>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-tutu-light">
            Ranking Geral de Participantes
          </h1>
          <p className="text-sm text-tutu-light/80">
            Acompanhe os visitantes mais engajados na Arena BRB Mané Garrincha. Dados pessoais sensíveis (como e-mail e telefone) são protegidos e jamais exibidos.
          </p>
        </div>

        <div className="px-3.5 py-2 rounded-xl bg-tutu-secondary/25 border border-tutu-secondary/50 text-xs text-tutu-light/85 flex items-center gap-2 self-start">
          <ShieldCheck className="w-4 h-4 text-tutu-lime shrink-0" />
          <span>Ranking Público Protegido por Privacidade</span>
        </div>
      </div>

      {/* TOP 3 PODIUM CARDS (Section 5.7) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        {topThree.map((entry) => {
          const isFirst = entry.position === 1;
          return (
            <div
              key={entry.participantId}
              className={`tutu-card p-6 flex flex-col justify-between space-y-5 relative ${
                isFirst
                  ? 'border-2 border-tutu-lime bg-tutu-secondary/30 shadow-xl'
                  : 'border border-tutu-blue/60'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    isFirst
                      ? 'bg-tutu-lime text-tutu-dark'
                      : 'bg-tutu-blue text-tutu-light'
                  }`}
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>{entry.position}º Lugar</span>
                </span>
                {entry.isCurrentUser && (
                  <span className="text-xs font-bold text-tutu-lime">Você</span>
                )}
              </div>

              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl font-display font-bold text-lg flex items-center justify-center shrink-0 ${
                    isFirst
                      ? 'bg-tutu-lime text-tutu-dark'
                      : 'bg-tutu-blue text-tutu-light border border-tutu-lime/40'
                  }`}
                >
                  {entry.avatar}
                </div>
                <div>
                  <h2 className="font-display font-bold text-xl text-tutu-light">
                    {entry.displayName}
                  </h2>
                  <p className="font-display font-bold text-2xl text-tutu-lime mt-0.5">
                    {formatPoints(entry.points)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-3 border-t border-tutu-secondary/40 text-xs">
                <div className="p-2.5 rounded-xl bg-tutu-dark/70 flex items-center gap-2">
                  <Award className="w-4 h-4 text-tutu-lime shrink-0" />
                  <span>
                    <strong>{entry.medalsCount}</strong> medalhas
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-tutu-dark/70 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-tutu-lime shrink-0" />
                  <span>
                    <strong>{entry.completedMissionsCount}</strong> missões
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Public Leaderboard Table */}
      <div className="tutu-card overflow-hidden">
        <div className="p-5 border-b border-tutu-secondary/40 flex items-center justify-between">
          <h2 className="font-display font-bold text-xl text-tutu-light flex items-center gap-2">
            <Trophy className="w-5 h-5 text-tutu-lime" />
            <span>Classificação Geral</span>
          </h2>
          <span className="text-xs text-tutu-light/70">
            {publicRanking.length} participantes listados
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-tutu-secondary/40 text-[11px] uppercase tracking-wider text-tutu-light/70 bg-tutu-dark/60">
                <th className="py-3.5 px-4">Posição</th>
                <th className="py-3.5 px-4">Participante (Nome / Apelido)</th>
                <th className="py-3.5 px-4">Missões Concluídas</th>
                <th className="py-3.5 px-4">Medalhas</th>
                <th className="py-3.5 px-4 text-right">Pontuação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-tutu-secondary/30 text-sm">
              {publicRanking.map((row) => (
                <tr
                  key={row.participantId}
                  className={`transition-colors ${
                    row.isCurrentUser
                      ? 'bg-tutu-blue/25 font-semibold'
                      : 'hover:bg-tutu-secondary/15'
                  }`}
                >
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-display font-bold text-sm ${
                        row.position <= 3
                          ? 'bg-tutu-lime text-tutu-dark'
                          : 'bg-tutu-dark/80 text-tutu-light border border-tutu-secondary/50'
                      }`}
                    >
                      #{row.position}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-tutu-secondary text-tutu-light font-display font-bold text-xs flex items-center justify-center">
                        {row.avatar}
                      </div>
                      <div>
                        <span className="text-tutu-light font-medium">{row.displayName}</span>
                        {row.isCurrentUser && (
                          <span className="ml-2 px-2 py-0.5 rounded-full bg-tutu-lime text-tutu-dark text-[10px] font-bold">
                            Você
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-tutu-light/85">
                    {row.completedMissionsCount} concluídas
                  </td>
                  <td className="py-3.5 px-4 text-tutu-light/85">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-tutu-dark/70 text-xs">
                      <Award className="w-3.5 h-3.5 text-tutu-lime" />
                      {row.medalsCount}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right font-display font-bold text-base text-tutu-lime">
                    <span className="inline-flex items-center justify-end gap-1">
                      <Zap className="w-4 h-4" />
                      {formatPoints(row.points)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Tie-breaker info */}
      <div className="tutu-card p-5 space-y-2 text-xs text-tutu-light/80">
        <p className="font-bold text-tutu-lime uppercase tracking-wider">
          Critérios Oficiais de Desempate:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {eventSettings.tieBreakerCriteria.map((crit, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40"
            >
              {crit}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
