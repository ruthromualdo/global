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
    <section className="relative w-full py-4 sm:py-6 lg:py-8 overflow-hidden">
      {/* 1. Fundo e Atmosfera: Padrão sutil + Brilhos radiais em verde menta */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none opacity-[0.09]"
        style={{
          backgroundImage: `radial-gradient(#397B55 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute -top-32 left-1/4 w-[550px] h-[550px] rounded-full pointer-events-none blur-3xl opacity-[0.07]"
        style={{
          background: 'radial-gradient(circle, #C8FFD2 0%, transparent 70%)',
        }}
      />
      <div
        aria-hidden="true"
        className="absolute top-1/4 -right-24 w-[480px] h-[480px] rounded-full pointer-events-none blur-3xl opacity-[0.07]"
        style={{
          background: 'radial-gradient(circle, #C8FFD2 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">
          {/* Coluna Esquerda: Conteúdo Principal */}
          <div className="lg:col-span-7 space-y-3.5 sm:space-y-4 lg:space-y-5 min-w-0">
            {/* Topo: APENAS o badge em pílula "• UMA INICIATIVA EX-DEVEDOR" */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tutu-secondary/50 border border-tutu-blue/60 text-[10px] sm:text-[11px] font-bold tracking-wider text-tutu-muted uppercase">
              <span className="w-1.5 h-1.5 rounded-full bg-tutu-lime shrink-0" />
              <span>UMA INICIATIVA EX-DEVEDOR</span>
            </div>

            {/* Título Principal com Sublinhado Refinado em "Conquiste." */}
            <h1 className="font-display font-bold text-3xl sm:text-5xl lg:text-[3.5rem] tracking-tight text-[#FFFFFF] leading-[1.08]">
              Explore.
              <span className="block">Descubra.</span>
              <span className="relative inline-block text-tutu-lime mt-0.5">
                Conquiste.
                <span
                  aria-hidden="true"
                  className="absolute left-0 -bottom-1 w-full h-[2.5px] bg-tutu-lime rounded-full shadow-[0_0_10px_rgba(200,255,210,0.45)]"
                />
              </span>
            </h1>

            <p className="text-xs sm:text-sm lg:text-base text-tutu-muted max-w-xl leading-relaxed">
              Conheça o ecossistema empreendedor de um jeito inédito no Desafio Ex-Devedor. Conecte-se com startups inovadoras, experimente soluções tecnológicas nos estandes, cumpra missões e acompanhe sua evolução no ranking geral.
            </p>

            {/* Data e Local: Sem bordas de caixa, alinhamento limpo */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 pt-0.5 text-xs sm:text-sm text-tutu-muted">
              <div className="flex items-center gap-2 min-w-0">
                <Calendar className="w-4 h-4 text-tutu-lime shrink-0" />
                <span className="font-medium text-[#FFFFFF]">{eventSettings.dates}</span>
              </div>
              <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-tutu-lime/40" />
              <div className="flex items-center gap-2 min-w-0">
                <MapPin className="w-4 h-4 text-tutu-lime shrink-0" />
                <span className="font-medium text-[#FFFFFF]">
                  {eventSettings.location} • {eventSettings.city}
                </span>
              </div>
            </div>

            {/* Botão CTA Principal */}
            <div className="pt-1 sm:pt-2">
              <Link
                to="/cadastro"
                className="min-h-[46px] w-full sm:w-auto px-7 py-3 rounded-xl btn-tutu-lime text-sm sm:text-base font-semibold inline-flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tutu-lime"
              >
                <span>Participar agora</span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </Link>
            </div>
          </div>

          {/* Coluna Direita: Card Interativo "COMO PARTICIPAR" (Visual Original) */}
          <div className="lg:col-span-5 min-w-0">
            <div
              role="region"
              aria-roledescription="carrossel"
              aria-label="Como participar — 3 etapas"
              onMouseEnter={() => setIsHoverPaused(true)}
              onMouseLeave={() => setIsHoverPaused(false)}
              onKeyDown={handlePanelKeyDown}
              className="tutu-card p-4 sm:p-5 lg:p-6 border border-tutu-blue/60 flex flex-col justify-between space-y-4 sm:space-y-5 relative shadow-lg"
            >
              {/* Topo do Painel */}
              <div className="flex items-center justify-between gap-2 border-b border-tutu-secondary/40 pb-3">
                <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
                  Como participar
                </span>
                <span className="text-xs font-semibold text-tutu-muted whitespace-nowrap">
                  Etapa {currentStep.number} de 03
                </span>
              </div>

              {/* Box Interno com Fundo Verde Menta Claro e Glow Sutil */}
              <div
                key={currentStep.number}
                aria-live={isAutoCycleActive ? 'off' : 'polite'}
                className={`min-h-[175px] sm:min-h-[190px] flex flex-col justify-between p-4 sm:p-5 rounded-2xl bg-[#E8FFF0] border border-[#A4F0B5]/80 shadow-[0_0_25px_rgba(164,240,181,0.25)] ${
                  prefersReducedMotion ? '' : 'transition-opacity duration-300 ease-out'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="px-2.5 sm:px-3 py-1 rounded-lg bg-[#071812]/10 border border-[#071812]/15 text-[#071812] font-bold text-[11px] sm:text-xs tracking-wider uppercase break-words">
                    {currentStep.label}
                  </span>
                  <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-[#071812]/10 border border-[#071812]/15 flex items-center justify-center text-[#071812] shrink-0 shadow-sm">
                    <StepIcon className="w-5 h-5 sm:w-5 sm:h-5" />
                  </div>
                </div>

                <div className="space-y-1.5 mt-3">
                  <div className="flex items-baseline gap-2">
                    <span className="font-display font-bold text-xl sm:text-2xl text-[#071812] shrink-0">
                      {currentStep.number}.
                    </span>
                    <h2 className="font-display font-bold text-lg sm:text-xl text-[#071812] break-words">
                      {currentStep.title}
                    </h2>
                  </div>
                  <p className="text-xs sm:text-sm text-[#071812]/85 font-medium leading-relaxed">
                    {currentStep.description}
                  </p>
                </div>
              </div>

              {/* Rodapé: Indicador de Barra Única Verde Menta à esquerda + Setas à direita */}
              <div className="flex items-center justify-between gap-4 pt-1">
                {/* Indicador de Barra Única Verde Menta */}
                <div
                  className="flex items-center gap-1.5 sm:gap-2"
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
                        className={`h-2.5 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tutu-lime ${
                          isActive
                            ? 'w-8 bg-tutu-lime shadow-sm'
                            : 'w-2.5 bg-tutu-secondary/60 hover:bg-tutu-blue'
                        }`}
                      />
                    );
                  })}
                </div>

                {/* Setas de Navegação Manual */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handlePrev}
                    aria-label="Etapa anterior"
                    className={`w-10 h-10 rounded-xl bg-tutu-dark border border-tutu-secondary/60 flex items-center justify-center text-tutu-light transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-tutu-lime ${
                      currentIndex === 0
                        ? 'opacity-30 cursor-default'
                        : 'opacity-100 hover:bg-tutu-secondary hover:border-tutu-lime/40'
                    }`}
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    aria-label="Próxima etapa"
                    className="w-10 h-10 rounded-xl bg-tutu-dark border border-tutu-secondary/60 flex items-center justify-center text-tutu-light opacity-100 hover:bg-tutu-secondary hover:border-tutu-lime/40 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-tutu-lime"
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
