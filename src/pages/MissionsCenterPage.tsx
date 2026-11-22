import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Crown,
  HelpCircle,
  History,
  Play,
  QrCode,
  Send,
  Sparkles,
  Trophy,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { Mission } from '../types';
import { CategoryPill, MissionStatusBadge } from '../components/UI';
import { MissionTimer } from '../components/MissionTimer';
import { formatPoints } from '../utils/formatters';

export const MissionsCenterPage: React.FC = () => {
  const {
    missions,
    startMission,
    completeMissionInstant,
    submitMissionEvidence,
    notify,
  } = useAppStore();
  const navigate = useNavigate();

  // Estados de modais interativos (Quiz / Evidência)
  const [activeQuizMission, setActiveQuizMission] = useState<Mission | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [evidenceMission, setEvidenceMission] = useState<Mission | null>(null);
  const [evidenceText, setEvidenceText] = useState('');
  const [showCompletedHistory, setShowCompletedHistory] = useState(false);

  // Missões sequenciais oficiais do circuito (1: Tutu, 2: Escreve Lab, 3: Futurize, 4: Startup Convidada)
  const sequentialMissions = missions
    .filter((m) => m.sequenceOrder !== null && m.sequenceOrder !== undefined && m.active)
    .sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0));

  // A missão ativa atual é a primeira da sequência cujo status NÃO seja 'Concluída'
  const currentMission = sequentialMissions.find((m) => m.status !== 'Concluída') || null;
  const isAllCompleted =
    sequentialMissions.length > 0 &&
    sequentialMissions.every((m) => m.status === 'Concluída');
  const completedMissions = sequentialMissions.filter((m) => m.status === 'Concluída');

  const handleActionClick = (mission: Mission) => {
    if (mission.status === 'Bloqueada') {
      notify(
        'Missão Bloqueada',
        `Conclua a missão anterior da sequência para desbloquear "${mission.title}".`,
        'error'
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
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
              Circuito Gamificado • Etapa 5
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-tutu-secondary/30 text-tutu-light/80 text-[11px] font-semibold border border-tutu-secondary/40">
              <span>Sequência Obrigatória</span>
            </span>
          </div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
            Central de Missões
          </h1>
          <p className="text-xs sm:text-sm text-tutu-light/80 leading-relaxed max-w-3xl">
            Avance progressivamente pelas 4 missões oficiais das startups expositoras. Cada desafio completado desbloqueia automaticamente o próximo da jornada.
          </p>
        </div>

        {/* Status Badge no Header */}
        <div className="px-3.5 py-2 rounded-xl bg-tutu-secondary/25 border border-tutu-secondary/50 text-xs text-tutu-light/85 flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Sparkles className="w-4 h-4 text-tutu-lime shrink-0" />
          <span>
            {isAllCompleted
              ? 'Circuito 100% Concluído'
              : `Missão ${currentMission?.sequenceOrder || (completedMissions.length + 1)} de ${sequentialMissions.length || 4}`}
          </span>
        </div>
      </div>

      {/* Indicador Compacto de Progresso (Sem cartões ou detalhes de missões futuras) */}
      <div className="tutu-card p-4 sm:p-5 border border-tutu-secondary/40 bg-tutu-dark/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-tutu-lime/10 border border-tutu-lime/30 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-tutu-lime" />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-tutu-light/60 block">
                Progresso do Circuito
              </span>
              <p className="text-base sm:text-lg font-bold text-tutu-light">
                {isAllCompleted
                  ? 'Circuito 100% Concluído'
                  : `Missão ${currentMission?.sequenceOrder || (completedMissions.length + 1)} de ${sequentialMissions.length || 4}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-72">
            <div className="flex-1 bg-tutu-secondary/30 rounded-full h-2.5 overflow-hidden p-0.5 border border-tutu-secondary/40">
              <div
                className="bg-tutu-lime h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(208,255,0,0.5)]"
                style={{
                  width: `${(completedMissions.length / Math.max(1, sequentialMissions.length || 4)) * 100}%`,
                }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-tutu-lime shrink-0">
              {completedMissions.length} de {sequentialMissions.length || 4} concluídas
            </span>
          </div>
        </div>
      </div>

      {/* CASO 1: CIRCUITO 100% CONCLUÍDO */}
      {isAllCompleted ? (
        <div className="tutu-card p-6 sm:p-10 text-center space-y-5 sm:space-y-6 border-2 border-tutu-lime bg-tutu-secondary/30 shadow-2xl">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-tutu-lime/20 border-2 border-tutu-lime flex items-center justify-center text-tutu-lime mx-auto shadow-lg">
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>

          <div className="space-y-2 max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tutu-lime text-tutu-dark text-xs font-bold uppercase tracking-wider">
              <Crown className="w-3.5 h-3.5 shrink-0" />
              <span>Circuito Oficial Completo</span>
            </div>
            <h2 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
              Parabéns! Você concluiu todas as 4 missões!
            </h2>
            <p className="text-xs sm:text-sm text-tutu-light/85 leading-relaxed">
              Você completou com sucesso a jornada pelas quatro startups expositoras (Tutu, Escreve Lab, Futurize e Startup Convidada). Todos os pontos-base e bônus de velocidade foram contabilizados no seu saldo oficial.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              to="/app/ranking"
              className="min-h-[46px] w-full sm:w-auto px-6 py-2.5 rounded-xl btn-tutu-lime text-xs font-bold flex items-center justify-center gap-2"
            >
              <Trophy className="w-4 h-4 shrink-0" />
              <span>Ver Minha Posição no Ranking</span>
            </Link>
            <Link
              to="/app/perfil"
              className="min-h-[46px] w-full sm:w-auto px-6 py-2.5 rounded-xl btn-tutu-outline text-xs font-semibold flex items-center justify-center gap-2"
            >
              <span>Ver Perfil e Conquistas</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </Link>
          </div>
        </div>
      ) : currentMission ? (
        /* CASO 2: EXIBIÇÃO DE APENAS UMA MISSÃO POR VEZ (A ATUAL LIBERADA) */
        <div className="space-y-4">
          <div className="tutu-card p-6 sm:p-8 space-y-6 border-2 border-tutu-lime bg-tutu-secondary/20 shadow-xl relative overflow-hidden">
            {/* Top Bar da Missão Atual */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-3 py-1 rounded-full bg-tutu-lime text-tutu-dark text-xs font-bold uppercase tracking-wider">
                  Missão Ativa • Missão {currentMission.sequenceOrder} de {sequentialMissions.length || 4}
                </span>
                <CategoryPill category={currentMission.category} />
                <span className="text-xs text-tutu-light/80 font-semibold">
                  • {currentMission.startupName}
                </span>
              </div>
              <MissionStatusBadge status={currentMission.status} />
            </div>

            {/* Título & Descrição Nobres */}
            <div className="space-y-2">
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-tutu-light">
                {currentMission.title}
              </h2>
              <p className="text-xs sm:text-sm text-tutu-light/85 leading-relaxed max-w-4xl">
                {currentMission.description}
              </p>
            </div>

            {/* Recompensas e Informações */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 sm:p-4 rounded-2xl bg-tutu-dark/80 border border-tutu-secondary/50 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-tutu-lime/15 text-tutu-lime flex items-center justify-center shrink-0 border border-tutu-lime/30">
                  <Zap className="w-4 h-4 fill-tutu-lime" />
                </div>
                <div>
                  <span className="text-[11px] text-tutu-light/65 block">Pontuação de Conclusão</span>
                  <span className="font-display font-bold text-sm text-tutu-lime">
                    +{formatPoints(currentMission.points)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-tutu-blue/20 text-tutu-light flex items-center justify-center shrink-0 border border-tutu-blue/40">
                  <Sparkles className="w-4 h-4 text-tutu-lime" />
                </div>
                <div>
                  <span className="text-[11px] text-tutu-light/65 block">Bônus por Velocidade</span>
                  <span className="font-display font-bold text-sm text-tutu-lime">
                    Até +50 pts extras
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-tutu-dark text-tutu-light/80 flex items-center justify-center shrink-0 border border-tutu-secondary/40">
                  <Clock className="w-4 h-4 text-tutu-lime" />
                </div>
                <div>
                  <span className="text-[11px] text-tutu-light/65 block">Tempo Estimado</span>
                  <span className="font-medium text-tutu-light">
                    {currentMission.estimatedTime} ({currentMission.period})
                  </span>
                </div>
              </div>
            </div>

            {/* Cronômetro e Bônus de Velocidade Integrado */}
            <MissionTimer
              status={currentMission.status}
              startedAtMs={currentMission.startedAtMs}
              durationSeconds={currentMission.durationSeconds}
              targetEndAtMs={currentMission.targetEndAtMs}
              serverTimeMs={currentMission.serverTimeMs}
              completedAtMs={currentMission.completedAtMs}
              elapsedSeconds={currentMission.elapsedSeconds}
              speedBonusAwarded={currentMission.speedBonusAwarded}
            />

            {/* Critérios e Ação Principal */}
            <div className="pt-4 border-t border-tutu-secondary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-0.5 min-w-0 max-w-xl">
                <span className="text-[11px] font-bold uppercase tracking-wider text-tutu-lime block">
                  Critério de Validação Oficial:
                </span>
                <p className="text-xs text-tutu-light/80 leading-relaxed">
                  {currentMission.completionCriteria}
                </p>
              </div>

              <button
                type="button"
                onClick={() => handleActionClick(currentMission)}
                className={`min-h-[48px] w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shrink-0 transition-all shadow-md ${
                  currentMission.status === 'Em andamento'
                    ? 'btn-tutu-lime'
                    : currentMission.status === 'Aguardando validação'
                    ? 'bg-tutu-secondary/40 text-tutu-light border border-tutu-secondary/60'
                    : 'btn-tutu-lime'
                }`}
              >
                {currentMission.status === 'Disponível' && (
                  <>
                    <Play className="w-4 h-4 shrink-0 fill-current" />
                    <span>
                      {currentMission.qrCodeRequired
                        ? `Iniciar Missão & Validar QR (${currentMission.qrCodeRequired})`
                        : currentMission.category === 'Quiz'
                        ? 'Iniciar Missão & Abrir Quiz'
                        : 'Iniciar Missão Agora'}
                    </span>
                  </>
                )}
                {currentMission.status === 'Em andamento' && (
                  <>
                    {currentMission.category === 'Quiz' ? (
                      <>
                        <HelpCircle className="w-4 h-4 shrink-0" />
                        <span>Responder Quiz Interativo</span>
                      </>
                    ) : currentMission.category === 'Compartilhamento' ? (
                      <>
                        <Send className="w-4 h-4 shrink-0" />
                        <span>Enviar Registro de Evidência</span>
                      </>
                    ) : currentMission.qrCodeRequired ? (
                      <>
                        <QrCode className="w-4 h-4 shrink-0" />
                        <span>Escanear QR Code ({currentMission.qrCodeRequired})</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Confirmar Conclusão da Missão</span>
                      </>
                    )}
                  </>
                )}
                {currentMission.status === 'Aguardando validação' && (
                  <>
                    <Send className="w-4 h-4 shrink-0" />
                    <span>Evidência Enviada • Aguardando Validação</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Histórico Discreto de Missões Concluídas (Colapsável) */}
      {completedMissions.length > 0 && (
        <div className="tutu-card overflow-hidden border border-tutu-secondary/35 bg-tutu-dark/50">
          <button
            type="button"
            onClick={() => setShowCompletedHistory((prev) => !prev)}
            className="w-full p-4 flex items-center justify-between text-left text-xs font-semibold text-tutu-light hover:bg-tutu-secondary/20 transition-colors"
          >
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-tutu-lime shrink-0" />
              <span>
                Histórico de Missões Concluídas ({completedMissions.length} de {sequentialMissions.length})
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-tutu-light/60">
              <span className="text-[11px]">
                {showCompletedHistory ? 'Recolher' : 'Exibir'}
              </span>
              {showCompletedHistory ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {showCompletedHistory && (
            <div className="divide-y divide-tutu-secondary/30 border-t border-tutu-secondary/30 p-2 sm:p-3 bg-tutu-dark/80">
              {completedMissions.map((m) => (
                <div
                  key={m.id}
                  className="p-3 sm:p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-xl hover:bg-tutu-secondary/15 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-7 h-7 rounded-lg bg-tutu-lime/20 text-tutu-lime border border-tutu-lime/40 flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4 h-4" />
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-semibold text-tutu-light truncate">
                        Etapa {m.sequenceOrder}: {m.title}
                      </h4>
                      <p className="text-[11px] text-tutu-light/60 truncate">
                        {m.startupName} • {m.completionCriteria}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto text-xs">
                    <span className="text-tutu-lime font-bold">
                      +{formatPoints(m.points)}
                    </span>
                    {m.speedBonusAwarded ? (
                      <span className="px-2 py-0.5 rounded bg-tutu-lime/10 text-tutu-lime text-[10px] font-bold border border-tutu-lime/30">
                        +{m.speedBonusAwarded} bônus
                      </span>
                    ) : null}
                    <span className="px-2 py-0.5 rounded-full bg-tutu-secondary/30 text-tutu-light/75 text-[10px]">
                      Concluída
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
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
                        className={`flex items-start gap-3 p-3 rounded-lg border text-xs cursor-pointer transition-colors ${
                          quizAnswers[qIdx] === optIdx
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
                placeholder="Ex.: Participei da dinâmica no estande e recebi a validação da equipe"
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
