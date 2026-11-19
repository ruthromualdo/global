import React from 'react';
import { Award, CheckCircle2, Lock, Sparkles, Zap } from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { AchievementIcon } from '../components/UI';

export const AchievementsPage: React.FC = () => {
  const { achievements } = useAppStore();

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
            Coleção Oficial de Insígnias
          </span>
          <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
            Medalhas & Conquistas
          </h1>
          <p className="text-xs sm:text-sm text-tutu-light/80 leading-relaxed">
            Cada insígnia representa um marco na sua jornada de exploração pelas startups na Arena BRB Mané Garrincha.
          </p>
        </div>

        <div className="px-4 py-2.5 rounded-xl bg-tutu-secondary/30 border border-tutu-lime/40 flex items-center gap-2.5 self-start shrink-0">
          <Award className="w-5 h-5 text-tutu-lime shrink-0" />
          <span className="font-display font-bold text-sm sm:text-base text-tutu-light">
            {unlockedCount} de {achievements.length} Desbloqueadas
          </span>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
        {achievements.map((ach) => {
          const pct = Math.min(
            100,
            Math.round((ach.progressCurrent / Math.max(1, ach.progressTotal)) * 100)
          );

          return (
            <div
              key={ach.id}
              className={`tutu-card p-5 sm:p-6 flex flex-col justify-between space-y-5 ${
                ach.unlocked
                  ? 'border-2 border-tutu-lime bg-tutu-secondary/25'
                  : 'opacity-85 border border-tutu-secondary/50'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <AchievementIcon iconName={ach.iconName} unlocked={ach.unlocked} />
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shrink-0 ${
                      ach.unlocked
                        ? 'bg-tutu-lime text-tutu-dark'
                        : 'bg-tutu-dark/80 text-tutu-light/70 border border-tutu-secondary/50'
                    }`}
                  >
                    {ach.unlocked ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Desbloqueada</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>Em progresso</span>
                      </>
                    )}
                  </span>
                </div>

                <div>
                  <h2 className="font-display font-bold text-xl sm:text-2xl text-tutu-light">
                    {ach.name}
                  </h2>
                  <p className="text-xs sm:text-sm text-tutu-light/85 mt-1 leading-relaxed">
                    {ach.description}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 space-y-1 text-xs">
                  <span className="text-tutu-lime font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Condição de desbloqueio:</span>
                  </span>
                  <p className="text-tutu-light/85 leading-relaxed">{ach.unlockCondition}</p>
                </div>
              </div>

              <div className="space-y-3 pt-2 border-t border-tutu-secondary/40">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="text-tutu-light/75">
                    Progresso: {ach.progressCurrent}/{ach.progressTotal}
                  </span>
                  <span className="font-bold text-tutu-lime flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 shrink-0" />+{ach.pointsBonus} pts bônus
                  </span>
                </div>
                <div className="w-full h-2.5 bg-tutu-dark rounded-full overflow-hidden">
                  <div
                    className="h-full bg-tutu-lime rounded-full transition-all"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                {ach.unlockedAt && (
                  <p className="text-[11px] text-tutu-lime font-medium">
                    Conquistada em: {ach.unlockedAt}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
