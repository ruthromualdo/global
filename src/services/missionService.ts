import { initialMissions, initialValidationQueue } from '../mocks/mockData';
import { Mission, MissionCompletion, MissionStatus } from '../types';

let missionsStore: Mission[] = initialMissions.map((m) => ({ ...m }));
let validationQueueStore: MissionCompletion[] = initialValidationQueue.map((v) => ({ ...v }));

export const missionService = {
  getMissions(includeInactive = true): Mission[] {
    const list = missionsStore.map((m) => ({ ...m }));
    return includeInactive ? list : list.filter((m) => m.active);
  },

  getMissionsByStartup(startupId: string): Mission[] {
    return missionsStore.filter((m) => m.startupId === startupId).map((m) => ({ ...m }));
  },

  updateMissionStatus(missionId: string, status: MissionStatus): Mission | undefined {
    let updated: Mission | undefined;
    missionsStore = missionsStore.map((m) => {
      if (m.id === missionId) {
        updated = { ...m, status };
        return updated;
      }
      return m;
    });

    // Desbloqueia missão surpresa se houver 3+ concluídas
    const completedCount = missionsStore.filter((m) => m.status === 'Concluída').length;
    if (completedCount >= 3) {
      missionsStore = missionsStore.map((m) =>
        m.status === 'Bloqueada' ? { ...m, status: 'Disponível' } : m
      );
    }

    return updated;
  },

  createMission(payload: Omit<Mission, 'id'>): Mission {
    const created: Mission = {
      ...payload,
      id: `ms-${Date.now()}`,
    };
    missionsStore = [created, ...missionsStore];
    return { ...created };
  },

  updateMission(id: string, updates: Partial<Mission>): Mission[] {
    missionsStore = missionsStore.map((m) => (m.id === id ? { ...m, ...updates } : m));
    return this.getMissions();
  },

  toggleMissionActive(id: string): Mission[] {
    missionsStore = missionsStore.map((m) => (m.id === id ? { ...m, active: !m.active } : m));
    return this.getMissions();
  },

  deleteMission(id: string): Mission[] {
    missionsStore = missionsStore.filter((m) => m.id !== id);
    return this.getMissions();
  },

  getValidationQueue(): MissionCompletion[] {
    return validationQueueStore.map((v) => ({ ...v }));
  },

  submitMissionForValidation(item: Omit<MissionCompletion, 'id' | 'submittedAt' | 'status'>): MissionCompletion {
    const newEntry: MissionCompletion = {
      ...item,
      id: `val-${Date.now()}`,
      submittedAt: 'Agora mesmo • Simulação',
      status: 'Pendente',
    };
    validationQueueStore = [newEntry, ...validationQueueStore];
    this.updateMissionStatus(item.missionId, 'Aguardando validação');
    return newEntry;
  },

  reviewMissionValidation(id: string, decision: 'Aprovada' | 'Rejeitada'): MissionCompletion[] {
    validationQueueStore = validationQueueStore.map((item) => {
      if (item.id === id) {
        if (decision === 'Aprovada') {
          this.updateMissionStatus(item.missionId, 'Concluída');
        }
        return { ...item, status: decision };
      }
      return item;
    });
    return this.getValidationQueue();
  },
};
