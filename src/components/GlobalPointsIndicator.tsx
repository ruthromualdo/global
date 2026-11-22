import React from 'react';
import { CheckCircle2, Trophy, Zap } from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { formatPoints } from '../utils/formatters';

export interface GlobalPointsIndicatorProps {
  /**
   * Estilo de apresentação:
   * - 'hero': Destaque principal para dashboard com cards de marcos e resumo da dinâmica
   * - 'card': Card visual completo e elegante para páginas de conteúdo
   * - 'compact': Versão enxuta para headers ou barras laterais
   */
  variant?: 'hero' | 'card' | 'compact';
  /**
   * Opcional: sobrescreve pontos para pré-visualização ou simulação
   */
  pointsOverride?: number;
  /**
   * Exibir marcadores das 4 missões (250, 500, 750, 1000 pts)
   */
  showMilestones?: boolean;
  className?: string;
}

const MAX_POINTS = 1000;

export const GlobalPointsIndicator: React.FC<GlobalPointsIndicatorProps> = ({
  variant = 'card',
  pointsOverride,
  showMilestones = true,
  className = '',
}) => {
  const { participant } = useAppStore();

  const currentPoints = Math.min(
    MAX_POINTS,
    Math.max(0, pointsOverride !== undefined ? pointsOverride : participant.points)
  );

  const progressPercentage = Math.min(100, Math.round((currentPoints / MAX_POINTS) * 100));
  const remainingPoints = Math.max(0, MAX_POINTS - currentPoints);
  const isMaxReached = currentPoints >= MAX_POINTS;

  const milestones = [
    { target: 250, label: 'Missão 01', shortLabel: 'M1 (250 pts)' },
    { target: 500, label: 'Missão 02', shortLabel: 'M2 (500 pts)' },
    { target: 750, label: 'Missão 03', shortLabel: 'M3 (750 pts)' },
    { target: 1000, label: 'Missão 04 (Teto)', shortLabel: 'M4 (1.000 pts)' },
  ];

  if (variant === 'compact') {
    return (
      <div className={`space-y-1.5 ${className}`}>
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-[#FFFFFF] flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#C8FFD2] fill-[#C8FFD2] shrink-0" />
            <span>Pontuação Global</span>
          </span>
          <span className="font-display font-bold text-[#C8FFD2]">
            {formatPoints(currentPoints)}{' '}
            <span className="text-[#D0DED4] font-sans font-normal text-[11px]">/ 1.000</span>
          </span>
        </div>
        <div className="w-full h-2 bg-tutu-dark rounded-full overflow-hidden border border-tutu-secondary/60">
          <div
            className="h-full bg-[#C8FFD2] rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`tutu-card p-5 sm:p-6 space-y-4 sm:space-y-5 border ${
        isMaxReached
          ? 'border-[#C8FFD2]/70 bg-tutu-secondary shadow-lg'
          : 'border-tutu-blue/40 bg-tutu-secondary'
      } ${className}`}
    >
      {/* Top Banner & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tutu-dark border border-tutu-blue/50 text-[11px] font-semibold uppercase tracking-wider text-[#DDF8E4]">
              <Zap className="w-3 h-3 text-[#C8FFD2] fill-[#C8FFD2] shrink-0" />
              <span>Indicador Global de Pontuação</span>
            </span>
            {isMaxReached && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#C8FFD2] text-[#071812] text-[11px] font-bold">
                <Trophy className="w-3 h-3 shrink-0" />
                <span>Teto Máximo Atingido!</span>
              </span>
            )}
          </div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-[#FFFFFF]">
            {isMaxReached
              ? 'Parabéns! Você alcançou os 1.000 pontos'
              : 'Acompanhe sua evolução'}
          </h2>
          <p className="text-xs sm:text-sm text-[#D0DED4] leading-relaxed">
            {isMaxReached
              ? 'Você completou a jornada com a pontuação máxima possível do circuito oficial.'
              : `Você acumulou ${currentPoints.toLocaleString('pt-BR')} pontos de um total possível de 1.000 pontos.`}
          </p>
        </div>

        {/* Counter Badge */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-tutu-dark border border-tutu-blue/40 flex items-center justify-between sm:flex-col sm:items-end gap-1.5 shrink-0 self-start sm:self-auto min-w-[140px]">
          <span className="text-[11px] text-[#D0DED4] uppercase tracking-wider font-semibold">
            Progresso Geral
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-display font-bold text-2xl sm:text-3xl text-[#C8FFD2]">
              {progressPercentage}%
            </span>
          </div>
          <span className="text-[11px] text-[#D0DED4] font-mono">
            <strong className="text-[#FFFFFF]">{currentPoints}</strong> / 1.000 pts
          </span>
        </div>
      </div>

      {/* Main Visual Progress Bar */}
      <div className="space-y-2">
        <div className="w-full h-4 sm:h-5 bg-tutu-dark rounded-full overflow-hidden border border-tutu-blue/40 p-0.5 relative shadow-inner">
          <div
            className="h-full bg-[#C8FFD2] rounded-full transition-all duration-700 ease-out shadow-sm relative flex items-center justify-end"
            style={{ width: `${Math.max(3, progressPercentage)}%` }}
          >
            {progressPercentage >= 15 && (
              <span className="text-[10px] font-bold text-[#071812] pr-2 select-none">
                {progressPercentage}%
              </span>
            )}
          </div>
        </div>

        {/* Milestones Markers */}
        {showMilestones && (
          <div className="grid grid-cols-4 gap-1 sm:gap-2 pt-1">
            {milestones.map((m) => {
              const reached = currentPoints >= m.target;
              return (
                <div
                  key={m.target}
                  className={`p-2 rounded-xl text-center border transition-all ${
                    reached
                      ? 'bg-[#C8FFD2]/15 border-[#C8FFD2]/60 text-[#C8FFD2]'
                      : 'bg-tutu-dark/70 border-tutu-blue/30 text-[#D0DED4]/60'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {reached ? (
                      <CheckCircle2 className="w-3 h-3 text-[#C8FFD2] shrink-0" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#D0DED4]/40 shrink-0" />
                    )}
                    <span className="font-display font-bold text-xs sm:text-sm">
                      {m.target} pts
                    </span>
                  </div>
                  <span className="text-[10px] hidden sm:block truncate opacity-80 mt-0.5 text-[#D0DED4]">
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contextual Info Banner */}
      <div className="p-3 sm:p-4 rounded-xl bg-tutu-dark border border-tutu-blue/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Zap className="w-4 h-4 text-[#C8FFD2] shrink-0" />
          <span className="text-[#FFFFFF] leading-snug">
            {isMaxReached ? (
              <strong className="text-[#C8FFD2]">
                Teto oficial de 1.000 pontos atingido com sucesso!
              </strong>
            ) : (
              <>
                Restam <strong className="text-[#DDF8E4]">{remainingPoints} pontos</strong> para
                atingir o limite de 1.000 pontos.
              </>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-[11px] text-[#D0DED4]">
          <span>{milestones.filter((m) => currentPoints >= m.target).length} de 4 marcos</span>
        </div>
      </div>
    </div>
  );
};
