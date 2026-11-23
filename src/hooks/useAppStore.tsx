import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
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
  QRCode,
  Startup,
  UserRole,
} from '../types';
import { authService } from '../services/authService';
import { participantService } from '../services/participantService';
import { startupService } from '../services/startupService';
import { missionService } from '../services/missionService';
import { qrCodeService } from '../services/qrCodeService';
import { rankingService } from '../services/rankingService';
import { adminService } from '../services/adminService';
import { governanceService } from '../services/governanceService';
import {
  apiRequest,
  apiRequestWithStatus,
  setAuthToken,
  uploadEvidenceFileRequest,
} from '../services/apiClient';

export type QRScanStatus =
  | 'VALIDATED'
  | 'INVALID_CODE'
  | 'INACTIVE_CODE'
  | 'INVALID_MISSION'
  | 'ALREADY_USED'
  | 'CONNECTION_ERROR';

export interface QRScanResult {
  success: boolean;
  status: QRScanStatus;
  alreadyUsed?: boolean;
  message: string;
  qrCode?: QRCode;
  pointsAwarded?: number;
}

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
  qrCodes: QRCode[];
  validationQueue: MissionCompletion[];
  publicRanking: PublicRankingEntry[];
  dailyRankings?: DailyRankingDaySummary[];
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
  qrCodes: QRCode[];
  validationQueue: MissionCompletion[];
  publicRanking: PublicRankingEntry[];
  dailyRankings?: DailyRankingDaySummary[];
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
  startMission: (missionId: string) => void;
  submitMissionEvidence: (missionId: string, evidenceText: string) => void;
  uploadMissionEvidence: (
    missionId: string,
    file: File,
    description?: string
  ) => Promise<{ ok: boolean; error?: string }>;
  scanQRCodeDemo: (code: string) => Promise<QRScanResult>;
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
  createQRCode: (payload: Omit<QRCode, 'id' | 'scansCount' | 'createdAt'>) => void;
  toggleQRCodeActive: (id: string) => void;
  reviewValidationItem: (id: string, decision: 'Aprovada' | 'Rejeitada') => void;
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

const AppStoreContext = createContext<AppStoreContextValue | undefined>(undefined);

