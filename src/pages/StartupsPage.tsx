import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Compass,
  MapPin,
  Sparkles,
  Zap,
  X,
} from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { Startup } from '../types';
import { StartupAvatarBadge } from '../assets/logos';
import { CategoryPill, MissionStatusBadge } from '../components/UI';
import { formatPoints } from '../utils/formatters';

export const StartupsPage: React.FC = () => {
  const { startups, missions, participant } = useAppStore();
  const [selectedStartup, setSelectedStartup] = useState<Startup | null>(null);

  const activeStartups = startups.filter((s) => s.active);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
          Circuito Oficial de Inovação
        </span>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-tutu-light">
          Startups Expositoras
        </h1>
        <p className="text-sm text-tutu-light/80 max-w-3xl">
          Conheça as startups participantes do Desafio Global Summit 2026, explore suas soluções tecnológicas e veja as missões vinculadas a cada estande.
        </p>
      </div>

      {/* Startups Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {activeStartups.map((st) => {
          const relatedMissions = missions.filter((m) => m.startupId === st.id && m.active);
          const isVisited = participant.visitedStartupsIds.includes(st.id);

          return (
            <div
              key={st.id}
              className="tutu-card tutu-card-hover p-6 sm:p-7 flex flex-col justify-between space-y-6"
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <StartupAvatarBadge
                      logoText={st.logoText}
                      isGuest={st.isConfigurableGuest}
                    />
                    <div>
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-tutu-secondary/40 text-tutu-lime text-xs font-semibold">
                        {st.category}
                      </span>
                      <h2 className="font-display font-bold text-2xl text-tutu-light mt-1">
                        {st.name}
                      </h2>
                      <p className="text-xs text-tutu-light/70 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-tutu-lime" />
                        <span>{st.boothNumber}</span>
                      </p>
                    </div>
                  </div>

                  {isVisited && (
                    <span className="px-2.5 py-1 rounded-full bg-tutu-lime text-tutu-dark text-[11px] font-bold flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Visitada</span>
                    </span>
                  )}
                </div>

                <p className="text-sm text-tutu-light/85 leading-relaxed">{st.description}</p>

                {/* Apresentação da Solução */}
                <div className="p-4 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-tutu-lime flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Apresentação da Solução</span>
                  </span>
                  <p className="text-xs text-tutu-light/85 leading-relaxed">
                    {st.solutionPresentation}
                  </p>
                </div>

                {/* Missões Relacionadas */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-tutu-light/85 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-tutu-lime" />
                      <span>Missões Relacionadas ({relatedMissions.length})</span>
                    </span>
                    <span className="font-bold text-tutu-lime flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" />
                      {formatPoints(st.availablePoints)} disponíveis
                    </span>
                  </div>

                  <div className="space-y-2">
                    {relatedMissions.map((m) => (
                      <div
                        key={m.id}
                        className="p-2.5 rounded-xl bg-tutu-secondary/20 border border-tutu-secondary/40 flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <CategoryPill category={m.category} />
                          <span className="truncate text-tutu-light font-medium">{m.title}</span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-tutu-lime font-bold">+{m.points}</span>
                          <MissionStatusBadge status={m.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-tutu-secondary/40 flex items-center justify-between gap-3">
                <span className="text-xs text-tutu-light/70 italic line-clamp-1">
                  "{st.tagline}"
                </span>
                <button
                  onClick={() => setSelectedStartup(st)}
                  className="px-4 py-2.5 rounded-xl btn-tutu-primary text-xs flex items-center gap-1.5 shrink-0"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Conhecer startup</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Startup Detail Modal */}
      {selectedStartup && (
        <div className="fixed inset-0 z-50 bg-tutu-dark/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="tutu-card max-w-2xl w-full p-6 sm:p-8 space-y-6 border-2 border-tutu-blue">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <StartupAvatarBadge
                  logoText={selectedStartup.logoText}
                  isGuest={selectedStartup.isConfigurableGuest}
                />
                <div>
                  <span className="text-xs font-bold text-tutu-lime uppercase tracking-wider">
                    {selectedStartup.category}
                  </span>
                  <h2 className="font-display font-bold text-2xl sm:text-3xl text-tutu-light">
                    {selectedStartup.name}
                  </h2>
                  <p className="text-xs text-tutu-light/75">{selectedStartup.boothNumber}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStartup(null)}
                className="p-2 rounded-xl bg-tutu-secondary/30 text-tutu-light hover:text-tutu-lime"
                aria-label="Fechar detalhes da startup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm text-tutu-light/90 leading-relaxed">
              <p>{selectedStartup.description}</p>
              <div className="p-4 rounded-xl bg-tutu-dark/80 border border-tutu-secondary/50 space-y-1.5">
                <p className="text-xs font-bold uppercase text-tutu-lime">
                  O que experimentar no estande:
                </p>
                <p className="text-xs text-tutu-light/85">
                  {selectedStartup.solutionPresentation}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-tutu-secondary/40">
              <span className="font-display font-bold text-lg text-tutu-lime">
                Pontuação total na startup: {formatPoints(selectedStartup.availablePoints)}
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setSelectedStartup(null)}
                  className="px-4 py-2.5 rounded-xl btn-tutu-outline text-xs"
                >
                  Fechar
                </button>
                <Link
                  to="/app/missoes"
                  onClick={() => setSelectedStartup(null)}
                  className="px-5 py-2.5 rounded-xl btn-tutu-lime text-xs flex items-center gap-1.5"
                >
                  <span>Ir para Missões da Startup</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
