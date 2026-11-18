import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  Achievement,
  AdminDashboardMetrics,
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
import { apiRequest } from '../services/apiClient';

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
  achievements: Achievement[];
  qrCodes: QRCode[];
  validationQueue: MissionCompletion[];
  publicRanking: PublicRankingEntry[];
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
  achievements: Achievement[];
  qrCodes: QRCode[];
  validationQueue: MissionCompletion[];
  publicRanking: PublicRankingEntry[];
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
  loginDemo: (email: string, password?: string) => Promise<void>;
  loginAdmin: (
    email: string,
    password: string
  ) => Promise<{ ok: boolean; status: number; error?: string }>;
  logoutSession: () => Promise<void>;
  registerDemo: (payload: {
    name: string;
    email: string;
    password?: string;
    acceptedTerms: boolean;
  }) => Promise<void>;
  completeMissionInstant: (missionId: string) => void;
  startMission: (missionId: string) => void;
  submitMissionEvidence: (missionId: string, evidenceText: string) => void;
  scanQRCodeDemo: (code: string) => { success: boolean; message: string; qrCode?: QRCode };
  updateProfile: (updates: Partial<Participant>) => void;
  // Admin actions
  createStartup: (payload: Omit<Startup, 'id'>) => void;
  updateStartup: (id: string, updates: Partial<Startup>) => void;
  toggleStartupActive: (id: string) => void;
  deleteStartup: (id: string) => void;
  createMission: (payload: Omit<Mission, 'id'>) => void;
  updateMission: (id: string, updates: Partial<Mission>) => void;
  toggleMissionActive: (id: string) => void;
  deleteMission: (id: string) => void;
  createQRCode: (payload: Omit<QRCode, 'id' | 'scansCount' | 'createdAt'>) => void;
  toggleQRCodeActive: (id: string) => void;
  reviewValidationItem: (id: string, decision: 'Aprovada' | 'Rejeitada') => void;
  updateParticipantStatus: (id: string, status: Participant['status']) => void;
  adjustParticipantPointsAdmin: (participantId: string, pointsDelta: number, reason: string) => void;
  updateEventSettings: (updates: Partial<EventSettings>) => void;
  updateGovernancePlan: (id: string, updates: Partial<GovernancePlan>) => void;
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
  const [achievements, setAchievements] = useState<Achievement[]>(() =>
    participantService.getAchievements()
  );
  const [qrCodes, setQrCodes] = useState<QRCode[]>(() => qrCodeService.getQRCodes());
  const [validationQueue, setValidationQueue] = useState<MissionCompletion[]>(() =>
    missionService.getValidationQueue()
  );
  const [publicRanking, setPublicRanking] = useState<PublicRankingEntry[]>(() =>
    rankingService.getPublicRanking()
  );
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

  const syncFromSqliteOrMemory = useCallback(async () => {
    const data = await apiRequest<BootstrapPayload>('/bootstrap');
    if (data) {
      setSqliteConnected(true);
      setParticipant(data.participant);
      setAllParticipants(data.allParticipants);
      setStartups(data.startups);
      setMissions(data.missions);
      setAchievements(data.achievements);
      setQrCodes(data.qrCodes);
      setValidationQueue(data.validationQueue);
      setPublicRanking(data.publicRanking);
      setPointsTransactions(data.pointsTransactions);
      setEventSettings(data.eventSettings);
      setGovernancePlans(data.governancePlans);
      setAdminMetrics(data.adminMetrics);
      if (data.auth) {
        setAuthState(data.auth);
      }
      setIsCheckingAuth(false);
      return;
    }

    setSqliteConnected(false);
    setIsCheckingAuth(false);
    setParticipant(participantService.getParticipantProfile());
    setAllParticipants(participantService.getAllParticipants());
    setStartups(startupService.getStartups());
    setMissions(missionService.getMissions());
    setAchievements(participantService.getAchievements());
    setQrCodes(qrCodeService.getQRCodes());
    setValidationQueue(missionService.getValidationQueue());
    setPublicRanking(rankingService.getPublicRanking());
    setPointsTransactions(rankingService.getPointsTransactions());
    setEventSettings(adminService.getEventSettings());
    setGovernancePlans(governanceService.getGovernancePlans());
  }, []);

  useEffect(() => {
    void syncFromSqliteOrMemory();
  }, [syncFromSqliteOrMemory]);

  const loginDemo = async (email: string, password?: string) => {
    const res = await authService.loginDemo(email, password);
    participantService.updateParticipantProfile({ email: res.user.email });
    await syncFromSqliteOrMemory();
    notify('Sessão Ativa', res.message, 'info');
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
    password?: string;
    acceptedTerms: boolean;
  }) => {
    const res = await authService.registerDemo(payload);
    participantService.updateParticipantProfile({
      name: res.user.name,
      nickname: res.user.nickname,
      email: res.user.email,
      avatar: res.user.avatar,
    });
    await syncFromSqliteOrMemory();
    notify('Cadastro Realizado', res.message, 'success');
  };

  const startMission = (missionId: string) => {
    missionService.updateMissionStatus(missionId, 'Em andamento');
    void apiRequest(`/missions/${missionId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Em andamento' }),
    }).then(() => syncFromSqliteOrMemory());

    const target = missions.find((m) => m.id === missionId);
    if (target) {
      notify(
        'Missão Iniciada',
        `A missão "${target.title}" agora está em andamento.`,
        'info'
      );
    }
  };

  const completeMissionInstant = (missionId: string) => {
    const target = missions.find((m) => m.id === missionId);
    if (!target) return;
    if (target.status === 'Concluída') {
      notify('Missão já concluída', 'Você já recebeu os pontos desta missão.', 'info');
      return;
    }

    const prevPoints = participant.points;
    missionService.updateMissionStatus(missionId, 'Concluída');
    const updatedUser = participantService.addParticipantPoints(target.points, target.startupId);
    rankingService.recordPointsTransaction({
      participantId: updatedUser.id,
      participantName: updatedUser.name,
      sourceType: 'Missão',
      sourceTitle: target.title,
      pointsDelta: target.points,
      previousBalance: prevPoints,
      newBalance: updatedUser.points,
    });

    void apiRequest(`/missions/${missionId}/complete`, { method: 'POST' }).then(() =>
      syncFromSqliteOrMemory()
    );

    notify(
      `+${target.points} Pontos Conquistados!`,
      `Missão "${target.title}" concluída e gravada com sucesso.`,
      'success'
    );
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

  const scanQRCodeDemo = (code: string) => {
    const result = qrCodeService.validateSimulatedScan(code);
    if (result.success && result.qrCode) {
      const prevPoints = participant.points;
      missionService.updateMissionStatus(result.qrCode.missionId, 'Concluída');
      const updatedUser = participantService.addParticipantPoints(
        result.qrCode.points,
        result.qrCode.startupId
      );
      rankingService.recordPointsTransaction({
        participantId: updatedUser.id,
        participantName: updatedUser.name,
        sourceType: 'QR Code',
        sourceTitle: `${result.qrCode.code} — ${result.qrCode.missionTitle}`,
        pointsDelta: result.qrCode.points,
        previousBalance: prevPoints,
        newBalance: updatedUser.points,
      });

      void apiRequest('/qrcodes/scan', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }).then(() => syncFromSqliteOrMemory());

      notify('QR Code Validado!', result.message, 'success');
    } else {
      notify('Falha na Leitura', result.message, 'error');
    }
    return result;
  };

  const updateProfile = (updates: Partial<Participant>) => {
    participantService.updateParticipantProfile(updates);
    void apiRequest('/participants/me', {
      method: 'PUT',
      body: JSON.stringify(updates),
    }).then(() => syncFromSqliteOrMemory());
    notify('Perfil Atualizado', 'Suas preferências foram salvas no SQLite.', 'success');
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

  const createMission = (payload: Omit<Mission, 'id'>) => {
    const created = missionService.createMission(payload);
    void apiRequest('/missions', {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then(() => syncFromSqliteOrMemory());
    notify('Missão Criada', `"${created.title}" adicionada à Central de Missões.`, 'success');
  };

  const updateMission = (id: string, updates: Partial<Mission>) => {
    missionService.updateMission(id, updates);
    void apiRequest(`/missions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }).then(() => syncFromSqliteOrMemory());
    notify('Missão Atualizada', 'Configurações da missão salvas no SQLite.', 'success');
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

  const adjustParticipantPointsAdmin = (
    participantId: string,
    pointsDelta: number,
    reason: string
  ) => {
    const target = allParticipants.find((p) => p.id === participantId);
    if (!target) return;
    const prev = target.points;
    if (participantId === participant.id) {
      participantService.addParticipantPoints(pointsDelta);
    }
    rankingService.recordPointsTransaction({
      participantId: target.id,
      participantName: target.name,
      sourceType: 'Ajuste Administrativo',
      sourceTitle: reason || 'Ajuste manual de auditoria',
      pointsDelta,
      previousBalance: prev,
      newBalance: prev + pointsDelta,
    });

    void apiRequest('/ranking/adjust', {
      method: 'POST',
      body: JSON.stringify({ participantId, pointsDelta, reason }),
    }).then(() => syncFromSqliteOrMemory());

    notify(
      'Registro de Pontuação',
      `Transação gravada no histórico SQLite do ranking.`,
      'success'
    );
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
        achievements,
        qrCodes,
        validationQueue,
        publicRanking,
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
        scanQRCodeDemo,
        updateProfile,
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
        adjustParticipantPointsAdmin,
        updateEventSettings,
        updateGovernancePlan,
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
