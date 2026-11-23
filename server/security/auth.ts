import crypto from 'node:crypto';
import type { Request, Response, NextFunction } from 'express';
import { db } from '../db/database';

export type UserRole = 'PARTICIPANT' | 'ADMIN';

export interface AuthenticatedSession {
  tokenHash: string;
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  expiresAt: number;
}

const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS) || 8 * 60 * 60 * 1000; // 8 horas padrão

/**
 * Gera hash seguro de senha utilizando scrypt nativo do Node.js com salt aleatório de 16 bytes.
 */
export function hashPassword(plainPassword: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(plainPassword, salt, 64).toString('hex');
  return `scrypt$${salt}$${derivedKey}`;
}

/**
 * Verifica senha contra hash scrypt utilizando comparação em tempo constante (timingSafeEqual).
 */
export function verifyPassword(plainPassword: string, storedHash: string | null | undefined): boolean {
  if (!storedHash || !storedHash.startsWith('scrypt$')) {
    return false;
  }
  const parts = storedHash.split('$');
  if (parts.length !== 3) return false;
  const [, salt, keyHex] = parts;
  const keyBuffer = Buffer.from(keyHex, 'hex');
  const derivedBuffer = crypto.scryptSync(plainPassword, salt, 64);
  if (keyBuffer.length !== derivedBuffer.length) return false;
  return crypto.timingSafeEqual(keyBuffer, derivedBuffer);
}

export function hashSessionToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

export function createSessionInDb(params: {
  userId: string;
  email: string;
  role: UserRole;
}): { token: string; expiresAt: number } {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  const now = Date.now();
  const expiresAt = now + SESSION_TTL_MS;

  // Limpa sessões expiradas
  db.prepare('DELETE FROM auth_sessions WHERE expires_at <= ?').run(now);

  db.prepare(`
    INSERT INTO auth_sessions (token_hash, user_id, user_email, role, created_at, expires_at, revoked)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `).run(tokenHash, params.userId, params.email, params.role, now, expiresAt);

  return { token: rawToken, expiresAt };
}

export function revokeSessionTokenInDb(rawToken: string): boolean {
  const tokenHash = hashSessionToken(rawToken);
  const result = db
    .prepare('UPDATE auth_sessions SET revoked = 1 WHERE token_hash = ?')
    .run(tokenHash);
  return Number(result.changes) > 0;
}

export function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Valida o token no banco SQLite e consulta o papel (role) real do usuário na tabela participants.
 * Nunca confia em dados de perfil enviados pelo cliente.
 */
export function resolveSessionFromRequest(req: Request): AuthenticatedSession | null {
  const rawToken = extractBearerToken(req);
  if (!rawToken) return null;

  const tokenHash = hashSessionToken(rawToken);
  const now = Date.now();

  const row = db
    .prepare(`
      SELECT
        s.token_hash,
        s.user_id,
        s.expires_at,
        s.revoked,
        p.email,
        p.name,
        p.role,
        p.status
      FROM auth_sessions s
      INNER JOIN participants p ON p.id = s.user_id
      WHERE s.token_hash = ?
      LIMIT 1
    `)
    .get(tokenHash) as Record<string, unknown> | undefined;

  if (!row) return null;
  if (Boolean(row.revoked)) return null;
  if (Number(row.expires_at) <= now) {
    db.prepare('UPDATE auth_sessions SET revoked = 1 WHERE token_hash = ?').run(tokenHash);
    return null;
  }
  if (String(row.status) === 'Inativo') return null;

  const normalizedRole: UserRole =
    String(row.role).toUpperCase() === 'ADMIN' ? 'ADMIN' : 'PARTICIPANT';

  return {
    tokenHash: String(row.token_hash),
    userId: String(row.user_id),
    email: String(row.email),
    name: String(row.name),
    role: normalizedRole,
    expiresAt: Number(row.expires_at),
  };
}

export interface RequestWithAuth extends Request {
  authSession?: AuthenticatedSession;
}

/**
 * Middleware: Exige usuário autenticado (PARTICIPANT ou ADMIN).
 */
export function requireAuth(req: RequestWithAuth, res: Response, next: NextFunction): void {
  const session = resolveSessionFromRequest(req);
  if (!session) {
    res.status(401).json({
      error: 'Não autenticado. Faça login para acessar este recurso.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }
  req.authSession = session;
  next();
}

/**
 * Middleware: Exige papel PARTICIPANT validado no servidor SQLite.
 * Retorna HTTP 401 (AUTH_REQUIRED) para não autenticados e HTTP 403 (PARTICIPANT_ROLE_REQUIRED) para ADMIN.
 */
export function requireParticipant(req: RequestWithAuth, res: Response, next: NextFunction): void {
  const session = resolveSessionFromRequest(req);
  if (!session) {
    res.status(401).json({
      error: 'Não autenticado. Faça login como participante para acessar este recurso.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }
  if (session.role !== 'PARTICIPANT') {
    res.status(403).json({
      error: 'Acesso negado (HTTP 403): operação exclusiva de participantes autenticados.',
      code: 'PARTICIPANT_ROLE_REQUIRED',
    });
    return;
  }
  req.authSession = session;
  next();
}

/**
 * Middleware: Exige papel ADMIN validado no servidor SQLite.
 * Retorna HTTP 401 para não autenticados e HTTP 403 para PARTICIPANT.
 */
export function requireAdmin(req: RequestWithAuth, res: Response, next: NextFunction): void {
  const session = resolveSessionFromRequest(req);
  if (!session) {
    res.status(401).json({
      error: 'Acesso restrito. Autenticação administrativa obrigatória.',
      code: 'ADMIN_AUTH_REQUIRED',
    });
    return;
  }
  if (session.role !== 'ADMIN') {
    res.status(403).json({
      error: 'Acesso negado (HTTP 403): sua conta possui perfil PARTICIPANT e não tem permissão para executar operações administrativas.',
      code: 'FORBIDDEN_ADMIN_ONLY',
    });
    return;
  }
  req.authSession = session;
  next();
}
