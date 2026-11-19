import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Compass,
  MapPin,
  Trophy,
  UserPlus,
} from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';

interface HowToStep {
  number: string;
  label: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const HOW_TO_PARTICIPATE_STEPS: HowToStep[] = [
  {
    number: '01',
    label: 'ETAPA 01 — CADASTRE-SE',
    title: 'Cadastre-se',
    description: 'Entre na experiência e crie seu perfil para começar sua jornada.',
    icon: UserPlus,
  },
  {
    number: '02',
    label: 'ETAPA 02 — EXPLORE',
    title: 'Explore',
    description:
      'Conheça as startups participantes e descubra o que cada uma tem a oferecer.',
    icon: Compass,
  },
  {
    number: '03',
    label: 'ETAPA 03 — PARTICIPE E CONQUISTE',
    title: 'Participe e Conquiste',
    description:
      'Visite as startups, escaneie os QR Codes, complete missões, acumule pontos e acompanhe sua evolução no ranking.',
    icon: Trophy,
  },
];

const AUTO_ADVANCE_INTERVAL_MS = 6000;

export const LandingPage: React.FC = () => {
  const { eventSettings } = useAppStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isHoverPaused, setIsHoverPaused] = useState(false);

  // Detecta preferência do dispositivo por movimento reduzido
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const isAutoCycleActive = !prefersReducedMotion && !isHoverPaused;

