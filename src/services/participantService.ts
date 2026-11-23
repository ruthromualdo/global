import {
  initialCurrentParticipant,
  initialParticipantsList,
} from '../mocks/mockData';
import { Participant } from '../types';

let participantState: Participant = { ...initialCurrentParticipant };
let participantsDirectory: Participant[] = initialParticipantsList.map((p) => ({ ...p }));

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

    return { ...participantState };
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
