const rawApiBase = (import.meta as unknown as { env?: Record<string, string | undefined> }).env
  ?.VITE_API_BASE_URL;

export const API_BASE_URL =
  typeof rawApiBase === 'string' && rawApiBase.trim().length > 0
    ? rawApiBase.trim().replace(/\/+$/, '')
    : '/api';

const SESSION_TOKEN_KEY = 'dgs2026_auth_token';
let inMemoryToken: string | null = null;

export function getAuthToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  try {
    return window.sessionStorage.getItem(SESSION_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setAuthToken(token: string | null): void {
  inMemoryToken = token;
  try {
    if (token) {
      window.sessionStorage.setItem(SESSION_TOKEN_KEY, token);
    } else {
      window.sessionStorage.removeItem(SESSION_TOKEN_KEY);
    }
  } catch {
    // Ignorar caso sessionStorage esteja indisponível
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<T | null> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options?.headers as Record<string, string>) || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function apiRequestWithStatus<T>(
  endpoint: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options?.headers as Record<string, string>) || {}),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: body as T | null,
        error: body?.error || body?.message || `Erro HTTP ${response.status}`,
      };
    }
    return {
      ok: true,
      status: response.status,
      data: body as T,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      error: 'Falha de conexão com o servidor.',
    };
  }
}

export async function uploadEvidenceFileRequest(params: {
  missionId: string;
  file: File;
  description?: string;
}): Promise<{ ok: boolean; status: number; data: any; error?: string }> {
  try {
    const token = getAuthToken();
    const buffer = await params.file.arrayBuffer();
    const headers: Record<string, string> = {
      'Content-Type': 'application/octet-stream',
      'X-Mission-Id': params.missionId,
      'X-File-Name': encodeURIComponent(params.file.name),
      'X-File-Mime': params.file.type || 'application/octet-stream',
      'X-Evidence-Description': encodeURIComponent(params.description || ''),
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/evidences/upload`, {
      method: 'POST',
      headers,
      body: buffer,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: body,
        error: body?.error || body?.message || `Erro HTTP ${response.status}`,
      };
    }
    return { ok: true, status: response.status, data: body };
  } catch {
    return {
      ok: false,
      status: 0,
      data: null,
      error: 'Falha de conexão ao enviar o arquivo de evidência.',
    };
  }
}

export async function fetchAuthenticatedEvidenceBlob(
  validationId: string
): Promise<{
  ok: boolean;
  blob?: Blob;
  mimeType?: string;
  fileName?: string;
  error?: string;
}> {
  try {
    const token = getAuthToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const response = await fetch(`${API_BASE_URL}/evidences/${validationId}/file`, {
      method: 'GET',
      headers,
    });
    if (!response.ok) {
      const errBody = await response.json().catch(() => null);
      return {
        ok: false,
        error: errBody?.error || `Não foi possível carregar o arquivo (HTTP ${response.status}).`,
      };
    }
    const blob = await response.blob();
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="?([^"]+)"?/i);
    const fileName = match?.[1] ? decodeURIComponent(match[1]) : undefined;
    return {
      ok: true,
      blob,
      mimeType: response.headers.get('Content-Type') || blob.type,
      fileName,
    };
  } catch {
    return { ok: false, error: 'Erro ao baixar arquivo de evidência.' };
  }
}
