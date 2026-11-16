import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Award,
  Calendar,
  CheckCircle2,
  Compass,
  MapPin,
  QrCode,
  ShieldAlert,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { StartupAvatarBadge } from '../assets/logos';
import { AchievementIcon } from '../components/UI';
import { formatPoints } from '../utils/formatters';

export const LandingPage: React.FC = () => {
  const { startups, achievements, eventSettings } = useAppStore();
  const activeStartups = startups.filter((s) => s.active);

  const steps = [
    {
      step: '01',
      title: 'Cadastre-se na Plataforma',
      description:
        'Crie seu passaporte digital de visitante em segundos e receba acesso imediato à Central de Missões.',
      icon: Sparkles,
    },
    {
      step: '02',
      title: 'Visite as Startups & Escaneie QR Codes',
      description:
        'Circule pelos estandes na Arena BRB Mané Garrincha, experimente soluções reais e valide códigos exclusivos.',
      icon: QrCode,
    },
    {
      step: '03',
      title: 'Responda Quizzes & Cumpra Missões',
      description:
        'Teste seus conhecimentos, compartilhe insights e desbloqueie missões surpresas ao longo dos 3 dias.',
      icon: Compass,
    },
    {
      step: '04',
      title: 'Suba no Ranking & Desbloqueie Medalhas',
      description:
        'Acumule pontos em tempo real, conquiste insígnias exclusivas e acompanhe sua colocação no Ranking Geral.',
      icon: Trophy,
    },
  ];

  return (
    <div className="space-y-20 pb-8">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-10 sm:pt-16 pb-12 border-b border-tutu-secondary/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex flex-wrap items-center gap-2 px-3.5 py-1.5 rounded-full bg-tutu-secondary/35 border border-tutu-blue text-xs font-semibold text-tutu-light">
                <span className="w-2 h-2 rounded-full bg-tutu-lime" />
                <span>BRASIL GLOBAL SUMMIT 2026 • PLATAFORMA OFICIAL DE GAMIFICAÇÃO</span>
              </div>

              <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-6xl tracking-tight text-tutu-light leading-[1.08]">
                Explore. Descubra.{' '}
                <span className="text-tutu-lime underline decoration-tutu-blue decoration-4 underline-offset-8">
                  Conquiste.
                </span>
              </h1>

              <p className="text-base sm:text-lg text-tutu-light/85 max-w-2xl leading-relaxed">
                Viva o ecossistema empreendedor de um jeito inédito no{' '}
                <strong className="text-tutu-light font-semibold">
                  {eventSettings.eventName}
                </strong>
                . Conecte-se com startups inovadoras, experimente soluções tecnológicas nos estandes, cumpra missões e acompanhe sua evolução no ranking geral.
              </p>

              {/* Event Metadata Pills */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-tutu-secondary/25 border border-tutu-secondary/60 text-sm">
                  <Calendar className="w-4 h-4 text-tutu-lime shrink-0" />
                  <span className="font-medium">{eventSettings.dates}</span>
                </div>
                <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-tutu-secondary/25 border border-tutu-secondary/60 text-sm">
                  <MapPin className="w-4 h-4 text-tutu-lime shrink-0" />
                  <span className="font-medium">
                    {eventSettings.location} • {eventSettings.city}
                  </span>
                </div>
              </div>

              {/* Primary CTA Buttons */}
              <div className="flex flex-wrap items-center gap-4 pt-3">
                <Link
                  to="/app/dashboard"
                  className="px-6 py-3.5 rounded-xl btn-tutu-lime text-base flex items-center gap-2 shadow-lg"
                >
                  <span>Começar minha jornada</span>
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/app/ranking"
                  className="px-6 py-3.5 rounded-xl btn-tutu-primary text-base flex items-center gap-2"
                >
                  <Trophy className="w-5 h-5 text-tutu-lime" />
                  <span>Ver ranking</span>
                </Link>
              </div>
            </div>

            {/* Right Interactive Highlight Card */}
            <div className="lg:col-span-5">
              <div className="tutu-card p-6 sm:p-7 space-y-6 border-2 border-tutu-blue relative">
                <div className="flex items-center justify-between border-b border-tutu-secondary/40 pb-4">
                  <div>
                    <span className="text-xs uppercase tracking-wider text-tutu-lime font-bold">
                      Circuito Interativo 2026
                    </span>
                    <h2 className="font-display font-bold text-2xl text-tutu-light mt-0.5">
                      Passaporte da Arena BRB
                    </h2>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-tutu-lime text-tutu-dark flex items-center justify-center font-display font-bold text-xl">
                    26
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-xl bg-tutu-dark/80 border border-tutu-secondary/50">
                    <span className="text-xs text-tutu-light/70">Startups no Circuito</span>
                    <p className="font-display font-bold text-3xl text-tutu-lime mt-1">
                      0{activeStartups.length}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-tutu-dark/80 border border-tutu-secondary/50">
                    <span className="text-xs text-tutu-light/70">Pontos em Jogo</span>
                    <p className="font-display font-bold text-3xl text-tutu-light mt-1">
                      +3.950
                    </p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-tutu-light/75">
                    Destaques da Experiência
                  </p>
                  {[
                    'Leitura instantânea de QR Codes nos estandes',
                    'Quizzes temáticos e experimentação guiada',
                    '5 medalhas colecionáveis de impacto',
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5 text-sm text-tutu-light/90">
                      <CheckCircle2 className="w-4 h-4 text-tutu-lime shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-tutu-light/75 border-t border-tutu-secondary/40">
                  <span>Identidade Oficial Tutu</span>
                  <Link
                    to="/cadastro"
                    className="text-tutu-lime font-semibold hover:underline flex items-center gap-1"
                  >
                    <span>Criar conta demonstrativa</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* EXPLANATION OF DYNAMICS */}
      <section id="dinamica" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        <div className="max-w-3xl space-y-3">
          <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
            Dinâmica do Evento
          </span>
          <h2 className="font-display font-bold text-3xl sm:text-4xl text-tutu-light">
            Como funciona o Desafio Global Summit 2026
          </h2>
          <p className="text-tutu-light/80 text-base">
            Uma jornada estruturada para transformar sua visita aos pavilhões da Arena BRB Mané Garrincha em conexões práticas com startups de alto impacto.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {steps.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="tutu-card tutu-card-hover p-6 flex flex-col justify-between space-y-5">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold text-3xl text-tutu-lime">
                    {item.step}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-tutu-blue/30 border border-tutu-blue flex items-center justify-center text-tutu-light">
                    <Icon className="w-5 h-5 text-tutu-lime" />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-display font-bold text-lg text-tutu-light">{item.title}</h3>
                  <p className="text-sm text-tutu-light/80 leading-relaxed">{item.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* STARTUPS PRESENTATION */}
      <section id="startups" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
              Ecossistema Expositor
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-tutu-light">
              Startups Participantes
            </h2>
          </div>
          <Link
            to="/app/startups"
            className="px-4 py-2.5 rounded-xl btn-tutu-outline text-sm inline-flex items-center gap-2 self-start"
          >
            <span>Explorar detalhes das startups</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {activeStartups.map((st) => (
            <div key={st.id} className="tutu-card tutu-card-hover p-6 flex flex-col justify-between gap-5">
              <div className="flex items-start gap-4">
                <StartupAvatarBadge logoText={st.logoText} isGuest={st.isConfigurableGuest} />
                <div className="space-y-1 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-md bg-tutu-secondary/40 text-tutu-lime">
                      {st.category}
                    </span>
                    <span className="text-xs font-bold text-tutu-lime flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" /> Até {formatPoints(st.availablePoints)}
                    </span>
                  </div>
                  <h3 className="font-display font-bold text-xl text-tutu-light pt-1">{st.name}</h3>
                  <p className="text-xs text-tutu-light/70">{st.boothNumber}</p>
                </div>
              </div>

              <p className="text-sm text-tutu-light/85 leading-relaxed">{st.description}</p>

              <div className="pt-3 border-t border-tutu-secondary/40 flex items-center justify-between">
                <span className="text-xs text-tutu-light/75 italic">{st.tagline}</span>
                <Link
                  to="/app/startups"
                  className="text-xs font-bold text-tutu-lime hover:underline flex items-center gap-1 shrink-0 ml-2"
                >
                  <span>Conhecer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* MISSIONS, SCORING & ACHIEVEMENTS */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Regras de Pontuação */}
          <div className="lg:col-span-6 tutu-card p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
                Missões & Pontuação
              </span>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-tutu-light">
                Como acumular pontos no evento
              </h2>
            </div>

            <div className="space-y-3">
              {eventSettings.scoringRules.map((rule, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 flex items-start gap-3"
                >
                  <div className="w-6 h-6 rounded-lg bg-tutu-blue text-tutu-light font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-tutu-light/90">{rule}</p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-xl bg-tutu-secondary/25 border border-tutu-lime/40 flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-tutu-lime shrink-0 mt-0.5" />
              <div className="text-xs text-tutu-light/85 space-y-1">
                <p className="font-bold text-tutu-light">
                  Sobre Conquistas e Premiações ({eventSettings.rewardsEnabled ? 'Ativas' : 'Aguardando Liberação Formal'})
                </p>
                <p>
                  {eventSettings.rewardsEnabled
                    ? eventSettings.rewardsDescription
                    : eventSettings.rewardsLegalNote}
                </p>
              </div>
            </div>
          </div>

          {/* Medalhas Colecionáveis */}
          <div className="lg:col-span-6 tutu-card p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
                  Insígnias Oficiais
                </span>
                <h2 className="font-display font-bold text-2xl sm:text-3xl text-tutu-light">
                  Medalhas & Conquistas
                </h2>
              </div>
              <Award className="w-8 h-8 text-tutu-lime" />
            </div>

            <div className="space-y-3">
              {achievements.map((ach) => (
                <div
                  key={ach.id}
                  className="p-3.5 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 flex items-center gap-4"
                >
                  <AchievementIcon iconName={ach.iconName} unlocked={ach.unlocked} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display font-bold text-base text-tutu-light">
                        {ach.name}
                      </h3>
                      <span className="text-xs font-bold text-tutu-lime">
                        +{ach.pointsBonus} pts
                      </span>
                    </div>
                    <p className="text-xs text-tutu-light/75 mt-0.5">{ach.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