export const AppStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [participant, setParticipant] = useState<Participant>(() =>
    participantService.getParticipantProfile()
  );
  const [allParticipants, setAllParticipants] = useState<Participant[]>(() =>
    participantService.getAllParticipants()
  );
  const [startups, setStartups] = useState<Startup[]>(() => startupService.getStartups());
  const [missions, setMissions] = useState<Mission[]>(() => missionService.getMissions());
  const [qrCodes, setQrCodes] = useState<QRCode[]>(() => qrCodeService.getQRCodes());
  const [validationQueue, setValidationQueue] = useState<MissionCompletion[]>(() =>
    missionService.getValidationQueue()
  );
  const [publicRanking, setPublicRanking] = useState<PublicRankingEntry[]>(() =>
    rankingService.getPublicRanking()
  );
  const [dailyRankings, setDailyRankings] = useState<DailyRankingDaySummary[]>([]);
  const [pointsTransactions, setPointsTransactions] = useState<PointsTransaction[]>(() =>
    rankingService.getPointsTransactions()
  );
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

  const syncFromSqliteOrMemory = useCallback(async (): Promise<BootstrapPayload | null> => {
    const data = await apiRequest<BootstrapPayload>('/bootstrap');
    if (data) {
      setSqliteConnected(true);
      setParticipant(data.participant);
      setAllParticipants(data.allParticipants);
      setStartups(data.startups);
      setMissions(data.missions);
      setQrCodes(data.qrCodes);
      setValidationQueue(data.validationQueue);
      setPublicRanking(data.publicRanking);
      setDailyRankings(Array.isArray(data.dailyRankings) ? data.dailyRankings : []);
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

    setSqliteConnected(false);
    setIsCheckingAuth(false);
    setParticipant(participantService.getParticipantProfile());
    setAllParticipants(participantService.getAllParticipants());
    setStartups(startupService.getStartups());
    setMissions(missionService.getMissions());
    setQrCodes(qrCodeService.getQRCodes());
    setValidationQueue(missionService.getValidationQueue());
    setPublicRanking(rankingService.getPublicRanking());
    setPointsTransactions(rankingService.getPointsTransactions());
    setEventSettings(adminService.getEventSettings());
    setGovernancePlans(governanceService.getGovernancePlans());
    return null;
  }, []);

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

  const startMission = (missionId: string) => {
    void apiRequestWithStatus<Mission & { error?: string }>(`/missions/${missionId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Em andamento' }),
    }).then(async (res) => {
      if (res.ok) {
        missionService.updateMissionStatus(missionId, 'Em andamento');
        await syncFromSqliteOrMemory();
        const target = missions.find((m) => m.id === missionId);
        if (target) {
          notify(
            'Missão Iniciada',
            `A missão "${target.title}" agora está em andamento.`,
            'info'
          );
        }
      } else {
        await syncFromSqliteOrMemory();
        notify(
          'Missão Bloqueada',
          res.error || 'Conclua a missão anterior na sequência antes de iniciar esta missão.',
          'error'
        );
      }
    });
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

  const submitMissionEvidence = (missionId: string, evidenceText: string) => {
    const target = missions.find((m) => m.id === missionId);
    if (!target) return;

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

    missionService.submitMissionForValidation(payload);
    void apiRequest('/validations', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then(() => syncFromSqliteOrMemory());

    notify(
      'Enviado para Validação',
      `Sua evidência para "${target.title}" entrou na fila da curadoria.`,
      'info'
    );
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
        'Evidência Enviada',
        `Seu arquivo para "${target?.title || 'missão'}" foi enviado e está aguardando validação administrativa.`,
        'success'
      );
      return { ok: true };
    }

    const errorMsg = res.error || 'Não foi possível enviar a evidência. Verifique o arquivo e tente novamente.';
    notify('Erro ao Enviar Evidência', errorMsg, 'error');
    return { ok: false, error: errorMsg };
  };

  const scanQRCodeDemo = async (code: string): Promise<QRScanResult> => {
    const normalized = (code || '').trim().toUpperCase();
    if (!normalized) {
      const emptyRes: QRScanResult = {
        success: false,
        status: 'INVALID_CODE',
        message: 'Informe ou escaneie um código QR válido.',
      };
      notify('Código Inválido', emptyRes.message, 'error');
      return emptyRes;
    }

    // Validação definitiva no backend SQLite
    const apiRes = await apiRequestWithStatus<{
      success: boolean;
      status?: QRScanStatus;
      alreadyUsed?: boolean;
      qrCode?: QRCode;
      pointsAwarded?: number;
      message?: string;
      error?: string;
    }>('/qrcodes/scan', {
      method: 'POST',
      body: JSON.stringify({ code: normalized }),
    });

    // Erro de rede / servidor indisponível
    if (apiRes.status === 0) {
      const connError: QRScanResult = {
        success: false,
        status: 'CONNECTION_ERROR',
        message:
          'Erro de conexão com o servidor de validação. Verifique sua conexão e tente ler o QR Code novamente.',
      };
      notify('Erro de Conexão', connError.message, 'error');
      return connError;
    }

    const payload = apiRes.data;

    if (apiRes.ok && payload?.success && payload.qrCode) {
      // Sincroniza estado local e recarrega dados reais do SQLite
      qrCodeService.validateSimulatedScan(normalized);
      missionService.updateMissionStatus(payload.qrCode.missionId, 'Concluída');
      const prevPoints = participant.points;
      const updatedUser = participantService.addParticipantPoints(
        payload.qrCode.points,
        payload.qrCode.startupId
      );
      rankingService.recordPointsTransaction({
        participantId: updatedUser.id,
        participantName: updatedUser.name,
        sourceType: 'QR Code',
        sourceTitle: `${payload.qrCode.code} — ${payload.qrCode.missionTitle}`,
        pointsDelta: payload.qrCode.points,
        previousBalance: prevPoints,
        newBalance: updatedUser.points,
      });

      await syncFromSqliteOrMemory();

      const successResult: QRScanResult = {
        success: true,
        status: 'VALIDATED',
        qrCode: payload.qrCode,
        pointsAwarded: payload.pointsAwarded ?? payload.qrCode.points,
        message:
          payload.message ||
          `Leitura confirmada! +${payload.qrCode.points} pontos creditados pela missão "${payload.qrCode.missionTitle}".`,
      };
      notify('QR Code Validado!', successResult.message, 'success');
      return successResult;
    }

    // Código já utilizado pelo participante (HTTP 409)
    if (apiRes.status === 409 || payload?.status === 'ALREADY_USED' || payload?.alreadyUsed) {
      await syncFromSqliteOrMemory();
      const usedResult: QRScanResult = {
        success: false,
        status: 'ALREADY_USED',
        alreadyUsed: true,
        qrCode: payload?.qrCode,
        message:
          payload?.message ||
          `O código ${normalized} já foi utilizado por você anteriormente e os pontos já foram registrados.`,
      };
      notify('Código Já Utilizado', usedResult.message, 'info');
      return usedResult;
    }

    // Código inválido, inativo ou missão inválida
    const failStatus: QRScanStatus = payload?.status || 'INVALID_CODE';
    const failResult: QRScanResult = {
      success: false,
      status: failStatus,
      qrCode: payload?.qrCode,
      message:
        payload?.message ||
        apiRes.error ||
        `Código QR "${normalized}" inválido ou não localizado no sistema.`,
    };
    notify('Código Não Validado', failResult.message, 'error');
    return failResult;
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

  const createQRCode = (payload: Omit<QRCode, 'id' | 'scansCount' | 'createdAt'>) => {
    const created = qrCodeService.createQRCode(payload);
    void apiRequest('/qrcodes', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then(() => syncFromSqliteOrMemory());
    notify('QR Code Gerado', `Código ${created.code} associado com sucesso.`, 'success');
  };

  const toggleQRCodeActive = (id: string) => {
    qrCodeService.toggleQRCodeActive(id);
    void apiRequest(`/qrcodes/${id}/toggle`, { method: 'PATCH' }).then(() =>
      syncFromSqliteOrMemory()
    );
    notify('Status do QR Code', 'Estado de ativação do QR Code atualizado.', 'info');
  };

  const reviewValidationItem = (id: string, decision: 'Aprovada' | 'Rejeitada') => {
    const target = validationQueue.find((v) => v.id === id);
    missionService.reviewMissionValidation(id, decision);
    void apiRequest(`/validations/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ decision }),
    }).then(() => syncFromSqliteOrMemory());

    notify(
      `Evidência ${decision}`,
      `Submissão de ${target?.participantName || 'participante'} marcada como ${decision.toLowerCase()}.`,
      decision === 'Aprovada' ? 'success' : 'info'
    );
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
        qrCodes,
        validationQueue,
        publicRanking,
        dailyRankings,
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
        scanQRCodeDemo,
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
        createQRCode,
        toggleQRCodeActive,
        reviewValidationItem,
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
