import React from 'react';
import { Award, CheckCircle2, ChevronRight, Sparkles, Trophy, Zap } from 'lucide-react';
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
          <span className="font-semibold text-tutu-light flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-tutu-lime fill-tutu-lime shrink-0" />
            <span>Pontuação Global</span>
          </span>
          <span className="font-display font-bold text-tutu-lime">
            {formatPoints(currentPoints)}{' '}
            <span className="text-tutu-light/60 font-sans font-normal text-[11px]">/ 1.000</span>
          </span>
        </div>
        <div className="w-full h-2 bg-tutu-dark rounded-full overflow-hidden border border-tutu-secondary/60">
          <div
            className="h-full bg-gradient-to-r from-tutu-blue via-tutu-lime to-tutu-lime rounded-full transition-all duration-700 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`tutu-card p-5 sm:p-6 space-y-4 sm:space-y-5 border-2 ${
        isMaxReached
          ? 'border-tutu-lime bg-tutu-secondary/30 shadow-xl'
          : 'border-tutu-blue/60 bg-tutu-secondary/15'
      } ${className}`}
    >
      {/* Top Banner & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-tutu-dark/80 border border-tutu-lime/40 text-[11px] font-bold uppercase tracking-wider text-tutu-lime">
              <Zap className="w-3 h-3 text-tutu-lime fill-tutu-lime shrink-0" />
              <span>Indicador Global de Pontuação</span>
            </span>
            {isMaxReached && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-tutu-lime text-tutu-dark text-[11px] font-bold">
                <Trophy className="w-3 h-3 shrink-0" />
                <span>Teto Máximo Atingido!</span>
              </span>
            )}
          </div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-tutu-light">
            {isMaxReached
              ? 'Parabéns! Você alcançou os 1.000 pontos'
              : 'Evolução rumo ao teto de 1.000 pontos'}
          </h2>
          <p className="text-xs sm:text-sm text-tutu-light/80 leading-relaxed">
            {isMaxReached
              ? 'Você completou a jornada com a pontuação máxima possível do circuito oficial.'
              : `Você acumulou ${currentPoints.toLocaleString('pt-BR')} pontos de um total possível de 1.000 pontos.`}
          </p>
        </div>

        {/* Counter Badge */}
        <div className="p-3 sm:p-3.5 rounded-2xl bg-tutu-dark/90 border border-tutu-secondary/60 flex items-center justify-between sm:flex-col sm:items-end gap-1.5 shrink-0 self-start sm:self-auto min-w-[140px]">
          <span className="text-[11px] text-tutu-light/65 uppercase tracking-wider font-semibold">
            Progresso Geral
          </span>
          <div className="flex items-baseline gap-1">
            <span className="font-display font-bold text-2xl sm:text-3xl text-tutu-lime">
              {progressPercentage}%
            </span>
          </div>
          <span className="text-[11px] text-tutu-light/75 font-mono">
            <strong>{currentPoints}</strong> / 1.000 pts
          </span>
        </div>
      </div>

      {/* Main Visual Progress Bar */}
      <div className="space-y-2">
        <div className="w-full h-4 sm:h-5 bg-tutu-dark rounded-full overflow-hidden border border-tutu-secondary/70 p-0.5 relative shadow-inner">
          <div
            className="h-full bg-gradient-to-r from-tutu-blue via-tutu-lime to-tutu-lime rounded-full transition-all duration-700 ease-out shadow-sm relative flex items-center justify-end"
            style={{ width: `${Math.max(3, progressPercentage)}%` }}
          >
            {progressPercentage >= 15 && (
              <span className="text-[10px] font-bold text-tutu-dark pr-2 drop-shadow-sm select-none">
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
                      ? 'bg-tutu-lime/10 border-tutu-lime/50 text-tutu-lime'
                      : 'bg-tutu-dark/50 border-tutu-secondary/30 text-tutu-light/50'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1">
                    {reached ? (
                      <CheckCircle2 className="w-3 h-3 text-tutu-lime shrink-0" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-tutu-light/40 shrink-0" />
                    )}
                    <span className="font-display font-bold text-xs sm:text-sm">
                      {m.target} pts
                    </span>
                  </div>
                  <span className="text-[10px] hidden sm:block truncate opacity-80 mt-0.5">
                    {m.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Contextual Info Banner */}
      <div className="p-3 sm:p-4 rounded-xl bg-tutu-dark/60 border border-tutu-secondary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-tutu-lime shrink-0" />
          <span className="text-tutu-light/90 leading-snug">
            {isMaxReached ? (
              <strong className="text-tutu-lime">
                Meta alcançada! Todos os 1.000 pontos do circuito foram conquistados.
              </strong>
            ) : (
              <span>
                Restam <strong className="text-tutu-lime">{remainingPoints} pontos</strong> para
                atingir o limite de 1.000 pontos.
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-[11px] text-tutu-light/70 border-t sm:border-t-0 pt-2 sm:pt-0 border-tutu-secondary/30">
          <span>4 missões • Até 250 pts cada</span>
          <span className="hidden sm:inline">•</span>
          <span className="text-tutu-lime">Velocidade: até +50 pts</span>
        </div>
      </div>
    </div>
  );
};
