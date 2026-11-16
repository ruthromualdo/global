import { initialGovernancePlans } from '../mocks/mockData';
import { GovernancePlan } from '../types';

let governancePlansStore: GovernancePlan[] = initialGovernancePlans.map((p) => ({
  ...p,
  relatedDocuments: [...p.relatedDocuments],
}));

export const governanceService = {
  getGovernancePlans(): GovernancePlan[] {
    return governancePlansStore.map((p) => ({
      ...p,
      relatedDocuments: [...p.relatedDocuments],
    }));
  },

  updateGovernancePlan(id: string, updates: Partial<GovernancePlan>): GovernancePlan[] {
    governancePlansStore = governancePlansStore.map((plan) =>
      plan.id === id ? { ...plan, ...updates } : plan
    );
    return this.getGovernancePlans();
  },
};
