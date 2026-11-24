import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import {
  AlertCircle,
  ArrowRight,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Crown,
  Download,
  ExternalLink,
  Eye,
  FileText,
  Film,
  HelpCircle,
  History,
  Loader2,
  Paperclip,
  Play,
  QrCode,
  Send,
  Sparkles,
  Trophy,
  Upload,
  X,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { EvidenceRequirementType, Mission, MissionCompletion } from '../types';
import { CategoryPill, MissionStatusBadge } from '../components/UI';
import { MissionTimer } from '../components/MissionTimer';
import { formatPoints } from '../utils/formatters';
import { fetchAuthenticatedEvidenceBlob } from '../services/apiClient';

const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_EVIDENCE_BYTES = 25 * 1024 * 1024;

const OFFICIAL_TRACK_TABS = [
  { id: 'ex_devedor', label: 'Ex Devedor', subtitle: '3 missões' },
  { id: 'sign', label: 'Sign', subtitle: '3 missões' },
  { id: 'editora_escreva', label: 'Editora Escreva', subtitle: '3 missões' },
  { id: 'bonus', label: 'Missões Bônus', subtitle: 'Trilha bônus' },
] as const;

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2).replace('.', ',')} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function getEvidenceRequirementsLabel(
  type?: EvidenceRequirementType,
  maxVideoSeconds?: number | null
): string {
  const durHint = maxVideoSeconds ? ` até ${maxVideoSeconds}s` : '';
  if (type === 'text') return 'Resposta em texto (sem envio de arquivo)';
  if (type === 'print') return 'Print de tela (JPG, PNG ou WEBP • máx. 5 MB)';
  if (type === 'video') return `Vídeo obrigatório (MP4, MOV ou WEBM${durHint} • máx. 25 MB)`;
  if (type === 'photo_or_video')
    return `Foto/Print (máx. 5 MB) ou Vídeo (MP4, MOV, WEBM${durHint} • máx. 25 MB)`;
  if (type === 'file') return 'Arquivo (PDF, JPG, PNG ou WEBP • máx. 5 MB)';
  if (type === 'both') return 'Foto ou Arquivo (JPG, PNG, WEBP ou PDF • máx. 5 MB)';
  return 'Foto (JPG, JPEG, PNG ou WEBP • máx. 5 MB)';
}

function getEvidenceAcceptAttr(type?: EvidenceRequirementType): string {
  if (type === 'video') {
    return 'video/mp4,video/quicktime,video/webm,.mp4,.mov,.webm';
  }
  if (type === 'photo_or_video') {
    return 'image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,.jpg,.jpeg,.png,.webp,.mp4,.mov,.webm';
  }
  if (type === 'file' || type === 'both') {
    return 'image/jpeg,image/png,image/webp,application/pdf,.jpg,.jpeg,.png,.webp,.pdf';
  }
  return 'image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp';
}

