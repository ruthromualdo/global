import { initialStartups } from '../mocks/mockData';
import { Startup } from '../types';

let startupsStore: Startup[] = initialStartups.map((s) => ({ ...s }));

export const startupService = {
  getStartups(onlyActive = false): Startup[] {
    const list = startupsStore.map((s) => ({ ...s }));
    return onlyActive ? list.filter((s) => s.active) : list;
  },

  getStartupById(id: string): Startup | undefined {
    const found = startupsStore.find((s) => s.id === id);
    return found ? { ...found } : undefined;
  },

  createStartup(payload: Omit<Startup, 'id'>): Startup {
    const newStartup: Startup = {
      ...payload,
      id: `st-${Date.now()}`,
    };
    startupsStore = [...startupsStore, newStartup];
    return { ...newStartup };
  },

  updateStartup(id: string, updates: Partial<Startup>): Startup[] {
    startupsStore = startupsStore.map((s) => (s.id === id ? { ...s, ...updates } : s));
    return this.getStartups();
  },

  toggleStartupActive(id: string): Startup[] {
    startupsStore = startupsStore.map((s) => (s.id === id ? { ...s, active: !s.active } : s));
    return this.getStartups();
  },

  deleteStartup(id: string): Startup[] {
    startupsStore = startupsStore.filter((s) => s.id !== id);
    return this.getStartups();
  },
};
