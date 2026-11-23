import { initialPointsTransactions } from '../mocks/mockData';
import { PointsTransaction, PublicRankingEntry } from '../types';
import { participantService } from './participantService';

let transactionsStore: PointsTransaction[] = initialPointsTransactions.map((t) => ({ ...t }));

export const rankingService = {
  /**
   * Retorna o ranking público estritamente sem e-mails, telefones ou dados sensíveis.
   */
  getPublicRanking(): PublicRankingEntry[] {
    const participants = participantService.getAllParticipants();
    const current = participantService.getParticipantProfile();

    const sorted = [...participants].sort((a, b) => b.points - a.points);
    return sorted.map((p, index) => ({
      position: index + 1,
      participantId: p.id,
      displayName: p.privacyPreferences.showNicknameInPublicRanking ? p.nickname : p.name,
      avatar: p.avatar,
      points: p.points,
      completedMissionsCount: p.completedMissionsCount,
      isCurrentUser: p.id === current.id,
    }));
  },

  getPointsTransactions(): PointsTransaction[] {
    return transactionsStore.map((t) => ({ ...t }));
  },

  recordPointsTransaction(entry: Omit<PointsTransaction, 'id' | 'createdAt'>): PointsTransaction {
    const created: PointsTransaction = {
      ...entry,
      id: `tx-${Date.now()}`,
      createdAt: 'Agora mesmo • Simulação',
    };
    transactionsStore = [created, ...transactionsStore];
    return created;
  },
};