export const MissionsCenterPage: React.FC = () => {
  const {
    participant,
    missions,
    validationQueue,
    startMission,
    completeMissionInstant,
    submitMissionEvidence,
    uploadMissionEvidence,
    notify,
  } = useAppStore();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Trilha selecionada (quando o catálogo de 4 trilhas está ativo)
  const hasMultiTracks = missions.some((m) => Boolean(m.trackId) && m.active);
  const queryTrack = searchParams.get('track');
  const [selectedTrackId, setSelectedTrackId] = useState<string>(
    queryTrack && OFFICIAL_TRACK_TABS.some((t) => t.id === queryTrack) ? queryTrack : 'ex_devedor'
  );

  useEffect(() => {
    if (queryTrack && OFFICIAL_TRACK_TABS.some((t) => t.id === queryTrack)) {
      setSelectedTrackId(queryTrack);
    }
  }, [queryTrack]);

  // Estados de modais interativos (Quiz / Evidência)
  const [activeQuizMission, setActiveQuizMission] = useState<Mission | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});
  const [evidenceMission, setEvidenceMission] = useState<Mission | null>(null);
  const [evidenceText, setEvidenceText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);
  const [startingMissionId, setStartingMissionId] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<{ url: string; fileName: string } | null>(null);
  const [loadingEvidenceId, setLoadingEvidenceId] = useState<string | null>(null);
  const [showCompletedHistory, setShowCompletedHistory] = useState(false);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  useEffect(() => {
    return () => {
      if (previewModal?.url) URL.revokeObjectURL(previewModal.url);
    };
  }, [previewModal]);

  const resetEvidenceModal = () => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setFilePreviewUrl(null);
    setSelectedFile(null);
    setUploadError(null);
    setEvidenceText('');
    setEvidenceMission(null);
  };

  const handleOpenOwnEvidence = async (submission: MissionCompletion) => {
    setLoadingEvidenceId(submission.id);
    const res = await fetchAuthenticatedEvidenceBlob(submission.id);
    setLoadingEvidenceId(null);

    if (!res.ok || !res.blob) {
      notify(
        'Não foi possível abrir a evidência',
        res.error || 'Erro ao carregar arquivo autenticado.',
        'error'
      );
      return;
    }

    const mime = res.mimeType || submission.evidenceMimeType || '';
    const fileName = res.fileName || submission.evidenceFileName || 'evidencia';
    const blobUrl = URL.createObjectURL(res.blob);

    if (mime.startsWith('image/')) {
      setPreviewModal({ url: blobUrl, fileName });
      return;
    }

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  };

  const handleSelectEvidenceFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
      setFilePreviewUrl(null);
    }
    setUploadError(null);

    if (!file) {
      setSelectedFile(null);
      return;
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const evType = evidenceMission?.evidenceType;
    const isVideoFile = ['mp4', 'mov', 'webm'].includes(ext) || file.type.startsWith('video/');

    const allowedExts =
      evType === 'video'
        ? ['mp4', 'mov', 'webm']
        : evType === 'photo_or_video'
        ? ['jpg', 'jpeg', 'png', 'webp', 'mp4', 'mov', 'webm']
        : evType === 'file' || evType === 'both'
        ? ['jpg', 'jpeg', 'png', 'webp', 'pdf']
        : ['jpg', 'jpeg', 'png', 'webp'];

    if (!allowedExts.includes(ext)) {
      setSelectedFile(null);
      setUploadError(
        evType === 'video'
          ? 'Esta missão exige obrigatoriamente um vídeo (MP4, MOV ou WEBM). Não é permitida substituição por foto ou texto.'
          : evType === 'photo_or_video'
          ? 'Envie uma foto/print (JPG, PNG, WEBP) ou um vídeo (MP4, MOV, WEBM).'
          : evType === 'photo' || evType === 'print'
          ? 'Esta missão aceita somente imagens nos formatos JPG, JPEG, PNG ou WEBP.'
          : 'Formato não permitido. Envie um arquivo JPG, JPEG, PNG, WEBP ou PDF.'
      );
      return;
    }

    const limitBytes = isVideoFile ? MAX_VIDEO_EVIDENCE_BYTES : MAX_EVIDENCE_BYTES;
    if (file.size > limitBytes) {
      setSelectedFile(null);
      setUploadError(
        `O arquivo ultrapassa o limite máximo de ${Math.round(limitBytes / (1024 * 1024))} MB. Escolha um arquivo menor.`
      );
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      setFilePreviewUrl(URL.createObjectURL(file));
    }
  };

  // Todas as missões oficiais ativas (todas as trilhas)
  const allOfficialMissions = missions.filter(
    (m) => m.sequenceOrder !== null && m.sequenceOrder !== undefined && m.active
  );

  // Missão atualmente em execução no cronômetro global (em qualquer trilha)
  const globalRunningMission =
    allOfficialMissions.find((m) => m.status === 'Em andamento' && !m.isExpired) || null;

  // Missões sequenciais da trilha selecionada (ou circuito único no modo legado)
  const sequentialMissions = (
    hasMultiTracks
      ? allOfficialMissions.filter((m) => m.trackId === selectedTrackId)
      : allOfficialMissions
  ).sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0));

  // Missões extras ativas que exigem evidência (independentes da sequência oficial)
  const extraEvidenceMissions = missions.filter(
    (m) => (m.sequenceOrder === null || m.sequenceOrder === undefined) && m.active && m.requiresEvidence
  );

  // A missão ativa atual é a primeira da sequência cujo status NÃO seja 'Concluída'
  const currentMission = sequentialMissions.find((m) => m.status !== 'Concluída') || null;
  const isAllCompleted =
    sequentialMissions.length > 0 &&
    sequentialMissions.every((m) => m.status === 'Concluída');
  const completedMissions = sequentialMissions.filter((m) => m.status === 'Concluída');
  const getOwnSubmissionForMission = (missionId: string): MissionCompletion | undefined =>
    validationQueue.find(
      (v) => v.missionId === missionId && v.participantId === participant.id
    );
  const currentMissionSubmission = currentMission
    ? getOwnSubmissionForMission(currentMission.id)
    : undefined;

  const handleActionClick = async (mission: Mission) => {
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

    // Cronômetro global único: avisa antes de tentar iniciar outra missão enquanto existe uma em execução
    if (
      globalRunningMission &&
      globalRunningMission.id !== mission.id &&
      mission.status === 'Disponível'
    ) {
      notify(
        'Cronômetro Global em Execução',
        `Você já está executando "${globalRunningMission.title}". Envie a evidência dela antes de iniciar outra missão.`,
        'error'
      );
      if (globalRunningMission.trackId) {
        setSelectedTrackId(globalRunningMission.trackId);
        setSearchParams({ track: globalRunningMission.trackId });
      }
      return;
    }

    // ETAPA 1: Iniciar missão no servidor (sem abrir o modal de evidência automaticamente)
    // Mantém o participante na tela da missão com o cronômetro regressivo visível em tempo real.
    const isOfficialMission =
      mission.sequenceOrder !== null && mission.sequenceOrder !== undefined;
    if (isOfficialMission && mission.status === 'Disponível') {
      if (startingMissionId) return;
      setStartingMissionId(mission.id);
      try {
        await startMission(mission.id);
      } finally {
        setStartingMissionId(null);
      }
      return;
    }

    // ETAPA 2: Com a missão confirmada 'Em andamento', abre o fluxo de envio de evidência
    if (mission.requiresEvidence) {
      const existing = getOwnSubmissionForMission(mission.id);
      if (
        mission.status === 'Aguardando validação' ||
        existing?.status === 'Pendente' ||
        existing?.status === 'Aprovada'
      ) {
        notify(
          'Evidência Já Enviada',
          'Sua evidência já foi registrada e está aguardando análise da equipe organizadora.',
          'info'
        );
        return;
      }

      if (filePreviewUrl) {
        URL.revokeObjectURL(filePreviewUrl);
        setFilePreviewUrl(null);
      }
      setSelectedFile(null);
      setUploadError(null);
      setEvidenceText('');
      setEvidenceMission(mission);
      return;
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

  const handleEvidenceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evidenceMission) return;

    if (evidenceMission.requiresEvidence && evidenceMission.evidenceType !== 'text') {
      if (!selectedFile) {
        setUploadError('Selecione um arquivo válido antes de enviar sua evidência.');
        return;
      }
      setIsUploadingEvidence(true);
      setUploadError(null);
      const res = await uploadMissionEvidence(
        evidenceMission.id,
        selectedFile,
        evidenceText.trim() || undefined
      );
      setIsUploadingEvidence(false);

      if (res.ok) {
        resetEvidenceModal();
      } else {
        setUploadError(res.error || 'Falha ao enviar evidência.');
      }
      return;
    }

    if (evidenceText.trim().length < 5) {
      setUploadError('Escreva sua resposta em texto (mínimo de 5 caracteres) antes de enviar.');
      return;
    }

    submitMissionEvidence(evidenceMission.id, evidenceText.trim());
    resetEvidenceModal();
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
            Avance progressivamente pelas missões oficiais das startups expositoras. Cada desafio completado desbloqueia automaticamente o próximo da jornada.
          </p>
        </div>

        {/* Status Badge no Header */}
        <div className="px-3.5 py-2 rounded-xl bg-tutu-secondary/25 border border-tutu-secondary/50 text-xs text-tutu-light/85 flex items-center gap-2 self-start sm:self-auto shrink-0">
          <Sparkles className="w-4 h-4 text-tutu-lime shrink-0" />
          <span>
            {isAllCompleted
              ? 'Circuito 100% Concluído'
              : `Missão ${currentMission?.sequenceOrder || (completedMissions.length + 1)} de ${sequentialMissions.length}`}
          </span>
        </div>
      </div>

      {/* Seletor das 4 Trilhas Independentes (Catálogo Oficial 2026) */}
      {hasMultiTracks && (
        <div className="space-y-3">
          {globalRunningMission && globalRunningMission.trackId !== selectedTrackId && (
            <div className="p-3.5 rounded-xl bg-tutu-lime/15 border border-tutu-lime/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
              <div className="flex items-center gap-2 text-tutu-light">
                <Clock className="w-4 h-4 text-tutu-lime animate-pulse shrink-0" />
                <span>
                  Cronômetro global ativo na missão <strong>{globalRunningMission.title}</strong> ({globalRunningMission.startupName}).
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (globalRunningMission.trackId) {
                    setSelectedTrackId(globalRunningMission.trackId);
                    setSearchParams({ track: globalRunningMission.trackId });
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-tutu-lime text-tutu-dark font-bold text-xs shrink-0"
              >
                Voltar à Missão em Execução
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
            {OFFICIAL_TRACK_TABS.map((tab) => {
              const trackMissions = allOfficialMissions.filter((m) => m.trackId === tab.id);
              const doneCount = trackMissions.filter((m) => m.status === 'Concluída').length;
              const isRunningHere = globalRunningMission?.trackId === tab.id;
              const isSelected = selectedTrackId === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSelectedTrackId(tab.id);
                    setSearchParams({ track: tab.id });
                  }}
                  className={`p-3.5 rounded-2xl border text-left transition-all space-y-1 ${
                    isSelected
                      ? 'bg-tutu-lime/15 border-tutu-lime text-tutu-light shadow-md'
                      : 'bg-tutu-dark/70 border-tutu-secondary/40 text-tutu-light/80 hover:border-tutu-lime/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display font-bold text-sm text-tutu-light truncate">
                      {tab.label}
                    </span>
                    {isRunningHere && (
                      <span className="w-2 h-2 rounded-full bg-tutu-lime animate-pulse shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-tutu-light/65">
                    <span>{tab.id === 'bonus' ? 'Trilha Bônus' : 'Trilha Startup'}</span>
                    <span className="font-mono font-bold text-tutu-lime">
                      {doneCount}/{trackMissions.length}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

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
                  : `Missão ${currentMission?.sequenceOrder || (completedMissions.length + 1)} de ${sequentialMissions.length}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-72">
            <div className="flex-1 bg-tutu-secondary/30 rounded-full h-2.5 overflow-hidden p-0.5 border border-tutu-secondary/40">
              <div
                className="bg-tutu-lime h-full rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(208,255,0,0.5)]"
                style={{
                  width: `${(completedMissions.length / Math.max(1, sequentialMissions.length)) * 100}%`,
                }}
              />
            </div>
            <span className="text-xs font-mono font-bold text-tutu-lime shrink-0">
              {completedMissions.length} de {sequentialMissions.length} concluídas
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
              Parabéns! Você concluiu todas as missões oficiais!
            </h2>
            <p className="text-xs sm:text-sm text-tutu-light/85 leading-relaxed">
              Você completou com sucesso a jornada pelas startups expositoras do circuito oficial. Todos os pontos de conclusão e bônus de velocidade foram contabilizados no seu saldo oficial.
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
              <span>Ver Meu Perfil</span>
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
                  Missão Ativa • Missão {currentMission.sequenceOrder} de {sequentialMissions.length}
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
              <p className="text-xs sm:text-sm text-tutu-light/85 leading-relaxed max-w-4xl whitespace-pre-line">
                {currentMission.description}
              </p>
              {currentMission.externalLink && (
                <a
                  href={currentMission.externalLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-tutu-lime/15 border border-tutu-lime/40 hover:bg-tutu-lime/25 text-xs font-semibold text-tutu-lime transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  <span>Acessar Plataforma ({currentMission.externalLink})</span>
                </a>
              )}
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
                    +{formatPoints(currentMission.completionPoints ?? currentMission.points)}
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
                    {currentMission.maxSpeedBonus !== undefined
                      ? `Até +${currentMission.maxSpeedBonus} pts extras`
                      : 'Bônus proporcional por agilidade'}
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
              completionPoints={currentMission.completionPoints ?? currentMission.points}
              maxSpeedBonus={currentMission.maxSpeedBonus}
              potentialSpeedBonus={currentMission.potentialSpeedBonus}
            />

            {/* Requisito de Evidência Obrigatória (Etapa 5) */}
            {currentMission.requiresEvidence && (
              <div className="p-4 rounded-2xl bg-tutu-blue/15 border border-tutu-blue/40 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-tutu-lime">
                    {currentMission.evidenceType === 'video' ? (
                      <Film className="w-4 h-4 shrink-0" />
                    ) : currentMission.evidenceType === 'photo' || currentMission.evidenceType === 'print' ? (
                      <Camera className="w-4 h-4 shrink-0" />
                    ) : currentMission.evidenceType === 'text' ? (
                      <FileText className="w-4 h-4 shrink-0" />
                    ) : (
                      <Paperclip className="w-4 h-4 shrink-0" />
                    )}
                    <span>Evidência Obrigatória para Conclusão</span>
                  </div>
                  <span className="text-[11px] font-semibold text-tutu-light/85 px-2.5 py-0.5 rounded-full bg-tutu-dark/70 border border-tutu-secondary/40">
                    {getEvidenceRequirementsLabel(
                      currentMission.evidenceType,
                      currentMission.maxVideoSeconds
                    )}
                  </span>
                </div>
                <p className="text-xs text-tutu-light/80 leading-relaxed">
                  Envie o comprovante exigido para análise administrativa. Os pontos desta missão serão liberados após a aprovação da sua evidência.
                </p>

                {currentMissionSubmission && (
                  <div className="pt-2 border-t border-tutu-secondary/30 space-y-2 text-xs">
                    {currentMissionSubmission.status === 'Rejeitada' &&
                      currentMissionSubmission.rejectionReason && (
                        <div className="p-2.5 rounded-xl bg-red-500/15 border border-red-400/40 text-red-200 flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-300" />
                          <div>
                            <span className="font-bold block">Motivo da reprovação:</span>
                            <span>{currentMissionSubmission.rejectionReason}</span>
                          </div>
                        </div>
                      )}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-2 min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          currentMissionSubmission.status === 'Aprovada'
                            ? 'bg-tutu-lime text-tutu-dark'
                            : currentMissionSubmission.status === 'Rejeitada'
                            ? 'bg-red-500/20 text-red-200 border border-red-400/40'
                            : 'bg-tutu-blue text-tutu-light'
                        }`}
                      >
                        Status: {currentMissionSubmission.status}
                      </span>
                      {currentMissionSubmission.evidenceFileName && (
                        <span className="text-tutu-light/80 truncate max-w-xs">
                          {currentMissionSubmission.evidenceFileName}
                          {currentMissionSubmission.evidenceSizeBytes
                            ? ` (${formatFileSize(currentMissionSubmission.evidenceSizeBytes)})`
                            : ''}
                        </span>
                      )}
                    </div>

                    {currentMissionSubmission.hasFile && (
                      <button
                        type="button"
                        onClick={() => handleOpenOwnEvidence(currentMissionSubmission)}
                        disabled={loadingEvidenceId === currentMissionSubmission.id}
                        className="px-3 py-1.5 rounded-lg bg-tutu-dark/80 border border-tutu-lime/40 text-tutu-lime hover:bg-tutu-lime/10 text-[11px] font-semibold inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 disabled:opacity-50"
                      >
                        {loadingEvidenceId === currentMissionSubmission.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : currentMissionSubmission.evidenceMimeType?.startsWith('image/') ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>
                          {currentMissionSubmission.evidenceMimeType?.startsWith('image/')
                            ? 'Ver Minha Evidência'
                            : 'Baixar Minha Evidência'}
                        </span>
                      </button>
                    )}
                    </div>
                  </div>
                )}
              </div>
            )}

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
                onClick={() => void handleActionClick(currentMission)}
                disabled={startingMissionId === currentMission.id}
                className={`min-h-[48px] w-full sm:w-auto px-6 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shrink-0 transition-all shadow-md disabled:opacity-60 ${
                  currentMission.status === 'Em andamento'
                    ? 'btn-tutu-lime'
                    : currentMission.status === 'Aguardando validação'
                    ? 'bg-tutu-secondary/40 text-tutu-light border border-tutu-secondary/60'
                    : 'btn-tutu-lime'
                }`}
              >
                {currentMission.status === 'Disponível' && (
                  <>
                    {startingMissionId === currentMission.id ? (
                      <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4 shrink-0 fill-current" />
                    )}
                    <span>
                      {startingMissionId === currentMission.id
                        ? 'Iniciando Missão...'
                        : 'Iniciar Missão'}
                    </span>
                  </>
                )}
                {currentMission.status === 'Em andamento' && (
                  <>
                    {currentMission.requiresEvidence ? (
                      <>
                        <Upload className="w-4 h-4 shrink-0" />
                        <span>
                          {currentMissionSubmission?.status === 'Rejeitada'
                            ? 'Reenviar Evidência'
                            : 'Enviar Evidência'}
                        </span>
                      </>
                    ) : currentMission.category === 'Quiz' ? (
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

      {/* Missões Extras com Evidência Obrigatória (independentes da sequência oficial) */}
      {extraEvidenceMissions.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-tutu-lime block">
                Atividades Complementares • Fora do Circuito Oficial
              </span>
              <h2 className="font-display font-bold text-xl sm:text-2xl text-tutu-light">
                Missões Extras com Evidência
              </h2>
            </div>
            <span className="text-xs text-tutu-light/65">
              Não alteram a ordem nem a reserva do circuito oficial.
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {extraEvidenceMissions.map((extraMission) => {
              const extraSub = getOwnSubmissionForMission(extraMission.id);
              const isApproved = extraSub?.status === 'Aprovada' || extraMission.status === 'Concluída';
              const isPending = extraSub?.status === 'Pendente';
              const isRejected = extraSub?.status === 'Rejeitada';

              return (
                <div
                  key={extraMission.id}
                  className="tutu-card p-5 space-y-4 border border-tutu-secondary/50 bg-tutu-dark/75 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full bg-tutu-secondary/40 border border-tutu-secondary/60 text-[11px] font-bold text-tutu-light">
                          Missão Extra
                        </span>
                        <CategoryPill category={extraMission.category} />
                      </div>
                      <span className="text-xs font-display font-bold text-tutu-lime flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 fill-tutu-lime" />
                        +{formatPoints(extraMission.points)}
                      </span>
                    </div>

                    <div>
                      <h3 className="font-display font-bold text-lg text-tutu-light">
                        {extraMission.title}
                      </h3>
                      <p className="text-xs text-tutu-light/70 mt-0.5">
                        {extraMission.startupName} • {extraMission.period}
                      </p>
                      <p className="text-xs text-tutu-light/85 mt-2 leading-relaxed">
                        {extraMission.description}
                      </p>
                    </div>

                    <div className="p-3 rounded-xl bg-tutu-blue/15 border border-tutu-blue/35 text-[11px] text-tutu-light/85 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-tutu-lime">
                        {extraMission.evidenceType === 'photo' ? (
                          <Camera className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <Paperclip className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{getEvidenceRequirementsLabel(extraMission.evidenceType)}</span>
                      </div>
                      <p className="text-tutu-light/75">{extraMission.completionCriteria}</p>
                    </div>

                    {extraSub && (
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isApproved
                              ? 'bg-tutu-lime text-tutu-dark'
                              : isRejected
                              ? 'bg-red-500/20 text-red-200 border border-red-400/40'
                              : 'bg-tutu-blue text-tutu-light'
                          }`}
                        >
                          Evidência: {extraSub.status}
                        </span>
                        {extraSub.hasFile && (
                          <button
                            type="button"
                            onClick={() => handleOpenOwnEvidence(extraSub)}
                            disabled={loadingEvidenceId === extraSub.id}
                            className="px-2.5 py-1 rounded-lg bg-tutu-dark/80 border border-tutu-lime/35 text-tutu-lime hover:bg-tutu-lime/10 text-[11px] font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                          >
                            {loadingEvidenceId === extraSub.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : extraSub.evidenceMimeType?.startsWith('image/') ? (
                              <Eye className="w-3 h-3" />
                            ) : (
                              <Download className="w-3 h-3" />
                            )}
                            <span>Ver/Baixar Evidência</span>
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleActionClick(extraMission)}
                    disabled={isApproved || isPending}
                    className={`min-h-[44px] w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                      isApproved
                        ? 'bg-tutu-lime/15 text-tutu-lime border border-tutu-lime/40 cursor-default'
                        : isPending
                        ? 'bg-tutu-secondary/40 text-tutu-light border border-tutu-secondary/60 cursor-default'
                        : 'btn-tutu-lime'
                    }`}
                  >
                    {isApproved ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 shrink-0" />
                        <span>Evidência Aprovada</span>
                      </>
                    ) : isPending ? (
                      <>
                        <Send className="w-4 h-4 shrink-0" />
                        <span>Aguardando Validação</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 shrink-0" />
                        <span>
                          {isRejected ? 'Reenviar Evidência' : 'Enviar Evidência'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

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
              {completedMissions.map((m) => {
                const ownSub = getOwnSubmissionForMission(m.id);
                return (
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

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-end sm:self-auto text-xs">
                    {ownSub?.hasFile && (
                      <button
                        type="button"
                        onClick={() => handleOpenOwnEvidence(ownSub)}
                        disabled={loadingEvidenceId === ownSub.id}
                        className="px-2.5 py-1 rounded-lg bg-tutu-dark/80 border border-tutu-lime/35 text-tutu-lime hover:bg-tutu-lime/10 text-[10px] font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                      >
                        {loadingEvidenceId === ownSub.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : ownSub.evidenceMimeType?.startsWith('image/') ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <Download className="w-3 h-3" />
                        )}
                        <span>Evidência</span>
                      </button>
                    )}
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
                );
              })}
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
      {evidenceMission && (() => {
        const liveEvidenceMission =
          missions.find((m) => m.id === evidenceMission.id) || evidenceMission;
        return (
        <div className="fixed inset-0 z-50 bg-tutu-dark/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="tutu-card max-w-lg w-full max-h-[90vh] overflow-y-auto p-5 sm:p-8 space-y-5 border-2 border-tutu-lime">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-xs font-bold uppercase text-tutu-lime">
                  {evidenceMission.requiresEvidence
                    ? 'Envio de Evidência Obrigatória'
                    : 'Envio para Curadoria'}
                </span>
                <h3 className="font-display font-bold text-xl sm:text-2xl text-tutu-light mt-1">
                  {evidenceMission.title}
                </h3>
                <p className="text-xs text-tutu-light/75 mt-1 leading-relaxed">
                  {evidenceMission.requiresEvidence && evidenceMission.evidenceType !== 'text'
                    ? `Anexe sua comprovação (${getEvidenceRequirementsLabel(evidenceMission.evidenceType, evidenceMission.maxVideoSeconds)}) para análise administrativa.`
                    : 'Escreva sua resposta completa abaixo para enviar à fila de validação administrativa.'}
                </p>
              </div>
              <button
                type="button"
                onClick={resetEvidenceModal}
                disabled={isUploadingEvidence}
                className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg bg-tutu-secondary/30 text-tutu-light/70 hover:text-tutu-light shrink-0"
                aria-label="Fechar modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {liveEvidenceMission.status === 'Em andamento' && liveEvidenceMission.startedAtMs && (
              <MissionTimer
                compact
                status={liveEvidenceMission.status}
                startedAtMs={liveEvidenceMission.startedAtMs}
                durationSeconds={liveEvidenceMission.durationSeconds}
                targetEndAtMs={liveEvidenceMission.targetEndAtMs}
                serverTimeMs={liveEvidenceMission.serverTimeMs}
                completionPoints={liveEvidenceMission.completionPoints ?? liveEvidenceMission.points}
                maxSpeedBonus={liveEvidenceMission.maxSpeedBonus}
                potentialSpeedBonus={liveEvidenceMission.potentialSpeedBonus}
              />
            )}

            <form onSubmit={handleEvidenceSubmit} className="space-y-4">
              {evidenceMission.requiresEvidence && evidenceMission.evidenceType !== 'text' ? (
                <>
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-tutu-light">
                      Arquivo de Evidência *
                    </label>
                    <label className="flex flex-col items-center justify-center gap-2 p-5 rounded-xl border-2 border-dashed border-tutu-lime/40 bg-tutu-dark/70 hover:border-tutu-lime cursor-pointer transition-colors text-center">
                      <Upload className="w-6 h-6 text-tutu-lime" />
                      <span className="text-xs font-semibold text-tutu-light">
                        {selectedFile
                          ? 'Clique para trocar o arquivo selecionado'
                          : evidenceMission.evidenceType === 'video'
                          ? 'Clique para selecionar ou gravar o vídeo'
                          : 'Clique para selecionar ou registrar sua evidência'}
                      </span>
                      <span className="text-[11px] text-tutu-light/65">
                        {getEvidenceRequirementsLabel(
                          evidenceMission.evidenceType,
                          evidenceMission.maxVideoSeconds
                        )}
                      </span>
                      <input
                        type="file"
                        accept={getEvidenceAcceptAttr(evidenceMission.evidenceType)}
                        onChange={handleSelectEvidenceFile}
                        className="hidden"
                      />
                    </label>

                    {selectedFile && (
                      <div className="p-3 rounded-xl bg-tutu-secondary/20 border border-tutu-secondary/40 space-y-2.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-tutu-lime shrink-0" />
                            <span className="text-tutu-light font-medium truncate">
                              {selectedFile.name}
                            </span>
                          </div>
                          <span className="text-[11px] text-tutu-lime font-mono shrink-0">
                            {formatFileSize(selectedFile.size)}
                          </span>
                        </div>
                        {filePreviewUrl && (
                          <div className="rounded-lg overflow-hidden border border-tutu-secondary/40 bg-tutu-dark max-h-56 flex items-center justify-center">
                            <img
                              src={filePreviewUrl}
                              alt="Pré-visualização da evidência"
                              className="max-h-56 w-auto object-contain"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {uploadError && (
                      <div className="p-3 rounded-xl bg-red-500/15 border border-red-400/40 text-xs text-red-200 flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-300" />
                        <span>{uploadError}</span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs text-tutu-light/80 mb-1">
                      Observação (opcional)
                    </label>
                    <textarea
                      rows={2}
                      value={evidenceText}
                      onChange={(e) => setEvidenceText(e.target.value)}
                      placeholder="Ex.: Foto registrada no estande após a demonstração."
                      className="input-tutu text-xs"
                    />
                  </div>
                </>
              ) : (
                <textarea
                  rows={3}
                  required
                  value={evidenceText}
                  onChange={(e) => setEvidenceText(e.target.value)}
                  placeholder="Ex.: Participei da dinâmica no estande e recebi a validação da equipe"
                  className="input-tutu text-xs"
                />
              )}

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3">
                <button
                  type="button"
                  onClick={resetEvidenceModal}
                  disabled={isUploadingEvidence}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl btn-tutu-outline text-xs disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={
                    isUploadingEvidence ||
                    (Boolean(evidenceMission.requiresEvidence) &&
                      evidenceMission.evidenceType !== 'text' &&
                      !selectedFile)
                  }
                  className="min-h-[44px] px-5 py-2.5 rounded-xl btn-tutu-lime text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isUploadingEvidence && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>
                    {isUploadingEvidence ? 'Enviando evidência...' : 'Enviar para Validação'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}

      {/* AUTHENTICATED IMAGE PREVIEW MODAL */}
      {previewModal && (
        <div className="fixed inset-0 z-50 bg-tutu-dark/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="tutu-card max-w-3xl w-full p-4 sm:p-6 space-y-4 border-2 border-tutu-lime">
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-display font-bold text-base sm:text-lg text-tutu-light truncate">
                {previewModal.fileName}
              </h3>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(previewModal.url);
                  setPreviewModal(null);
                }}
                className="min-h-[36px] px-3 py-1 rounded-lg bg-tutu-secondary/30 text-xs text-tutu-light hover:text-tutu-lime flex items-center gap-1"
              >
                <X className="w-4 h-4" />
                <span>Fechar</span>
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-tutu-dark border border-tutu-secondary/40 flex items-center justify-center max-h-[70vh]">
              <img
                src={previewModal.url}
                alt={previewModal.fileName}
                className="max-h-[70vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
