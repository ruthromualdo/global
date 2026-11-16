import { initialAdminMetrics, initialEventSettings } from '../mocks/mockData';
import { AdminDashboardMetrics, EventSettings } from '../types';

let eventSettingsStore: EventSettings = { ...initialEventSettings };
let metricsStore: AdminDashboardMetrics = { ...initialAdminMetrics };

export const adminService = {
  getDashboardMetrics(): AdminDashboardMetrics {
    return {
      ...metricsStore,
      engagementByDay: metricsStore.engagementByDay.map((d) => ({ ...d })),
      participationByStartup: metricsStore.participationByStartup.map((s) => ({ ...s })),
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
