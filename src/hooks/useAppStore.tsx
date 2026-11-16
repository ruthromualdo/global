import React, { createContext, useContext, useState, useCallback } from 'react';
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
} from '../types';
import { authService } from '../services/authService';
import { participantService } from '../services/participantService';
import { startupService } from '../services/startupService';
import { missionService } from '../services/missionService';
import { qrCodeService } from '../services/qrCodeService';
import { rankingService } from '../services/rankingService';
import { adminService } from '../services/adminService';
import { governanceService } from '../services/governanceService';

export interface ToastNotice {
  id: string;
  type: 'success' | 'error' | 'info';
  title: string;
  message: string;
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
  toasts: ToastNotice[];
  notify: (title: string, message: string, type?: ToastNotice['type']) => void;
  dismissToast: (id: string) => void;
  // Participant actions
  loginDemo: (email: string) => Promise<void>;
  registerDemo: (payload: { name: string; email: string; acceptedTerms: boolean }) => Promise<void>;
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
  const [adminMetrics] = useState<AdminDashboardMetrics>(() =>
    adminService.getDashboardMetrics()
  );
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

  const syncAll = useCallback(() => {
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

  const loginDemo = async (email: string) => {
    const res = await authService.loginDemo(email);
    participantService.updateParticipantProfile({ email: res.user.email });
    syncAll();
    notify('Sessão Demonstrativa Ativa', res.message, 'info');
  };

  const registerDemo = async (payload: {
    name: string;
    email: string;
    acceptedTerms: boolean;
  }) => {
    const res = await authService.registerDemo(payload);
    participantService.updateParticipantProfile({
      name: res.user.name,
      nickname: res.user.nickname,
      email: res.user.email,
      avatar: res.user.avatar,
    });
    syncAll();
    notify('Cadastro Demonstrativo Realizado', res.message, 'success');
  };

  const startMission = (missionId: string) => {
    const updated = missionService.updateMissionStatus(missionId, 'Em andamento');
    syncAll();
    if (updated) {
      notify(
        'Missão Iniciada',
        `A missão "${updated.title}" agora está em andamento.`,
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
    syncAll();
    notify(
      `+${target.points} Pontos Conquistados!`,
      `Missão "${target.title}" concluída com sucesso.`,
      'success'
    );
  };

  const submitMissionEvidence = (missionId: string, evidenceText: string) => {
    const target = missions.find((m) => m.id === missionId);
    if (!target) return;

    missionService.submitMissionForValidation({
      participantId: participant.id,
      participantName: participant.name,
      missionId: target.id,
      missionTitle: target.title,
      startupId: target.startupId,
      startupName: target.startupName,
      evidenceDescription: evidenceText || 'Registro enviado via Central de Missões.',
      evidenceCode: `EVID-${Math.floor(1000 + Math.random() * 9000)}`,
      pointsAwarded: target.points,
    });
    syncAll();
    notify(
      'Enviado para Validação',
      `Sua evidência para "${target.title}" entrou na fila demonstrativa da curadoria.`,
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
      syncAll();
      notify('QR Code Validado!', result.message, 'success');
    } else {
      notify('Falha na Leitura Simulada', result.message, 'error');
    }
    return result;
  };

  const updateProfile = (updates: Partial<Participant>) => {
    participantService.updateParticipantProfile(updates);
    syncAll();
    notify('Perfil Atualizado', 'Suas preferências demonstrativas foram salvas.', 'success');
  };

  const createStartup = (payload: Omit<Startup, 'id'>) => {
    const created = startupService.createStartup(payload);
    syncAll();
    notify('Startup Cadastrada', `"${created.name}" foi adicionada ao circuito.`, 'success');
  };

  const updateStartup = (id: string, updates: Partial<Startup>) => {
    startupService.updateStartup(id, updates);
    syncAll();
    notify('Startup Atualizada', 'Dados da startup atualizados na camada de serviços.', 'success');
  };

  const toggleStartupActive = (id: string) => {
    startupService.toggleStartupActive(id);
    syncAll();
    notify('Status Alterado', 'Visibilidade da startup atualizada.', 'info');
  };

  const deleteStartup = (id: string) => {
    startupService.deleteStartup(id);
    syncAll();
    notify('Startup Removida', 'Registro removido da listagem demonstrativa.', 'info');
  };

  const createMission = (payload: Omit<Mission, 'id'>) => {
    const created = missionService.createMission(payload);
    syncAll();
    notify('Missão Criada', `"${created.title}" adicionada à Central de Missões.`, 'success');
  };

  const updateMission = (id: string, updates: Partial<Mission>) => {
    missionService.updateMission(id, updates);
    syncAll();
    notify('Missão Atualizada', 'Configurações da missão salvas com sucesso.', 'success');
  };

  const toggleMissionActive = (id: string) => {
    missionService.toggleMissionActive(id);
    syncAll();
    notify('Status da Missão Alterado', 'Disponibilidade da missão atualizada.', 'info');
  };

  const deleteMission = (id: string) => {
    missionService.deleteMission(id);
    syncAll();
    notify('Missão Excluída', 'Missão removida da lista demonstrativa.', 'info');
  };

  const createQRCode = (payload: Omit<QRCode, 'id' | 'scansCount' | 'createdAt'>) => {
    const created = qrCodeService.createQRCode(payload);
    syncAll();
    notify('QR Code Gerado', `Código ${created.code} associado com sucesso.`, 'success');
  };

  const toggleQRCodeActive = (id: string) => {
    qrCodeService.toggleQRCodeActive(id);
    syncAll();
    notify('Status do QR Code', 'Estado de ativação do QR Code atualizado.', 'info');
  };

  const reviewValidationItem = (id: string, decision: 'Aprovada' | 'Rejeitada') => {
    const target = validationQueue.find((v) => v.id === id);
    missionService.reviewMissionValidation(id, decision);
    if (target && decision === 'Aprovada' && target.participantId === participant.id) {
      const prev = participant.points;
      const updatedUser = participantService.addParticipantPoints(
        target.pointsAwarded,
        target.startupId
      );
      rankingService.recordPointsTransaction({
        participantId: updatedUser.id,
        participantName: updatedUser.name,
        sourceType: 'Missão',
        sourceTitle: `Validação Aprovada: ${target.missionTitle}`,
        pointsDelta: target.pointsAwarded,
        previousBalance: prev,
        newBalance: updatedUser.points,
      });
    }
    syncAll();
    notify(
      `Evidência ${decision}`,
      `Submissão de ${target?.participantName || 'participante'} marcada como ${decision.toLowerCase()}.`,
      decision === 'Aprovada' ? 'success' : 'info'
    );
  };

  const updateParticipantStatus = (id: string, status: Participant['status']) => {
    participantService.updateParticipantStatus(id, status);
    syncAll();
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
    syncAll();
    notify(
      'Registro de Pontuação',
      `Transação demonstrativa registrada no histórico do ranking.`,
      'success'
    );
  };

  const updateEventSettings = (updates: Partial<EventSettings>) => {
    adminService.updateEventSettings(updates);
    syncAll();
    notify('Configurações Salvas', 'Parâmetros do evento atualizados em memória.', 'success');
  };

  const updateGovernancePlan = (id: string, updates: Partial<GovernancePlan>) => {
    governanceService.updateGovernancePlan(id, updates);
    syncAll();
    notify('Plano de Governança Atualizado', 'Alterações demonstrativas registradas.', 'success');
  };

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
        toasts,
        notify,
        dismissToast,
        loginDemo,
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
