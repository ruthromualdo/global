import { initialCurrentParticipant } from '../mocks/mockData';
import { Participant } from '../types';
import { apiRequest, apiRequestWithStatus, setAuthToken } from './apiClient';

let currentSessionParticipant: Participant = { ...initialCurrentParticipant };

export const authService = {
  async loginDemo(
    email: string,
    password?: string
  ): Promise<{
    ok: boolean;
    status: number;
    user?: Participant;
    message?: string;
    error?: string;
  }> {
    const res = await apiRequestWithStatus<{
      token?: string;
      expiresAt?: number;
      user?: Participant;
      message?: string;
      error?: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const hasValidToken =
      typeof res.data?.token === 'string' && res.data.token.trim().length > 0;
    const hasValidUser = Boolean(res.data?.user?.id && res.data?.user?.email);

    if (res.ok && hasValidToken && hasValidUser && res.data?.user && res.data?.token) {
      setAuthToken(res.data.token);
      currentSessionParticipant = { ...res.data.user };
      return {
        ok: true,
        status: res.status,
        user: res.data.user,
        message: res.data.message || 'Sessão autenticada com sucesso.',
      };
    }

    setAuthToken(null);
    const errorMsg =
      res.status === 0
        ? 'Não foi possível conectar ao servidor de autenticação. Verifique sua conexão e tente novamente.'
        : res.ok
        ? 'Resposta de autenticação inválida do servidor.'
        : res.data?.error || res.error || 'E-mail ou senha inválidos.';

    return {
      ok: false,
      status: res.ok ? 502 : res.status,
      error: errorMsg,
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
    phone: string;
    password?: string;
    acceptedTerms: boolean;
  }): Promise<{
    ok: boolean;
    status: number;
    user?: Participant;
    message?: string;
    error?: string;
  }> {
    const res = await apiRequestWithStatus<{
      token?: string;
      user: Participant;
      message: string;
      error?: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    if (res.ok && res.data?.user) {
      if (res.data.token) {
        setAuthToken(res.data.token);
      }
      currentSessionParticipant = { ...res.data.user };
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
      error:
        res.data?.error ||
        res.error ||
        'Não foi possível concluir o cadastro. Verifique os dados informados.',
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
