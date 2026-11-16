import {
  initialAchievements,
  initialCurrentParticipant,
  initialParticipantsList,
} from '../mocks/mockData';
import { Achievement, Participant } from '../types';

let participantState: Participant = { ...initialCurrentParticipant };
let participantsDirectory: Participant[] = initialParticipantsList.map((p) => ({ ...p }));
let achievementsState: Achievement[] = initialAchievements.map((a) => ({ ...a }));

export const participantService = {
  getParticipantProfile(): Participant {
    return { ...participantState };
  },

  updateParticipantProfile(updates: Partial<Participant>): Participant {
    participantState = {
      ...participantState,
      ...updates,
      privacyPreferences: {
        ...participantState.privacyPreferences,
        ...(updates.privacyPreferences || {}),
      },
    };
    participantsDirectory = participantsDirectory.map((p) =>
      p.id === participantState.id ? { ...participantState } : p
    );
    return { ...participantState };
  },

  addParticipantPoints(pointsDelta: number, visitedStartupId?: string): Participant {
    const updatedVisited = visitedStartupId && !participantState.visitedStartupsIds.includes(visitedStartupId)
      ? [...participantState.visitedStartupsIds, visitedStartupId]
      : participantState.visitedStartupsIds;

    participantState = {
      ...participantState,
      points: participantState.points + pointsDelta,
      completedMissionsCount: participantState.completedMissionsCount + 1,
      visitedStartupsIds: updatedVisited,
    };

    participantsDirectory = participantsDirectory.map((p) =>
      p.id === participantState.id ? { ...participantState } : p
    );

    // Recalcular posições no diretório
    const sorted = [...participantsDirectory].sort((a, b) => b.points - a.points);
    sorted.forEach((p, idx) => {
      p.rankingPosition = idx + 1;
      if (p.id === participantState.id) {
        participantState.rankingPosition = idx + 1;
      }
    });
    participantsDirectory = sorted;

    // Atualizar progresso de conquistas
    achievementsState = achievementsState.map((ach) => {
      if (ach.id === 'ach-05') {
        const nextProgress = Math.min(ach.progressTotal, participantState.points);
        const unlocked = nextProgress >= ach.progressTotal && participantState.visitedStartupsIds.length >= 4;
        return {
          ...ach,
          progressCurrent: nextProgress,
          unlocked: ach.unlocked || unlocked,
          unlockedAt: unlocked && !ach.unlocked ? 'Agora mesmo • Simulação' : ach.unlockedAt,
        };
      }
      if (ach.id === 'ach-03') {
        const nextProgress = Math.min(ach.progressTotal, ach.progressCurrent + 1);
        const unlocked = nextProgress >= ach.progressTotal;
        return {
          ...ach,
          progressCurrent: nextProgress,
          unlocked: ach.unlocked || unlocked,
          unlockedAt: unlocked && !ach.unlocked ? 'Agora mesmo • Simulação' : ach.unlockedAt,
        };
      }
      return ach;
    });

    return { ...participantState };
  },

  getAchievements(): Achievement[] {
    return achievementsState.map((a) => ({ ...a }));
  },

  getAllParticipants(): Participant[] {
    return participantsDirectory.map((p) => ({ ...p }));
  },

  updateParticipantStatus(id: string, status: Participant['status']): Participant[] {
    participantsDirectory = participantsDirectory.map((p) =>
      p.id === id ? { ...p, status } : p
    );
    return this.getAllParticipants();
  },
};