  // Alternância automática a cada 6 segundos
  useEffect(() => {
    if (!isAutoCycleActive) return;

    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % HOW_TO_PARTICIPATE_STEPS.length);
    }, AUTO_ADVANCE_INTERVAL_MS);

    return () => window.clearInterval(timer);
  }, [isAutoCycleActive, currentIndex]);

  const handleNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % HOW_TO_PARTICIPATE_STEPS.length);
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentIndex(
      (prev) =>
        (prev - 1 + HOW_TO_PARTICIPATE_STEPS.length) % HOW_TO_PARTICIPATE_STEPS.length
    );
  }, []);

  const handleSelectStep = useCallback((idx: number) => {
    setCurrentIndex(idx);
  }, []);

  const handlePanelKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      handleNext();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      handlePrev();
    }
  };

  const currentStep = HOW_TO_PARTICIPATE_STEPS[currentIndex];
  const StepIcon = currentStep.icon;

  return (
    <section className="w-full py-6 sm:py-12 lg:py-16">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
          {/* Lado Esquerdo: Marca, Chamada Principal e Botão de Conversão */}
          <div className="lg:col-span-7 space-y-5 sm:space-y-7 min-w-0">
            <div className="inline-flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-tutu-secondary/30 border border-tutu-blue text-[11px] sm:text-xs font-bold tracking-wider text-tutu-light uppercase max-w-full">
              <span className="w-2 h-2 rounded-full bg-tutu-lime shrink-0" />
              <span className="truncate">UMA INICIATIVA EX-DEVEDOR</span>
            </div>

            <h1 className="font-display font-bold text-4xl sm:text-6xl lg:text-7xl tracking-tight text-tutu-light leading-[1.08]">
              Explore.
              <span className="block">Descubra.</span>
              <span className="block text-tutu-lime underline decoration-tutu-blue decoration-4 underline-offset-8 mt-1">
                Conquiste.
              </span>
            </h1>

            <p className="text-sm sm:text-lg text-tutu-light/85 max-w-2xl leading-relaxed">
              Conheça o ecossistema empreendedor de um jeito inédito no Desafio Ex-Devedor. Conecte-se com startups inovadoras, experimente soluções tecnológicas nos estandes, cumpra missões e acompanhe sua evolução no ranking geral.
            </p>

            {/* Event Metadata Pills */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2.5 sm:gap-3 pt-1">
              <div className="flex items-center gap-2 px-3.5 py-2.5 sm:py-2 rounded-xl bg-tutu-secondary/25 border border-tutu-secondary/60 text-xs sm:text-sm min-w-0">
                <Calendar className="w-4 h-4 text-tutu-lime shrink-0" />
                <span className="font-medium break-words">{eventSettings.dates}</span>
              </div>
              <div className="flex items-center gap-2 px-3.5 py-2.5 sm:py-2 rounded-xl bg-tutu-secondary/25 border border-tutu-secondary/60 text-xs sm:text-sm min-w-0">
                <MapPin className="w-4 h-4 text-tutu-lime shrink-0" />
                <span className="font-medium break-words">
                  {eventSettings.location} • {eventSettings.city}
                </span>
              </div>
            </div>

            <div className="pt-1 sm:pt-2">
              <Link
                to="/cadastro"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl btn-tutu-lime text-base sm:text-lg inline-flex items-center justify-center gap-3 shadow-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tutu-lime"
              >
                <span>Comece sua jornada</span>
                <ArrowRight className="w-5 h-5 shrink-0" />
              </Link>
            </div>
          </div>

          {/* Lado Direito: Painel Interativo "Como participar" */}
          <div className="lg:col-span-5 min-w-0">
            <div
              role="region"
              aria-roledescription="carrossel"
              aria-label="Como participar — 3 etapas"
              onMouseEnter={() => setIsHoverPaused(true)}
              onMouseLeave={() => setIsHoverPaused(false)}
              onKeyDown={handlePanelKeyDown}
              className="tutu-card p-4 sm:p-6 lg:p-7 border-2 border-tutu-blue flex flex-col justify-between space-y-5 sm:space-y-6 relative"
            >
              {/* Topo do Painel: Título e Indicador de Etapa */}
              <div className="flex items-center justify-between gap-2 border-b border-tutu-secondary/40 pb-3.5">
                <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
                  Como participar
                </span>
                <span className="text-xs font-semibold text-tutu-light/75 whitespace-nowrap">
                  Etapa {currentStep.number} de 03
                </span>
              </div>

              {/* Etapa Atual (1 por vez) */}
              <div
                key={currentStep.number}
                aria-live={isAutoCycleActive ? 'off' : 'polite'}
                className={`min-h-[180px] sm:min-h-[200px] flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-tutu-dark/85 border border-tutu-secondary/50 ${
                  prefersReducedMotion ? '' : 'transition-opacity duration-300 ease-out'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="px-2.5 sm:px-3 py-1 rounded-lg bg-tutu-secondary/35 text-tutu-lime font-bold text-[11px] sm:text-xs tracking-wider uppercase break-words">
                    {currentStep.label}
                  </span>
                  <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-tutu-blue/30 border border-tutu-lime/50 flex items-center justify-center text-tutu-lime shrink-0">
                    <StepIcon className="w-5 h-5 sm:w-6 sm:h-6" />
                  </div>
                </div>

                <div className="space-y-2 mt-4">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display font-bold text-2xl sm:text-3xl text-tutu-lime shrink-0">
                      {currentStep.number}.
                    </span>
                    <h2 className="font-display font-bold text-xl sm:text-3xl text-tutu-light break-words">
                      {currentStep.title}
                    </h2>
                  </div>
                  <p className="text-sm sm:text-base text-tutu-light/85 leading-relaxed">
                    {currentStep.description}
                  </p>
                </div>
              </div>

              {/* Controles de Navegação: Indicadores de Posição (3 etapas) + Setas */}
              <div className="flex items-center justify-between gap-4 pt-1">
                {/* 3 Indicadores de Posição */}
                <div
                  className="flex items-center gap-2"
                  role="tablist"
                  aria-label="Selecionar etapa"
                >
                  {HOW_TO_PARTICIPATE_STEPS.map((step, idx) => {
                    const isActive = idx === currentIndex;
                    return (
                      <button
                        key={step.number}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        aria-label={`Ir para ${step.label}`}
                        onClick={() => handleSelectStep(idx)}
                        className={`h-3 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tutu-lime ${
                          isActive
                            ? 'w-8 bg-tutu-lime'
                            : 'w-3 bg-tutu-secondary/60 hover:bg-tutu-blue'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Setas de Navegação Manual (Área de toque 44x44px) */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Etapa anterior"
                    className="w-11 h-11 rounded-xl bg-tutu-dark/80 hover:bg-tutu-blue/40 border border-tutu-secondary/60 flex items-center justify-center text-tutu-light transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-tutu-lime"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Próxima etapa"
                    className="w-11 h-11 rounded-xl bg-tutu-dark/80 hover:bg-tutu-blue/40 border border-tutu-secondary/60 flex items-center justify-center text-tutu-light transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-tutu-lime"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
