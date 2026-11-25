// ============================================================================
// INTERFACES TYPESCRIPT — PREPARADAS PARA FUTURA INTEGRAÇÃO SQLITE VIA API
// ============================================================================

export type MissionCategory =
  | 'Visitação'
  | 'Experimentação'
  | 'Quiz'
  | 'Compartilhamento'
  | 'Missão surpresa'
  | 'Bônus';

export type MissionTrackId = 'ex_devedor' | 'sign' | 'editora_escreva' | 'bonus';

export type EvidenceRequirementType =
  | 'photo'
  | 'print'
  | 'video'
  | 'photo_or_video'
  | 'text'
  | 'file'
  | 'both';

export type MissionStatus =
  | 'Disponível'
  | 'Em andamento'
  | 'Aguardando validação'
  | 'Concluída'
  | 'Bloqueada';

export type ParticipantStatus = 'Ativo' | 'Pendente' | 'Inativo' | 'Desclassificado';
export type UserRole = 'PARTICIPANT' | 'STARTUP' | 'ADMIN';

export interface Participant {
  id: string;
  name: string;
  nickname: string;
  email: string;
  phone?: string | null;
  role?: UserRole;
  startupId?: string | null;
  avatar: string;
  points: number;
  rankingPosition: number;
  completedMissionsCount: number;
  visitedStartupsIds: string[];
  registeredAt: string;
  status: ParticipantStatus;
  disqualifiedAt?: string | null;
  disqualifiedBy?: string | null;
  disqualificationReason?: string | null;
  privacyPreferences: {
    showNicknameInPublicRanking: boolean;
    allowActivityNotifications: boolean;
    shareStartupInterests: boolean;
  };
  imagePublicityConsent?: boolean;
  imagePublicityConsentUpdatedAt?: string | null;
  imagePublicityConsentVersion?: string | null;
}

export interface Startup {
  id: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  category: string;
  solutionPresentation: string;
  boothNumber: string;
  logoText: string;
  availablePoints: number;
  active: boolean;
  isConfigurableGuest?: boolean;
  website?: string;
  instagramUrl?: string;
  logoPath?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface Mission {
  id: string;
  title: string;
  description: string;
  startupId: string;
  startupName: string;
  category: MissionCategory;
  points: number;
  estimatedTime: string;
  status: MissionStatus;
  period: string;
  completionCriteria: string;
  active: boolean;
  qrCodeRequired?: string;
  quizQuestions?: QuizQuestion[];
  sequenceOrder?: number;
  trackId?: string | null;
  relativeWeight?: number;
  unlockPoints?: number;
  completionPoints?: number;
  maxSpeedBonus?: number;
  timerMinutes?: number | null;
  durationSeconds?: number;
  startedAtMs?: number | null;
  submittedAtMs?: number | null;
  targetEndAtMs?: number | null;
  completedAtMs?: number | null;
  elapsedSeconds?: number;
  remainingSeconds?: number;
  isExpired?: boolean;
  potentialSpeedBonus?: number;
  speedBonusAwarded?: number;
  serverTimeMs?: number;
  requiresEvidence?: boolean;
  evidenceType?: EvidenceRequirementType;
  requiredEvidenceCount?: number;
  maxVideoSeconds?: number | null;
  allowSharedEvidence?: boolean;
  externalLink?: string;
}

export interface EvidenceFileItem {
  id: string;
  completionId: string;
  fileOrder: number;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number | null;
  createdAt?: string;
  url: string;
}

export interface MissionCompletion {
  id: string;
  participantId: string;
  participantName: string;
  missionId: string;
  missionTitle: string;
  startupId: string;
  startupName: string;
  submittedAt: string;
  submittedDate?: string | null;
  evidenceDescription: string;
  evidenceCode: string;
  evidenceFileName?: string;
  evidenceMimeType?: string;
  evidenceSizeBytes?: number;
  evidenceDurationSeconds?: number | null;
  rejectionReason?: string | null;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reversedPoints?: number;
  reversedAt?: string | null;
  trackId?: string | null;
  sharedEvidenceCount?: number;
  participantImageConsent?: boolean;
  participantImageConsentVersion?: string | null;
  hasFile?: boolean;
  evidenceFiles?: EvidenceFileItem[];
  pointsAwarded: number;
  status: 'Pendente' | 'Aprovada' | 'Rejeitada';
}

export interface WinnerHomologation {
  id: string;
  scope: 'GERAL' | 'DIARIO';
  eventDate: string | null;
  participantId: string;
  participantName: string;
  points: number;
  rankingPosition: number;
  evidenceSummary: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
  };
  dataFingerprint: string;
  homologatedBy: string;
  homologatedAt: string;
  homologatedAtMs: number;
  status: 'Homologado' | 'Invalidado';
  invalidatedReason?: string | null;
  invalidatedAt?: string | null;
}

