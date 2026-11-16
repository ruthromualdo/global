import { initialCurrentParticipant } from '../mocks/mockData';
import { Participant } from '../types';

let currentSessionParticipant: Participant = { ...initialCurrentParticipant };

export const authService = {
  async loginDemo(email: string, _password?: string): Promise<{ user: Participant; message: string }> {
    return {
      user: {
        ...currentSessionParticipant,
        email: email || currentSessionParticipant.email,
      },
      message: 'Acesso demonstrativo realizado com sucesso (Sem autenticação real/banco de dados nesta etapa).',
    };
  },

  async registerDemo(payload: {
    name: string;
    email: string;
    password?: string;
    acceptedTerms: boolean;
  }): Promise<{ user: Participant; message: string }> {
    const initials = payload.name
      .trim()
      .split(/\s+/)
      .map((p) => p[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    currentSessionParticipant = {
      ...currentSessionParticipant,
      name: payload.name || currentSessionParticipant.name,
      nickname: payload.name.split(' ')[0] || currentSessionParticipant.nickname,
      email: payload.email || currentSessionParticipant.email,
      avatar: initials || 'MC',
    };

    return {
      user: { ...currentSessionParticipant },
      message: 'Cadastro demonstrativo concluído! Bem-vindo(a) ao Desafio Global Summit 2026.',
    };
  },

  async requestPasswordResetDemo(email: string): Promise<{ message: string }> {
    return {
      message: `Simulação demonstrativa: instruções de recuperação enviadas para ${email}.`,
    };
  },

  getCurrentUser(): Participant {
    return { ...currentSessionParticipant };
  },

  updateCurrentUser(partial: Partial<Participant>): Participant {
    currentSessionParticipant = { ...currentSessionParticipant, ...partial };
    return { ...currentSessionParticipant };
  },
};
