import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import {
  AdminDashboardMetrics,
  DailyRankingDaySummary,
  EventSettings,
  GovernancePlan,
  Mission,
  MissionCompletion,
  Participant,
  PointsTransaction,
  PublicRankingEntry,
  Startup,
  UserRole,
  WinnerHomologation,
} from '../types';
import { authService } from '../services/authService';
import { participantService } from '../services/participantService';
import { startupService } from '../services/startupService';
import { missionService } from '../services/missionService';
import { rankingService } from '../services/rankingService';
import { adminService } from '../services/adminService';
import { governanceService } from '../services/governanceService';
import {
  apiRequest,
  apiRequestWithStatus,
  setAuthToken,
  uploadEvidenceBatchRequest,
  uploadEvidenceFileRequest,
} from '../services/apiClient';

export interface ToastNotice {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
}

export interface AuthStateInfo {
  authenticated: boolean;
  role: UserRole | null;
  userId: string | null;
  email: string | null;
  hasConfiguredAdmin: boolean;
}

interface BootstrapPayload {
  participant: Participant;
  allParticipants: Participant[];
  startups: Startup[];
  missions: Mission[];
  validationQueue: MissionCompletion[];
  publicRanking: PublicRankingEntry[];
  dailyRankings?: DailyRankingDaySummary[];
  homologations?: WinnerHomologation[];
  pointsTransactions: PointsTransaction[];
  eventSettings: EventSettings;
  governancePlans: GovernancePlan[];
  adminMetrics: AdminDashboardMetrics;
  auth?: AuthStateInfo;
}