export interface PointsTransaction {
  id: string;
  participantId: string;
  participantName: string;
  sourceType: 'Missão' | 'QR Code' | 'Ajuste Administrativo';
  sourceTitle: string;
  pointsDelta: number;
  previousBalance: number;
  newBalance: number;
  createdAt: string;
}

export interface QRCode {
  id: string;
  code: string;
  label: string;
  startupId: string;
  startupName: string;
  missionId: string;
  missionTitle: string;
  points: number;
  scansCount: number;
  active: boolean;
  createdAt: string;
}

export interface EventSettings {
  eventName: string;
  editionYear: number;
  dates: string;
  location: string;
  city: string;
  description: string;
  activePeriod: string;
  scoringRules: string[];
  tieBreakerCriteria: string[];
  rewardsEnabled: boolean;
  rewardsLegalNote: string;
  rewardsDescription: string;
  defaultMissionTimerMinutes?: number;
}

export interface GovernancePlan {
  id: string;
  code: string; // Plano 01 .. Plano 12
  name: string;
  objective: string;
  description: string;
  responsible: string;
  indicators: string;
  status: 'Aguardando preenchimento oficial' | 'Em estruturação' | 'Validado';
  relatedDocuments: string[];
}

export interface PublicRankingEntry {
  position: number;
  participantId: string;
  displayName: string;
  avatar: string;
  points: number;
  completedMissionsCount: number;
  isCurrentUser?: boolean;
}

export interface DailyRankingEntry {
  position: number;
  participantId: string;
  displayName: string;
  avatar: string;
  dailyPoints: number;
  completedMissionsInDay: number;
  lastMissionCompletedAtMs: number | null;
  isCurrentUser?: boolean;
}

export interface DailyAwardWinner {
  participantId: string;
  displayName: string;
  avatar: string;
  dailyPoints: number;
  lastMissionCompletedAtMs: number | null;
}

export interface DailyRankingDaySummary {
  eventDate: string;
  dayLabel: string;
  status: 'Aberto' | 'Encerrado';
  scheduledCloseAtMs: number;
  scheduledCloseLabel: string;
  closedAtMs: number | null;
  winner: DailyAwardWinner | null;
  ranking: DailyRankingEntry[];
}

export interface DailyEngagementMetric {
  date: string; // YYYY-MM-DD (America/Sao_Paulo)
  day: string;
  scans: number;
  missions: number; // alias para missionsCompleted (compatibilidade)
  missionsStarted: number;
  missionsCompleted: number;
  missionsExpired: number;
  completionRate: number;
  pointsAwarded: number;
  activeUsers: number;
}

export interface StartupParticipationMetric {
  startupId: string;
  startupName: string;
  visits: number; // participantes únicos com atividade/visita na startup
  uniqueParticipants: number;
  missionsStarted: number;
  missionsCompleted: number;
  missionsPending: number;
  completionRate: number;
  pointsIssued: number;
}

export interface MissionPerformanceMetric {
  missionId: string;
  title: string;
  startupName: string;
  category: string;
  points: number;
  starts: number;
  completions: number;
}

export interface AdminDashboardMetrics {
  registeredParticipants: number;
  activeParticipants: number;
  inactiveParticipants: number;
  startedMissions: number;
  completedMissions: number;
  expiredMissions: number;
  missionCompletionRate: number;
  averageCompletionSeconds: number | null;
  totalSpeedBonusAwarded: number;
  qrCodesScanned: number;
  registeredStartups: number;
  totalPointsDistributed: number;
  participationRate: number;
  engagementByDay: DailyEngagementMetric[];
  participationByStartup: StartupParticipationMetric[];
  missionPerformance: MissionPerformanceMetric[];
}
