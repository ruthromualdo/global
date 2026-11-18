import { initialCurrentParticipant } from '../mocks/mockData';
import { Participant } from '../types';
import { apiRequest, apiRequestWithStatus, setAuthToken } from './apiClient';

let currentSessionParticipant: Participant = { ...initialCurrentParticipant };

export const authService = {
  async loginDemo(
    email: string,
    password?: string
  ): Promise<{ user: Participant; message: string }> {
    const apiRes = await apiRequest<{
      token?: string;
      user: Participant;
      message: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (apiRes) {
      if (apiRes.token) {
        setAuthToken(apiRes.token);
      }
      currentSessionParticipant = { ...apiRes.user };
      return apiRes;
    }

    return {
      user: {
        ...currentSessionParticipant,
        email: email || currentSessionParticipant.email,
      },
      message: 'Acesso realizado com sucesso.',
    };
  },

  async loginAdmin(
    email: string,
    password: string
  ): Promise<{
    ok: boolean;
    status: number;
    user?: Participant;
    message?: string;
    error?: string;
  }> {
    const res = await apiRequestWithStatus<{
      token: string;
      expiresAt: number;
      user: Participant;
      message: string;
    }>('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (res.ok && res.data) {
      setAuthToken(res.data.token);
      return {
        ok: true,
        status: res.status,
        user: res.data.user,
        message: res.data.message,
      };
    }

    return {
      ok: false,
      status: res.status,
      error: res.error || 'Falha na autenticação administrativa.',
    };
  },

  async logout(): Promise<void> {
    await apiRequest('/auth/logout', { method: 'POST' });
    setAuthToken(null);
  },

  async registerDemo(payload: {
    name: string;
    email: string;
    password?: string;
    acceptedTerms: boolean;
  }): Promise<{ user: Participant; message: string }> {
    const apiRes = await apiRequest<{
      token?: string;
      user: Participant;
      message: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (apiRes) {
      if (apiRes.token) {
        setAuthToken(apiRes.token);
      }
      currentSessionParticipant = { ...apiRes.user };
      return apiRes;
    }

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
      avatar: initials || 'RR',
    };

    return {
      user: { ...currentSessionParticipant },
      message: 'Cadastro concluído! Bem-vindo(a) ao Desafio Global Summit 2026.',
    };
  },

  async requestPasswordResetDemo(email: string): Promise<{ message: string }> {
    const apiRes = await apiRequest<{ message: string }>('/auth/recover-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
    if (apiRes) return apiRes;

    return {
      message: `Instruções de recuperação enviadas para ${email}.`,
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
