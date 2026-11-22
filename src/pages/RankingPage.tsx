import React from 'react';
import {
  AlertCircle,
  Award,
  CheckCircle2,
  Crown,
  Medal,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trophy,
  User,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { formatPoints } from '../utils/formatters';
import { GlobalPointsIndicator } from '../components/GlobalPointsIndicator';

export const RankingPage: React.FC = () => {
  const {
    publicRanking,
    participant,
    eventSettings,
    refreshRanking,
    isRefreshingRanking,
  } = useAppStore();

  const topThree = publicRanking.slice(0, 3);
  const currentUserEntry = publicRanking.find(
    (r) => r.isCurrentUser || r.participantId === participant.id
  );
  const currentRank = currentUserEntry?.position || participant.rankingPosition || 1;
  const isUserInTopThree = currentRank <= 3;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
              Classificação em Tempo Real • Etapa 4
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-tutu-secondary/30 text-tutu-light/80 text-[11px] font-semibold border border-tutu-secondary/40">
              <span className="w-1.5 h-1.5 rounded-full bg-tutu-lime animate-pulse" />
              <span>Ao Vivo</span>
            </span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
            Ranking Geral de Participantes
          </h1>
          <p className="text-xs sm:text-sm text-tutu-light/80 leading-relaxed max-w-3xl">
            Acompanhe a pontuação oficial acumulada com base nas 4 missões e nos bônus de velocidade. Dados pessoais sensíveis são protegidos por privacidade e jamais expostos.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => void refreshRanking()}
            disabled={isRefreshingRanking}
            className="min-h-[40px] px-3.5 py-2 rounded-xl bg-tutu-secondary/30 hover:bg-tutu-secondary/50 border border-tutu-secondary/60 text-xs text-tutu-light font-medium flex items-center gap-2 transition-all disabled:opacity-50"
            title="Sincronizar classificação mais recente do servidor"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 text-tutu-lime ${
                isRefreshingRanking ? 'animate-spin' : ''
              }`}
            />
            <span>{isRefreshingRanking ? 'Atualizando...' : 'Atualizar Ranking'}</span>
          </button>

          <div className="hidden sm:flex px-3 py-2 rounded-xl bg-tutu-secondary/25 border border-tutu-secondary/50 text-xs text-tutu-light/85 items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-tutu-lime shrink-0" />
            <span>Público Protegido</span>
          </div>
        </div>
      </div>

      {/* Indicador Global de Pontuação & Destaque do Participante Logado */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-stretch">
        {/* Card Destaque: Sua Situação no Ranking */}
        <div className="lg:col-span-5 tutu-card p-5 sm:p-6 flex flex-col justify-between space-y-4 border-2 border-tutu-lime/60 bg-tutu-secondary/20 shadow-md">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tutu-lime text-tutu-dark text-xs font-bold uppercase tracking-wider">
                <User className="w-3.5 h-3.5 shrink-0" />
                <span>Sua Classificação</span>
              </span>
              <span className="text-xs text-tutu-light/70 font-mono">
                {participant.completedMissionsCount}/4 missões
              </span>
            </div>

            <div className="flex items-center gap-3.5 pt-1">
              <div className="w-14 h-14 rounded-2xl bg-tutu-blue text-tutu-light font-display font-bold text-xl flex items-center justify-center border-2 border-tutu-lime/50 shrink-0 shadow-sm">
                {participant.avatar || 'VC'}
              </div>
              <div className="min-w-0">
                <span className="text-xs text-tutu-light/60 block">Participante Conectado</span>
                <h2 className="font-display font-bold text-lg sm:text-xl text-tutu-light truncate">
                  {participant.name}
                </h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-display font-bold text-xl sm:text-2xl text-tutu-lime">
                    #{currentRank}º Lugar
                  </span>
                  <span className="text-xs text-tutu-light/50">•</span>
                  <span className="text-xs font-semibold text-tutu-light/80">
                    {formatPoints(participant.points)}
                  </span>
                </div>
              </div>
            </div>

            <p className="text-xs text-tutu-light/80 leading-relaxed pt-1">
              {isUserInTopThree ? (
                <span className="text-tutu-lime font-medium flex items-center gap-1.5">
                  <Crown className="w-4 h-4 shrink-0" />
                  Sensacional! Você está atualmente no Pódio Top 3 do Desafio Global 2026.
                </span>
              ) : (
                <span>
                  Cada bônus de velocidade concede até <strong>50 pontos extras</strong> por missão. Continue avançando para alcançar o Top 3!
                </span>
              )}
            </p>
          </div>

          <div className="pt-3 border-t border-tutu-secondary/40 space-y-2">
            <div className="flex justify-between text-xs text-tutu-light/80">
              <span>Meta: Teto de 1.000 pontos</span>
              <strong className="text-tutu-lime font-mono">
                {Math.round((participant.points / 1000) * 100)}%
              </strong>
            </div>
            <div className="w-full h-2.5 bg-tutu-dark rounded-full overflow-hidden border border-tutu-secondary/60 p-0.5">
              <div
                className="h-full bg-gradient-to-r from-tutu-blue to-tutu-lime rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.min(100, Math.round((participant.points / 1000) * 100))}%` }}
              />
            </div>
          </div>
        </div>

        {/* Indicador Global Completo com Marcadores das 4 Missões */}
        <div className="lg:col-span-7 flex flex-col justify-center">
          <GlobalPointsIndicator variant="card" showMilestones={true} />
        </div>
      </div>

      {/* TOP 3 PODIUM CARDS */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg sm:text-xl text-tutu-light flex items-center gap-2">
            <Trophy className="w-5 h-5 text-tutu-lime shrink-0" />
            <span>Pódio Oficial — Líderes do Desafio</span>
          </h2>
          <span className="text-xs text-tutu-light/70">Top 3 Visitantes</span>
        </div>

        {topThree.length === 0 ? (
          <div className="tutu-card p-8 text-center space-y-3 border border-tutu-secondary/40">
            <Trophy className="w-10 h-10 text-tutu-light/40 mx-auto" />
            <h3 className="font-display font-bold text-lg text-tutu-light">
              Nenhum participante no pódio ainda
            </h3>
            <p className="text-xs sm:text-sm text-tutu-light/70 max-w-md mx-auto">
              Inicie as missões nas startups expositoras para acumular pontos e garantir seu lugar no Top 3!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 items-stretch">
            {topThree.map((entry) => {
              const isFirst = entry.position === 1;
              const isSecond = entry.position === 2;

              return (
                <div
                  key={entry.participantId}
                  className={`tutu-card p-5 sm:p-6 flex flex-col justify-between space-y-5 relative transition-all ${
                    isFirst
                      ? 'border-2 border-tutu-lime bg-tutu-secondary/35 shadow-xl shadow-tutu-lime/5'
                      : isSecond
                      ? 'border-2 border-tutu-blue/90 bg-tutu-secondary/25'
                      : 'border-2 border-amber-500/60 bg-tutu-secondary/20'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                        isFirst
                          ? 'bg-tutu-lime text-tutu-dark shadow-sm'
                          : isSecond
                          ? 'bg-tutu-blue text-tutu-light'
                          : 'bg-amber-600 text-tutu-light'
                      }`}
                    >
                      {isFirst ? (
                        <Crown className="w-3.5 h-3.5 shrink-0" />
                      ) : (
                        <Medal className="w-3.5 h-3.5 shrink-0" />
                      )}
                      <span>
                        {entry.position}º Lugar {isFirst ? '• Líder' : ''}
                      </span>
                    </span>

                    {entry.isCurrentUser && (
                      <span className="px-2.5 py-0.5 rounded-full bg-tutu-lime text-tutu-dark text-xs font-bold shadow-sm">
                        Você
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3.5 min-w-0">
                    <div
                      className={`w-14 h-14 rounded-2xl font-display font-bold text-lg flex items-center justify-center shrink-0 shadow-md ${
                        isFirst
                          ? 'bg-tutu-lime text-tutu-dark border-2 border-tutu-lime/60'
                          : isSecond
                          ? 'bg-tutu-blue text-tutu-light border-2 border-tutu-blue/60'
                          : 'bg-amber-900/60 text-amber-200 border-2 border-amber-500/60'
                      }`}
                    >
                      {entry.avatar}
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-display font-bold text-lg sm:text-xl text-tutu-light truncate">
                        {entry.displayName}
                      </h3>
                      <p className="font-display font-bold text-2xl sm:text-3xl text-tutu-lime mt-0.5">
                        {formatPoints(entry.points)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-3 border-t border-tutu-secondary/40 text-xs">
                    <div className="p-2.5 rounded-xl bg-tutu-dark/70 flex items-center gap-2 border border-tutu-secondary/30">
                      <CheckCircle2 className="w-4 h-4 text-tutu-lime shrink-0" />
                      <span className="truncate">
                        <strong>{entry.completedMissionsCount}</strong> missões
                      </span>
                    </div>
                    <div className="p-2.5 rounded-xl bg-tutu-dark/70 flex items-center gap-2 border border-tutu-secondary/30">
                      <Award className="w-4 h-4 text-tutu-lime shrink-0" />
                      <span className="truncate">
                        <strong>{entry.medalsCount}</strong> medalhas
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Full Leaderboard: Cards on Mobile (<768px) & Table on Tablet/Desktop (>=768px) */}
      <div className="tutu-card overflow-hidden border border-tutu-secondary/40">
        <div className="p-4 sm:p-5 border-b border-tutu-secondary/40 flex flex-wrap items-center justify-between gap-3 bg-tutu-dark/70">
          <div>
            <h2 className="font-display font-bold text-lg sm:text-xl text-tutu-light flex items-center gap-2">
              <Trophy className="w-5 h-5 text-tutu-lime shrink-0" />
              <span>Tabela Geral de Classificação</span>
            </h2>
            <p className="text-xs text-tutu-light/70 mt-0.5">
              Ordenada pela pontuação oficial computada no servidor Express / SQLite
            </p>
          </div>
          <span className="px-3 py-1 rounded-xl bg-tutu-secondary/30 border border-tutu-secondary/50 text-xs text-tutu-light/80 font-mono">
            {publicRanking.length} participante(s) registrado(s)
          </span>
        </div>

        {publicRanking.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <AlertCircle className="w-8 h-8 text-tutu-light/40 mx-auto" />
            <p className="text-sm text-tutu-light/75">
              Nenhum registro de pontuação disponível no momento.
            </p>
          </div>
        ) : (
          <>
            {/* Mobile View: Stacked Cards without horizontal scroll */}
            <div className="md:hidden divide-y divide-tutu-secondary/30">
              {publicRanking.map((row) => (
                <div
                  key={row.participantId}
                  className={`p-4 space-y-3 transition-colors ${
                    row.isCurrentUser
                      ? 'bg-tutu-lime/10 border-l-4 border-l-tutu-lime'
                      : 'hover:bg-tutu-secondary/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-display font-bold text-xs shrink-0 shadow-sm ${
                          row.position === 1
                            ? 'bg-tutu-lime text-tutu-dark'
                            : row.position === 2
                            ? 'bg-tutu-blue text-tutu-light'
                            : row.position === 3
                            ? 'bg-amber-600 text-tutu-light'
                            : 'bg-tutu-dark text-tutu-light border border-tutu-secondary/60'
                        }`}
                      >
                        #{row.position}
                      </span>
                      <div className="w-9 h-9 rounded-xl bg-tutu-secondary text-tutu-light font-display font-bold text-xs flex items-center justify-center shrink-0 border border-tutu-secondary/50">
                        {row.avatar}
                      </div>
                      <div className="min-w-0">
                        <span className="text-sm text-tutu-light font-semibold block truncate">
                          {row.displayName}
                        </span>
                        {row.isCurrentUser && (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-tutu-lime text-tutu-dark text-[10px] font-bold">
                            Você
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="font-display font-bold text-base text-tutu-lime inline-flex items-center gap-1 shrink-0">
                      <Zap className="w-4 h-4 shrink-0 fill-tutu-lime" />
                      {formatPoints(row.points)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-tutu-light/80 pl-11">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-tutu-lime" />
                      {row.completedMissionsCount} missões
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-tutu-dark/70 border border-tutu-secondary/40">
                      <Award className="w-3.5 h-3.5 text-tutu-lime" />
                      {row.medalsCount} medalhas
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Tablet & Desktop View: Clean Professional Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-tutu-secondary/40 text-[11px] uppercase tracking-wider text-tutu-light/70 bg-tutu-dark/70">
                    <th className="py-3.5 px-5">Posição</th>
                    <th className="py-3.5 px-5">Participante</th>
                    <th className="py-3.5 px-5">Missões Concluídas</th>
                    <th className="py-3.5 px-5">Medalhas</th>
                    <th className="py-3.5 px-5 text-right">Pontuação Oficial</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tutu-secondary/30 text-sm">
                  {publicRanking.map((row) => (
                    <tr
                      key={row.participantId}
                      className={`transition-colors ${
                        row.isCurrentUser
                          ? 'bg-tutu-lime/10 border-l-4 border-l-tutu-lime font-semibold'
                          : 'hover:bg-tutu-secondary/15'
                      }`}
                    >
                      <td className="py-3.5 px-5">
                        <span
                          className={`inline-flex items-center justify-center w-8 h-8 rounded-xl font-display font-bold text-xs ${
                            row.position === 1
                              ? 'bg-tutu-lime text-tutu-dark shadow-sm'
                              : row.position === 2
                              ? 'bg-tutu-blue text-tutu-light'
                              : row.position === 3
                              ? 'bg-amber-600 text-tutu-light'
                              : 'bg-tutu-dark text-tutu-light border border-tutu-secondary/50'
                          }`}
                        >
                          #{row.position}
                        </span>
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-tutu-secondary text-tutu-light font-display font-bold text-xs flex items-center justify-center shrink-0 border border-tutu-secondary/50">
                            {row.avatar}
                          </div>
                          <div className="min-w-0">
                            <span className="text-tutu-light font-medium">{row.displayName}</span>
                            {row.isCurrentUser && (
                              <span className="ml-2 px-2 py-0.5 rounded-full bg-tutu-lime text-tutu-dark text-[10px] font-bold">
                                Você
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-tutu-light/85">
                        <span className="inline-flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-tutu-lime" />
                          <span>{row.completedMissionsCount} de 4 missões</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-tutu-light/85">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-tutu-dark/70 text-xs border border-tutu-secondary/40">
                          <Award className="w-3.5 h-3.5 text-tutu-lime" />
                          <span>{row.medalsCount}</span>
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-right font-display font-bold text-base text-tutu-lime">
                        <span className="inline-flex items-center justify-end gap-1.5">
                          <Zap className="w-4 h-4 fill-tutu-lime" />
                          <span>{formatPoints(row.points)}</span>
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Tie-breaker info */}
      <div className="tutu-card p-4 sm:p-5 space-y-2.5 text-xs text-tutu-light/80 border border-tutu-secondary/40">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-tutu-lime shrink-0" />
          <span className="font-bold text-tutu-lime uppercase tracking-wider">
            Regras de Classificação e Desempate Oficial:
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {eventSettings.tieBreakerCriteria.map((crit, idx) => (
            <div
              key={idx}
              className="p-3 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 leading-relaxed"
            >
              <strong className="text-tutu-lime block mb-0.5">{idx + 1}º Critério:</strong>
              {crit}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
