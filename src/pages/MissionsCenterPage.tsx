import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  Clock,
  Filter,
  HelpCircle,
  Lock,
  Play,
  QrCode,
  Send,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { Mission, MissionCategory, MissionStatus } from '../types';
import { CategoryPill, MissionStatusBadge } from '../components/UI';
import { MissionTimer } from '../components/MissionTimer';
import { formatPoints } from '../utils/formatters';

const CATEGORIES: ('Todas' | MissionCategory)[] = [
  'Todas',
  'Visitação',
  'Experimentação',
  'Quiz',
  'Compartilhamento',
  'Missão surpresa',
];

const STATUSES: ('Todos' | MissionStatus)[] = [
  'Todos',
  'Disponível',
  'Em andamento',
  'Aguardando validação',
  'Concluída',
  'Bloqueada',
];

export const MissionsCenterPage: React.FC = () => {
  const {
    missions,
    startups,
    startMission,
    completeMissionInstant,
    submitMissionEvidence,
    notify,
  } = useAppStore();
  const navigate = useNavigate();

  const [selectedCategory, setSelectedCategory] = useState<'Todas' | MissionCategory>('Todas');
  const [selectedStartupId, setSelectedStartupId] = useState<string>('Todas');
  const [selectedStatus, setSelectedStatus] = useState<'Todos' | MissionStatus>('Todos');

  // Interactive Modal for Quiz or Evidence Submission
  const [activeQuizMission, setActiveQuizMission] = useState<Mission | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [evidenceMission, setEvidenceMission] = useState<Mission | null>(null);
  const [evidenceText, setEvidenceText] = useState('');

  const filteredMissions = missions
    .filter((m) => m.active)
    .filter((m) => (selectedCategory === 'Todas' ? true : m.category === selectedCategory))
    .filter((m) => (selectedStartupId === 'Todas' ? true : m.startupId === selectedStartupId))
    .filter((m) => (selectedStatus === 'Todos' ? true : m.status === selectedStatus));

  const handleActionClick = (mission: Mission) => {
    if (mission.status === 'Bloqueada') {
      notify(
        'Missão Bloqueada',
        `Conclua mais missões nas startups expositoras para desbloquear "${mission.title}".`,
        'info'
      );
      return;
    }

    if (mission.status === 'Concluída') {
      notify('Missão Concluída', 'Você já garantiu os pontos desta missão!', 'info');
      return;
    }

    // Inicia o cronômetro no servidor quando a missão for iniciada pela primeira vez
    if (mission.status === 'Disponível') {
      startMission(mission.id);
    }

    if (mission.category === 'Quiz' && mission.quizQuestions?.length) {
      setQuizAnswers({});
      setActiveQuizMission(mission);
      return;
    }

    if (mission.category === 'Compartilhamento') {
      setEvidenceText('');
      setEvidenceMission(mission);
      return;
    }

    if (mission.qrCodeRequired) {
      navigate(`/app/escanear?code=${mission.qrCodeRequired}`);
      return;
    }

    completeMissionInstant(mission.id);
  };

  const handleQuizSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeQuizMission || !activeQuizMission.quizQuestions) return;

    const questions = activeQuizMission.quizQuestions;
    let correct = 0;
    questions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctIndex) correct += 1;
    });

    if (correct >= Math.ceil(questions.length * 0.6)) {
      completeMissionInstant(activeQuizMission.id);
      setActiveQuizMission(null);
    } else {
      notify(
        'Quase lá!',
        `Você acertou ${correct} de ${questions.length}. Revise suas respostas e tente novamente!`,
        'error'
      );
    }
  };

  const handleEvidenceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceMission) return;
    submitMissionEvidence(evidenceMission.id, evidenceText);
    setEvidenceMission(null);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
            Circuito Gamificado
          </span>
          <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
            Central de Missões
          </h1>
          <p className="text-xs sm:text-sm text-tutu-light/80">
            Filtre por categoria, startup ou status e execute as atividades para acumular pontos.
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="tutu-card p-4 sm:p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-tutu-lime">
          <Filter className="w-4 h-4 shrink-0" />
          <span>Filtros Inteligentes</span>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === cat
                  ? 'bg-tutu-lime text-tutu-dark font-bold shadow-sm'
                  : 'bg-tutu-dark/70 text-tutu-light/80 hover:text-tutu-light border border-tutu-secondary/40'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Startup & Status Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pt-2 border-t border-tutu-secondary/30">
          <div>
            <label
              htmlFor="filter-startup"
              className="block text-xs text-tutu-light/75 mb-1.5 font-medium"
            >
              Filtrar por Startup Expositora
            </label>
            <select
              id="filter-startup"
              value={selectedStartupId}
              onChange={(e) => setSelectedStartupId(e.target.value)}
              className="input-tutu text-xs py-2.5"
            >
              <option value="Todas">Todas as Startups ({startups.length})</option>
              {startups.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="filter-status"
              className="block text-xs text-tutu-light/75 mb-1.5 font-medium"
            >
              Filtrar por Status da Missão
            </label>
            <select
              id="filter-status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as 'Todos' | MissionStatus)}
              className="input-tutu text-xs py-2.5"
            >
              {STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Missions Grid: 1 col mobile, 2 cols tablet/md, 3 cols desktop xl */}
      {filteredMissions.length === 0 ? (
        <div className="tutu-card p-8 sm:p-10 text-center space-y-3">
          <Sparkles className="w-8 h-8 text-tutu-lime mx-auto" />
          <h3 className="font-display font-bold text-xl text-tutu-light">
            Nenhuma missão encontrada com estes filtros
          </h3>
          <p className="text-xs text-tutu-light/75">
            Experimente limpar os filtros selecionados para visualizar todas as missões do evento.
          </p>
          <button
            onClick={() => {
              setSelectedCategory('Todas');
              setSelectedStartupId('Todas');
              setSelectedStatus('Todos');
            }}
            className="min-h-[44px] px-4 py-2 rounded-xl btn-tutu-primary text-xs"
          >
            Restaurar Filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
          {filteredMissions.map((mission) => (
            <div
              key={mission.id}
              className={`tutu-card p-5 sm:p-6 flex flex-col justify-between space-y-5 ${mission.status === 'Bloqueada' ? 'opacity-70' : 'tutu-card-hover'
                }`}
            >
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    <CategoryPill category={mission.category} />
                    <span className="text-xs text-tutu-light/70 font-medium truncate">
                      • {mission.startupName}
                    </span>
                  </div>
                  <MissionStatusBadge status={mission.status} />
                </div>

                <h2 className="font-display font-bold text-lg sm:text-xl text-tutu-light">
                  {mission.title}
                </h2>
                <p className="text-xs sm:text-sm text-tutu-light/85 leading-relaxed">
                  {mission.description}
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 text-tutu-lime font-bold">
                      <Zap className="w-4 h-4 shrink-0" />
                      {formatPoints(mission.points)}
                    </span>
                    <span className="inline-flex items-center gap-1 text-tutu-light/80">
                      <Clock className="w-3.5 h-3.5 text-tutu-lime shrink-0" />
                      {mission.estimatedTime}
                    </span>
                  </div>
                  <span className="text-[11px] text-tutu-light/65">{mission.period}</span>
                </div>

                {/* Cronômetro e Bônus de Velocidade (Etapa 3) */}
                <MissionTimer
                  status={mission.status}
                  startedAtMs={mission.startedAtMs}
                  durationSeconds={mission.durationSeconds}
                  targetEndAtMs={mission.targetEndAtMs}
                  serverTimeMs={mission.serverTimeMs}
                  completedAtMs={mission.completedAtMs}
                  elapsedSeconds={mission.elapsedSeconds}
                  speedBonusAwarded={mission.speedBonusAwarded}
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <span className="text-[11px] text-tutu-light/70 leading-snug">
                    {mission.completionCriteria}
                  </span>

                  <button
                    onClick={() => handleActionClick(mission)}
                    className={`min-h-[44px] w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 ${mission.status === 'Concluída'
                      ? 'bg-tutu-secondary/30 text-tutu-lime border border-tutu-lime/40'
                      : mission.status === 'Bloqueada'
                        ? 'bg-tutu-dark text-tutu-light/50 border border-tutu-light/15'
                        : mission.status === 'Em andamento'
                          ? 'btn-tutu-lime'
                          : 'btn-tutu-primary'
                      }`}
                  >
                    {mission.status === 'Concluída' && (
                      <>
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Concluída</span>
                      </>
                    )}
                    {mission.status === 'Bloqueada' && (
                      <>
                        <Lock className="w-4 h-4 shrink-0" />
                        <span>Bloqueada</span>
                      </>
                    )}
                    {mission.status === 'Aguardando validação' && (
                      <>
                        <Send className="w-4 h-4 shrink-0" />
                        <span>Reenviar Evidência</span>
                      </>
                    )}
                    {mission.status === 'Disponível' && (
                      <>
                        <Play className="w-4 h-4 shrink-0" />
                        <span>
                          {mission.qrCodeRequired
                            ? `Iniciar & Ler QR (${mission.qrCodeRequired})`
                            : mission.category === 'Quiz'
                              ? 'Iniciar Quiz'
                              : 'Iniciar Missão'}
                        </span>
                      </>
                    )}
                    {mission.status === 'Em andamento' && (
                      <>
                        {mission.category === 'Quiz' ? (
                          <>
                            <HelpCircle className="w-4 h-4 shrink-0" />
                            <span>Responder Quiz</span>
                          </>
                        ) : mission.category === 'Compartilhamento' ? (
                          <>
                            <Send className="w-4 h-4 shrink-0" />
                            <span>Enviar Validação</span>
                          </>
                        ) : mission.qrCodeRequired ? (
                          <>
                            <QrCode className="w-4 h-4 shrink-0" />
                            <span>Escanear QR ({mission.qrCodeRequired})</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 shrink-0" />
                            <span>Concluir Missão</span>
                          </>
                        )}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* QUIZ MODAL */}
      {activeQuizMission && activeQuizMission.quizQuestions && (
        <div className="fixed inset-0 z-50 bg-tutu-dark/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="tutu-card max-w-xl w-full max-h-[90vh] overflow-y-auto p-5 sm:p-8 space-y-5 sm:space-y-6 border-2 border-tutu-lime">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase text-tutu-lime">
                  Quiz Interativo • {activeQuizMission.startupName}
                </span>
                <h3 className="font-display font-bold text-xl sm:text-2xl text-tutu-light mt-1">
                  {activeQuizMission.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveQuizMission(null)}
                className="min-h-[38px] text-xs text-tutu-light/70 hover:text-tutu-light px-3 py-1.5 rounded-lg bg-tutu-secondary/30 shrink-0"
              >
                Fechar
              </button>
            </div>

            <form onSubmit={handleQuizSubmit} className="space-y-4 sm:space-y-5">
              {activeQuizMission.quizQuestions.map((q, qIdx) => (
                <div
                  key={qIdx}
                  className="p-3.5 sm:p-4 rounded-xl bg-tutu-dark/80 border border-tutu-secondary/50 space-y-3"
                >
                  <p className="text-xs sm:text-sm font-semibold text-tutu-light leading-relaxed">
                    {qIdx + 1}. {q.question}
                  </p>
                  <div className="space-y-2">
                    {q.options.map((opt, optIdx) => (
                      <label
                        key={optIdx}
                        className={`flex items-start gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${quizAnswers[qIdx] === optIdx
                          ? 'bg-tutu-blue/30 border-tutu-lime text-tutu-light font-semibold'
                          : 'bg-tutu-dark/50 border-tutu-secondary/30 text-tutu-light/80'
                          }`}
                      >
                        <input
                          type="radio"
                          name={`q-${qIdx}`}
                          required
                          checked={quizAnswers[qIdx] === optIdx}
                          onChange={() =>
                            setQuizAnswers((prev) => ({ ...prev, [qIdx]: optIdx }))
                          }
                          className="accent-tutu-lime mt-0.5 shrink-0"
                        />
                        <span className="leading-relaxed">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActiveQuizMission(null)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl btn-tutu-outline text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2.5 rounded-xl btn-tutu-lime text-xs"
                >
                  Confirmar Respostas (+{formatPoints(activeQuizMission.points)})
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EVIDENCE SUBMISSION MODAL */}
      {evidenceMission && (
        <div className="fixed inset-0 z-50 bg-tutu-dark/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="tutu-card max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-8 space-y-5 border-2 border-tutu-blue">
            <div>
              <span className="text-xs font-bold uppercase text-tutu-lime">
                Envio para Curadoria
              </span>
              <h3 className="font-display font-bold text-xl sm:text-2xl text-tutu-light mt-1">
                {evidenceMission.title}
              </h3>
              <p className="text-xs text-tutu-light/75 mt-1 leading-relaxed">
                Descreva seu aprendizado ou informe o código recebido no estande para enviar à fila de validação administrativa.
              </p>
            </div>

            <form onSubmit={handleEvidenceSubmit} className="space-y-4">
              <textarea
                rows={3}
                required
                value={evidenceText}
                onChange={(e) => setEvidenceText(e.target.value)}
                placeholder="Ex.: Participei da dinâmica no estande da Futurize e compartilhei meu insight no mural"
                className="input-tutu text-xs"
              />
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={() => setEvidenceMission(null)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl btn-tutu-outline text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="min-h-[44px] px-5 py-2.5 rounded-xl btn-tutu-lime text-xs"
                >
                  Enviar para Validação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
