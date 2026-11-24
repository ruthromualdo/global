import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Compass,
  ExternalLink,
  Instagram,
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

  const resolveStartupTrackId = (st: Startup): string => {
    const related = missions.find((m) => m.startupId === st.id && m.active && m.trackId && m.trackId !== 'bonus');
    if (related?.trackId) return related.trackId;
    if (st.id.includes('ex-devedor') || st.id.includes('tutu')) return 'ex_devedor';
    if (st.id.includes('sign')) return 'sign';
    if (st.id.includes('escreva')) return 'editora_escreva';
    return 'ex_devedor';
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
          Circuito Oficial de Inovação
        </span>
        <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
          Startups Expositoras
        </h1>
        <p className="text-xs sm:text-sm text-tutu-light/80 max-w-3xl leading-relaxed">
          Conheça as startups participantes, explore suas soluções tecnológicas e veja as missões vinculadas a cada estande.
        </p>
      </div>

      {/* Startups Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 sm:gap-6">
        {activeStartups.map((st) => {
          const relatedMissions = missions.filter(
            (m) => m.startupId === st.id && m.active && m.trackId !== 'bonus'
          );
          const isVisited = participant.visitedStartupsIds.includes(st.id);

          return (
            <div
              key={st.id}
              className="tutu-card tutu-card-hover p-5 sm:p-7 flex flex-col justify-between space-y-5 sm:space-y-6"
            >
              <div className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3.5 min-w-0">
                    <StartupAvatarBadge
                      logoText={st.logoText}
                      logoPath={st.logoPath}
                      name={st.name}
                      isGuest={st.isConfigurableGuest}
                    />
                    <div className="min-w-0">
                      <span className="inline-block px-2.5 py-0.5 rounded-md bg-tutu-secondary/40 text-tutu-lime text-xs font-semibold">
                        {st.category}
                      </span>
                      <h2 className="font-display font-bold text-xl sm:text-2xl text-tutu-light mt-1 break-words">
                        {st.name}
                      </h2>
                      <p className="text-xs text-tutu-light/70 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-tutu-lime shrink-0" />
                        <span className="break-words">{st.boothNumber}</span>
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

                <p className="text-xs sm:text-sm text-tutu-light/85 leading-relaxed whitespace-pre-line">
                  {st.description}
                </p>

                {(st.instagramUrl || st.website) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {st.instagramUrl && (
                      <a
                        href={st.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tutu-dark/80 border border-tutu-secondary/50 hover:border-tutu-lime text-xs font-semibold text-tutu-light hover:text-tutu-lime transition-colors"
                      >
                        <Instagram className="w-3.5 h-3.5 text-tutu-lime shrink-0" />
                        <span>Instagram Oficial</span>
                        <ExternalLink className="w-3 h-3 opacity-70 shrink-0" />
                      </a>
                    )}
                    {st.website && (
                      <a
                        href={st.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-tutu-lime/15 border border-tutu-lime/40 hover:bg-tutu-lime/25 text-xs font-semibold text-tutu-lime transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5 shrink-0" />
                        <span>Acessar Plataforma</span>
                        <ExternalLink className="w-3 h-3 shrink-0" />
                      </a>
                    )}
                  </div>
                )}

                {/* Apresentação da Solução */}
                <div className="p-3.5 sm:p-4 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-tutu-lime flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    <span>Apresentação da Solução</span>
                  </span>
                  <p className="text-xs text-tutu-light/85 leading-relaxed">
                    {st.solutionPresentation}
                  </p>
                </div>

                {/* Missões Relacionadas */}
                <div className="space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-tutu-light/85 flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-tutu-lime shrink-0" />
                      <span>Missões Relacionadas ({relatedMissions.length})</span>
                    </span>
                    <span className="font-bold text-tutu-lime flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 shrink-0" />
                      {formatPoints(st.availablePoints)} disponíveis
                    </span>
                  </div>

                  <div className="space-y-2">
                    {relatedMissions.map((m) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-xl bg-tutu-secondary/20 border border-tutu-secondary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex flex-wrap items-center gap-2 min-w-0">
                          <CategoryPill category={m.category} />
                          <span className="text-tutu-light font-medium break-words">
                            {m.title}
                          </span>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                          <span className="text-tutu-lime font-bold">+{m.points} pts</span>
                          <MissionStatusBadge status={m.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-tutu-secondary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-xs text-tutu-light/70 italic leading-snug">
                  "{st.tagline}"
                </span>
                <button
                  onClick={() => setSelectedStartup(st)}
                  className="min-h-[44px] w-full sm:w-auto px-4 py-2.5 rounded-xl btn-tutu-primary text-xs flex items-center justify-center gap-1.5 shrink-0"
                >
                  <Building2 className="w-4 h-4 shrink-0" />
                  <span>Conhecer startup</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Startup Detail Modal */}
      {selectedStartup && (
        <div className="fixed inset-0 z-50 bg-tutu-dark/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="tutu-card max-w-2xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-8 space-y-5 sm:space-y-6 border-2 border-tutu-blue">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5 min-w-0">
                <StartupAvatarBadge
                  logoText={selectedStartup.logoText}
                  logoPath={selectedStartup.logoPath}
                  name={selectedStartup.name}
                  isGuest={selectedStartup.isConfigurableGuest}
                />
                <div className="min-w-0">
                  <span className="text-xs font-bold text-tutu-lime uppercase tracking-wider block">
                    {selectedStartup.category}
                  </span>
                  <h2 className="font-display font-bold text-xl sm:text-3xl text-tutu-light break-words">
                    {selectedStartup.name}
                  </h2>
                  <p className="text-xs text-tutu-light/75 break-words">
                    {selectedStartup.boothNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedStartup(null)}
                className="min-w-[40px] min-h-[40px] p-2 rounded-xl bg-tutu-secondary/30 text-tutu-light hover:text-tutu-lime flex items-center justify-center shrink-0"
                aria-label="Fechar detalhes da startup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-tutu-light/90 leading-relaxed">
              <p className="whitespace-pre-line">{selectedStartup.description}</p>
              <div className="p-4 rounded-xl bg-tutu-dark/80 border border-tutu-secondary/50 space-y-1.5">
                <p className="text-xs font-bold uppercase text-tutu-lime">
                  O que experimentar no estande:
                </p>
                <p className="text-xs text-tutu-light/85 leading-relaxed">
                  {selectedStartup.solutionPresentation}
                </p>
              </div>
              {(selectedStartup.instagramUrl || selectedStartup.website) && (
                <div className="flex flex-wrap items-center gap-2.5">
                  {selectedStartup.instagramUrl && (
                    <a
                      href={selectedStartup.instagramUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-tutu-dark border border-tutu-secondary/50 hover:border-tutu-lime text-xs font-semibold text-tutu-light hover:text-tutu-lime"
                    >
                      <Instagram className="w-4 h-4 text-tutu-lime shrink-0" />
                      <span>Abrir Instagram</span>
                      <ExternalLink className="w-3.5 h-3.5 opacity-70" />
                    </a>
                  )}
                  {selectedStartup.website && (
                    <a
                      href={selectedStartup.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-tutu-lime/15 border border-tutu-lime/40 hover:bg-tutu-lime/25 text-xs font-semibold text-tutu-lime"
                    >
                      <Sparkles className="w-4 h-4 shrink-0" />
                      <span>Acessar Plataforma</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-tutu-secondary/40">
              <span className="font-display font-bold text-base sm:text-lg text-tutu-lime">
                Pontuação na startup: {formatPoints(selectedStartup.availablePoints)}
              </span>
              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  onClick={() => setSelectedStartup(null)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl btn-tutu-outline text-xs"
                >
                  Fechar
                </button>
                <Link
                  to={`/app/missoes?track=${resolveStartupTrackId(selectedStartup)}`}
                  onClick={() => setSelectedStartup(null)}
                  className="min-h-[44px] px-5 py-2.5 rounded-xl btn-tutu-lime text-xs flex items-center justify-center gap-1.5"
                >
                  <span>Ir para Missões da Startup</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
