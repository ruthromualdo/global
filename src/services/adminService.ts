import { initialAdminMetrics, initialEventSettings } from '../mocks/mockData';
import { AdminDashboardMetrics, EventSettings, Participant, UserRole } from '../types';
import { apiRequestWithStatus } from './apiClient';

export interface AdminUserPayload {
  name: string;
  nickname?: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  startupId?: string | null;
  status: Participant['status'];
  password?: string;
}

let eventSettingsStore: EventSettings = { ...initialEventSettings };
let metricsStore: AdminDashboardMetrics = { ...initialAdminMetrics };

export const adminService = {
  async listUsers(role?: UserRole) {
    const query = role ? `?role=${encodeURIComponent(role)}` : '';
    return apiRequestWithStatus<Participant[]>(`/admin/users${query}`);
  },

  async createUser(payload: AdminUserPayload) {
    return apiRequestWithStatus<Participant>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async updateUser(id: string, payload: Partial<AdminUserPayload>) {
    return apiRequestWithStatus<Participant>(`/admin/users/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async deleteUser(id: string) {
    return apiRequestWithStatus<{ deleted: boolean; id: string }>(
      `/admin/users/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    );
  },

  getDashboardMetrics(): AdminDashboardMetrics {
    return {
      ...metricsStore,
      engagementByDay: metricsStore.engagementByDay.map((d) => ({ ...d })),
      participationByStartup: metricsStore.participationByStartup.map((s) => ({ ...s })),
      missionPerformance: metricsStore.missionPerformance.map((m) => ({ ...m })),
    };
  },

  getEventSettings(): EventSettings {
    return {
      ...eventSettingsStore,
      scoringRules: [...eventSettingsStore.scoringRules],
      tieBreakerCriteria: [...eventSettingsStore.tieBreakerCriteria],
    };
  },

  updateEventSettings(updates: Partial<EventSettings>): EventSettings {
    eventSettingsStore = {
      ...eventSettingsStore,
      ...updates,
    };
    return this.getEventSettings();
  },
};
