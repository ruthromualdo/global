// ============================================================================
// INTERFACES TYPESCRIPT — PREPARADAS PARA FUTURA INTEGRAÇÃO SQLITE VIA API
// ============================================================================

export type MissionCategory =
  | 'Visitação'
  | 'Experimentação'
  | 'Quiz'
  | 'Compartilhamento'
  | 'Missão surpresa';

export type MissionStatus =
  | 'Disponível'
  | 'Em andamento'
  | 'Aguardando validação'
  | 'Concluída'
  | 'Bloqueada';

export type ParticipantStatus = 'Ativo' | 'Pendente' | 'Inativo';

export interface Participant {
  id: string;
  name: string;
  nickname: string;
  email: string;
  avatar: string;
  points: number;
  rankingPosition: number;
  completedMissionsCount: number;
  visitedStartupsIds: string[];
  unlockedAchievementIds: string[];
  registeredAt: string;
  status: ParticipantStatus;
  privacyPreferences: {
    showNicknameInPublicRanking: boolean;
    allowActivityNotifications: boolean;
    shareStartupInterests: boolean;
  };
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
  evidenceDescription: string;
  evidenceCode: string;
  pointsAwarded: number;
  status: 'Pendente' | 'Aprovada' | 'Rejeitada';
}

export interface PointsTransaction {
  id: string;
  participantId: string;
  participantName: string;
  sourceType: 'Missão' | 'QR Code' | 'Conquista' | 'Ajuste Administrativo';
  sourceTitle: string;
  pointsDelta: number;
  previousBalance: number;
  newBalance: number;
  createdAt: string;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlockCondition: string;
  iconName: 'compass' | 'footprints' | 'brain' | 'globe' | 'rocket' | 'award';
  pointsBonus: number;
  unlocked: boolean;
  unlockedAt?: string;
  progressCurrent: number;
  progressTotal: number;
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
  medalsCount: number;
  completedMissionsCount: number;
  isCurrentUser?: boolean;
}

export interface AdminDashboardMetrics {
  registeredParticipants: number;
  activeParticipants: number;
  completedMissions: number;
  qrCodesScanned: number;
  registeredStartups: number;
  totalPointsDistributed: number;
  participationRate: number;
  engagementByDay: { day: string; scans: number; missions: number; activeUsers: number }[];
  participationByStartup: { startupName: string; visits: number; missionsCompleted: number; pointsIssued: number }[];
}