interface AppStoreContextValue {
  participant: Participant;
  allParticipants: Participant[];
  startups: Startup[];
  missions: Mission[];
  validationQueue: MissionCompletion[];
  publicRanking: PublicRankingEntry[];
  dailyRankings?: DailyRankingDaySummary[];
  homologations?: WinnerHomologation[];
  pointsTransactions: PointsTransaction[];
  eventSettings: EventSettings;
  governancePlans: GovernancePlan[];
  adminMetrics: AdminDashboardMetrics;
  sqliteConnected: boolean;
  authState: AuthStateInfo;
  isCheckingAuth: boolean;
  isAdminAuthenticated: boolean;
  toasts: ToastNotice[];
  notify: (title: string, message: string, type?: ToastNotice['type']) => void;
  dismissToast: (id: string) => void;
  // Auth & Participant actions
  loginDemo: (
    email: string,
    password?: string
  ) => Promise<{ ok: boolean; status: number; error?: string }>;
  loginAdmin: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; status: number; error?: string }>;
  logoutSession: () => Promise<void>;
  registerDemo: (payload: {
    name: string;
    email: string;
    phone: string;
    password?: string;
    acceptedTerms: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  completeMissionInstant: (missionId: string) => void;
  startMission: (missionId: string) => Promise<{
    ok: boolean;
    error?: string;
    errorCode?: string;
    status?: number;
  }>;
  submitMissionEvidence: (
    missionId: string,
    evidenceText: string
  ) => Promise<{ ok: boolean; error?: string }>;
  uploadMissionEvidence: (
    missionId: string,
    file: File,
    description?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  uploadMissionEvidenceBatch: (
    missionId: string,
    files: File[],
    description?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  updateProfile: (updates: {
    name?: string;
    email?: string;
    phone?: string;
    currentPassword?: string;
    newPassword?: string;
    confirmNewPassword?: string;
  }) => Promise<{ ok: boolean; error?: string; message?: string }>;
  updateImagePublicityConsent: (
    authorized: boolean
  ) => Promise<{ ok: boolean; error?: string; message?: string }>;
  // Admin actions
  createStartup: (payload: Omit<Startup, 'id'>) => void;
  updateStartup: (id: string, updates: Partial<Startup>) => void;
  toggleStartupActive: (id: string) => void;
  deleteStartup: (id: string) => void;
  createMission: (
    payload: Omit<Mission, 'id'> & { missionType?: 'official' | 'extra' }
  ) => Promise<{ ok: boolean; data?: Mission; error?: string }>;
  updateMission: (
    id: string,
    updates: Partial<Mission> & { missionType?: 'official' | 'extra' }
  ) => Promise<{ ok: boolean; error?: string }>;
  toggleMissionActive: (id: string) => void;
  deleteMission: (id: string) => void;
  reviewValidationItem: (
    id: string,
    decision: 'Aprovada' | 'Rejeitada',
    rejectionReason?: string
  ) => Promise<{ ok: boolean; status: number; error?: string }>;
  disqualifyParticipantAdmin: (
    participantId: string,
    reason: string,
    confirmed: boolean
  ) => Promise<{ ok: boolean; status: number; error?: string }>;
  homologateWinnerAdmin: (payload: {
    scope: 'GERAL' | 'DIARIO';
    eventDate?: string | null;
    participantId: string;
    conferenceCompleted: boolean;
  }) => Promise<{ ok: boolean; status: number; error?: string; homologation?: WinnerHomologation }>;
  updateParticipantStatus: (id: string, status: Participant['status']) => void;
  resetParticipantPasswordAdmin: (
    participantId: string,
    newPassword: string,
    confirmPassword: string
  ) => Promise<{ ok: boolean; error?: string; message?: string }>;
  adjustParticipantPointsAdmin: (participantId: string, pointsDelta: number, reason: string) => void;
  updateEventSettings: (updates: Partial<EventSettings>) => void;
  updateGovernancePlan: (id: string, updates: Partial<GovernancePlan>) => void;
  refreshRanking: () => Promise<void>;
  isRefreshingRanking: boolean;
}

const PARTICIPANT_POLL_INTERVAL_MS = 5000;

const AppStoreContext = createContext<AppStoreContextValue | undefined>(undefined);

const EMPTY_PARTICIPANT: Participant = {
  id: '',
  name: '',
  nickname: '',
  email: '',
  phone: null,
  role: undefined,
  avatar: '',
  points: 0,
  rankingPosition: 0,
  completedMissionsCount: 0,
  visitedStartupsIds: [],
  registeredAt: '',
  status: 'Ativo',
  privacyPreferences: {
    showNicknameInPublicRanking: true,
    allowActivityNotifications: false,
    shareStartupInterests: false,
  },
  imagePublicityConsent: false,
  imagePublicityConsentUpdatedAt: null,
  imagePublicityConsentVersion: null,
};

export const AppStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [participant, setParticipant] = useState<Participant>(EMPTY_PARTICIPANT);
  const [allParticipants, setAllParticipants] = useState<Participant[]>([]);
  const [startups, setStartups] = useState<Startup[]>(() => startupService.getStartups());
  const [missions, setMissions] = useState<Mission[]>(() => missionService.getMissions());
  const [validationQueue, setValidationQueue] = useState<MissionCompletion[]>([]);
  const [publicRanking, setPublicRanking] = useState<PublicRankingEntry[]>([]);
  const [dailyRankings, setDailyRankings] = useState<DailyRankingDaySummary[]>([]);
  const [homologations, setHomologations] = useState<WinnerHomologation[]>([]);
  const [pointsTransactions, setPointsTransactions] = useState<PointsTransaction[]>([]);
  const [eventSettings, setEventSettings] = useState<EventSettings>(() =>
    adminService.getEventSettings()
  );
  const [governancePlans, setGovernancePlans] = useState<GovernancePlan[]>(() =>
    governanceService.getGovernancePlans()
  );
  const [adminMetrics, setAdminMetrics] = useState<AdminDashboardMetrics>(() =>
    adminService.getDashboardMetrics()
  );
  const [sqliteConnected, setSqliteConnected] = useState<boolean>(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(true);
  const [authState, setAuthState] = useState<AuthStateInfo>({
    authenticated: false,
    role: null,
    userId: null,
    email: null,
    hasConfiguredAdmin: false,
  });
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  const notify = useCallback(
    (title: string, message: string, type: ToastNotice['type'] = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [{ id, title, message, type }, ...prev.slice(0, 3)]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4500);
    },
    []
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const syncSeqRef = useRef<number>(0);
  const isBackgroundPollInFlightRef = useRef<boolean>(false);

  const syncFromSqliteOrMemory = useCallback(
    async (options?: { preserveStateOnError?: boolean }): Promise<BootstrapPayload | null> => {
      const requestSeq = ++syncSeqRef.current;
      const data = await apiRequest<BootstrapPayload>('/bootstrap');

      // Descarta respostas antigas caso outra sincronização mais recente já tenha sido iniciada
      if (requestSeq !== syncSeqRef.current) {
        return data;
      }

      if (data) {
        setSqliteConnected(true);
        const isAdminParticipant =
          String(data.participant?.role || '').toUpperCase() === 'ADMIN';
        setParticipant(
          isAdminParticipant
            ? { ...data.participant, rankingPosition: 0 }
            : data.participant
        );
        setAllParticipants(data.allParticipants);
        setStartups(data.startups);
        setMissions(data.missions);
        setValidationQueue(data.validationQueue);
        setPublicRanking(data.publicRanking);
        setDailyRankings(Array.isArray(data.dailyRankings) ? data.dailyRankings : []);
        setHomologations(Array.isArray(data.homologations) ? data.homologations : []);
        setPointsTransactions(data.pointsTransactions);
        setEventSettings(data.eventSettings);
        setGovernancePlans(data.governancePlans);
        setAdminMetrics(data.adminMetrics);
        if (data.auth) {
          setAuthState(data.auth);
        }
        setIsCheckingAuth(false);
        return data;
      }

      if (options?.preserveStateOnError) {
        // Em polling de fundo, preserva o estado válido atual durante oscilações de rede sem recorrer a mockData
        return null;
      }

      setSqliteConnected(false);
      setIsCheckingAuth(false);
      // Nunca injeta participantes ou rankings fictícios de mockData em caso de falha da API
      setParticipant(EMPTY_PARTICIPANT);
      setAllParticipants([]);
      setPublicRanking([]);
      setDailyRankings([]);
      setHomologations([]);
      setPointsTransactions([]);
      setValidationQueue([]);
      return null;
    },
    []
  );

  const [isRefreshingRanking, setIsRefreshingRanking] = useState<boolean>(false);

  const refreshRanking = useCallback(async () => {
    setIsRefreshingRanking(true);
    try {
      await syncFromSqliteOrMemory();
    } finally {
      setIsRefreshingRanking(false);
    }
  }, [syncFromSqliteOrMemory]);

  useEffect(() => {
    void syncFromSqliteOrMemory();
  }, [syncFromSqliteOrMemory]);

  // Polling automático a cada 5 segundos para participantes autenticados (reflete aprovações/reprovações em tempo real)
  const isParticipantPollingActive =
    authState.authenticated &&
    authState.role === 'PARTICIPANT' &&
    Boolean(participant.id);

  useEffect(() => {
    if (!isParticipantPollingActive) return;

    let isDisposed = false;

    const runBackgroundSync = async () => {
      if (isDisposed || isBackgroundPollInFlightRef.current) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      isBackgroundPollInFlightRef.current = true;
      try {
        await syncFromSqliteOrMemory({ preserveStateOnError: true });
      } finally {
        isBackgroundPollInFlightRef.current = false;
      }
    };

    const intervalId = window.setInterval(() => {
      void runBackgroundSync();
    }, PARTICIPANT_POLL_INTERVAL_MS);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void runBackgroundSync();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isDisposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isParticipantPollingActive, syncFromSqliteOrMemory]);

  const loginDemo = async (
    email: string,
    password?: string
  ): Promise<{ ok: boolean; status: number; error?: string }> => {
    const res = await authService.loginDemo(email, password);
    if (!res.ok || !res.user) {
      setAuthToken(null);
      const errorMsg = res.error || 'E-mail ou senha inválidos.';
      const title =
        res.status === 429
          ? 'Muitas Tentativas'
          : res.status === 0
          ? 'Erro de Conexão'
          : 'Falha no Login';
      notify(title, errorMsg, 'error');
      return { ok: false, status: res.status, error: errorMsg };
    }

    const bootstrapData = await syncFromSqliteOrMemory();
    if (!bootstrapData || !bootstrapData.auth?.authenticated) {
      setAuthToken(null);
      setAuthState((prev) => ({
        ...prev,
        authenticated: false,
        role: null,
        userId: null,
        email: null,
      }));
      const bootstrapError =
        'Não foi possível confirmar sua sessão autenticada no servidor. Tente novamente.';
      notify('Sessão Não Confirmada', bootstrapError, 'error');
      return { ok: false, status: 401, error: bootstrapError };
    }

    participantService.updateParticipantProfile({ email: res.user.email });
    notify('Sessão Ativa', res.message || 'Sessão autenticada com sucesso.', 'success');
    return { ok: true, status: res.status };
  };

  const loginAdmin = async (email: string, password: string) => {
    const res = await authService.loginAdmin(email, password);
    if (res.ok) {
      await syncFromSqliteOrMemory();
      notify(
        'Acesso Administrativo Liberado',
        res.message || 'Bem-vindo(a) ao Painel Administrativo.',
        'success'
      );
      return { ok: true, status: res.status };
    }
    notify('Acesso Negado', res.error || 'Credenciais inválidas.', 'error');
    return { ok: false, status: res.status, error: res.error };
  };

  const logoutSession = async () => {
    await authService.logout();
    setAuthState((prev) => ({
      ...prev,
      authenticated: false,
      role: null,
      userId: null,
      email: null,
    }));
    await syncFromSqliteOrMemory();
    notify('Sessão Encerrada', 'Seu token de acesso foi invalidado com segurança.', 'info');
  };

  const registerDemo = async (payload: {
    name: string;
    email: string;
    phone: string;
    password?: string;
    acceptedTerms: boolean;
  }): Promise<{ ok: boolean; error?: string }> => {
    const res = await authService.registerDemo(payload);
    if (!res.ok || !res.user) {
      const errorMsg =
        res.error || 'Este e-mail já possui cadastro. Faça login para acessar sua conta.';
      notify(
        res.status === 409 ? 'E-mail já cadastrado' : 'Cadastro não realizado',
        errorMsg,
        'error'
      );
      return { ok: false, error: errorMsg };
    }

    participantService.updateParticipantProfile({
      name: res.user.name,
      nickname: res.user.nickname,
      email: res.user.email,
      phone: res.user.phone,
      avatar: res.user.avatar,
    });
    await syncFromSqliteOrMemory();
    notify('Cadastro Realizado', res.message || 'Cadastro concluído com sucesso.', 'success');
    return { ok: true };
  };

  const startMission = async (
    missionId: string
  ): Promise<{ ok: boolean; error?: string; errorCode?: string; status?: number }> => {
    const res = await apiRequestWithStatus<Mission & { error?: string; errorCode?: string }>(
      `/missions/${missionId}/status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Em andamento' }),
      }
    );

    if (res.ok) {
      missionService.updateMissionStatus(missionId, 'Em andamento');
      await syncFromSqliteOrMemory();
      const target = missions.find((m) => m.id === missionId);
      if (target) {
        notify(
          'Missão Iniciada',
          `Cronômetro iniciado para "${target.title}". Realize a atividade e clique em "Enviar Evidência" quando concluir.`,
          'info'
        );
      }
      return { ok: true, status: res.status };
    }

    await syncFromSqliteOrMemory();
    const errorCode = res.data?.errorCode;
    const isTimerConflict = res.status === 409 || errorCode === 'ACTIVE_TIMER_CONFLICT';
    notify(
      isTimerConflict ? 'Cronômetro Global em Execução' : 'Não Foi Possível Iniciar',
      res.error ||
        (isTimerConflict
          ? 'Você já possui outra missão em andamento. Envie a evidência dela antes de iniciar uma nova.'
          : 'Conclua e aguarde a aprovação da missão anterior antes de iniciar esta missão.'),
      'error'
    );
    return { ok: false, error: res.error, errorCode, status: res.status };
  };

  const completeMissionInstant = (missionId: string) => {
    const target = missions.find((m) => m.id === missionId);
    if (!target) return;
    if (target.status === 'Concluída') {
      notify('Missão já concluída', 'Você já recebeu os pontos desta missão.', 'info');
      return;
    }
    if (target.status === 'Bloqueada') {
      notify(
        'Bloqueio Sequencial',
        'Conclua a missão anterior na sequência obrigatória antes de realizar esta missão.',
        'error'
      );
      return;
    }

    void apiRequestWithStatus<{
      success?: boolean;
      alreadyCompleted?: boolean;
      completionPointsAwarded?: number;
      unlockPointsAwarded?: number;
      pointsAwarded?: number;
      nextMissionUnlocked?: string | null;
      message?: string;
      error?: string;
    }>(`/missions/${missionId}/complete`, { method: 'POST' }).then(async (res) => {
      if (res.ok && res.data?.success) {
        const totalAwarded = res.data.pointsAwarded ?? target.points;
        await syncFromSqliteOrMemory();
        notify(
          `+${totalAwarded} Pontos Creditados!`,
          res.data.message || `Missão "${target.title}" concluída e gravada com sucesso.`,
          'success'
        );
      } else if (res.status === 409 || res.data?.alreadyCompleted) {
        await syncFromSqliteOrMemory();
        notify(
          'Missão já concluída',
          res.data?.error || 'Você já recebeu os pontos desta missão anteriormente.',
          'info'
        );
      } else {
        await syncFromSqliteOrMemory();
        notify(
          'Operação Bloqueada',
          res.data?.error || res.error || 'Conclua a missão anterior na sequência obrigatória.',
          'error'
        );
      }
    });
  };

  const submitMissionEvidence = async (
    missionId: string,
    evidenceText: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const target = missions.find((m) => m.id === missionId);
    if (!target) {
      return { ok: false, error: 'Missão não encontrada.' };
    }

    const payload = {
      participantId: participant.id,
      participantName: participant.name,
      missionId: target.id,
      missionTitle: target.title,
      startupId: target.startupId,
      startupName: target.startupName,
      evidenceDescription: evidenceText || 'Registro enviado via Central de Missões.',
      evidenceCode: `EVID-${Math.floor(1000 + Math.random() * 9000)}`,
      pointsAwarded: target.points,
    };

    const res = await apiRequestWithStatus<{ error?: string }>('/validations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    await syncFromSqliteOrMemory();

    if (res.ok) {
      notify(
        'Evidência Registrada e Pontuada!',
        `Sua evidência para "${target.title}" foi registrada, os pontos foram contabilizados e a próxima missão foi liberada (sujeita à conferência final).`,
        'success'
      );
      return { ok: true };
    }

    const errorMsg =
      res.data?.error || 'Não foi possível registrar a evidência. Verifique os dados e tente novamente.';
    notify('Erro ao Enviar Evidência', errorMsg, 'error');
    return { ok: false, error: errorMsg };
  };

  const uploadMissionEvidence = async (
    missionId: string,
    file: File,
    description?: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const target = missions.find((m) => m.id === missionId);
    const res = await uploadEvidenceFileRequest({ missionId, file, description });
    await syncFromSqliteOrMemory();

    if (res.ok) {
      notify(
        'Evidência Registrada e Pontuada!',
        `Evidência para "${target?.title || 'missão'}" registrada! Pontuação contabilizada e próxima missão liberada (sujeita à conferência final).`,
        'success'
      );
      return { ok: true };
    }

    const errorMsg = res.error || 'Não foi possível enviar a evidência. Verifique o arquivo e tente novamente.';
    notify('Erro ao Enviar Evidência', errorMsg, 'error');
    return { ok: false, error: errorMsg };
  };

  const uploadMissionEvidenceBatch = async (
    missionId: string,
    files: File[],
    description?: string
  ): Promise<{ ok: boolean; error?: string }> => {
    const target = missions.find((m) => m.id === missionId);
    const res = await uploadEvidenceBatchRequest({ missionId, files, description });
    await syncFromSqliteOrMemory();

    if (res.ok) {
      notify(
        'Evidências Registradas e Pontuadas!',
        `As ${files.length} imagens de "${target?.title || 'missão'}" foram registradas em uma única conclusão! Pontuação contabilizada (sujeita à conferência final).`,
        'success'
      );
      return { ok: true };
    }

    const errorMsg =
      res.error || 'Não foi possível enviar as imagens de evidência. Verifique os arquivos e tente novamente.';
    notify('Erro ao Enviar Evidências', errorMsg, 'error');
    return { ok: false, error: errorMsg };
  };

  const updateProfile = async (updates: {
    name?: string;
    email?: string;
    phone?: string;
    currentPassword?: string;
    newPassword?: string;
    confirmNewPassword?: string;
  }): Promise<{ ok: boolean; error?: string; message?: string }> => {
    const res = await apiRequestWithStatus<{
      ok?: boolean;
      participant?: Participant;
      message?: string;
      error?: string;
    }>('/participants/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    });

    if (res.ok && res.data?.participant) {
      await syncFromSqliteOrMemory();
      const successMsg = res.data.message || 'Dados cadastrais atualizados com sucesso.';
      notify('Perfil Atualizado', successMsg, 'success');
      return { ok: true, message: successMsg };
    }

    const errorMsg =
      res.data?.error ||
      res.error ||
      'Não foi possível atualizar seu perfil. Verifique os dados informados.';
    return { ok: false, error: errorMsg };
  };

  const updateImagePublicityConsent = async (
    authorized: boolean
  ): Promise<{ ok: boolean; error?: string; message?: string }> => {
    const res = await apiRequestWithStatus<{
      ok?: boolean;
      authorized?: boolean;
      updatedAt?: string;
      message?: string;
      error?: string;
    }>('/participants/me/image-consent', {
      method: 'PUT',
      body: JSON.stringify({ authorized }),
    });

    if (res.ok) {
      await syncFromSqliteOrMemory();
      const msg =
        res.data?.message ||
        (authorized
          ? 'Autorização de divulgação de imagem registrada.'
          : 'Autorização de divulgação de imagem revogada.');
      notify('Preferência de Imagem (LGPD)', msg, 'success');
      return { ok: true, message: msg };
    }

    const errorMsg = res.data?.error || res.error || 'Não foi possível atualizar sua preferência de imagem.';
    notify('Erro ao Atualizar Preferência', errorMsg, 'error');
    return { ok: false, error: errorMsg };
  };

  const createStartup = (payload: Omit<Startup, 'id'>) => {
    const created = startupService.createStartup(payload);
    void apiRequest('/startups', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then(() => syncFromSqliteOrMemory());
    notify('Startup Cadastrada', `"${created.name}" foi adicionada ao circuito.`, 'success');
  };

  const updateStartup = (id: string, updates: Partial<Startup>) => {
    startupService.updateStartup(id, updates);
    void apiRequest(`/startups/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }).then(() => syncFromSqliteOrMemory());
    notify('Startup Atualizada', 'Dados da startup atualizados no SQLite.', 'success');
  };

  const toggleStartupActive = (id: string) => {
    startupService.toggleStartupActive(id);
    void apiRequest(`/startups/${id}/toggle`, { method: 'PATCH' }).then(() =>
      syncFromSqliteOrMemory()
    );
    notify('Status Alterado', 'Visibilidade da startup atualizada.', 'info');
  };

  const deleteStartup = (id: string) => {
    startupService.deleteStartup(id);
    void apiRequest(`/startups/${id}`, { method: 'DELETE' }).then(() =>
      syncFromSqliteOrMemory()
    );
    notify('Startup Removida', 'Registro removido do banco SQLite.', 'info');
  };

  const createMission = async (
    payload: Omit<Mission, 'id'> & { missionType?: 'official' | 'extra' }
  ): Promise<{ ok: boolean; data?: Mission; error?: string }> => {
    const res = await apiRequestWithStatus<Mission>('/missions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.ok && res.data) {
      missionService.createMission(res.data);
      await syncFromSqliteOrMemory();
      notify('Missão Criada', `"${res.data.title}" adicionada com sucesso.`, 'success');
      return { ok: true, data: res.data };
    }

    const errorMsg = res.error || 'Falha ao cadastrar a missão no servidor.';
    notify('Erro ao Criar Missão', errorMsg, 'error');
    return { ok: false, error: errorMsg };
  };

  const updateMission = async (
    id: string,
    updates: Partial<Mission> & { missionType?: 'official' | 'extra' }
  ): Promise<{ ok: boolean; error?: string }> => {
    missionService.updateMission(id, updates);
    const res = await apiRequestWithStatus<Mission[]>(`/missions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
    await syncFromSqliteOrMemory();
    if (res.ok) {
      notify('Missão Atualizada', 'Configurações da missão salvas no SQLite.', 'success');
      return { ok: true };
    }
    const errorMsg = res.error || 'Falha ao salvar alterações da missão.';
    notify('Erro ao Atualizar', errorMsg, 'error');
    return { ok: false, error: errorMsg };
  };

  const toggleMissionActive = (id: string) => {
    missionService.toggleMissionActive(id);
    void apiRequest(`/missions/${id}/toggle`, { method: 'PATCH' }).then(() =>
      syncFromSqliteOrMemory()
    );
    notify('Status da Missão Alterado', 'Disponibilidade da missão atualizada.', 'info');
  };

  const deleteMission = (id: string) => {
    missionService.deleteMission(id);
    void apiRequest(`/missions/${id}`, { method: 'DELETE' }).then(() =>
      syncFromSqliteOrMemory()
    );
    notify('Missão Excluída', 'Missão removida do banco SQLite.', 'info');
  };

  const reviewValidationItem = async (
    id: string,
    decision: 'Aprovada' | 'Rejeitada',
    rejectionReason?: string
  ): Promise<{ ok: boolean; status: number; error?: string }> => {
    const target = validationQueue.find((v) => v.id === id);
    const res = await apiRequestWithStatus<{ error?: string }>(`/validations/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({
        decision,
        ...(rejectionReason !== undefined ? { rejectionReason } : {}),
      }),
    });

    if (res.ok) {
      await syncFromSqliteOrMemory();
      notify(
        decision === 'Aprovada' ? 'Evidência Conferida e Aprovada' : 'Evidência Rejeitada com Estorno',
        decision === 'Aprovada'
          ? `Evidência de ${target?.participantName || 'participante'} homologada na conferência final (sem duplicação de pontos).`
          : `Evidência de ${target?.participantName || 'participante'} rejeitada e pontos da missão estornados automaticamente.`,
        decision === 'Aprovada' ? 'success' : 'info'
      );
      return { ok: true, status: res.status };
    }

    const errorMsg =
      res.data?.error || res.error || 'Não foi possível registrar a revisão da evidência.';
    notify('Erro na Conferência de Evidência', errorMsg, 'error');
    return { ok: false, status: res.status, error: errorMsg };
  };

  const disqualifyParticipantAdmin = async (
    participantId: string,
    reason: string,
    confirmed: boolean
  ): Promise<{ ok: boolean; status: number; error?: string }> => {
    const target = allParticipants.find((p) => p.id === participantId);
    const res = await apiRequestWithStatus<{ ok?: boolean; error?: string }>(
      `/admin/participants/${participantId}/disqualify`,
      {
        method: 'POST',
        body: JSON.stringify({ reason, confirmed }),
      }
    );

    if (res.ok && res.data?.ok) {
      await syncFromSqliteOrMemory();
      notify(
        'Participante Desclassificado',
        `${target?.name || 'Participante'} foi desclassificado(a) e removido(a) da disputa competitiva. Histórico preservado.`,
        'info'
      );
      return { ok: true, status: res.status };
    }

    const errorMsg =
      res.data?.error || res.error || 'Não foi possível concluir a desclassificação.';
    notify('Erro na Desclassificação', errorMsg, 'error');
    return { ok: false, status: res.status, error: errorMsg };
  };

  const homologateWinnerAdmin = async (payload: {
    scope: 'GERAL' | 'DIARIO';
    eventDate?: string | null;
    participantId: string;
    conferenceCompleted: boolean;
  }): Promise<{ ok: boolean; status: number; error?: string; homologation?: WinnerHomologation }> => {
    const res = await apiRequestWithStatus<{
      ok?: boolean;
      error?: string;
      homologation?: WinnerHomologation;
    }>('/admin/homologations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.ok && res.data?.ok) {
      await syncFromSqliteOrMemory();
      const hom = res.data.homologation;
      notify(
        'Vencedor Homologado!',
        hom
          ? `${hom.participantName} homologado(a) no ${
              hom.scope === 'GERAL' ? 'Ranking Geral' : `Ranking Diário (${hom.eventDate})`
            } com ${hom.points} pts.`
          : 'Homologação registrada com sucesso.',
        'success'
      );
      return { ok: true, status: res.status, homologation: hom };
    }

    const errorMsg =
      res.data?.error || res.error || 'Não foi possível registrar a homologação do vencedor.';
    notify('Erro na Homologação', errorMsg, 'error');
    return { ok: false, status: res.status, error: errorMsg };
  };

  const updateParticipantStatus = (id: string, status: Participant['status']) => {
    participantService.updateParticipantStatus(id, status);
    void apiRequest(`/participants/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }).then(() => syncFromSqliteOrMemory());
    notify('Status do Participante', `Status atualizado para ${status}.`, 'info');
  };

  const resetParticipantPasswordAdmin = async (
    participantId: string,
    newPassword: string,
    confirmPassword: string
  ): Promise<{ ok: boolean; error?: string; message?: string }> => {
    const res = await apiRequestWithStatus<{
      ok?: boolean;
      message?: string;
      error?: string;
    }>(`/participants/${participantId}/reset-password`, {
      method: 'POST',
      body: JSON.stringify({ newPassword, confirmPassword }),
    });

    if (res.ok && res.data?.ok) {
      const successMsg =
        res.data.message || 'Senha do participante redefinida com sucesso.';
      notify('Senha Redefinida', successMsg, 'success');
      return { ok: true, message: successMsg };
    }

    const errorMsg =
      res.data?.error ||
      res.error ||
      'Não foi possível redefinir a senha do participante.';
    notify('Erro ao Redefinir Senha', errorMsg, 'error');
    return { ok: false, error: errorMsg };
  };

  const adjustParticipantPointsAdmin = (
    participantId: string,
    pointsDelta: number,
    reason: string
  ) => {
    void apiRequestWithStatus<{ error?: string }>('/ranking/adjust', {
      method: 'POST',
      body: JSON.stringify({ participantId, pointsDelta, reason }),
    }).then(async (res) => {
      await syncFromSqliteOrMemory();
      if (res.ok) {
        notify(
          'Registro de Pontuação',
          'Transação gravada no histórico SQLite respeitando o limite global de 1.000 pontos.',
          'success'
        );
      } else {
        notify(
          'Limite Global de Pontuação',
          res.error || 'O participante não pode ultrapassar o limite máximo de 1.000 pontos.',
          'error'
        );
      }
    });
  };

  const updateEventSettings = (updates: Partial<EventSettings>) => {
    adminService.updateEventSettings(updates);
    void apiRequest('/admin/settings', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }).then(() => syncFromSqliteOrMemory());
    notify('Configurações Salvas', 'Parâmetros do evento salvos no banco SQLite.', 'success');
  };

  const updateGovernancePlan = (id: string, updates: Partial<GovernancePlan>) => {
    governanceService.updateGovernancePlan(id, updates);
    void apiRequest(`/admin/governance/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }).then(() => syncFromSqliteOrMemory());
    notify('Plano de Governança Atualizado', 'Alterações salvas no banco SQLite.', 'success');
  };

  const isAdminAuthenticated = authState.authenticated && authState.role === 'ADMIN';

  return (
    <AppStoreContext.Provider
      value={{
        participant,
        allParticipants,
        startups,
        missions,
        validationQueue,
        publicRanking,
        dailyRankings,
        homologations,
        pointsTransactions,
        eventSettings,
        governancePlans,
        adminMetrics,
        sqliteConnected,
        authState,
        isCheckingAuth,
        isAdminAuthenticated,
        toasts,
        notify,
        dismissToast,
        loginDemo,
        loginAdmin,
        logoutSession,
        registerDemo,
        completeMissionInstant,
        startMission,
        submitMissionEvidence,
        uploadMissionEvidence,
        uploadMissionEvidenceBatch,
        updateProfile,
        updateImagePublicityConsent,
        createStartup,
        updateStartup,
        toggleStartupActive,
        deleteStartup,
        createMission,
        updateMission,
        toggleMissionActive,
        deleteMission,
        reviewValidationItem,
        disqualifyParticipantAdmin,
        homologateWinnerAdmin,
        updateParticipantStatus,
        resetParticipantPasswordAdmin,
        adjustParticipantPointsAdmin,
        updateEventSettings,
        updateGovernancePlan,
        refreshRanking,
        isRefreshingRanking,
      }}
    >
      {children}
    </AppStoreContext.Provider>
  );
};

export function useAppStore() {
  const ctx = useContext(AppStoreContext);
  if (!ctx) {
    throw new Error('useAppStore deve ser utilizado dentro de um AppStoreProvider');
  }
  return ctx;
}
