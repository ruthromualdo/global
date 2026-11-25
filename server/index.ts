import './env';
import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { DatabaseSync } from 'node:sqlite';
import { VALID_BRAZILIAN_DDDS } from '../src/utils/formatters';
import {
  calculateParticipantReservedPoints,
  closeDatabaseGracefully,
  compactCircuitSequencesInDb,
  DAILY_AWARD_DAYS,
  computeLiveDailyRanking,
  db,
  DB_FILE_PATH,
  DEFAULT_MISSION_TIMER_MINUTES,
  deleteEvidenceFileIfExists,
  ensureDailyRankingsClosedUpTo,
  ensureParticipantFirstMissionUnlockedInDb,
  EVIDENCE_STORAGE_DIR,
  EvidenceRequirementType,
  findActiveTransactionByEventKeys,
  getAdminMetricsFromDb,
  getDailyRankingsFromDb,
  getEvidenceFilesForCompletions,
  getMissionConfiguredDurationSeconds,
  getPublicRankingFromDb,
  hasOfficialCircuitStartedInDb,
  initializeDatabase,
  mapEventSettingsRow,
  mapGovernancePlanRow,
  mapHomologationRow,
  mapMissionRow,
  mapParticipantRow,
  mapQRCodeRow,
  mapStartupRow,
  mapTransactionRow,
  mapValidationRow,
  MAX_MISSION_TIMER_MINUTES,
  MAX_PARTICIPANT_POINTS,
  MIN_MISSION_TIMER_MINUTES,
  ParticipantPointsReservation,
  recalculateCircuitMissionPointsInDb,
  recalculateRankingsInDb,
  resolveNextIdempotentEventKey,
  resolveSafeEvidenceFilePath,
  saveEvidenceFileToDisk,
  validateAndDetectEvidenceFile,
} from './db/database';
import {
  hasActiveInProgressTimerForDefaultMissionsInDb,
  hasActiveInProgressTimerForMissionInDb,
} from './db/circuitScoring';
import {
  createSessionInDb,
  extractBearerToken,
  hashPassword,
  requireAdmin,
  requireAuth,
  requireParticipant,
  RequestWithAuth,
  resolveSessionFromRequest,
  revokeSessionTokenInDb,
  verifyPassword,
} from './security/auth';
import { createInMemoryRateLimiter } from './security/rateLimiter';

initializeDatabase();

const app = express();
const PORT = Number(process.env.PORT) || 3001;
let isShuttingDown = false;

if (process.env.TRUST_PROXY === 'true' || process.env.TRUST_PROXY === '1') {
  app.set('trust proxy', 1);
}

// Compressão Gzip leve para respostas JSON (reduz tráfego em ~70% no celular/4G)
app.use((req, res, next) => {
  const acceptEncoding = String(req.headers['accept-encoding'] || '');
  if (!acceptEncoding.includes('gzip')) {
    next();
    return;
  }

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    try {
      const jsonStr = JSON.stringify(body);
      if (jsonStr && jsonStr.length >= 1024 && !res.headersSent) {
        const compressed = zlib.gzipSync(Buffer.from(jsonStr, 'utf8'));
        res.setHeader('Content-Encoding', 'gzip');
        res.setHeader('Vary', 'Accept-Encoding');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Content-Length', String(compressed.length));
        return res.end(compressed);
      }
    } catch {
      // fallback seguro para resposta sem compressão
    }
    return originalJson(body);
  }) as typeof res.json;

  next();
});

app.use((_req, res, next) => {
  if (isShuttingDown) {
    res.setHeader('Connection', 'close');
    res.status(503).json({
      error: 'Servidor em processo de encerramento controlado. Tente novamente em instantes.',
      code: 'SERVER_SHUTTING_DOWN',
    });
    return;
  }
  next();
});

// Configuração de CORS restrito via variável CORS_ALLOWED_ORIGINS (nunca '*' em produção)
const configuredCorsOrigins = (process.env.CORS_ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const defaultDevOrigins =
  process.env.NODE_ENV === 'production'
    ? []
    : [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:4173',
        'http://127.0.0.1:4173',
      ];

const allowedCorsOrigins = new Set<string>(
  configuredCorsOrigins.length > 0 ? configuredCorsOrigins : defaultDevOrigins
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Requisições sem cabeçalho Origin (same-origin, healthchecks, clientes CLI) são permitidas sem abrir CORS '*'
      if (!origin) {
        callback(null, true);
        return;
      }
      const normalizedOrigin = origin.trim().replace(/\/+$/, '');
      if (allowedCorsOrigins.has(normalizedOrigin)) {
        callback(null, true);
        return;
      }
      const corsError = new Error('Origem não autorizada pela política de CORS.') as Error & {
        status?: number;
        code?: string;
      };
      corsError.status = 403;
      corsError.code = 'CORS_ORIGIN_FORBIDDEN';
      callback(corsError);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Mission-Id',
      'X-File-Name',
      'X-File-Mime',
      'X-Evidence-Description',
      'X-Participant-Id',
    ],
  })
);
app.use(express.json());

// Rate limiters nativos em memória (instância única, limites independentes por rota)
const DEFAULT_RATE_WINDOW_MS = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;

const loginRateLimiter = createInMemoryRateLimiter({
  routeKey: 'auth_login',
  windowMs: DEFAULT_RATE_WINDOW_MS,
  maxRequests: Number(process.env.RATE_LIMIT_LOGIN_MAX) || 10,
  message: 'Muitas tentativas de login. Aguarde alguns minutos e tente novamente.',
});

const adminLoginRateLimiter = createInMemoryRateLimiter({
  routeKey: 'auth_admin_login',
  windowMs: DEFAULT_RATE_WINDOW_MS,
  maxRequests: Number(process.env.RATE_LIMIT_ADMIN_LOGIN_MAX) || 5,
  message: 'Muitas tentativas de login administrativo. Aguarde alguns minutos e tente novamente.',
});

const registerRateLimiter = createInMemoryRateLimiter({
  routeKey: 'auth_register',
  windowMs: DEFAULT_RATE_WINDOW_MS,
  maxRequests: Number(process.env.RATE_LIMIT_REGISTER_MAX) || 10,
  message: 'Muitas tentativas de cadastro em sequência. Aguarde alguns minutos e tente novamente.',
});

const evidenceUploadRateLimiter = createInMemoryRateLimiter({
  routeKey: 'evidences_upload',
  windowMs: DEFAULT_RATE_WINDOW_MS,
  maxRequests: Number(process.env.RATE_LIMIT_UPLOAD_MAX) || 20,
  message: 'Limite temporário de envios de evidência atingido. Aguarde alguns minutos.',
});

// Helper seguro para buscar o registro do usuário autenticado exclusivamente por ID da sessão (sem fallback)
function getAuthenticatedUserById(userId: string) {
  const row = db
    .prepare('SELECT * FROM participants WHERE id = ? LIMIT 1')
    .get(userId) as Record<string, unknown> | undefined;
  return row ? mapParticipantRow(row) : null;
}

function hasAdminAccountInDb(): boolean {
  const row = db
    .prepare("SELECT COUNT(*) as total FROM participants WHERE UPPER(role) = 'ADMIN'")
    .get() as { total: number };
  return row.total > 0;
}

function hasActiveParticipantSessionInDb(): boolean {
  const row = db
    .prepare(
      "SELECT COUNT(*) as total FROM participants WHERE is_current_session = 1 AND UPPER(role) = 'PARTICIPANT'"
    )
    .get() as { total: number };
  return row.total > 0;
}

// Helper para creditar pontos respeitando o limite global de 1.000 pontos e idempotência por event_key
function assertParticipantEligibleForCompetition(
  targetDb: DatabaseSync,
  participantId: string
):
  | { ok: true }
  | { ok: false; httpStatus: number; code: 'PARTICIPANT_DISQUALIFIED'; error: string } {
  const row = targetDb
    .prepare('SELECT status, disqualification_reason FROM participants WHERE id = ? LIMIT 1')
    .get(participantId) as { status?: string; disqualification_reason?: string | null } | undefined;

  if (row && String(row.status) === 'Desclassificado') {
    return {
      ok: false,
      httpStatus: 403,
      code: 'PARTICIPANT_DISQUALIFIED',
      error:
        'Sua conta foi desclassificada administrativamente e não pode mais registrar progresso ou acumular pontos competitivos.',
    };
  }
  return { ok: true };
}

function creditPointsInSql(params: {
  participantId: string;
  pointsDelta: number;
  sourceType: 'Missão' | 'QR Code' | 'Ajuste Administrativo';
  sourceTitle: string;
  visitedStartupId?: string;
  incrementMissionCount?: boolean;
  eventKey?: string;
  missionId?: string;
  sourceCompletionId?: string;
  targetDb?: DatabaseSync;
}) {
  const activeDb = params.targetDb || db;
  const row = activeDb
    .prepare('SELECT * FROM participants WHERE id = ?')
    .get(params.participantId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const participant = mapParticipantRow(row);

  // Defesa em profundidade: participante desclassificado nunca acumula pontos competitivos
  if (
    participant.status === 'Desclassificado' &&
    params.sourceType !== 'Ajuste Administrativo'
  ) {
    return {
      participant,
      effectiveDelta: 0,
      alreadyProcessed: false,
      disqualified: true,
    };
  }

  // Proteção idempotente: se eventKey já foi processada, não credita novamente
  if (params.eventKey) {
    const existingTx = activeDb
      .prepare('SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1')
      .get(params.eventKey) as { id: string } | undefined;
    if (existingTx) {
      return {
        participant,
        effectiveDelta: 0,
        alreadyProcessed: true,
      };
    }
  }

  const previousBalance = Math.max(0, Math.min(MAX_PARTICIPANT_POINTS, participant.points));
  let effectiveDelta = 0;

  if (params.pointsDelta >= 0) {
    const remainingCap = Math.max(0, MAX_PARTICIPANT_POINTS - previousBalance);
    effectiveDelta = Math.min(params.pointsDelta, remainingCap);
  } else {
    effectiveDelta = Math.max(params.pointsDelta, -previousBalance);
  }

  const newBalance = previousBalance + effectiveDelta;
  const newMissionCount = params.incrementMissionCount
    ? participant.completedMissionsCount + 1
    : participant.completedMissionsCount;

  const visitedStartups =
    params.visitedStartupId && !participant.visitedStartupsIds.includes(params.visitedStartupId)
      ? [...participant.visitedStartupsIds, params.visitedStartupId]
      : participant.visitedStartupsIds;

  const nowStr = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  activeDb
    .prepare(`
    UPDATE participants
    SET points = ?,
        completed_missions_count = ?,
        visited_startups_json = ?
    WHERE id = ?
  `)
    .run(newBalance, newMissionCount, JSON.stringify(visitedStartups), participant.id);

  const nowMs = Date.now();
  const txId = `tx-${nowMs}-${Math.random().toString(36).slice(2, 7)}`;
  activeDb
    .prepare(`
    INSERT INTO points_transactions (
      id, participant_id, participant_name, source_type, source_title,
      points_delta, previous_balance, new_balance, created_at, created_at_ms, event_key, mission_id, source_completion_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `)
    .run(
      txId,
      participant.id,
      participant.name,
      params.sourceType,
      params.sourceTitle,
      effectiveDelta,
      previousBalance,
      newBalance,
      nowStr,
      nowMs,
      params.eventKey || null,
      params.missionId || null,
      params.sourceCompletionId || null
    );

  if (activeDb === db) {
    recalculateRankingsInDb();
  }

  const updatedRow = activeDb
    .prepare('SELECT * FROM participants WHERE id = ?')
    .get(participant.id) as Record<string, unknown>;
  return {
    participant: mapParticipantRow(updatedRow),
    effectiveDelta,
    alreadyProcessed: false,
  };
}

// Helper para resolver o status sequencial das 4 missões principais para o participante ativo
function getParticipantMissionsFromDb(participant: ReturnType<typeof mapParticipantRow>) {
  if (participant.role === 'PARTICIPANT') {
    ensureParticipantFirstMissionUnlockedInDb(participant.id);
  }

  const baseMissionsRows = db
    .prepare(
      'SELECT * FROM missions WHERE sequence_order IS NOT NULL AND active = 1 ORDER BY sequence_order ASC'
    )
    .all() as Record<string, unknown>[];

  const pmRows = db
    .prepare(
      'SELECT * FROM participant_missions WHERE participant_id = ? ORDER BY sequence_order ASC'
    )
    .all(participant.id) as Record<string, unknown>[];
  const pmByMissionId = new Map<string, Record<string, unknown>>();
  for (const r of pmRows) {
    pmByMissionId.set(String(r.mission_id), r);
  }

  const completedTrackSeqs = new Set<string>();
  for (const mRow of baseMissionsRows) {
    const mId = String(mRow.id);
    const trackKey = String(mRow.track_id || 'default');
    const seq = Number(mRow.sequence_order);
    const pm = pmByMissionId.get(mId);
    const completeTx = findActiveTransactionByEventKeys(participant.id, [
      `COMPLETE:${participant.id}:${mId}`,
      `COMPLETE:${participant.id}:${mId}:POST_SIM_REV`,
    ]);

    if ((pm && String(pm.status) === 'Concluída') || completeTx) {
      completedTrackSeqs.add(`${trackKey}:${seq}`);
    }
  }

  const nowMs = Date.now();

  const officialMapped = baseMissionsRows.map((mRow) => {
    const m = mapMissionRow(mRow);
    const trackKey = String(mRow.track_id || 'default');
    const seq = Number(mRow.sequence_order);
    const pm = pmByMissionId.get(m.id);
    const isCompleted = completedTrackSeqs.has(`${trackKey}:${seq}`);

    let computedStatus: 'Disponível' | 'Em andamento' | 'Aguardando validação' | 'Concluída' | 'Bloqueada' = 'Disponível';
    if (isCompleted) {
      computedStatus = 'Concluída';
    } else if (seq > 1 && !completedTrackSeqs.has(`${trackKey}:${seq - 1}`)) {
      computedStatus = 'Bloqueada';
    } else {
      const pmStatus = pm ? String(pm.status) : 'Disponível';
      if (pmStatus === 'Aguardando validação') {
        computedStatus = 'Aguardando validação';
      } else if (pmStatus === 'Em andamento') {
        computedStatus = 'Em andamento';
      } else {
        computedStatus = 'Disponível';
      }
    }

    const durationSeconds = pm?.duration_seconds
      ? Number(pm.duration_seconds)
      : getMissionConfiguredDurationSeconds(m.id);
    const startedAtMs = pm?.started_at_ms ? Number(pm.started_at_ms) : null;
    const submittedAtMs = pm?.submitted_at_ms ? Number(pm.submitted_at_ms) : null;
    const targetEndAtMs = pm?.target_end_at_ms
      ? Number(pm.target_end_at_ms)
      : (startedAtMs ? startedAtMs + durationSeconds * 1000 : null);
    const completedAtMs = pm?.completed_at_ms ? Number(pm.completed_at_ms) : null;
    const speedBonusAwarded = Number(pm?.speed_bonus_awarded || 0);

    const rawMaxBonus = Number(mRow.max_speed_bonus);
    const missionMaxBonus = Number.isInteger(rawMaxBonus) && rawMaxBonus >= 0 ? rawMaxBonus : 0;
    let elapsedSeconds = 0;
    let remainingSeconds = durationSeconds;
    let isExpired = false;
    let potentialSpeedBonus = missionMaxBonus;

    if (isCompleted) {
      if (startedAtMs && (submittedAtMs || completedAtMs)) {
        const refEndMs = submittedAtMs ?? completedAtMs!;
        elapsedSeconds = Math.max(0, Math.round((refEndMs - startedAtMs) / 1000));
        remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
      } else {
        elapsedSeconds = Number(pm?.elapsed_seconds || 0);
        remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
      }
      isExpired = remainingSeconds <= 0;
      potentialSpeedBonus = 0;
    } else if (computedStatus === 'Aguardando validação' && startedAtMs && submittedAtMs) {
      // Tempo congelado no momento do envio: espera pela aprovação não consome o cronômetro
      elapsedSeconds = Math.max(0, Math.round((submittedAtMs - startedAtMs) / 1000));
      remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
      isExpired = remainingSeconds <= 0;
      potentialSpeedBonus = isExpired
        ? 0
        : Math.max(
            0,
            Math.min(missionMaxBonus, Math.round(missionMaxBonus * (remainingSeconds / durationSeconds)))
          );
    } else if (startedAtMs && targetEndAtMs) {
      elapsedSeconds = Math.max(0, Math.round((nowMs - startedAtMs) / 1000));
      remainingSeconds = Math.max(0, Math.ceil((targetEndAtMs - nowMs) / 1000));
      isExpired = remainingSeconds <= 0;
      potentialSpeedBonus = isExpired
        ? 0
        : Math.max(
            0,
            Math.min(missionMaxBonus, Math.round(missionMaxBonus * (remainingSeconds / durationSeconds)))
          );
    }

    return {
      ...m,
      status: computedStatus,
      durationSeconds,
      startedAtMs,
      submittedAtMs,
      targetEndAtMs,
      completedAtMs,
      elapsedSeconds,
      remainingSeconds,
      isExpired,
      potentialSpeedBonus,
      speedBonusAwarded,
      serverTimeMs: nowMs,
    };
  });

  // Inclui missões extras ativas com exigência de evidência (sem interferir na sequência oficial)
  const extraEvidenceRows = db
    .prepare(
      'SELECT * FROM missions WHERE sequence_order IS NULL AND active = 1 AND requires_evidence = 1 ORDER BY rowid ASC'
    )
    .all() as Record<string, unknown>[];

  const extraMapped = extraEvidenceRows.map((mRow) => {
    const m = mapMissionRow(mRow);
    const pm = pmByMissionId.get(m.id);
    const subRow = db
      .prepare(
        'SELECT status FROM mission_completions WHERE participant_id = ? AND mission_id = ? ORDER BY rowid DESC LIMIT 1'
      )
      .get(participant.id, m.id) as { status: string } | undefined;

    let computedStatus: ReturnType<typeof mapMissionRow>['status'] = 'Disponível';
    if ((pm && String(pm.status) === 'Concluída') || subRow?.status === 'Aprovada') {
      computedStatus = 'Concluída';
    } else if (subRow?.status === 'Pendente') {
      computedStatus = 'Aguardando validação';
    }

    return {
      ...m,
      status: computedStatus,
      serverTimeMs: nowMs,
    };
  });

  return [...officialMapped, ...extraMapped];
}

// Helper transacional atômico para concluir missão sequencial (+180 pts) e desbloquear a próxima (+20 pts)
function completeSequentialMissionInSql(params: {
  participantId: string;
  missionId: string;
  sourceType: 'Missão' | 'QR Code';
  qrCodeRow?: ReturnType<typeof mapQRCodeRow>;
  useExistingTransaction?: boolean;
  targetDb?: DatabaseSync;
  sourceCompletionId?: string;
}) {
  const activeDb = params.targetDb || db;
  const manageTx = !params.useExistingTransaction;
  const rollbackIfManaged = () => {
    if (!manageTx) return;
    try {
      activeDb.exec('ROLLBACK;');
    } catch {
      // transação já encerrada
    }
  };

  if (manageTx) {
    activeDb.exec('BEGIN IMMEDIATE TRANSACTION;');
  }
  try {
    const eligibility = assertParticipantEligibleForCompetition(activeDb, params.participantId);
    if (!eligibility.ok) {
      rollbackIfManaged();
      return {
        ok: false,
        httpStatus: eligibility.httpStatus,
        status: 'PARTICIPANT_DISQUALIFIED' as const,
        message: eligibility.error,
      };
    }

    if (activeDb === db) {
      ensureParticipantFirstMissionUnlockedInDb(params.participantId);
    }

    const missionRow = activeDb
      .prepare('SELECT * FROM missions WHERE id = ? LIMIT 1')
      .get(params.missionId) as Record<string, unknown> | undefined;

    if (!missionRow) {
      rollbackIfManaged();
      return {
        ok: false,
        httpStatus: 404,
        status: 'INVALID_MISSION' as const,
        message: 'Missão não encontrada no banco SQLite.',
      };
    }

    const mission = mapMissionRow(missionRow);
    const seqOrder =
      missionRow.sequence_order !== null && missionRow.sequence_order !== undefined
        ? Number(missionRow.sequence_order)
        : null;

    if (!mission.active || seqOrder === null) {
      rollbackIfManaged();
      return {
        ok: false,
        httpStatus: 400,
        status: 'INVALID_MISSION' as const,
        message: `A missão "${mission.title}" não faz parte da trilha ativa no momento.`,
      };
    }

    const baseCompleteEventKey = `COMPLETE:${params.participantId}:${mission.id}`;
    const completeEventKey = resolveNextIdempotentEventKey(
      params.participantId,
      baseCompleteEventKey
    );
    const existingCompleteTx = findActiveTransactionByEventKeys(params.participantId, [
      baseCompleteEventKey,
      `${baseCompleteEventKey}:POST_SIM_REV`,
    ]);

    const pmRow = activeDb
      .prepare(
        'SELECT * FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1'
      )
      .get(params.participantId, mission.id) as Record<string, unknown> | undefined;

    if (existingCompleteTx || (pmRow && String(pmRow.status) === 'Concluída')) {
      rollbackIfManaged();
      return {
        ok: false,
        httpStatus: 409,
        status: 'ALREADY_USED' as const,
        alreadyUsed: true,
        alreadyCompleted: true,
        message: `A missão "${mission.title}" já foi concluída anteriormente e seus pontos já foram creditados.`,
      };
    }

    // Verifica bloqueio sequencial estrito dentro da mesma trilha: Missão N exige Missão N-1 concluída pelo participante
    const missionTrackKey = missionRow.track_id ? String(missionRow.track_id) : 'default';
    if (seqOrder > 1) {
      const prevMissionRow = activeDb
        .prepare(
          "SELECT id, title FROM missions WHERE COALESCE(track_id, 'default') = ? AND sequence_order = ? AND active = 1 LIMIT 1"
        )
        .get(missionTrackKey, seqOrder - 1) as { id: string; title: string } | undefined;

      if (prevMissionRow) {
        const prevCompleteTx = findActiveTransactionByEventKeys(params.participantId, [
          `COMPLETE:${params.participantId}:${prevMissionRow.id}`,
          `COMPLETE:${params.participantId}:${prevMissionRow.id}:POST_SIM_REV`,
        ]);
        const prevPm = activeDb
          .prepare(
            'SELECT status FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1'
          )
          .get(params.participantId, prevMissionRow.id) as { status: string } | undefined;

        const isPrevCompleted =
          Boolean(prevCompleteTx) || (prevPm && String(prevPm.status) === 'Concluída');

        if (!isPrevCompleted) {
          rollbackIfManaged();
          return {
            ok: false,
            httpStatus: 403,
            status: 'MISSION_LOCKED' as const,
            message: `Bloqueio sequencial: conclua primeiro a Missão 0${seqOrder - 1} ("${prevMissionRow.title}") antes de realizar a Missão 0${seqOrder}.`,
          };
        }
      }
    }

    // Se veio de leitura de QR Code, registra em qr_scans e incrementa contador
    if (params.qrCodeRow) {
      const existingScan = activeDb
        .prepare(
          'SELECT id FROM qr_scans WHERE qr_code_id = ? AND participant_id = ? LIMIT 1'
        )
        .get(params.qrCodeRow.id, params.participantId) as { id: string } | undefined;

      if (existingScan) {
        rollbackIfManaged();
        return {
          ok: false,
          httpStatus: 409,
          status: 'ALREADY_USED' as const,
          alreadyUsed: true,
          alreadyCompleted: true,
          message: `Código ${params.qrCodeRow.code} já utilizado! Você já concluiu a missão "${mission.title}".`,
        };
      }

      activeDb.prepare('UPDATE qr_codes SET scans_count = scans_count + 1 WHERE id = ?').run(
        params.qrCodeRow.id
      );
      activeDb.prepare(
        'INSERT INTO qr_scans (id, qr_code_id, participant_id, scanned_at) VALUES (?, ?, ?, ?)'
      ).run(
        `scan-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        params.qrCodeRow.id,
        params.participantId,
        new Date().toISOString()
      );
    }

    const nowMs = Date.now();
    const completionSourceTitle = params.qrCodeRow
      ? `Conclusão (${params.qrCodeRow.code}): ${mission.title}`
      : `Conclusão: ${mission.title}`;

    const rawUnlock = missionRow.unlock_points;
    const rawCompletion = missionRow.completion_points;
    const rawBonus = missionRow.max_speed_bonus;

    if (
      rawUnlock === null || rawUnlock === undefined ||
      rawCompletion === null || rawCompletion === undefined ||
      rawBonus === null || rawBonus === undefined ||
      !Number.isInteger(Number(rawUnlock)) || Number(rawUnlock) < 0 ||
      !Number.isInteger(Number(rawCompletion)) || Number(rawCompletion) <= 0 ||
      !Number.isInteger(Number(rawBonus)) || Number(rawBonus) < 0
    ) {
      rollbackIfManaged();
      return {
        ok: false,
        httpStatus: 500,
        status: 'INVALID_CIRCUIT_SCORING' as const,
        message: `Erro contábil: a missão oficial "${mission.title}" (ID: ${mission.id}) não possui valores dinâmicos válidos de pontuação no banco (unlock: ${missionRow.unlock_points}, completion: ${missionRow.completion_points}, bonus: ${missionRow.max_speed_bonus}). Operação abortada e revertida integralmente.`,
      };
    }

    const missionUnlockPoints = Number(rawUnlock);
    const missionCompletionPoints = Number(rawCompletion);
    const missionMaxSpeedBonus = Number(rawBonus);

    const startedAtMs = pmRow?.started_at_ms ? Number(pmRow.started_at_ms) : null;
    const submittedAtMs = pmRow?.submitted_at_ms ? Number(pmRow.submitted_at_ms) : null;
    const durationSeconds = pmRow?.duration_seconds
      ? Number(pmRow.duration_seconds)
      : getMissionConfiguredDurationSeconds(mission.id);

    let elapsedSeconds = 0;
    let speedBonus = 0;

    if (startedAtMs) {
      // Se a evidência foi submetida antes da aprovação administrativa, usa submittedAtMs
      // para que o tempo de espera na fila de validação nunca penalize o participante.
      const effectiveEndMs = submittedAtMs ?? nowMs;
      elapsedSeconds = Math.max(0, Math.round((effectiveEndMs - startedAtMs) / 1000));
      const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
      if (remainingSeconds > 0 && durationSeconds > 0) {
        speedBonus = Math.round(missionMaxSpeedBonus * (remainingSeconds / durationSeconds));
        speedBonus = Math.max(0, Math.min(missionMaxSpeedBonus, speedBonus));
      }
    }

    // Regra definitiva: os pontos de desbloqueio (unlock_points) de CADA missão são creditados
    // exclusivamente na conclusão da própria missão, vinculados a source_completion_id.
    // Se já houver um crédito histórico ativo de desbloqueio (retrocompatibilidade), não duplica.
    let awardedUnlockPoints = 0;
    let newlyCreditedUnlockPoints = 0;
    {
      const legacyUnlockTx = findActiveTransactionByEventKeys(
        params.participantId,
        [
          `UNLOCK:${params.participantId}:${mission.id}`,
          `UNLOCK:${params.participantId}:${mission.id}:POST_SIM_REV`,
        ],
        activeDb
      );
      const reversalTx = activeDb
        .prepare('SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1')
        .get(`REVERSAL:${params.participantId}:${mission.id}`) as { id: string } | undefined;
      const validatedUnlockTx = findActiveTransactionByEventKeys(
        params.participantId,
        [
          `UNLOCK_VALIDATED:${params.participantId}:${mission.id}`,
          `UNLOCK_VALIDATED:${params.participantId}:${mission.id}:POST_SIM_REV`,
        ],
        activeDb
      );

      const hasEffectiveUnlock =
        (Boolean(legacyUnlockTx) && !Boolean(reversalTx)) || Boolean(validatedUnlockTx);

      if (!hasEffectiveUnlock) {
        const baseUnlockKey = Boolean(reversalTx)
          ? `UNLOCK_VALIDATED:${params.participantId}:${mission.id}`
          : `UNLOCK:${params.participantId}:${mission.id}`;
        const unlockEventKey = resolveNextIdempotentEventKey(
          params.participantId,
          baseUnlockKey,
          `${baseUnlockKey}:POST_SIM_REV`,
          activeDb
        );

        const unlockCredit = creditPointsInSql({
          participantId: params.participantId,
          pointsDelta: missionUnlockPoints,
          sourceType: 'Missão',
          sourceTitle: `Desbloqueio: ${mission.title}`,
          incrementMissionCount: false,
          eventKey: unlockEventKey,
          missionId: mission.id,
          sourceCompletionId: params.sourceCompletionId,
          targetDb: activeDb,
        });
        newlyCreditedUnlockPoints = unlockCredit?.effectiveDelta ?? 0;
        awardedUnlockPoints = newlyCreditedUnlockPoints;
      } else {
        awardedUnlockPoints = validatedUnlockTx
          ? Number(validatedUnlockTx.points_delta)
          : Number(legacyUnlockTx?.points_delta || missionUnlockPoints);
      }
    }

    // 1. Concede pontos dinâmicos pela conclusão válida da missão
    const completionCredit = creditPointsInSql({
      participantId: params.participantId,
      pointsDelta: missionCompletionPoints,
      sourceType: params.sourceType,
      sourceTitle: completionSourceTitle,
      visitedStartupId: mission.startupId,
      incrementMissionCount: true,
      eventKey: completeEventKey,
      missionId: mission.id,
      sourceCompletionId: params.sourceCompletionId,
      targetDb: activeDb,
    });

    const awardedCompletionPoints = completionCredit?.effectiveDelta ?? 0;

    // 1.5 Concede bônus de velocidade proporcional dinâmico (Etapa 3)
    let awardedSpeedBonus = 0;
    if (speedBonus > 0) {
      const speedBonusEventKey = resolveNextIdempotentEventKey(
        params.participantId,
        `SPEED_BONUS:${params.participantId}:${mission.id}`
      );
      const bonusCredit = creditPointsInSql({
        participantId: params.participantId,
        pointsDelta: speedBonus,
        sourceType: 'Missão',
        sourceTitle: `Bônus de Velocidade (+${speedBonus} pts): ${mission.title}`,
        incrementMissionCount: false,
        eventKey: speedBonusEventKey,
        missionId: mission.id,
        sourceCompletionId: params.sourceCompletionId,
        targetDb: activeDb,
      });
      awardedSpeedBonus = bonusCredit?.effectiveDelta ?? 0;
    }

    activeDb
      .prepare(`
      UPDATE participant_missions
      SET status = 'Concluída',
          completed_at_ms = ?,
          elapsed_seconds = ?,
          unlock_points_awarded = ?,
          completion_points_awarded = ?,
          speed_bonus_awarded = ?,
          total_points_awarded = ? + ? + ?
      WHERE participant_id = ? AND mission_id = ?
    `)
      .run(
        nowMs,
        elapsedSeconds,
        awardedUnlockPoints,
        awardedCompletionPoints,
        awardedSpeedBonus,
        awardedUnlockPoints,
        awardedCompletionPoints,
        awardedSpeedBonus,
        params.participantId,
        mission.id
      );

    // 2. Desbloqueia funcionalmente a próxima missão na sequência (se houver) SEM crédito antecipado.
    // Os unlock_points da próxima missão serão creditados exclusivamente quando ela própria for concluída.
    let nextMissionUnlockedTitle: string | null = null;
    const awardedNextUnlockPoints = 0;

    const nextMissionRow = activeDb
      .prepare(
        "SELECT * FROM missions WHERE COALESCE(track_id, 'default') = ? AND sequence_order = ? AND active = 1 LIMIT 1"
      )
      .get(missionTrackKey, seqOrder + 1) as Record<string, unknown> | undefined;

    if (nextMissionRow) {
      const nextMissionId = String(nextMissionRow.id);
      const nextMissionTitle = String(nextMissionRow.title);
      const rawNextUnlock = nextMissionRow.unlock_points;

      if (
        rawNextUnlock === null || rawNextUnlock === undefined ||
        !Number.isInteger(Number(rawNextUnlock)) || Number(rawNextUnlock) < 0
      ) {
        rollbackIfManaged();
        return {
          ok: false,
          httpStatus: 500,
          status: 'INVALID_CIRCUIT_SCORING' as const,
          message: `Erro contábil: a próxima missão oficial "${nextMissionTitle}" (ID: ${nextMissionId}) não possui pontuação dinâmica de desbloqueio válida no banco (unlock: ${nextMissionRow.unlock_points}). Operação abortada e revertida integralmente.`,
        };
      }

      nextMissionUnlockedTitle = nextMissionTitle;

      activeDb
        .prepare(`
        INSERT INTO participant_missions (
          id, participant_id, mission_id, sequence_order, status,
          unlocked_at_ms, unlock_points_awarded, completion_points_awarded,
          speed_bonus_awarded, total_points_awarded
        ) VALUES (?, ?, ?, ?, 'Disponível', ?, 0, 0, 0, 0)
        ON CONFLICT(participant_id, mission_id) DO UPDATE SET
          status = CASE WHEN participant_missions.status = 'Concluída' THEN 'Concluída' ELSE 'Disponível' END,
          unlocked_at_ms = COALESCE(participant_missions.unlocked_at_ms, excluded.unlocked_at_ms)
      `)
        .run(
          `pm-${params.participantId}-${nextMissionId}`,
          params.participantId,
          nextMissionId,
          seqOrder + 1,
          nowMs
        );
    }

    if (manageTx) {
      activeDb.exec('COMMIT;');
    }

    const updatedParticipant = activeDb
      .prepare('SELECT * FROM participants WHERE id = ?')
      .get(params.participantId) as Record<string, unknown>;

    const totalMissionPoints =
      newlyCreditedUnlockPoints + awardedCompletionPoints + awardedSpeedBonus;
    const bonusMsg =
      awardedSpeedBonus > 0
        ? ` com Bônus de Velocidade (+${awardedSpeedBonus} pts)! Total na missão: ${totalMissionPoints} pts.`
        : ' (sem bônus de velocidade adicional).';
    const unlockMsg = nextMissionUnlockedTitle
      ? ` Próxima missão "${nextMissionUnlockedTitle}" desbloqueada automaticamente!`
      : ' Você concluiu todas as missões desta etapa!';

    return {
      ok: true,
      httpStatus: 200,
      status: 'VALIDATED' as const,
      missionId: mission.id,
      missionTitle: mission.title,
      completionPointsAwarded: awardedCompletionPoints,
      speedBonusAwarded: awardedSpeedBonus,
      unlockPointsAwarded: awardedNextUnlockPoints,
      initialUnlockPointsAwarded: newlyCreditedUnlockPoints,
      missionPointsAwarded: totalMissionPoints,
      pointsAwarded: totalMissionPoints,
      nextMissionUnlocked: nextMissionUnlockedTitle,
      participant: mapParticipantRow(updatedParticipant),
      message: `Missão "${mission.title}" concluída (+${awardedCompletionPoints} pts)${
        newlyCreditedUnlockPoints > 0 ? ` +${newlyCreditedUnlockPoints} pts de desbloqueio` : ''
      }${bonusMsg}${unlockMsg}`,
    };
  } catch (err) {
    rollbackIfManaged();
    const errMsg = String((err as Error)?.message || '');
    if (errMsg.includes('UNIQUE constraint failed')) {
      return {
        ok: false,
        httpStatus: 409,
        status: 'ALREADY_USED' as const,
        alreadyUsed: true,
        alreadyCompleted: true,
        message: 'Esta operação já foi registrada anteriormente (proteção contra duplicidade).',
      };
    }
    throw err;
  }
}

// ============================================================================
// HOMOLOGAÇÃO DE VENCEDORES (GERAL E DIÁRIO) E CONCLUSÃO DE MISSÃO EXTRA ATÔMICA
// ============================================================================

function completeExtraMissionInExistingTx(params: {
  targetDb: DatabaseSync;
  participantId: string;
  missionRow: Record<string, unknown>;
  sourceCompletionId: string;
  nowMs: number;
}): { ok: true; pointsAwarded: number } | { ok: false; httpStatus: number; error: string } {
  const { targetDb, participantId, missionRow, sourceCompletionId, nowMs } = params;
  const missionId = String(missionRow.id);
  const missionTitle = String(missionRow.title || 'Missão Extra');
  const nowIso = new Date(nowMs).toISOString();

  const participantRow = targetDb
    .prepare(
      'SELECT id, name, status, points, completed_missions_count, visited_startups_json FROM participants WHERE id = ? LIMIT 1'
    )
    .get(participantId) as
    | {
        id: string;
        name: string;
        status: string;
        points: number;
        completed_missions_count: number;
        visited_startups_json: string;
      }
    | undefined;

  if (!participantRow) {
    return { ok: false, httpStatus: 404, error: 'Participante não encontrado para conclusão.' };
  }
  if (String(participantRow.status) === 'Desclassificado') {
    return {
      ok: false,
      httpStatus: 403,
      error: 'Participante desclassificado não pode acumular pontos competitivos.',
    };
  }

  const baseEventKey = `COMPLETE:${participantId}:${missionId}`;
  const existingTx = findActiveTransactionByEventKeys(participantId, [
    baseEventKey,
    `${baseEventKey}:POST_SIM_REV`,
  ]);

  const prevPoints = Number(participantRow.points || 0);
  const requestedPts = Math.max(0, Math.trunc(Number(missionRow.points || 0)));
  const reservation = calculateParticipantReservedPoints(participantId);
  const maxAllowedByReserve = Math.max(0, reservation.freeMargin);
  const pointsDelta = existingTx
    ? 0
    : Math.max(0, Math.min(requestedPts, maxAllowedByReserve, MAX_PARTICIPANT_POINTS - prevPoints));
  const newPoints = prevPoints + pointsDelta;

  const existingPm = targetDb
    .prepare(
      'SELECT id FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1'
    )
    .get(participantId, missionId) as { id: string } | undefined;

  if (existingPm) {
    targetDb
      .prepare(
        `UPDATE participant_missions
         SET status = 'Concluída', completed_at_ms = ?, completion_points_awarded = ?, total_points_awarded = ?
         WHERE id = ?`
      )
      .run(nowMs, pointsDelta, pointsDelta, existingPm.id);
  } else {
    targetDb
      .prepare(
        `INSERT INTO participant_missions (
           id, participant_id, mission_id, sequence_order, status, unlocked_at_ms, completed_at_ms,
           completion_points_awarded, total_points_awarded
         ) VALUES (?, ?, ?, 0, 'Concluída', ?, ?, ?, ?)`
      )
      .run(
        `pm-${participantId}-${missionId}`,
        participantId,
        missionId,
        nowMs,
        nowMs,
        pointsDelta,
        pointsDelta
      );
  }

  if (pointsDelta > 0) {
    const eventKey = resolveNextIdempotentEventKey(participantId, baseEventKey);
    const visitedList = (() => {
      try {
        const parsed = JSON.parse(participantRow.visited_startups_json || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    })();
    const startupId = String(missionRow.startup_id || '');
    if (startupId && !visitedList.includes(startupId)) {
      visitedList.push(startupId);
    }

    targetDb
      .prepare(
        `UPDATE participants
         SET points = ?, completed_missions_count = completed_missions_count + 1, visited_startups_json = ?
         WHERE id = ?`
      )
      .run(newPoints, JSON.stringify(visitedList), participantId);

    targetDb
      .prepare(
        `INSERT INTO points_transactions (
           id, participant_id, participant_name, source_type, source_title,
           points_delta, previous_balance, new_balance, created_at, created_at_ms, event_key, mission_id, source_completion_id
         ) VALUES (?, ?, ?, 'Missão', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        `tx-${nowMs}-${Math.floor(Math.random() * 10000)}`,
        participantId,
        participantRow.name,
        `Missão Extra: ${missionTitle}`,
        pointsDelta,
        prevPoints,
        newPoints,
        nowIso,
        nowMs,
        eventKey,
        missionId,
        sourceCompletionId
      );
  }

  return { ok: true, pointsAwarded: pointsDelta };
}

function computeHomologationSnapshot(
  targetDb: DatabaseSync,
  scope: 'GERAL' | 'DIARIO',
  eventDate: string | null
) {
  if (scope === 'GERAL') {
    const ranking = (
      targetDb
        .prepare(
          `SELECT id, name, nickname, points, ranking_position, completed_missions_count
           FROM participants
           WHERE UPPER(role) = 'PARTICIPANT' AND status = 'Ativo'
           ORDER BY points DESC, completed_missions_count DESC, id ASC`
        )
        .all() as Array<{
        id: string;
        name: string;
        nickname: string;
        points: number;
        ranking_position: number;
        completed_missions_count: number;
      }>
    ).map((row, idx) => ({
      participantId: row.id,
      participantName: row.name,
      points: Number(row.points || 0),
      position: idx + 1,
    }));

    const leader = ranking[0] || null;
    const leaderEvidences = leader
      ? (
          targetDb
            .prepare(
              `SELECT id, mission_id, status, points_awarded, reversed_points
               FROM mission_completions
               WHERE participant_id = ?
               ORDER BY id ASC`
            )
            .all(leader.participantId) as Array<{
            id: string;
            mission_id: string;
            status: string;
            points_awarded: number;
            reversed_points: number;
          }>
        )
      : [];

    const evidenceSummary = {
      total: leaderEvidences.length,
      approved: leaderEvidences.filter((e) => e.status === 'Aprovada').length,
      pending: leaderEvidences.filter((e) => e.status === 'Pendente').length,
      rejected: leaderEvidences.filter((e) => e.status === 'Rejeitada').length,
    };

    const canonicalPayload = {
      scope: 'GERAL',
      eventDate: null,
      leader,
      topThree: ranking.slice(0, 3),
      leaderEvidences: leaderEvidences.map((e) => ({
        id: e.id,
        missionId: e.mission_id,
        status: e.status,
        pointsAwarded: Number(e.points_awarded || 0),
        reversedPoints: Number(e.reversed_points || 0),
      })),
    };

    const dataFingerprint = crypto
      .createHash('sha256')
      .update(JSON.stringify(canonicalPayload))
      .digest('hex');

    return {
      scope,
      eventDate: null,
      leader,
      evidenceSummary,
      dataFingerprint,
    };
  }

  // Escopo DIARIO (independente por dia oficial)
  const dayConfig = DAILY_AWARD_DAYS.find((d) => d.eventDate === eventDate);
  if (!dayConfig) {
    return {
      scope,
      eventDate,
      leader: null,
      evidenceSummary: { total: 0, approved: 0, pending: 0, rejected: 0 },
      dataFingerprint: crypto
        .createHash('sha256')
        .update(JSON.stringify({ scope: 'DIARIO', eventDate, leader: null }))
        .digest('hex'),
    };
  }

  const liveDayRanking = computeLiveDailyRanking(targetDb, dayConfig);
  const topEntry = liveDayRanking[0] || null;
  let leader: {
    participantId: string;
    participantName: string;
    points: number;
    position: number;
    lastMissionCompletedAtMs: number | null;
  } | null = null;

  if (topEntry) {
    const pRow = targetDb
      .prepare('SELECT name FROM participants WHERE id = ? LIMIT 1')
      .get(topEntry.participantId) as { name?: string } | undefined;
    leader = {
      participantId: topEntry.participantId,
      participantName: pRow?.name || topEntry.displayName,
      points: topEntry.dailyPoints,
      position: topEntry.position,
      lastMissionCompletedAtMs: topEntry.lastMissionCompletedAtMs,
    };
  }

  // Evidências do líder referentes às missões que pontuaram naquele dia
  const dayMissionIds = leader
    ? (
        targetDb
          .prepare(
            `SELECT DISTINCT mission_id
             FROM points_transactions
             WHERE participant_id = ?
               AND mission_id IS NOT NULL
               AND created_at_ms IS NOT NULL
               AND created_at_ms >= ?
               AND created_at_ms < ?`
          )
          .all(leader.participantId, dayConfig.dayStartMs, dayConfig.scheduledCloseAtMs) as Array<{
          mission_id: string;
        }>
      ).map((r) => r.mission_id)
    : [];

  const leaderDayEvidences =
    leader && dayMissionIds.length > 0
      ? (
          targetDb
            .prepare(
              `SELECT id, mission_id, status, points_awarded, reversed_points
               FROM mission_completions
               WHERE participant_id = ?
                 AND mission_id IN (${dayMissionIds.map(() => '?').join(',')})
               ORDER BY id ASC`
            )
            .all(leader.participantId, ...dayMissionIds) as Array<{
            id: string;
            mission_id: string;
            status: string;
            points_awarded: number;
            reversed_points: number;
          }>
        )
      : [];

  const evidenceSummary = {
    total: leaderDayEvidences.length,
    approved: leaderDayEvidences.filter((e) => e.status === 'Aprovada').length,
    pending: leaderDayEvidences.filter((e) => e.status === 'Pendente').length,
    rejected: leaderDayEvidences.filter((e) => e.status === 'Rejeitada').length,
  };

  const canonicalPayload = {
    scope: 'DIARIO',
    eventDate: dayConfig.eventDate,
    leader,
    topThree: liveDayRanking.slice(0, 3).map((e) => ({
      participantId: e.participantId,
      dailyPoints: e.dailyPoints,
      position: e.position,
      lastMissionCompletedAtMs: e.lastMissionCompletedAtMs,
    })),
    leaderEvidences: leaderDayEvidences.map((e) => ({
      id: e.id,
      missionId: e.mission_id,
      status: e.status,
      pointsAwarded: Number(e.points_awarded || 0),
      reversedPoints: Number(e.reversed_points || 0),
    })),
  };

  const dataFingerprint = crypto
    .createHash('sha256')
    .update(JSON.stringify(canonicalPayload))
    .digest('hex');

  return {
    scope,
    eventDate: dayConfig.eventDate,
    leader,
    evidenceSummary,
    dataFingerprint,
  };
}

/**
 * Revalida de forma independente todas as homologações ativas ('Homologado').
 * Invalida SOMENTE aquelas cujo data_fingerprint efetivamente mudou, preservando o histórico.
 */
function revalidateActiveHomologationsInDb(targetDb: DatabaseSync, triggerReason: string): number {
  const activeRows = targetDb
    .prepare("SELECT * FROM winner_homologations WHERE status = 'Homologado'")
    .all() as Record<string, unknown>[];

  if (activeRows.length === 0) return 0;

  let invalidatedCount = 0;
  const nowIso = new Date().toISOString();

  for (const row of activeRows) {
    const scope = String(row.scope) as 'GERAL' | 'DIARIO';
    const eventDate = row.event_date ? String(row.event_date) : null;
    const savedFingerprint = String(row.data_fingerprint || '');
    const currentSnapshot = computeHomologationSnapshot(targetDb, scope, eventDate);

    if (currentSnapshot.dataFingerprint !== savedFingerprint) {
      targetDb
        .prepare(
          `UPDATE winner_homologations
           SET status = 'Invalidado',
               invalidated_reason = ?,
               invalidated_at = ?
           WHERE id = ? AND status = 'Homologado'`
        )
        .run(triggerReason, nowIso, String(row.id));
      invalidatedCount++;
    }
  }

  return invalidatedCount;
}

// ============================================================================
// 1. HEALTH & BOOTSTRAP (COM FILTRAGEM RBAC NO SERVIDOR)
// ============================================================================

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    engine: 'node:sqlite (SQLite3)',
    rbac: 'enabled (PARTICIPANT | ADMIN)',
    hasConfiguredAdmin: hasAdminAccountInDb(),
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/bootstrap', (req, res) => {
  const session = resolveSessionFromRequest(req);
  const isAdmin = session?.role === 'ADMIN';
  const isParticipantSession = session?.role === 'PARTICIPANT';

  let authenticatedParticipant: ReturnType<typeof mapParticipantRow> | null = null;
  if (session) {
    const bySession = db
      .prepare('SELECT * FROM participants WHERE id = ? LIMIT 1')
      .get(session.userId) as Record<string, unknown> | undefined;
    if (bySession) {
      authenticatedParticipant = mapParticipantRow(bySession);
    }
  }

  const missions = isAdmin
    ? (
        db
          .prepare(
            'SELECT * FROM missions ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC'
          )
          .all() as Record<string, unknown>[]
      ).map(mapMissionRow)
    : authenticatedParticipant && isParticipantSession
    ? getParticipantMissionsFromDb(authenticatedParticipant)
    : (
        db
          .prepare(
            'SELECT * FROM missions WHERE active = 1 ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC'
          )
          .all() as Record<string, unknown>[]
      ).map(mapMissionRow);

  // Recarrega participante autenticado após eventual sincronização inicial de missões
  if (authenticatedParticipant && isParticipantSession) {
    const refreshed = db
      .prepare('SELECT * FROM participants WHERE id = ? LIMIT 1')
      .get(authenticatedParticipant.id) as Record<string, unknown> | undefined;
    if (refreshed) {
      authenticatedParticipant = mapParticipantRow(refreshed);
    }
  }

  const guestParticipant = {
    id: '',
    name: '',
    nickname: '',
    email: '',
    phone: '',
    role: 'PARTICIPANT' as const,
    avatar: '',
    points: 0,
    rankingPosition: 0,
    completedMissionsCount: 0,
    visitedStartupsIds: [] as string[],
    registeredAt: '',
    status: 'Ativo' as const,
    privacy: {
      showNicknameInPublicRanking: true,
      allowActivityNotifications: false,
      shareStartupInterests: false,
    },
  };

  const participant = authenticatedParticipant || guestParticipant;

  const startups = (
    (isAdmin
      ? db.prepare('SELECT * FROM startups').all()
      : db.prepare('SELECT * FROM startups WHERE active = 1').all()) as Record<string, unknown>[]
  ).map(mapStartupRow);

  const qrCodes = (
    db.prepare('SELECT * FROM qr_codes').all() as Record<string, unknown>[]
  ).map(mapQRCodeRow);

  const publicRanking = getPublicRankingFromDb(authenticatedParticipant?.id);
  const dailyRankings = getDailyRankingsFromDb(db, {
    currentUserId: authenticatedParticipant?.id,
  });

  const settingsRow = db
    .prepare('SELECT * FROM event_settings WHERE id = 1')
    .get() as Record<string, unknown>;
  const eventSettings = mapEventSettingsRow(settingsRow);

  // Dados administrativos sensíveis só são retornados quando o token no servidor é ADMIN
  const allParticipants = isAdmin
    ? (
        db
          .prepare(
            "SELECT * FROM participants WHERE UPPER(role) = 'PARTICIPANT' ORDER BY ranking_position ASC"
          )
          .all() as Record<string, unknown>[]
      ).map(mapParticipantRow)
    : [];

  // Sem sessão autenticada, nenhuma evidência ou submissão de participante é retornada
  const validationQueue = isAdmin
    ? getEnrichedAdminValidations()
    : authenticatedParticipant && isParticipantSession
    ? (() => {
        const participantRows = db
          .prepare('SELECT * FROM mission_completions WHERE participant_id = ? ORDER BY rowid DESC')
          .all(authenticatedParticipant.id) as Record<string, unknown>[];
        const filesMap = getEvidenceFilesForCompletions(
          participantRows.map((r) => String(r.id))
        );
        return participantRows.map((r) => mapValidationRow(r, filesMap.get(String(r.id))));
      })()
    : [];

  const pointsTransactions = isAdmin
    ? (
        db.prepare('SELECT * FROM points_transactions ORDER BY rowid DESC').all() as Record<
          string,
          unknown
        >[]
      ).map(mapTransactionRow)
    : [];

  const governancePlans = isAdmin
    ? (
        db.prepare('SELECT * FROM governance_plans ORDER BY code ASC').all() as Record<
          string,
          unknown
        >[]
      ).map(mapGovernancePlanRow)
    : [];

  const adminMetrics = isAdmin
    ? getAdminMetricsFromDb()
    : {
        registeredParticipants: publicRanking.length,
        activeParticipants: 0,
        inactiveParticipants: publicRanking.length,
        startedMissions: 0,
        completedMissions: 0,
        expiredMissions: 0,
        missionCompletionRate: 0,
        averageCompletionSeconds: null,
        totalSpeedBonusAwarded: 0,
        qrCodesScanned: 0,
        registeredStartups: startups.length,
        totalPointsDistributed: 0,
        participationRate: 0,
        engagementByDay: [],
        participationByStartup: [],
        missionPerformance: [],
      };

  const homologations = (
    db
      .prepare('SELECT * FROM winner_homologations ORDER BY homologated_at_ms DESC')
      .all() as Record<string, unknown>[]
  ).map(mapHomologationRow);

  res.json({
    participant,
    allParticipants,
    startups,
    missions,
    qrCodes,
    validationQueue,
    publicRanking,
    dailyRankings,
    homologations,
    pointsTransactions,
    eventSettings,
    governancePlans,
    adminMetrics,
    auth: {
      authenticated: Boolean(session && authenticatedParticipant),
      role: session && authenticatedParticipant ? session.role : null,
      userId: session && authenticatedParticipant ? session.userId : null,
      email: session && authenticatedParticipant ? session.email : null,
      hasConfiguredAdmin: hasAdminAccountInDb(),
    },
  });
});

// ============================================================================
// 2. AUTENTICAÇÃO PARTICIPANTE, AUTENTICAÇÃO ADMIN E SESSÃO (RBAC)
// ============================================================================

app.get('/api/auth/session', (req, res) => {
  const session = resolveSessionFromRequest(req);
  if (!session) {
    res.status(401).json({
      authenticated: false,
      hasConfiguredAdmin: hasAdminAccountInDb(),
      error: 'Sessão inválida, expirada ou não autenticada.',
    });
    return;
  }

  const userRow = db
    .prepare('SELECT * FROM participants WHERE id = ?')
    .get(session.userId) as Record<string, unknown>;

  res.json({
    authenticated: true,
    session,
    user: mapParticipantRow(userRow),
    hasConfiguredAdmin: hasAdminAccountInDb(),
  });
});

app.post('/api/auth/login', loginRateLimiter, (req, res) => {
  const { email, password } = (req.body || {}) as { email?: string; password?: string };
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail || !password) {
    res.status(401).json({
      error: 'E-mail ou senha inválidos.',
      code: 'INVALID_CREDENTIALS',
    });
    return;
  }

  const row = db
    .prepare('SELECT * FROM participants WHERE LOWER(email) = ? LIMIT 1')
    .get(cleanEmail) as Record<string, unknown> | undefined;

  if (!row || String(row.status) === 'Inativo') {
    res.status(401).json({
      error: 'E-mail ou senha inválidos.',
      code: 'INVALID_CREDENTIALS',
    });
    return;
  }

  const storedHash = String(row.password_hash || '');
  // Exige hash scrypt válido e verificação estrita de senha tanto para PARTICIPANT quanto para ADMIN.
  // Contas legadas sem hash válido não recebem senha automaticamente e nunca têm password_hash alterado no login.
  if (!storedHash || !storedHash.startsWith('scrypt$') || !verifyPassword(password, storedHash)) {
    res.status(401).json({
      error: 'E-mail ou senha inválidos.',
      code: 'INVALID_CREDENTIALS',
    });
    return;
  }

  recalculateRankingsInDb();
  const updatedRow = db
    .prepare('SELECT * FROM participants WHERE id = ?')
    .get(String(row.id)) as Record<string, unknown>;

  const user = mapParticipantRow(updatedRow);
  const sessionToken = createSessionInDb({
    userId: user.id,
    email: user.email,
    role: user.role || 'PARTICIPANT',
  });

  res.json({
    token: sessionToken.token,
    expiresAt: sessionToken.expiresAt,
    user,
    message: `Sessão autenticada para ${user.name} (${user.role}).`,
  });
});

/**
 * Login exclusivo para Administradores (/api/auth/admin/login).
 * Verifica hash scrypt no servidor e exige role === 'ADMIN' no SQLite.
 */
app.post('/api/auth/admin/login', adminLoginRateLimiter, (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  const cleanEmail = (email || '').trim().toLowerCase();

  if (!cleanEmail || !password) {
    res.status(400).json({
      error: 'Informe o e-mail e a senha administrativa.',
    });
    return;
  }

  const row = db
    .prepare('SELECT * FROM participants WHERE LOWER(email) = ?')
    .get(cleanEmail) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(401).json({
      error: 'Credenciais administrativas inválidas.',
    });
    return;
  }

  const dbRole = String(row.role || '').toUpperCase();
  if (dbRole !== 'ADMIN') {
    res.status(403).json({
      error:
        'Acesso negado (HTTP 403): esta conta possui perfil PARTICIPANT e não tem autorização para acessar o Painel Administrativo.',
      code: 'FORBIDDEN_PARTICIPANT_ACCOUNT',
    });
    return;
  }

  const storedHash = String(row.password_hash || '');
  if (!verifyPassword(password, storedHash)) {
    res.status(401).json({
      error: 'Credenciais administrativas inválidas.',
    });
    return;
  }

  const adminUser = mapParticipantRow(row);
  const sessionToken = createSessionInDb({
    userId: adminUser.id,
    email: adminUser.email,
    role: 'ADMIN',
  });

  res.json({
    token: sessionToken.token,
    expiresAt: sessionToken.expiresAt,
    user: adminUser,
    message: `Autenticação administrativa confirmada para ${adminUser.name}.`,
  });
});

app.post('/api/auth/logout', (req, res) => {
  const rawToken = extractBearerToken(req);
  if (rawToken) {
    revokeSessionTokenInDb(rawToken);
  }
  db.prepare('UPDATE participants SET is_current_session = 0').run();
  res.json({
    success: true,
    message: 'Sessão encerrada e token invalidado no servidor.',
  });
});

export function normalizeAndValidateBrazilianPhone(raw: unknown):
  | { ok: true; normalized: string }
  | { ok: false; code: 'PHONE_REQUIRED' | 'INVALID_PHONE'; error: string } {
  const rawStr = typeof raw === 'string' || typeof raw === 'number' ? String(raw) : '';
  let digits = rawStr.replace(/\D/g, '');
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  if (!digits) {
    return {
      ok: false,
      code: 'PHONE_REQUIRED',
      error: 'Informe seu telefone ou WhatsApp com DDD.',
    };
  }
  if (digits.length !== 10 && digits.length !== 11) {
    return {
      ok: false,
      code: 'INVALID_PHONE',
      error: 'Informe um telefone brasileiro válido com DDD (10 dígitos para fixo ou 11 para celular).',
    };
  }
  if (/^(\d)\1+$/.test(digits)) {
    return {
      ok: false,
      code: 'INVALID_PHONE',
      error: 'Número de telefone inválido.',
    };
  }
  if (!VALID_BRAZILIAN_DDDS.has(digits.slice(0, 2))) {
    return {
      ok: false,
      code: 'INVALID_PHONE',
      error: 'DDD inválido. Informe um DDD brasileiro válido.',
    };
  }
  if (digits.length === 11 && digits[2] !== '9') {
    return {
      ok: false,
      code: 'INVALID_PHONE',
      error: 'Números de celular com 11 dígitos devem começar com 9 após o DDD.',
    };
  }
  if (digits.length === 10 && !/[2-5]/.test(digits[2])) {
    return {
      ok: false,
      code: 'INVALID_PHONE',
      error: 'Número de telefone fixo inválido após o DDD.',
    };
  }
  return { ok: true, normalized: digits };
}

export function registerParticipantInDb(
  targetDb: typeof db,
  payload: {
    name?: string;
    email?: string;
    phone?: string;
    password?: string;
    role?: string;
  },
  hooks?: {
    onAfterInsert?: (participantId: string) => void;
    createSession?: (params: { userId: string; email: string; role: 'PARTICIPANT' }) => {
      token: string;
      expiresAt: number;
    };
  }
):
  | {
      ok: true;
      httpStatus: 201;
      token?: string;
      expiresAt?: number;
      user: ReturnType<typeof mapParticipantRow>;
      message: string;
    }
  | {
      ok: false;
      httpStatus: number;
      code: string;
      error: string;
    } {
  const { name, email, phone, password, role } = payload;

  // Bloqueia tentativa de criar conta já como ADMIN via endpoint de cadastro
  if (role && String(role).toUpperCase() === 'ADMIN') {
    return {
      ok: false,
      httpStatus: 403,
      code: 'PRIVILEGE_ESCALATION_BLOCKED',
      error:
        'Operação bloqueada (HTTP 403): não é permitido atribuir papel ADMIN pelo cadastro de participantes.',
    };
  }

  // Validação obrigatória de telefone brasileiro (backend)
  const phoneCheck = normalizeAndValidateBrazilianPhone(phone);
  if (!phoneCheck.ok) {
    return {
      ok: false,
      httpStatus: 400,
      code: phoneCheck.code,
      error: phoneCheck.error,
    };
  }
  const normalizedPhone = phoneCheck.normalized;

  const cleanName = (name || 'Participante Summit').trim();
  const cleanEmail = (email || `visitante.${Date.now()}@summit2026.br`).trim().toLowerCase();
  const nickname = cleanName.split(/\s+/)[0];
  const initials = cleanName
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const passwordHash = password ? hashPassword(password) : hashPassword(crypto.randomUUID());
  const newId = `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const nowStr = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // BEGIN IMMEDIATE serializa verificações e inserções concorrentes no SQLite
  targetDb.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const existing = targetDb
      .prepare('SELECT id FROM participants WHERE LOWER(email) = ? LIMIT 1')
      .get(cleanEmail) as { id: string } | undefined;

    if (existing) {
      targetDb.exec('ROLLBACK;');
      return {
        ok: false,
        httpStatus: 409,
        code: 'EMAIL_ALREADY_REGISTERED',
        error: 'Este e-mail já possui cadastro. Faça login para acessar sua conta.',
      };
    }

    targetDb
      .prepare("UPDATE participants SET is_current_session = 0 WHERE UPPER(role) = 'PARTICIPANT'")
      .run();
    targetDb
      .prepare(`
        INSERT INTO participants (
          id, name, nickname, email, phone, password_hash, role, avatar, points, ranking_position,
          completed_missions_count, visited_startups_json,
          registered_at, status, show_nickname_in_public_ranking,
          allow_activity_notifications, share_startup_interests, is_current_session
        ) VALUES (?, ?, ?, ?, ?, ?, 'PARTICIPANT', ?, 0, 1, 0, '[]', ?, 'Ativo', 1, 1, 0, 1)
      `)
      .run(newId, cleanName, nickname, cleanEmail, normalizedPhone, passwordHash, initials || 'PS', nowStr);

    if (hooks?.onAfterInsert) {
      hooks.onAfterInsert(newId);
    }

    targetDb.exec('COMMIT;');
  } catch (err: unknown) {
    try {
      targetDb.exec('ROLLBACK;');
    } catch (_) {
      // transação já revertida
    }
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes('UNIQUE constraint failed') && errMsg.includes('email')) {
      return {
        ok: false,
        httpStatus: 409,
        code: 'EMAIL_ALREADY_REGISTERED',
        error: 'Este e-mail já possui cadastro. Faça login para acessar sua conta.',
      };
    }
    throw err;
  }

  const createdRow = targetDb
    .prepare('SELECT * FROM participants WHERE id = ?')
    .get(newId) as Record<string, unknown>;
  const user = mapParticipantRow(createdRow);
  const sessionToken = hooks?.createSession
    ? hooks.createSession({
        userId: user.id,
        email: user.email,
        role: 'PARTICIPANT',
      })
    : undefined;

  return {
    ok: true,
    httpStatus: 201,
    token: sessionToken?.token,
    expiresAt: sessionToken?.expiresAt,
    user,
    message: 'Cadastro gravado com sucesso no banco de dados SQLite!',
  };
}

app.post('/api/auth/register', registerRateLimiter, (req, res) => {
  const result = registerParticipantInDb(
    db,
    (req.body || {}) as {
      name?: string;
      email?: string;
      phone?: string;
      password?: string;
      role?: string;
    },
    {
      onAfterInsert: (newId) => {
        ensureParticipantFirstMissionUnlockedInDb(newId);
        recalculateRankingsInDb();
      },
      createSession: (params) => createSessionInDb(params),
    }
  );

  if (!result.ok) {
    res.status(result.httpStatus).json({
      error: result.error,
      code: result.code,
    });
    return;
  }

  res.status(result.httpStatus).json({
    token: result.token,
    expiresAt: result.expiresAt,
    user: result.user,
    message: result.message,
  });
});

app.post('/api/auth/recover-password', (req, res) => {
  const { email } = req.body as { email: string };
  res.json({
    message: `Instruções de redefinição registradas para ${email} no servidor Express/SQLite.`,
  });
});

// ============================================================================
// 3. PARTICIPANTES E PERFIL (COM PROTEÇÃO CONTRA ESCALONAMENTO DE PRIVILÉGIO)
// ============================================================================

// Listagem completa de participantes (com e-mails) é exclusiva de ADMIN
app.get('/api/participants', requireAdmin, (_req, res) => {
  recalculateRankingsInDb();
  const rows = db
    .prepare(
      "SELECT * FROM participants WHERE UPPER(role) = 'PARTICIPANT' ORDER BY ranking_position ASC"
    )
    .all() as Record<string, unknown>[];
  res.json(rows.map(mapParticipantRow));
});

app.get('/api/participants/me', requireAuth, (req: RequestWithAuth, res) => {
  recalculateRankingsInDb();
  const current = getAuthenticatedUserById(req.authSession!.userId);
  if (!current) {
    res.status(401).json({
      error: 'Sessão inválida ou usuário não encontrado.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }
  res.json(current);
});

const EMAIL_VALIDATION_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

function computeInitialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PS';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function updateParticipantProfileInDb(
  targetDb: typeof db,
  participantId: string,
  rawBody: Record<string, unknown>,
  options?: { allowAdminFields?: boolean }
):
  | { ok: true; participant: ReturnType<typeof mapParticipantRow>; passwordChanged: boolean; message: string }
  | { ok: false; httpStatus: number; code: string; error: string } {
  // Bloqueia tentativa de alterar outro participante pelo payload
  if (
    (rawBody.id !== undefined && String(rawBody.id) !== participantId) ||
    (rawBody.participantId !== undefined && String(rawBody.participantId) !== participantId)
  ) {
    return {
      ok: false,
      httpStatus: 403,
      code: 'FORBIDDEN_OTHER_PARTICIPANT',
      error: 'Operação bloqueada (HTTP 403): você só pode atualizar os seus próprios dados cadastrais.',
    };
  }

  // Bloqueia explicitamente alteração de privilégios, pontos, missões ou campos administrativos
  if (
    !options?.allowAdminFields &&
    (rawBody.role !== undefined ||
      rawBody.isAdmin !== undefined ||
      rawBody.permissions !== undefined ||
      rawBody.points !== undefined ||
      rawBody.completedMissionsCount !== undefined ||
      rawBody.completed_missions_count !== undefined ||
      rawBody.rankingPosition !== undefined ||
      rawBody.ranking_position !== undefined ||
      rawBody.status !== undefined ||
      rawBody.visitedStartupsIds !== undefined)
  ) {
    return {
      ok: false,
      httpStatus: 403,
      code: 'PROTECTED_FIELD_MUTATION_BLOCKED',
      error:
        'Operação bloqueada (HTTP 403): não é permitido alterar papel, permissões, pontuação ou progresso por esta rota.',
    };
  }

  const currentRow = targetDb
    .prepare('SELECT * FROM participants WHERE id = ? LIMIT 1')
    .get(participantId) as Record<string, unknown> | undefined;

  if (!currentRow) {
    return {
      ok: false,
      httpStatus: 404,
      code: 'PARTICIPANT_NOT_FOUND',
      error: 'Participante não encontrado.',
    };
  }

  const current = mapParticipantRow(currentRow);

  // 1. Validação de Nome
  const rawName = rawBody.name !== undefined ? String(rawBody.name).trim() : current.name;
  if (!rawName || rawName.length < 2) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'INVALID_NAME',
      error: 'Informe um nome completo válido (mínimo 2 caracteres).',
    };
  }

  // 2. Validação de E-mail + Unicidade
  const rawEmail =
    rawBody.email !== undefined ? String(rawBody.email).trim().toLowerCase() : current.email.toLowerCase();
  if (!rawEmail || !EMAIL_VALIDATION_REGEX.test(rawEmail)) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'INVALID_EMAIL',
      error: 'Informe um endereço de e-mail válido.',
    };
  }

  const emailOwner = targetDb
    .prepare('SELECT id FROM participants WHERE LOWER(email) = ? AND id != ? LIMIT 1')
    .get(rawEmail, participantId) as { id: string } | undefined;

  if (emailOwner) {
    return {
      ok: false,
      httpStatus: 409,
      code: 'EMAIL_ALREADY_IN_USE',
      error: 'Este e-mail já está cadastrado para outro participante.',
    };
  }

  // 2.5. Validação de Telefone (quando enviado)
  let nextPhone: string | null = current.phone ?? null;
  if (rawBody.phone !== undefined) {
    const phoneCheck = normalizeAndValidateBrazilianPhone(rawBody.phone);
    if (!phoneCheck.ok) {
      return {
        ok: false,
        httpStatus: 400,
        code: phoneCheck.code,
        error: phoneCheck.error,
      };
    }
    nextPhone = phoneCheck.normalized;
  }

  // 3. Validação opcional de Senha
  const currentPassword =
    typeof rawBody.currentPassword === 'string' ? rawBody.currentPassword : '';
  const newPassword = typeof rawBody.newPassword === 'string' ? rawBody.newPassword : '';
  const confirmNewPassword =
    typeof rawBody.confirmNewPassword === 'string' ? rawBody.confirmNewPassword : '';

  const wantsPasswordChange = Boolean(currentPassword || newPassword || confirmNewPassword);
  let nextPasswordHash: string | null = null;

  if (wantsPasswordChange) {
    if (!currentPassword) {
      return {
        ok: false,
        httpStatus: 400,
        code: 'CURRENT_PASSWORD_REQUIRED',
        error: 'Informe sua senha atual para definir uma nova senha.',
      };
    }
    if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
      return {
        ok: false,
        httpStatus: 400,
        code: 'WEAK_PASSWORD',
        error: `A nova senha deve conter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
      };
    }
    if (newPassword !== confirmNewPassword) {
      return {
        ok: false,
        httpStatus: 400,
        code: 'PASSWORD_MISMATCH',
        error: 'A nova senha e a confirmação não coincidem.',
      };
    }

    const storedHash = currentRow.password_hash ? String(currentRow.password_hash) : null;
    if (!verifyPassword(currentPassword, storedHash)) {
      return {
        ok: false,
        httpStatus: 401,
        code: 'INVALID_CURRENT_PASSWORD',
        error: 'A senha atual informada está incorreta.',
      };
    }

    nextPasswordHash = hashPassword(newPassword);
  }

  const nextNickname =
    rawBody.nickname !== undefined && String(rawBody.nickname).trim().length > 0
      ? String(rawBody.nickname).trim()
      : rawName.split(/\s+/)[0];
  const nextAvatar = computeInitialsFromName(rawName);

  targetDb.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    if (nextPasswordHash) {
      targetDb
        .prepare(
          'UPDATE participants SET name = ?, nickname = ?, email = ?, phone = ?, avatar = ?, password_hash = ? WHERE id = ?'
        )
        .run(rawName, nextNickname, rawEmail, nextPhone, nextAvatar, nextPasswordHash, participantId);
    } else {
      targetDb
        .prepare('UPDATE participants SET name = ?, nickname = ?, email = ?, phone = ?, avatar = ? WHERE id = ?')
        .run(rawName, nextNickname, rawEmail, nextPhone, nextAvatar, participantId);
    }

    if (rawEmail !== current.email.toLowerCase()) {
      targetDb
        .prepare('UPDATE auth_sessions SET user_email = ? WHERE user_id = ? AND revoked = 0')
        .run(rawEmail, participantId);
    }

    targetDb.exec('COMMIT;');
  } catch (err) {
    targetDb.exec('ROLLBACK;');
    throw err;
  }

  const updatedRow = targetDb
    .prepare('SELECT * FROM participants WHERE id = ? LIMIT 1')
    .get(participantId) as Record<string, unknown>;

  return {
    ok: true,
    participant: mapParticipantRow(updatedRow),
    passwordChanged: Boolean(nextPasswordHash),
    message: nextPasswordHash
      ? 'Dados cadastrais e senha atualizados com sucesso.'
      : 'Dados cadastrais atualizados com sucesso.',
  };
}

app.put('/api/participants/me', requireAuth, (req: RequestWithAuth, res) => {
  const rawBody = (req.body || {}) as Record<string, unknown>;
  const session = req.authSession!;
  const current = getAuthenticatedUserById(session.userId);

  if (!current) {
    res.status(401).json({
      error: 'Não autenticado. Faça login para atualizar seus dados.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  const result = updateParticipantProfileInDb(db, current.id, rawBody, {
    allowAdminFields: session.role === 'ADMIN',
  });

  if (!result.ok) {
    res.status(result.httpStatus).json({
      error: result.error,
      code: result.code,
    });
    return;
  }

  recalculateRankingsInDb();
  res.json({
    ok: true,
    participant: result.participant,
    passwordChanged: result.passwordChanged,
    message: result.message,
  });
});

const CURRENT_IMAGE_CONSENT_VERSION = 'v2-2026-11';
const CURRENT_IMAGE_CONSENT_TEXT =
  'Autorizo, de forma livre, opcional e revogável a qualquer momento (LGPD, Art. 7º, I), a divulgação institucional de fotos e vídeos registrados durante o Desafio Global Summit 2026 nos canais oficiais do evento e das startups participantes (Ex Devedor, Sign e Editora Escreva). As evidências enviadas para validação de missões permanecem privadas e minha participação ou pontuação não dependem desta autorização.';

// Consulta e atualização da autorização opcional de divulgação pública de imagem (LGPD Art. 7º, I)
// Totalmente desvinculada do envio de evidências obrigatórias (validação interna: Art. 7º, V)
app.get('/api/participants/me/image-consent', requireAuth, (req: RequestWithAuth, res) => {
  const current = getAuthenticatedUserById(req.authSession!.userId);
  if (!current) {
    res.status(401).json({
      error: 'Sessão inválida ou usuário não encontrado.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  res.json({
    authorized: Boolean(current.imagePublicityConsent),
    updatedAt: current.imagePublicityConsentUpdatedAt ?? null,
    version: current.imagePublicityConsentVersion ?? null,
    currentVersion: CURRENT_IMAGE_CONSENT_VERSION,
    consentText: CURRENT_IMAGE_CONSENT_TEXT,
    optional: true,
    legalBasis: 'Consentimento livre, informado e revogável (LGPD, Art. 7º, I)',
    validationNote:
      'O envio de evidências para validação de missões independe desta autorização e permanece privado.',
  });
});

app.put('/api/participants/me/image-consent', requireAuth, (req: RequestWithAuth, res) => {
  const { authorized } = (req.body || {}) as { authorized?: unknown };
  if (typeof authorized !== 'boolean') {
    res.status(400).json({
      error: 'Informe o campo booleano "authorized" (true ou false).',
      code: 'INVALID_CONSENT_VALUE',
    });
    return;
  }

  const userId = req.authSession!.userId;
  const current = getAuthenticatedUserById(userId);
  if (!current) {
    res.status(401).json({
      error: 'Sessão inválida ou usuário não encontrado.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  const updatedAt = new Date().toISOString();
  db.prepare(
    `UPDATE participants
     SET image_publicity_consent = ?,
         image_publicity_consent_updated_at = ?,
         image_publicity_consent_version = ?
     WHERE id = ?`
  ).run(authorized ? 1 : 0, updatedAt, CURRENT_IMAGE_CONSENT_VERSION, userId);

  res.json({
    ok: true,
    authorized,
    updatedAt,
    version: CURRENT_IMAGE_CONSENT_VERSION,
    message: authorized
      ? 'Autorização opcional para divulgação pública de imagem registrada com sucesso.'
      : 'Autorização para divulgação pública de imagem revogada. A revogação não impede sua participação nem o envio de evidências.',
  });
});

// Bloqueia tentativas de promoção de papel por endpoints diretos
app.patch('/api/participants/:id/role', requireAdmin, (_req, res) => {
  res.status(403).json({
    error:
      'Operação bloqueada: promoção de contas a ADMIN só pode ser realizada via script seguro de provisionamento no servidor.',
    code: 'ROLE_MUTATION_RESTRICTED',
  });
});

app.patch('/api/participants/:id/status', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status, role } = req.body as { status: string; role?: string };
  if (role !== undefined) {
    res.status(403).json({
      error: 'Não é permitido alterar o papel (role) de usuários por este endpoint.',
    });
    return;
  }

  db.prepare('UPDATE participants SET status = ? WHERE id = ?').run(status, id);
  const rows = db
    .prepare(
      "SELECT * FROM participants WHERE UPPER(role) = 'PARTICIPANT' ORDER BY ranking_position ASC"
    )
    .all() as Record<string, unknown>[];
  res.json(rows.map(mapParticipantRow));
});

export function resetParticipantPasswordInDb(
  targetDb: typeof db,
  params: {
    adminId: string;
    participantId: string;
    newPassword: unknown;
    confirmPassword: unknown;
  }
):
  | {
      ok: true;
      httpStatus: 200;
      participantId: string;
      sessionsRevoked: number;
      updatedAt: string;
      message: string;
    }
  | {
      ok: false;
      httpStatus: number;
      code: string;
      error: string;
    } {
  const newPassword = typeof params.newPassword === 'string' ? params.newPassword : '';
  const confirmPassword = typeof params.confirmPassword === 'string' ? params.confirmPassword : '';

  if (!newPassword || newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'WEAK_PASSWORD',
      error: `A nova senha deve conter pelo menos ${MIN_PASSWORD_LENGTH} caracteres.`,
    };
  }

  if (newPassword !== confirmPassword) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'PASSWORD_MISMATCH',
      error: 'A nova senha e a confirmação não coincidem.',
    };
  }

  const targetRow = targetDb
    .prepare('SELECT id, role FROM participants WHERE id = ? LIMIT 1')
    .get(params.participantId) as { id: string; role: string } | undefined;

  if (!targetRow) {
    return {
      ok: false,
      httpStatus: 404,
      code: 'PARTICIPANT_NOT_FOUND',
      error: 'Participante não encontrado.',
    };
  }

  if (String(targetRow.role || '').toUpperCase() !== 'PARTICIPANT') {
    return {
      ok: false,
      httpStatus: 403,
      code: 'ADMIN_PASSWORD_RESET_FORBIDDEN',
      error: 'Operação negada: não é permitido redefinir senha de contas administrativas por este endpoint.',
    };
  }

  const nextPasswordHash = hashPassword(newPassword);
  const updatedAt = new Date().toISOString();
  let sessionsRevoked = 0;

  targetDb.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const updateRes = targetDb
      .prepare("UPDATE participants SET password_hash = ? WHERE id = ? AND UPPER(role) = 'PARTICIPANT'")
      .run(nextPasswordHash, targetRow.id);

    if (Number(updateRes.changes) !== 1) {
      throw new Error('PARTICIPANT_PASSWORD_UPDATE_FAILED');
    }

    const revokeRes = targetDb
      .prepare('UPDATE auth_sessions SET revoked = 1 WHERE user_id = ?')
      .run(targetRow.id);
    sessionsRevoked = Number(revokeRes.changes || 0);

    targetDb.exec('COMMIT;');
  } catch (err) {
    try {
      targetDb.exec('ROLLBACK;');
    } catch {
      // transação já revertida
    }
    throw err;
  }

  console.log(
    `[AdminAudit] Redefinição administrativa de senha executada: adminId=${params.adminId} targetParticipantId=${targetRow.id} sessionsRevoked=${sessionsRevoked} timestamp=${updatedAt}`
  );

  return {
    ok: true,
    httpStatus: 200,
    participantId: targetRow.id,
    sessionsRevoked,
    updatedAt,
    message: 'Senha do participante redefinida com sucesso e sessões anteriores revogadas.',
  };
}

app.post('/api/participants/:id/reset-password', requireAdmin, (req: RequestWithAuth, res) => {
  const { id } = req.params;
  const body = (req.body || {}) as { newPassword?: unknown; confirmPassword?: unknown };
  const adminId = req.authSession!.userId;

  const result = resetParticipantPasswordInDb(db, {
    adminId,
    participantId: id,
    newPassword: body.newPassword,
    confirmPassword: body.confirmPassword,
  });

  if (!result.ok) {
    res.status(result.httpStatus).json({
      ok: false,
      error: result.error,
      code: result.code,
    });
    return;
  }

  res.status(200).json({
    ok: true,
    participantId: result.participantId,
    sessionsRevoked: result.sessionsRevoked,
    updatedAt: result.updatedAt,
    message: result.message,
  });
});

// ============================================================================
// 4. STARTUPS EXPOSITORAS (LEITURA PÚBLICA / ESCRITA PROTEGIDA POR ADMIN)
// ============================================================================

app.get('/api/startups', (req, res) => {
  const session = resolveSessionFromRequest(req);
  const isAdmin = session?.role === 'ADMIN';
  const rows = (
    isAdmin
      ? db.prepare('SELECT * FROM startups').all()
      : db.prepare('SELECT * FROM startups WHERE active = 1').all()
  ) as Record<string, unknown>[];
  res.json(rows.map(mapStartupRow));
});

app.post('/api/startups', requireAdmin, (req, res) => {
  const payload = req.body;
  const newId = `st-${Date.now()}`;
  db.prepare(`
    INSERT INTO startups (
      id, name, short_name, tagline, description, category,
      solution_presentation, booth_number, logo_text, available_points,
      active, is_configurable_guest, website
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    newId,
    payload.name,
    payload.shortName || payload.name,
    payload.tagline || '',
    payload.description || '',
    payload.category || 'Ecossistema',
    payload.solutionPresentation || '',
    payload.boothNumber || 'Pavilhão Inovação',
    payload.logoText || 'START',
    Number(payload.availablePoints || 500),
    payload.active === false ? 0 : 1,
    payload.isConfigurableGuest ? 1 : 0,
    payload.website || null
  );

  const created = db
    .prepare('SELECT * FROM startups WHERE id = ?')
    .get(newId) as Record<string, unknown>;
  res.status(201).json(mapStartupRow(created));
});

app.put('/api/startups/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const existingRow = db
    .prepare('SELECT * FROM startups WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;
  if (!existingRow) {
    res.status(404).json({ error: 'Startup não encontrada' });
    return;
  }
  const current = mapStartupRow(existingRow);
  const u = req.body;

  db.prepare(`
    UPDATE startups
    SET name = ?, short_name = ?, tagline = ?, description = ?,
        category = ?, solution_presentation = ?, booth_number = ?,
        logo_text = ?, available_points = ?, active = ?
    WHERE id = ?
  `).run(
    u.name ?? current.name,
    u.shortName ?? current.shortName,
    u.tagline ?? current.tagline,
    u.description ?? current.description,
    u.category ?? current.category,
    u.solutionPresentation ?? current.solutionPresentation,
    u.boothNumber ?? current.boothNumber,
    u.logoText ?? current.logoText,
    Number(u.availablePoints ?? current.availablePoints),
    (u.active ?? current.active) ? 1 : 0,
    id
  );

  const rows = db.prepare('SELECT * FROM startups').all() as Record<string, unknown>[];
  res.json(rows.map(mapStartupRow));
});

app.patch('/api/startups/:id/toggle', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare('UPDATE startups SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(
    id
  );
  const rows = db.prepare('SELECT * FROM startups').all() as Record<string, unknown>[];
  res.json(rows.map(mapStartupRow));
});

app.delete('/api/startups/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM startups WHERE id = ?').run(id);
  const rows = db.prepare('SELECT * FROM startups').all() as Record<string, unknown>[];
  res.json(rows.map(mapStartupRow));
});

// ============================================================================
// 5. MISSÕES E VALIDAÇÃO (CRUD E REVISÃO PROTEGIDOS POR ADMIN)
// ============================================================================

app.get('/api/missions', (req, res) => {
  const session = resolveSessionFromRequest(req);
  if (session?.role === 'ADMIN') {
    const rows = db
      .prepare(
        'SELECT * FROM missions ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC'
      )
      .all() as Record<string, unknown>[];
    res.json(rows.map(mapMissionRow));
    return;
  }
  if (session?.role === 'PARTICIPANT') {
    const participant = getAuthenticatedUserById(session.userId);
    if (participant) {
      res.json(getParticipantMissionsFromDb(participant));
      return;
    }
  }
  // Sem sessão autenticada: retorna apenas catálogo público ativo, sem progresso pessoal nem efeitos colaterais
  const publicRows = db
    .prepare(
      'SELECT * FROM missions WHERE active = 1 ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC'
    )
    .all() as Record<string, unknown>[];
  res.json(publicRows.map(mapMissionRow));
});

app.post('/api/missions', requireAdmin, (req, res) => {
  const p = req.body;

  // Determina se é missão do circuito oficial ou missão extra
  const isOfficial =
    p.missionType === 'official' ||
    (p.missionType !== 'extra' &&
      p.sequenceOrder !== null &&
      p.sequenceOrder !== undefined &&
      p.sequenceOrder !== '');

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    let sequenceOrder: number | null = null;
    if (isOfficial) {
      if (hasOfficialCircuitStartedInDb(db)) {
        db.exec('ROLLBACK;');
        res.status(409).json({
          error:
            'O circuito oficial já foi iniciado por participantes. A criação de novas missões oficiais está bloqueada.',
          code: 'CIRCUIT_LOCKED',
        });
        return;
      }

      const parsedSeq = Number(p.sequenceOrder);
      if (!Number.isInteger(parsedSeq) || parsedSeq < 1) {
        db.exec('ROLLBACK;');
        res.status(400).json({
          error:
            'A ordem sequencial é obrigatória e deve ser um número inteiro positivo para missões do circuito oficial.',
          code: 'INVALID_SEQUENCE_ORDER',
        });
        return;
      }

      const trackKeyForInsert = p.trackId ? String(p.trackId).trim() : null;
      // Validação de unicidade da ordem sequencial dentro da mesma trilha
      const existingSeq = db
        .prepare(
          "SELECT id, title FROM missions WHERE COALESCE(track_id, 'default') = ? AND sequence_order = ? LIMIT 1"
        )
        .get(trackKeyForInsert || 'default', parsedSeq) as { id: string; title: string } | undefined;

      if (existingSeq) {
        db.exec('ROLLBACK;');
        res.status(409).json({
          error: `A posição ${parsedSeq} já está ocupada pela missão "${existingSeq.title}". Escolha outra ordem sequencial.`,
          code: 'SEQUENCE_ORDER_DUPLICATE',
        });
        return;
      }

      sequenceOrder = parsedSeq;
    }

    const parsedTimerMinutes =
      p.timerMinutes !== null && p.timerMinutes !== undefined && p.timerMinutes !== ''
        ? Math.max(1, Math.min(30, Math.trunc(Number(p.timerMinutes))))
        : null;

    const parsedRelativeWeight =
      p.relativeWeight !== null && p.relativeWeight !== undefined && p.relativeWeight !== ''
        ? Math.max(1, Math.trunc(Number(p.relativeWeight)))
        : 10;
    const parsedMaxVideoSeconds =
      p.maxVideoSeconds !== null && p.maxVideoSeconds !== undefined && p.maxVideoSeconds !== ''
        ? Math.max(1, Math.min(300, Math.trunc(Number(p.maxVideoSeconds))))
        : null;
    const trackIdValue = p.trackId ? String(p.trackId).trim() : null;
    const allowSharedEvidence = Boolean(p.allowSharedEvidence) ? 1 : 0;
    const externalLink = p.externalLink ? String(p.externalLink).trim() : null;

    const points = isOfficial ? 0 : Number(p.points || 200);
    const unlockPoints = 0;
    const completionPoints = isOfficial ? 0 : points;
    const maxSpeedBonus = 0;

    const requiresEvidence = Boolean(p.requiresEvidence) ? 1 : 0;
    const rawEvidenceType = String(p.evidenceType || '').toLowerCase();
    const validEvTypes: EvidenceRequirementType[] = [
      'photo',
      'print',
      'video',
      'photo_or_video',
      'text',
      'file',
      'both',
    ];
    const evidenceType: EvidenceRequirementType | null = requiresEvidence
      ? validEvTypes.includes(rawEvidenceType as EvidenceRequirementType)
        ? (rawEvidenceType as EvidenceRequirementType)
        : 'photo'
      : null;

    const newId = `ms-${Date.now()}`;
    db.prepare(`
      INSERT INTO missions (
        id, title, description, startup_id, startup_name, category,
        points, estimated_time, status, period, completion_criteria,
        active, qr_code_required, quiz_questions_json,
        sequence_order, track_id, relative_weight, timer_minutes,
        unlock_points, completion_points, max_speed_bonus,
        requires_evidence, evidence_type, max_video_seconds,
        allow_shared_evidence, external_link
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      p.title,
      p.description,
      p.startupId,
      p.startupName,
      p.category,
      points,
      p.estimatedTime || '4 min',
      p.status || 'Disponível',
      p.period || '24 a 26/11/2026',
      p.completionCriteria || '',
      p.active === false ? 0 : 1,
      p.qrCodeRequired || null,
      p.quizQuestions ? JSON.stringify(p.quizQuestions) : null,
      sequenceOrder,
      trackIdValue,
      parsedRelativeWeight,
      parsedTimerMinutes,
      unlockPoints,
      completionPoints,
      maxSpeedBonus,
      requiresEvidence,
      evidenceType,
      parsedMaxVideoSeconds,
      allowSharedEvidence,
      externalLink
    );

    // Se for oficial e ativa, compacta a sequência e recalcula os 1.000 pontos
    if (isOfficial && p.active !== false) {
      compactCircuitSequencesInDb(db);
      recalculateCircuitMissionPointsInDb(db);
    }

    db.exec('COMMIT;');

    const created = db
      .prepare('SELECT * FROM missions WHERE id = ?')
      .get(newId) as Record<string, unknown>;
    res.status(201).json(mapMissionRow(created));
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
});

app.put('/api/missions/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const row = db
      .prepare('SELECT * FROM missions WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    if (!row) {
      db.exec('ROLLBACK;');
      res.status(404).json({ error: 'Missão não encontrada' });
      return;
    }
    const current = mapMissionRow(row);
    const u = req.body;
    const currentIsOfficial = current.sequenceOrder !== null && current.sequenceOrder !== undefined;
    const isStarted = hasOfficialCircuitStartedInDb(db);
    const validEvTypes: EvidenceRequirementType[] = [
      'photo',
      'print',
      'video',
      'photo_or_video',
      'text',
      'file',
      'both',
    ];

    if (isStarted) {
      if (currentIsOfficial) {
        // Missão oficial quando o circuito já iniciou:
        // Bloquear rebaixamento para extra
        if (u.missionType === 'extra' || (u.sequenceOrder === null && u.missionType !== 'official')) {
          db.exec('ROLLBACK;');
          res.status(409).json({
            error:
              'O circuito oficial já foi iniciado por participantes. Não é permitido rebaixar uma missão oficial para extra.',
            code: 'CIRCUIT_LOCKED',
          });
          return;
        }

        // Bloquear alteração de sequence_order
        if (
          u.sequenceOrder !== undefined &&
          u.sequenceOrder !== null &&
          Number(u.sequenceOrder) !== current.sequenceOrder
        ) {
          db.exec('ROLLBACK;');
          res.status(409).json({
            error:
              'O circuito oficial já foi iniciado por participantes. A ordem sequencial das missões oficiais está bloqueada.',
            code: 'CIRCUIT_LOCKED',
          });
          return;
        }

        // Bloquear ativação/desativação
        if (u.active !== undefined && Boolean(u.active) !== Boolean(current.active)) {
          db.exec('ROLLBACK;');
          res.status(409).json({
            error:
              'O circuito oficial já foi iniciado por participantes. Não é permitido desativar ou alterar o status ativo de missões oficiais.',
            code: 'CIRCUIT_LOCKED',
          });
          return;
        }

        // Permitir ajuste de timer_minutes para missões ainda não iniciadas (novo dia),
        // bloqueando apenas quando houver cronômetro ativo em andamento para esta missão
        let nextOfficialTimerMinutes: number | null = current.timerMinutes ?? null;
        if (u.timerMinutes !== undefined) {
          const requestedTimerMinutes =
            u.timerMinutes === null || u.timerMinutes === ''
              ? null
              : Math.trunc(Number(u.timerMinutes));

          if (
            requestedTimerMinutes !== null &&
            (isNaN(requestedTimerMinutes) ||
              requestedTimerMinutes < MIN_MISSION_TIMER_MINUTES ||
              requestedTimerMinutes > MAX_MISSION_TIMER_MINUTES)
          ) {
            db.exec('ROLLBACK;');
            res.status(400).json({
              error: `O tempo do cronômetro deve ser um número inteiro entre ${MIN_MISSION_TIMER_MINUTES} e ${MAX_MISSION_TIMER_MINUTES} minutos (ou vazio para herdar o padrão global).`,
            });
            return;
          }

          if (requestedTimerMinutes !== (current.timerMinutes ?? null)) {
            if (hasActiveInProgressTimerForMissionInDb(db, id)) {
              db.exec('ROLLBACK;');
              res.status(409).json({
                error:
                  'Há participante(s) com o cronômetro desta missão em andamento neste momento. Aguarde a conclusão ou expiração antes de alterar o tempo.',
                code: 'MISSION_TIMER_IN_PROGRESS',
              });
              return;
            }
            nextOfficialTimerMinutes = requestedTimerMinutes;
          }
        }

        // Bloquear alteração de critérios de conclusão
        if (
          u.completionCriteria !== undefined &&
          String(u.completionCriteria).trim() !== String(current.completionCriteria).trim()
        ) {
          db.exec('ROLLBACK;');
          res.status(409).json({
            error:
              'O circuito oficial já foi iniciado por participantes. Os critérios de conclusão das missões oficiais estão bloqueados.',
            code: 'CIRCUIT_LOCKED',
          });
          return;
        }

        // Bloquear alteração de configuração de evidência em missão oficial após início do circuito
        if (
          (u.requiresEvidence !== undefined &&
            Boolean(u.requiresEvidence) !== Boolean(current.requiresEvidence)) ||
          (u.evidenceType !== undefined &&
            (u.evidenceType || undefined) !== (current.evidenceType || undefined))
        ) {
          db.exec('ROLLBACK;');
          res.status(409).json({
            error:
              'O circuito oficial já foi iniciado por participantes. A configuração de evidência das missões oficiais está bloqueada.',
            code: 'CIRCUIT_LOCKED',
          });
          return;
        }

        // Bloquear alteração manual de pontos
        if (u.points !== undefined && Number(u.points) !== current.points) {
          db.exec('ROLLBACK;');
          res.status(409).json({
            error:
              'O circuito oficial já foi iniciado por participantes. A pontuação das missões oficiais é gerenciada dinamicamente pelo sistema.',
            code: 'CIRCUIT_LOCKED',
          });
          return;
        }

        // Operações permitidas em missão oficial após início do circuito:
        // título, descrição e duração do cronômetro (somente para futuras execuções, preservando missões já iniciadas/concluídas)
        db.prepare(`
          UPDATE missions
          SET title = ?, description = ?, timer_minutes = ?
          WHERE id = ?
        `).run(
          u.title ?? current.title,
          u.description ?? current.description,
          nextOfficialTimerMinutes,
          id
        );

        db.exec('COMMIT;');
        const rows = db
          .prepare(
            'SELECT * FROM missions ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC'
          )
          .all() as Record<string, unknown>[];
        res.json(rows.map(mapMissionRow));
        return;
      } else {
        // Missão atual é EXTRA, com circuito oficial já iniciado
        // Bloquear promoção de extra para oficial
        const wantsOfficial =
          u.missionType === 'official' ||
          (u.sequenceOrder !== undefined && u.sequenceOrder !== null && u.sequenceOrder !== '');
        if (wantsOfficial) {
          db.exec('ROLLBACK;');
          res.status(409).json({
            error:
              'O circuito oficial já foi iniciado por participantes. Não é permitido promover missões extras para o circuito oficial.',
            code: 'CIRCUIT_LOCKED',
          });
          return;
        }

        // Edição normal permitida para missão extra
        const parsedTimerMinutes =
          u.timerMinutes !== undefined
            ? u.timerMinutes !== null && u.timerMinutes !== ''
              ? Math.max(1, Math.min(30, Math.trunc(Number(u.timerMinutes))))
              : null
            : (current.timerMinutes ?? null);

        const nextExtraRequiresEvidence =
          u.requiresEvidence !== undefined
            ? Boolean(u.requiresEvidence)
              ? 1
              : 0
            : current.requiresEvidence
            ? 1
            : 0;
        const rawExtraEvType = String(u.evidenceType ?? current.evidenceType ?? '').toLowerCase();
        const nextExtraEvidenceType: EvidenceRequirementType | null = nextExtraRequiresEvidence
          ? rawExtraEvType === 'photo' || rawExtraEvType === 'file' || rawExtraEvType === 'both'
            ? rawExtraEvType
            : 'photo'
          : null;

        db.prepare(`
          UPDATE missions
          SET title = ?, description = ?, startup_id = ?, startup_name = ?,
              category = ?, points = ?, estimated_time = ?, status = ?,
              period = ?, completion_criteria = ?, active = ?,
              sequence_order = NULL, timer_minutes = ?,
              requires_evidence = ?, evidence_type = ?
          WHERE id = ?
        `).run(
          u.title ?? current.title,
          u.description ?? current.description,
          u.startupId ?? current.startupId,
          u.startupName ?? current.startupName,
          u.category ?? current.category,
          Number(u.points ?? current.points),
          u.estimatedTime ?? current.estimatedTime,
          u.status ?? current.status,
          u.period ?? current.period,
          u.completionCriteria ?? current.completionCriteria,
          (u.active ?? current.active) ? 1 : 0,
          parsedTimerMinutes,
          nextExtraRequiresEvidence,
          nextExtraEvidenceType,
          id
        );

        db.exec('COMMIT;');
        const rows = db
          .prepare(
            'SELECT * FROM missions ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC'
          )
          .all() as Record<string, unknown>[];
        res.json(rows.map(mapMissionRow));
        return;
      }
    }

    // Circuito AINDA NÃO iniciou (isStarted === false):
    // Gestão estrutural normal permitida
    let newSequenceOrder: number | null = current.sequenceOrder ?? null;
    if (u.missionType === 'extra') {
      newSequenceOrder = null;
    } else if (
      u.missionType === 'official' ||
      (u.sequenceOrder !== undefined && u.sequenceOrder !== null && u.sequenceOrder !== '')
    ) {
      const parsedSeq = Number(u.sequenceOrder);
      if (!Number.isInteger(parsedSeq) || parsedSeq < 1) {
        db.exec('ROLLBACK;');
        res.status(400).json({
          error:
            'A ordem sequencial deve ser um número inteiro positivo para missões do circuito oficial.',
          code: 'INVALID_SEQUENCE_ORDER',
        });
        return;
      }
      const nextTrackKey = u.trackId !== undefined ? String(u.trackId || 'default') : String(current.trackId || 'default');
      const duplicate = db
        .prepare(
          "SELECT id, title FROM missions WHERE COALESCE(track_id, 'default') = ? AND sequence_order = ? AND id != ? LIMIT 1"
        )
        .get(nextTrackKey, parsedSeq, id) as { id: string; title: string } | undefined;
      if (duplicate) {
        db.exec('ROLLBACK;');
        res.status(409).json({
          error: `A posição ${parsedSeq} já está ocupada pela missão "${duplicate.title}". Escolha outra ordem sequencial.`,
          code: 'SEQUENCE_ORDER_DUPLICATE',
        });
        return;
      }
      newSequenceOrder = parsedSeq;
    }

    const parsedTimerMinutes =
      u.timerMinutes !== undefined
        ? u.timerMinutes !== null && u.timerMinutes !== ''
          ? Math.max(1, Math.min(30, Math.trunc(Number(u.timerMinutes))))
          : null
        : (current.timerMinutes ?? null);

    const parsedRelativeWeight =
      u.relativeWeight !== undefined && u.relativeWeight !== null && u.relativeWeight !== ''
        ? Math.max(1, Math.trunc(Number(u.relativeWeight)))
        : (current.relativeWeight ?? 10);
    const parsedMaxVideoSeconds =
      u.maxVideoSeconds !== undefined
        ? u.maxVideoSeconds !== null && u.maxVideoSeconds !== ''
          ? Math.max(1, Math.min(300, Math.trunc(Number(u.maxVideoSeconds))))
          : null
        : (current.maxVideoSeconds ?? null);
    const nextTrackId = u.trackId !== undefined ? (u.trackId ? String(u.trackId).trim() : null) : (current.trackId ?? null);

    const willBeActive = (u.active ?? current.active) ? 1 : 0;
    // Se desativar uma missão oficial, zera a ordem sequencial dela
    if (willBeActive === 0 && newSequenceOrder !== null) {
      newSequenceOrder = null;
    }

    const nextRequiresEvidence =
      u.requiresEvidence !== undefined
        ? Boolean(u.requiresEvidence)
          ? 1
          : 0
        : current.requiresEvidence
        ? 1
        : 0;
    const rawNextEvType = String(u.evidenceType ?? current.evidenceType ?? '').toLowerCase();
    const nextEvidenceType: EvidenceRequirementType | null = nextRequiresEvidence
      ? validEvTypes.includes(rawNextEvType as EvidenceRequirementType)
        ? (rawNextEvType as EvidenceRequirementType)
        : 'photo'
      : null;

    db.prepare(`
      UPDATE missions
      SET title = ?, description = ?, startup_id = ?, startup_name = ?,
          category = ?, points = ?, estimated_time = ?, status = ?,
          period = ?, completion_criteria = ?, active = ?,
          sequence_order = ?, track_id = ?, relative_weight = ?, timer_minutes = ?,
          requires_evidence = ?, evidence_type = ?, max_video_seconds = ?
      WHERE id = ?
    `).run(
      u.title ?? current.title,
      u.description ?? current.description,
      u.startupId ?? current.startupId,
      u.startupName ?? current.startupName,
      u.category ?? current.category,
      Number(u.points ?? current.points),
      u.estimatedTime ?? current.estimatedTime,
      u.status ?? current.status,
      u.period ?? current.period,
      u.completionCriteria ?? current.completionCriteria,
      willBeActive,
      newSequenceOrder,
      nextTrackId,
      parsedRelativeWeight,
      parsedTimerMinutes,
      nextRequiresEvidence,
      nextEvidenceType,
      parsedMaxVideoSeconds,
      id
    );

    // Se qualquer missão oficial ativa estiver presente, compacta e recalcula
    const hasOfficial = db
      .prepare(
        'SELECT COUNT(*) as count FROM missions WHERE active = 1 AND sequence_order IS NOT NULL'
      )
      .get() as { count: number };
    if (hasOfficial.count > 0) {
      compactCircuitSequencesInDb(db);
      recalculateCircuitMissionPointsInDb(db);
    }

    db.exec('COMMIT;');
    const rows = db
      .prepare(
        'SELECT * FROM missions ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC'
      )
      .all() as Record<string, unknown>[];
    res.json(rows.map(mapMissionRow));
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
});

// Helper centralizado para iniciar a missão com controle de cronômetro e idempotência
function startMissionForParticipant(participantId: string, missionId: string) {
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const eligibility = assertParticipantEligibleForCompetition(db, participantId);
    if (!eligibility.ok) {
      db.exec('ROLLBACK;');
      return {
        ok: false as const,
        httpStatus: eligibility.httpStatus,
        errorCode: eligibility.code,
        error: eligibility.error,
      };
    }

    ensureParticipantFirstMissionUnlockedInDb(participantId);

    const missionRow = db
      .prepare('SELECT * FROM missions WHERE id = ? LIMIT 1')
      .get(missionId) as Record<string, unknown> | undefined;

    if (!missionRow || !missionRow.active || missionRow.sequence_order === null) {
      db.exec('ROLLBACK;');
      return {
        ok: false,
        httpStatus: 404,
        errorCode: 'MISSION_NOT_FOUND',
        error: 'Missão não encontrada ou inativa.',
      };
    }

    const seqOrder = Number(missionRow.sequence_order);
    const missionTrackKey = missionRow.track_id ? String(missionRow.track_id) : 'default';

    // Se for missão > 1 na mesma trilha, exige que a missão anterior da MESMA trilha esteja Concluída
    if (seqOrder > 1) {
      const prevMission = db
        .prepare(
          "SELECT id, title FROM missions WHERE COALESCE(track_id, 'default') = ? AND sequence_order = ? AND active = 1 LIMIT 1"
        )
        .get(missionTrackKey, seqOrder - 1) as { id: string; title: string } | undefined;

      if (prevMission) {
        const prevCompleteTx = findActiveTransactionByEventKeys(participantId, [
          `COMPLETE:${participantId}:${prevMission.id}`,
          `COMPLETE:${participantId}:${prevMission.id}:POST_SIM_REV`,
        ]);
        const prevPm = db
          .prepare(
            'SELECT status FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1'
          )
          .get(participantId, prevMission.id) as { status: string } | undefined;

        const isPrevCompleted =
          Boolean(prevCompleteTx) || (prevPm && String(prevPm.status) === 'Concluída');
        if (!isPrevCompleted) {
          db.exec('ROLLBACK;');
          return {
            ok: false,
            httpStatus: 403,
            errorCode: 'MISSION_LOCKED',
            error: `Missão bloqueada: conclua e aguarde a aprovação da Missão 0${seqOrder - 1} ("${prevMission.title}") para desbloquear esta missão.`,
          };
        }
      }
    }

    const nowMs = Date.now();

    // CRONÔMETRO GLOBAL ÚNICO: impede iniciar outra missão enquanto existir uma missão em andamento (não expirada)
    const otherActivePm = db
      .prepare(`
        SELECT pm.mission_id, pm.target_end_at_ms, m.title
        FROM participant_missions pm
        INNER JOIN missions m ON m.id = pm.mission_id
        WHERE pm.participant_id = ?
          AND pm.status = 'Em andamento'
          AND pm.mission_id != ?
          AND m.active = 1
        LIMIT 1
      `)
      .get(participantId, missionId) as
      | { mission_id: string; target_end_at_ms: number | null; title: string }
      | undefined;

    if (otherActivePm) {
      const otherTargetEnd = otherActivePm.target_end_at_ms
        ? Number(otherActivePm.target_end_at_ms)
        : null;
      const otherIsStillRunning = otherTargetEnd === null || nowMs < otherTargetEnd;
      if (otherIsStillRunning) {
        db.exec('ROLLBACK;');
        return {
          ok: false,
          httpStatus: 409,
          errorCode: 'ACTIVE_TIMER_CONFLICT',
          error: `Você já possui uma missão em andamento ("${otherActivePm.title}"). Envie a evidência dela antes de iniciar outra missão.`,
        };
      }
    }

    const currentPm = db
      .prepare(
        'SELECT * FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1'
      )
      .get(participantId, missionId) as Record<string, unknown> | undefined;

    if (currentPm && String(currentPm.status) === 'Concluída') {
      db.exec('ROLLBACK;');
      return {
        ok: false,
        httpStatus: 409,
        errorCode: 'ALREADY_COMPLETED',
        error: 'Esta missão já foi concluída anteriormente.',
      };
    }

    if (currentPm && String(currentPm.status) === 'Aguardando validação') {
      db.exec('ROLLBACK;');
      return {
        ok: false,
        httpStatus: 409,
        errorCode: 'AWAITING_VALIDATION',
        error: 'Sua evidência já foi enviada e está aguardando análise administrativa.',
      };
    }

    const durationSeconds = currentPm?.duration_seconds
      ? Number(currentPm.duration_seconds)
      : getMissionConfiguredDurationSeconds(missionId);
    const targetEndAtMs = currentPm?.target_end_at_ms
      ? Number(currentPm.target_end_at_ms)
      : nowMs + durationSeconds * 1000;

    // Atualiza com COALESCE: se já foi iniciada, NÃO reinicia os timestamps nem a duração!
    db.prepare(`
      UPDATE participant_missions
      SET status = 'Em andamento',
          started_at_ms = COALESCE(started_at_ms, ?),
          duration_seconds = COALESCE(duration_seconds, ?),
          target_end_at_ms = COALESCE(target_end_at_ms, ?)
      WHERE participant_id = ? AND mission_id = ?
    `).run(nowMs, durationSeconds, targetEndAtMs, participantId, missionId);

    const updatedPm = db
      .prepare(
        'SELECT * FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1'
      )
      .get(participantId, missionId) as Record<string, unknown>;

    const effectiveStartedAtMs = Number(updatedPm.started_at_ms || nowMs);
    const effectiveDurationSeconds = Number(updatedPm.duration_seconds || durationSeconds);
    const effectiveTargetEndAtMs = Number(updatedPm.target_end_at_ms || targetEndAtMs);
    const elapsedSeconds = Math.max(0, Math.round((nowMs - effectiveStartedAtMs) / 1000));
    const remainingSeconds = Math.max(0, Math.ceil((effectiveTargetEndAtMs - nowMs) / 1000));
    const isExpired = remainingSeconds <= 0;
    const rawBonus = missionRow.max_speed_bonus;
    if (
      rawBonus === null || rawBonus === undefined ||
      !Number.isInteger(Number(rawBonus)) || Number(rawBonus) < 0
    ) {
      db.exec('ROLLBACK;');
      return {
        ok: false,
        httpStatus: 500,
        errorCode: 'INVALID_CIRCUIT_SCORING',
        error: `Erro contábil: a missão oficial "${missionRow.title}" não possui max_speed_bonus dinâmico válido no banco.`,
      };
    }
    const missionMaxBonus = Number(rawBonus);

    const potentialSpeedBonus = isExpired
      ? 0
      : Math.max(
          0,
          Math.min(missionMaxBonus, Math.round(missionMaxBonus * (remainingSeconds / effectiveDurationSeconds)))
        );

    db.exec('COMMIT;');

    return {
      ok: true,
      httpStatus: 200,
      data: {
        success: true,
        missionId,
        status: 'Em andamento' as const,
        startedAtMs: effectiveStartedAtMs,
        durationSeconds: effectiveDurationSeconds,
        targetEndAtMs: effectiveTargetEndAtMs,
        serverTimeMs: nowMs,
        elapsedSeconds,
        remainingSeconds,
        potentialSpeedBonus,
        isExpired,
        message: `Missão "${missionRow.title}" iniciada! Tempo de execução: ${Math.round(effectiveDurationSeconds / 60)} min.`,
      },
    };
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
}

// Iniciação explícita da missão e do cronômetro (Etapa 3)
app.post('/api/missions/:id/start', requireParticipant, (req: RequestWithAuth, res) => {
  const { id } = req.params;
  const participantId = req.authSession!.userId;
  const result = startMissionForParticipant(participantId, id);

  if (!result.ok) {
    res.status(result.httpStatus).json({
      success: false,
      errorCode: result.errorCode,
      error: result.error,
    });
    return;
  }

  res.json(result.data);
});

// Consulta do status em tempo real do cronômetro da missão
app.get('/api/missions/:id/timer', requireParticipant, (req: RequestWithAuth, res) => {
  const { id } = req.params;
  const participantId = req.authSession!.userId;

  const pm = db
    .prepare(
      'SELECT * FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1'
    )
    .get(participantId, id) as Record<string, unknown> | undefined;

  const missionRow = db
    .prepare('SELECT * FROM missions WHERE id = ? LIMIT 1')
    .get(id) as Record<string, unknown> | undefined;

  if (!missionRow) {
    res.status(404).json({ error: 'Missão não encontrada' });
    return;
  }

  const isOfficial = missionRow.sequence_order !== null && missionRow.sequence_order !== undefined;
  const rawMaxBonus = missionRow.max_speed_bonus;

  if (
    isOfficial &&
    (rawMaxBonus === null || rawMaxBonus === undefined || !Number.isInteger(Number(rawMaxBonus)) || Number(rawMaxBonus) < 0)
  ) {
    res.status(500).json({
      error: `Erro contábil: a missão oficial "${missionRow.title}" não possui max_speed_bonus dinâmico válido no banco.`,
      code: 'INVALID_CIRCUIT_SCORING',
    });
    return;
  }

  const missionMaxBonus = isOfficial
    ? Number(rawMaxBonus)
    : (Number.isInteger(Number(rawMaxBonus)) && Number(rawMaxBonus) >= 0 ? Number(rawMaxBonus) : 0);

  const nowMs = Date.now();
  const durationSeconds = pm?.duration_seconds
    ? Number(pm.duration_seconds)
    : getMissionConfiguredDurationSeconds(id);

  if (!pm || !pm.started_at_ms) {
    res.json({
      missionId: id,
      status: pm ? String(pm.status) : 'Disponível',
      startedAtMs: null,
      durationSeconds,
      targetEndAtMs: null,
      serverTimeMs: nowMs,
      elapsedSeconds: 0,
      remainingSeconds: durationSeconds,
      potentialSpeedBonus: missionMaxBonus,
      speedBonusAwarded: 0,
      isExpired: false,
    });
    return;
  }

  const startedAtMs = Number(pm.started_at_ms);
  const targetEndAtMs = pm.target_end_at_ms
    ? Number(pm.target_end_at_ms)
    : startedAtMs + durationSeconds * 1000;
  const isCompleted = String(pm.status) === 'Concluída';

  let elapsedSeconds = 0;
  let remainingSeconds = durationSeconds;

  if (isCompleted && pm.completed_at_ms) {
    elapsedSeconds = Math.max(0, Math.round((Number(pm.completed_at_ms) - startedAtMs) / 1000));
    remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
  } else {
    elapsedSeconds = Math.max(0, Math.round((nowMs - startedAtMs) / 1000));
    remainingSeconds = Math.max(0, Math.ceil((targetEndAtMs - nowMs) / 1000));
  }

  const isExpired = remainingSeconds <= 0;
  const potentialSpeedBonus = isCompleted
    ? 0
    : isExpired
    ? 0
    : Math.max(0, Math.min(missionMaxBonus, Math.round(missionMaxBonus * (remainingSeconds / durationSeconds))));

  res.json({
    missionId: id,
    status: String(pm.status),
    startedAtMs,
    durationSeconds,
    targetEndAtMs,
    serverTimeMs: nowMs,
    elapsedSeconds,
    remainingSeconds,
    potentialSpeedBonus,
    speedBonusAwarded: Number(pm.speed_bonus_awarded || 0),
    isExpired,
  });
});

app.patch('/api/missions/:id/status', requireParticipant, (req: RequestWithAuth, res) => {
  const { id } = req.params;
  const { status } = req.body as { status?: string };
  const currentParticipant = getAuthenticatedUserById(req.authSession!.userId);

  if (!currentParticipant) {
    res.status(401).json({
      success: false,
      error: 'Sessão de participante inválida.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  const eligibility = assertParticipantEligibleForCompetition(db, currentParticipant.id);
  if (!eligibility.ok) {
    res.status(eligibility.httpStatus).json({
      success: false,
      errorCode: eligibility.code,
      code: eligibility.code,
      error: eligibility.error,
    });
    return;
  }

  ensureParticipantFirstMissionUnlockedInDb(currentParticipant.id);

  // Impede tentativas de desbloquear ou concluir missões diretamente pelo navegador via endpoint de status
  if (status !== 'Em andamento') {
    res.status(403).json({
      success: false,
      errorCode: 'DIRECT_UNLOCK_FORBIDDEN',
      error:
        'Operação bloqueada: não é permitido desbloquear ou concluir missões diretamente. Siga a sequência obrigatória.',
    });
    return;
  }

  const result = startMissionForParticipant(currentParticipant.id, id);
  if (!result.ok) {
    res.status(result.httpStatus).json({
      success: false,
      errorCode: result.errorCode,
      error: result.error,
    });
    return;
  }

  const participantMissions = getParticipantMissionsFromDb(currentParticipant);
  const updated = participantMissions.find((m) => m.id === id) || null;
  res.json(updated);
});

app.post('/api/missions/:id/complete', requireParticipant, (req: RequestWithAuth, res) => {
  const { id } = req.params;
  const participantId = req.authSession!.userId;

  const eligibility = assertParticipantEligibleForCompetition(db, participantId);
  if (!eligibility.ok) {
    res.status(eligibility.httpStatus).json({
      success: false,
      status: eligibility.code,
      code: eligibility.code,
      error: eligibility.error,
    });
    return;
  }

  const missionCheck = db
    .prepare('SELECT id, title, requires_evidence FROM missions WHERE id = ? LIMIT 1')
    .get(id) as { id: string; title: string; requires_evidence: number } | undefined;

  if (missionCheck && Boolean(missionCheck.requires_evidence)) {
    res.status(400).json({
      success: false,
      status: 'EVIDENCE_REQUIRED',
      error: `A missão "${missionCheck.title}" exige o envio e a aprovação administrativa de evidência antes da conclusão.`,
    });
    return;
  }

  const result = completeSequentialMissionInSql({
    participantId,
    missionId: id,
    sourceType: 'Missão',
  });

  if (!result.ok) {
    res.status(result.httpStatus).json({
      success: false,
      status: result.status,
      alreadyCompleted: result.alreadyCompleted || false,
      error: result.message,
      message: result.message,
    });
    return;
  }

  res.json({
    success: true,
    status: 'VALIDATED',
    missionId: result.missionId,
    completionPointsAwarded: result.completionPointsAwarded,
    speedBonusAwarded: result.speedBonusAwarded,
    unlockPointsAwarded: result.unlockPointsAwarded,
    pointsAwarded: result.pointsAwarded,
    nextMissionUnlocked: result.nextMissionUnlocked,
    message: result.message,
  });
});

app.patch('/api/missions/:id/toggle', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const row = db
      .prepare('SELECT id, active, sequence_order FROM missions WHERE id = ?')
      .get(id) as { id: string; active: number; sequence_order: number | null } | undefined;

    if (!row) {
      db.exec('ROLLBACK;');
      res.status(404).json({ error: 'Missão não encontrada' });
      return;
    }

    const isOfficial = row.sequence_order !== null && row.sequence_order !== undefined;
    const isStarted = hasOfficialCircuitStartedInDb(db);

    if (isStarted && isOfficial) {
      db.exec('ROLLBACK;');
      res.status(409).json({
        error:
          'O circuito oficial já foi iniciado por participantes. Não é permitido ativar ou desativar missões oficiais.',
        code: 'CIRCUIT_LOCKED',
      });
      return;
    }

    const newActive = row.active === 1 ? 0 : 1;
    // Se estiver desativando uma missão oficial antes do início, limpa a sequence_order dela
    const newSeqOrder = newActive === 0 && isOfficial ? null : row.sequence_order;

    db.prepare('UPDATE missions SET active = ?, sequence_order = ? WHERE id = ?').run(
      newActive,
      newSeqOrder,
      id
    );

    // Se houver missões oficiais ativas, compacta sequências e recalcula os 1.000 pontos
    const hasOfficial = db
      .prepare(
        'SELECT COUNT(*) as count FROM missions WHERE active = 1 AND sequence_order IS NOT NULL'
      )
      .get() as { count: number };
    if (hasOfficial.count > 0) {
      compactCircuitSequencesInDb(db);
      recalculateCircuitMissionPointsInDb(db);
    }

    db.exec('COMMIT;');

    const rows = db
      .prepare(
        'SELECT * FROM missions ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC'
      )
      .all() as Record<string, unknown>[];
    res.json(rows.map(mapMissionRow));
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
});

app.delete('/api/missions/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const row = db
      .prepare('SELECT id, active, sequence_order FROM missions WHERE id = ?')
      .get(id) as { id: string; active: number; sequence_order: number | null } | undefined;

    if (!row) {
      db.exec('ROLLBACK;');
      res.status(404).json({ error: 'Missão não encontrada' });
      return;
    }

    const isOfficial = row.sequence_order !== null && row.sequence_order !== undefined;
    const isStarted = hasOfficialCircuitStartedInDb(db);

    if (isStarted && isOfficial) {
      db.exec('ROLLBACK;');
      res.status(409).json({
        error:
          'O circuito oficial já foi iniciado por participantes. A exclusão de missões oficiais está bloqueada.',
        code: 'CIRCUIT_LOCKED',
      });
      return;
    }

    db.prepare('DELETE FROM missions WHERE id = ?').run(id);

    // Se era missão oficial antes de iniciar, compacta as remanescentes e recalcula
    if (isOfficial) {
      compactCircuitSequencesInDb(db);
      const hasOfficial = db
        .prepare(
          'SELECT COUNT(*) as count FROM missions WHERE active = 1 AND sequence_order IS NOT NULL'
        )
        .get() as { count: number };
      if (hasOfficial.count > 0) {
        recalculateCircuitMissionPointsInDb(db);
      }
    }

    db.exec('COMMIT;');

    const rows = db
      .prepare(
        'SELECT * FROM missions ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC'
      )
      .all() as Record<string, unknown>[];
    res.json(rows.map(mapMissionRow));
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }
});

export function submitEvidenceUploadInDb(
  targetDb: typeof db,
  params: {
    participantId: string;
    participantName: string;
    missionId: string;
    buffer: Buffer;
    originalName: string;
    declaredMimeType: string;
    description?: string;
    storageDir?: string;
  }
):
  | { ok: true; httpStatus: 201; validation: ReturnType<typeof mapValidationRow> }
  | { ok: false; httpStatus: number; code: string; error: string } {
  const storageDir = params.storageDir || EVIDENCE_STORAGE_DIR;

  const missionRow = targetDb
    .prepare('SELECT * FROM missions WHERE id = ? AND active = 1 LIMIT 1')
    .get(params.missionId) as Record<string, unknown> | undefined;

  if (!missionRow) {
    return {
      ok: false,
      httpStatus: 404,
      code: 'MISSION_NOT_FOUND',
      error: 'Missão não encontrada ou inativa.',
    };
  }

  if (!Boolean(missionRow.requires_evidence)) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'EVIDENCE_NOT_REQUIRED',
      error: 'Esta missão não exige o envio de evidência por arquivo.',
    };
  }

  const requiredEvidenceCount = Math.max(1, Number(missionRow.required_evidence_count || 1));
  if (requiredEvidenceCount > 1) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'MULTIPLE_EVIDENCE_REQUIRED',
      error: `Esta missão exige o envio de exatamente ${requiredEvidenceCount} imagens na mesma submissão.`,
    };
  }

  const rawEvType = String(missionRow.evidence_type || 'photo').toLowerCase();
  const validEvTypes: EvidenceRequirementType[] = [
    'photo',
    'print',
    'video',
    'photo_or_video',
    'text',
    'file',
    'both',
  ];
  const requiredType: EvidenceRequirementType = validEvTypes.includes(
    rawEvType as EvidenceRequirementType
  )
    ? (rawEvType as EvidenceRequirementType)
    : 'photo';

  if (requiredType === 'text') {
    return {
      ok: false,
      httpStatus: 400,
      code: 'TEXT_EVIDENCE_ONLY',
      error: 'Esta missão exige resposta em texto pela rota de submissão de texto.',
    };
  }

  const maxVideoSeconds =
    missionRow.max_video_seconds !== null && missionRow.max_video_seconds !== undefined
      ? Number(missionRow.max_video_seconds)
      : null;

  const isOfficial =
    missionRow.sequence_order !== null && missionRow.sequence_order !== undefined;

  // Valida pontuação dinâmica da missão oficial antes de aceitar arquivo
  let completionPoints = 0;
  if (isOfficial) {
    const rawComp = missionRow.completion_points;
    if (
      rawComp === null ||
      rawComp === undefined ||
      !Number.isInteger(Number(rawComp)) ||
      Number(rawComp) <= 0
    ) {
      return {
        ok: false,
        httpStatus: 500,
        code: 'INVALID_CIRCUIT_SCORING',
        error: `A missão oficial "${missionRow.title}" não possui completion_points dinâmico válido no banco.`,
      };
    }
    completionPoints = Number(rawComp);
  } else {
    completionPoints = Number(missionRow.points || 0);
  }

  // Validação completa do arquivo no backend (extensão, MIME, magic bytes, tamanho, duração de vídeo)
  const fileCheck = validateAndDetectEvidenceFile({
    buffer: params.buffer,
    originalName: params.originalName,
    declaredMimeType: params.declaredMimeType,
    requiredType,
    maxVideoSeconds,
  });
  if (!fileCheck.ok) {
    return fileCheck;
  }

  // Grava arquivo em armazenamento privado com nome interno UUID seguro
  saveEvidenceFileToDisk(params.buffer, fileCheck.storedName, storageDir);

  const newId = `val-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const evidenceCode = `EV-${Date.now().toString().slice(-6)}`;
  const nowMs = Date.now();
  const nowStr = new Date(nowMs).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const description =
    (params.description || '').trim() || `Arquivo enviado: ${fileCheck.safeDisplayName}`;

  const missionTrackKey = missionRow.track_id ? String(missionRow.track_id) : 'default';
  const allowSharedEvidence = Boolean(missionRow.allow_shared_evidence);

  targetDb.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    // Verifica bloqueio sequencial dentro da mesma trilha (elimina TOCTOU)
    if (isOfficial && Number(missionRow.sequence_order) > 1) {
      const seqOrder = Number(missionRow.sequence_order);
      const prevMission = targetDb
        .prepare(
          "SELECT id, title FROM missions WHERE COALESCE(track_id, 'default') = ? AND sequence_order = ? AND active = 1 LIMIT 1"
        )
        .get(missionTrackKey, seqOrder - 1) as { id: string; title: string } | undefined;

      if (prevMission) {
        const prevCompleteTx = findActiveTransactionByEventKeys(
          params.participantId,
          [
            `COMPLETE:${params.participantId}:${prevMission.id}`,
            `COMPLETE:${params.participantId}:${prevMission.id}:POST_SIM_REV`,
          ],
          targetDb
        );
        const prevPm = targetDb
          .prepare(
            'SELECT status FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1'
          )
          .get(params.participantId, prevMission.id) as { status: string } | undefined;

        if (!prevCompleteTx && (!prevPm || prevPm.status !== 'Concluída')) {
          targetDb.exec('ROLLBACK;');
          deleteEvidenceFileIfExists(fileCheck.storedName, storageDir);
          return {
            ok: false,
            httpStatus: 403,
            code: 'MISSION_LOCKED',
            error: `Bloqueio sequencial: conclua e aguarde a aprovação da Missão 0${seqOrder - 1} antes de enviar evidências desta missão.`,
          };
        }
      }
    }

    // Impede envio duplicado dentro da mesma transação (elimina TOCTOU)
    const existingCompleteTx = findActiveTransactionByEventKeys(
      params.participantId,
      [
        `COMPLETE:${params.participantId}:${params.missionId}`,
        `COMPLETE:${params.participantId}:${params.missionId}:POST_SIM_REV`,
      ],
      targetDb
    );
    const existingPm = targetDb
      .prepare(
        'SELECT status, started_at_ms, target_end_at_ms FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1'
      )
      .get(params.participantId, params.missionId) as
      | { status: string; started_at_ms: number | null; target_end_at_ms: number | null }
      | undefined;
    const existingSubmission = targetDb
      .prepare(
        "SELECT id, status FROM mission_completions WHERE participant_id = ? AND mission_id = ? AND status IN ('Pendente', 'Aprovada') LIMIT 1"
      )
      .get(params.participantId, params.missionId) as { id: string; status: string } | undefined;

    if (
      existingCompleteTx ||
      (existingPm && existingPm.status === 'Concluída') ||
      existingSubmission
    ) {
      targetDb.exec('ROLLBACK;');
      deleteEvidenceFileIfExists(fileCheck.storedName, storageDir);
      return {
        ok: false,
        httpStatus: 409,
        code: 'EVIDENCE_ALREADY_SUBMITTED',
        error:
          existingSubmission?.status === 'Pendente'
            ? 'Você já enviou uma evidência para esta missão e ela está aguardando validação.'
            : 'Esta missão já foi concluída e validada anteriormente.',
      };
    }

    // Cronômetro é critério exclusivo de bônus de velocidade (calculado em completeSequentialMissionInSql);
    // a expiração zera o bônus, mas não impede envio, conclusão ou desbloqueio.

    // Proteção contra duplicidade de arquivo via SHA-256
    // 1. Mesmo participante jamais pode reutilizar o mesmo arquivo em qualquer missão ativa
    const sameParticipantReuse = (targetDb
      .prepare(
        `SELECT id, mission_id, mission_title
         FROM mission_completions
         WHERE evidence_sha256 = ?
           AND participant_id = ?
           AND status IN ('Pendente', 'Aprovada')
         LIMIT 1`
      )
      .get(fileCheck.sha256, params.participantId) ||
      targetDb
        .prepare(
          `SELECT mc.id, mc.mission_id, mc.mission_title
           FROM mission_completion_files mcf
           INNER JOIN mission_completions mc ON mc.id = mcf.completion_id
           WHERE mcf.sha256 = ?
             AND mc.participant_id = ?
             AND mc.status IN ('Pendente', 'Aprovada')
           LIMIT 1`
        )
        .get(fileCheck.sha256, params.participantId)) as
      | { id: string; mission_id: string; mission_title: string }
      | undefined;

    if (sameParticipantReuse) {
      targetDb.exec('ROLLBACK;');
      deleteEvidenceFileIfExists(fileCheck.storedName, storageDir);
      return {
        ok: false,
        httpStatus: 409,
        code: 'DUPLICATE_EVIDENCE_FILE',
        error: `Este arquivo já foi utilizado por você na missão "${sameParticipantReuse.mission_title}". Envie uma evidência inédita.`,
      };
    }

    // 2. Outro participante usando o mesmo arquivo: bloqueado em todas as missões,
    // EXCETO quando allow_shared_evidence = 1 na MESMA missão (ex.: Trio de inovação)
    const otherParticipantReuse = (targetDb
      .prepare(
        `SELECT id, mission_id, mission_title, participant_id
         FROM mission_completions
         WHERE evidence_sha256 = ?
           AND participant_id != ?
           AND status IN ('Pendente', 'Aprovada')
         LIMIT 1`
      )
      .get(fileCheck.sha256, params.participantId) ||
      targetDb
        .prepare(
          `SELECT mc.id, mc.mission_id, mc.mission_title, mc.participant_id
           FROM mission_completion_files mcf
           INNER JOIN mission_completions mc ON mc.id = mcf.completion_id
           WHERE mcf.sha256 = ?
             AND mc.participant_id != ?
             AND mc.status IN ('Pendente', 'Aprovada')
           LIMIT 1`
        )
        .get(fileCheck.sha256, params.participantId)) as
      | { id: string; mission_id: string; mission_title: string; participant_id: string }
      | undefined;

    if (otherParticipantReuse) {
      const isAllowedCollectivePhoto =
        allowSharedEvidence && otherParticipantReuse.mission_id === String(missionRow.id);
      if (!isAllowedCollectivePhoto) {
        targetDb.exec('ROLLBACK;');
        deleteEvidenceFileIfExists(fileCheck.storedName, storageDir);
        return {
          ok: false,
          httpStatus: 409,
          code: 'DUPLICATE_EVIDENCE_FILE',
          error:
            'Este arquivo já foi enviado anteriormente em outra submissão. Utilize um registro inédito para esta missão.',
        };
      }
    }

    targetDb
      .prepare(`
        INSERT INTO mission_completions (
          id, participant_id, participant_name, mission_id, mission_title,
          startup_id, startup_name, submitted_at, evidence_description,
          evidence_code, evidence_file_name, evidence_stored_name,
          evidence_mime_type, evidence_size_bytes, evidence_sha256,
          evidence_duration_seconds, points_awarded, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendente')
      `)
      .run(
        newId,
        params.participantId,
        params.participantName,
        String(missionRow.id),
        String(missionRow.title),
        String(missionRow.startup_id),
        String(missionRow.startup_name),
        nowStr,
        description,
        evidenceCode,
        fileCheck.safeDisplayName,
        fileCheck.storedName,
        fileCheck.mimeType,
        fileCheck.sizeBytes,
        fileCheck.sha256,
        fileCheck.durationSeconds,
        completionPoints
      );

    if (isOfficial) {
      const frozenElapsed = existingPm?.started_at_ms
        ? Math.max(0, Math.round((nowMs - Number(existingPm.started_at_ms)) / 1000))
        : 0;
      targetDb
        .prepare(
          `UPDATE participant_missions
           SET status = 'Em andamento',
               submitted_at_ms = ?,
               elapsed_seconds = ?
           WHERE participant_id = ? AND mission_id = ?`
        )
        .run(nowMs, frozenElapsed, params.participantId, String(missionRow.id));

      const seqResult = completeSequentialMissionInSql({
        participantId: params.participantId,
        missionId: String(missionRow.id),
        sourceType: 'Missão',
        useExistingTransaction: true,
        targetDb,
        sourceCompletionId: newId,
      });

      if (!seqResult.ok) {
        targetDb.exec('ROLLBACK;');
        deleteEvidenceFileIfExists(fileCheck.storedName, storageDir);
        return {
          ok: false,
          httpStatus: seqResult.httpStatus,
          code: seqResult.status,
          error: seqResult.message,
        };
      }

      targetDb
        .prepare('UPDATE mission_completions SET points_awarded = ? WHERE id = ?')
        .run(seqResult.missionPointsAwarded, newId);
    } else {
      const extraRes = completeExtraMissionInExistingTx({
        targetDb,
        participantId: params.participantId,
        missionRow,
        sourceCompletionId: newId,
        nowMs,
      });
      if (!extraRes.ok) {
        targetDb.exec('ROLLBACK;');
        deleteEvidenceFileIfExists(fileCheck.storedName, storageDir);
        return {
          ok: false,
          httpStatus: extraRes.httpStatus,
          code: 'EXTRA_MISSION_ERROR',
          error: extraRes.error,
        };
      }
      targetDb
        .prepare('UPDATE mission_completions SET points_awarded = ? WHERE id = ?')
        .run(extraRes.pointsAwarded, newId);
    }

    targetDb.exec('COMMIT;');
  } catch (err: any) {
    try {
      targetDb.exec('ROLLBACK;');
    } catch {
      // transação já revertida
    }
    deleteEvidenceFileIfExists(fileCheck.storedName, storageDir);
    if (String(err?.message || '').includes('UNIQUE constraint failed')) {
      return {
        ok: false,
        httpStatus: 409,
        code: 'EVIDENCE_ALREADY_SUBMITTED',
        error: 'Você já possui uma evidência ativa ou aprovada para esta missão.',
      };
    }
    throw err;
  }

  if (targetDb === db) {
    recalculateRankingsInDb();
  }
  revalidateActiveHomologationsInDb(targetDb, 'Novo envio de evidência com pontuação contabilizada');

  const created = targetDb
    .prepare('SELECT * FROM mission_completions WHERE id = ?')
    .get(newId) as Record<string, unknown>;

  return {
    ok: true,
    httpStatus: 201,
    validation: mapValidationRow(created),
  };
}

const evidenceRawBodyMiddleware = express.raw({
  type: 'application/octet-stream',
  limit: '26mb',
});

app.post(
  '/api/evidences/upload',
  evidenceUploadRateLimiter,
  (req, res, next) => {
    evidenceRawBodyMiddleware(req, res, (err?: any) => {
      if (err) {
        if (err.type === 'entity.too.large' || err.status === 413 || err.statusCode === 413) {
          res.status(413).json({
            error: 'O arquivo excede o limite máximo permitido de 5 MB.',
            code: 'FILE_TOO_LARGE',
          });
          return;
        }
        res.status(400).json({
          error: 'Falha ao processar o arquivo enviado.',
          code: 'INVALID_UPLOAD_PAYLOAD',
        });
        return;
      }
      next();
    });
  },
  (req, res) => {
    const session = resolveSessionFromRequest(req);
    if (!session) {
      res.status(401).json({
        error: 'Não autenticado. Faça login para enviar evidências.',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (session.role !== 'PARTICIPANT') {
      res.status(403).json({
        error: 'Apenas participantes autenticados podem enviar evidências de missões.',
        code: 'PARTICIPANT_ROLE_REQUIRED',
      });
      return;
    }

    const participantRow = db
      .prepare("SELECT * FROM participants WHERE id = ? AND UPPER(role) = 'PARTICIPANT' LIMIT 1")
      .get(session.userId) as Record<string, unknown> | undefined;

    if (!participantRow) {
      res.status(401).json({
        error: 'Sessão de participante inválida ou expirada.',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const currentParticipant = mapParticipantRow(participantRow);

    const eligibility = assertParticipantEligibleForCompetition(db, currentParticipant.id);
    if (!eligibility.ok) {
      res.status(eligibility.httpStatus).json({
        error: eligibility.error,
        code: eligibility.code,
      });
      return;
    }

    const headerParticipantId = String(req.headers['x-participant-id'] || '').trim();
    if (headerParticipantId && headerParticipantId !== currentParticipant.id) {
      res.status(403).json({
        error: 'Operação negada: não é permitido enviar evidências em nome de outro participante.',
        code: 'FORBIDDEN_PARTICIPANT_MISMATCH',
      });
      return;
    }

    const missionId = String(req.headers['x-mission-id'] || '').trim();
    const rawFileNameHeader = String(req.headers['x-file-name'] || 'evidencia');
    let decodedFileName = rawFileNameHeader;
    try {
      decodedFileName = decodeURIComponent(rawFileNameHeader);
    } catch {
      decodedFileName = rawFileNameHeader;
    }
    const declaredMimeType = String(req.headers['x-file-mime'] || '').trim();
    const rawDescHeader = String(req.headers['x-evidence-description'] || '');
    let decodedDesc = rawDescHeader;
    try {
      decodedDesc = decodeURIComponent(rawDescHeader);
    } catch {
      decodedDesc = rawDescHeader;
    }

    const buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

    const result = submitEvidenceUploadInDb(db, {
      participantId: currentParticipant.id,
      participantName: currentParticipant.name,
      missionId,
      buffer,
      originalName: decodedFileName,
      declaredMimeType,
      description: decodedDesc,
    });

    if (!result.ok) {
      res.status(result.httpStatus).json({
        error: result.error,
        code: result.code,
      });
      return;
    }

    res.status(201).json({
      ok: true,
      validation: result.validation,
      message:
        'Evidência registrada com sucesso. Pontuação contabilizada e próxima missão liberada (evidência sujeita à conferência final).',
    });
  }
);

export function submitEvidenceBatchInDb(
  targetDb: typeof db,
  params: {
    participantId: string;
    participantName: string;
    missionId: string;
    files: Array<{
      buffer: Buffer;
      originalName: string;
      declaredMimeType: string;
    }>;
    description?: string;
    storageDir?: string;
  }
):
  | { ok: true; httpStatus: 201; validation: ReturnType<typeof mapValidationRow> }
  | { ok: false; httpStatus: number; code: string; error: string } {
  const storageDir = params.storageDir || EVIDENCE_STORAGE_DIR;

  const missionRow = targetDb
    .prepare('SELECT * FROM missions WHERE id = ? AND active = 1 LIMIT 1')
    .get(params.missionId) as Record<string, unknown> | undefined;

  if (!missionRow) {
    return {
      ok: false,
      httpStatus: 404,
      code: 'MISSION_NOT_FOUND',
      error: 'Missão não encontrada ou inativa.',
    };
  }

  if (!Boolean(missionRow.requires_evidence)) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'EVIDENCE_NOT_REQUIRED',
      error: 'Esta missão não exige o envio de evidência por arquivo.',
    };
  }

  const requiredEvidenceCount = Math.max(1, Number(missionRow.required_evidence_count || 1));
  if (requiredEvidenceCount <= 1) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'SINGLE_EVIDENCE_ONLY',
      error: 'Esta missão aceita apenas 1 arquivo de evidência pela rota padrão de envio.',
    };
  }

  if (!Array.isArray(params.files) || params.files.length !== requiredEvidenceCount) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'INVALID_EVIDENCE_COUNT',
      error: `Esta missão exige exatamente ${requiredEvidenceCount} imagens na mesma submissão (recebido: ${Array.isArray(params.files) ? params.files.length : 0}).`,
    };
  }

  const rawEvType = String(missionRow.evidence_type || 'print').toLowerCase();
  const validEvTypes: EvidenceRequirementType[] = [
    'photo',
    'print',
    'video',
    'photo_or_video',
    'text',
    'file',
    'both',
  ];
  const requiredType: EvidenceRequirementType = validEvTypes.includes(
    rawEvType as EvidenceRequirementType
  )
    ? (rawEvType as EvidenceRequirementType)
    : 'print';

  if (requiredType === 'text') {
    return {
      ok: false,
      httpStatus: 400,
      code: 'TEXT_EVIDENCE_ONLY',
      error: 'Esta missão exige resposta em texto pela rota de submissão de texto.',
    };
  }

  const maxVideoSeconds =
    missionRow.max_video_seconds !== null && missionRow.max_video_seconds !== undefined
      ? Number(missionRow.max_video_seconds)
      : null;

  const isOfficial =
    missionRow.sequence_order !== null && missionRow.sequence_order !== undefined;

  let completionPoints = 0;
  if (isOfficial) {
    const rawComp = missionRow.completion_points;
    if (
      rawComp === null ||
      rawComp === undefined ||
      !Number.isInteger(Number(rawComp)) ||
      Number(rawComp) <= 0
    ) {
      return {
        ok: false,
        httpStatus: 500,
        code: 'INVALID_CIRCUIT_SCORING',
        error: `A missão oficial "${missionRow.title}" não possui completion_points dinâmico válido no banco.`,
      };
    }
    completionPoints = Number(rawComp);
  } else {
    completionPoints = Number(missionRow.points || 0);
  }

  // Valida todas as imagens antes de gravar qualquer arquivo no disco
  const validatedFiles: Array<{
    buffer: Buffer;
    safeDisplayName: string;
    storedName: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    durationSeconds: number | null;
  }> = [];
  const seenBatchHashes = new Set<string>();

  for (let i = 0; i < params.files.length; i += 1) {
    const item = params.files[i];
    const check = validateAndDetectEvidenceFile({
      buffer: item.buffer,
      originalName: item.originalName,
      declaredMimeType: item.declaredMimeType,
      requiredType,
      maxVideoSeconds,
    });
    if (!check.ok) {
      return {
        ok: false,
        httpStatus: check.httpStatus,
        code: check.code,
        error: `Imagem ${i + 1}: ${check.error}`,
      };
    }

    if (seenBatchHashes.has(check.sha256)) {
      return {
        ok: false,
        httpStatus: 409,
        code: 'DUPLICATE_EVIDENCE_FILE_IN_BATCH',
        error:
          'As 3 imagens enviadas devem ser diferentes entre si (envie um print distinto para cada perfil: @exdevedor, @signedu e @editoraescreva).',
      };
    }
    seenBatchHashes.add(check.sha256);

    validatedFiles.push({
      buffer: item.buffer,
      safeDisplayName: check.safeDisplayName,
      storedName: check.storedName,
      mimeType: check.mimeType,
      sizeBytes: check.sizeBytes,
      sha256: check.sha256,
      durationSeconds: check.durationSeconds,
    });
  }

  // Grava os arquivos no disco com limpeza compensatória em caso de erro de escrita
  const writtenStoredNames: string[] = [];
  const cleanupWrittenFiles = () => {
    for (const storedName of writtenStoredNames) {
      deleteEvidenceFileIfExists(storedName, storageDir);
    }
  };

  try {
    for (const vf of validatedFiles) {
      saveEvidenceFileToDisk(vf.buffer, vf.storedName, storageDir);
      writtenStoredNames.push(vf.storedName);
    }
  } catch (writeErr: any) {
    cleanupWrittenFiles();
    return {
      ok: false,
      httpStatus: 500,
      code: 'STORAGE_WRITE_ERROR',
      error: `Falha ao armazenar os arquivos de evidência: ${writeErr?.message || 'erro de escrita'}.`,
    };
  }

  const newId = `val-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const evidenceCode = `EV-${Date.now().toString().slice(-6)}`;
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const nowStr = new Date(nowMs).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const firstFile = validatedFiles[0];
  const description =
    (params.description || '').trim() ||
    `Conjunto com ${validatedFiles.length} imagens enviadas: ${validatedFiles
      .map((f) => f.safeDisplayName)
      .join(', ')}`;

  const missionTrackKey = missionRow.track_id ? String(missionRow.track_id) : 'default';
  const allowSharedEvidence = Boolean(missionRow.allow_shared_evidence);

  targetDb.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    // 1. Bloqueio sequencial dentro da trilha
    if (isOfficial && Number(missionRow.sequence_order) > 1) {
      const seqOrder = Number(missionRow.sequence_order);
      const prevMission = targetDb
        .prepare(
          "SELECT id, title FROM missions WHERE COALESCE(track_id, 'default') = ? AND sequence_order = ? AND active = 1 LIMIT 1"
        )
        .get(missionTrackKey, seqOrder - 1) as { id: string; title: string } | undefined;

      if (prevMission) {
        const prevCompleteTx = findActiveTransactionByEventKeys(
          params.participantId,
          [
            `COMPLETE:${params.participantId}:${prevMission.id}`,
            `COMPLETE:${params.participantId}:${prevMission.id}:POST_SIM_REV`,
          ],
          targetDb
        );
        const prevPm = targetDb
          .prepare(
            'SELECT status FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1'
          )
          .get(params.participantId, prevMission.id) as { status: string } | undefined;

        if (!prevCompleteTx && (!prevPm || prevPm.status !== 'Concluída')) {
          targetDb.exec('ROLLBACK;');
          cleanupWrittenFiles();
          return {
            ok: false,
            httpStatus: 403,
            code: 'MISSION_LOCKED',
            error: `Bloqueio sequencial: conclua a etapa 0${seqOrder - 1} antes de enviar evidências desta missão.`,
          };
        }
      }
    }

    // 2. Impede envio duplicado da mesma missão
    const existingCompleteTx = findActiveTransactionByEventKeys(
      params.participantId,
      [
        `COMPLETE:${params.participantId}:${params.missionId}`,
        `COMPLETE:${params.participantId}:${params.missionId}:POST_SIM_REV`,
      ],
      targetDb
    );
    const existingPm = targetDb
      .prepare(
        'SELECT status, started_at_ms, target_end_at_ms FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1'
      )
      .get(params.participantId, params.missionId) as
      | { status: string; started_at_ms: number | null; target_end_at_ms: number | null }
      | undefined;
    const existingSubmission = targetDb
      .prepare(
        "SELECT id, status FROM mission_completions WHERE participant_id = ? AND mission_id = ? AND status IN ('Pendente', 'Aprovada') LIMIT 1"
      )
      .get(params.participantId, params.missionId) as { id: string; status: string } | undefined;

    if (
      existingCompleteTx ||
      (existingPm && existingPm.status === 'Concluída') ||
      existingSubmission
    ) {
      targetDb.exec('ROLLBACK;');
      cleanupWrittenFiles();
      return {
        ok: false,
        httpStatus: 409,
        code: 'EVIDENCE_ALREADY_SUBMITTED',
        error:
          existingSubmission?.status === 'Pendente'
            ? 'Você já enviou evidências para esta missão e elas estão aguardando conferência.'
            : 'Esta missão já foi concluída anteriormente.',
      };
    }

    // 3. Cronômetro é critério exclusivo de bônus de velocidade (calculado em completeSequentialMissionInSql);
    // a expiração zera o bônus, mas não impede envio, conclusão ou desbloqueio.

    // 4. Proteção anti-duplicidade SHA-256 para cada uma das 3 imagens (tabela pai e tabela filha)
    for (let i = 0; i < validatedFiles.length; i += 1) {
      const vf = validatedFiles[i];

      const sameParticipantReuse = (targetDb
        .prepare(
          `SELECT id, mission_id, mission_title
           FROM mission_completions
           WHERE evidence_sha256 = ?
             AND participant_id = ?
             AND status IN ('Pendente', 'Aprovada')
           LIMIT 1`
        )
        .get(vf.sha256, params.participantId) ||
        targetDb
          .prepare(
            `SELECT mc.id, mc.mission_id, mc.mission_title
             FROM mission_completion_files mcf
             INNER JOIN mission_completions mc ON mc.id = mcf.completion_id
             WHERE mcf.sha256 = ?
               AND mc.participant_id = ?
               AND mc.status IN ('Pendente', 'Aprovada')
             LIMIT 1`
          )
          .get(vf.sha256, params.participantId)) as
        | { id: string; mission_id: string; mission_title: string }
        | undefined;

      if (sameParticipantReuse) {
        targetDb.exec('ROLLBACK;');
        cleanupWrittenFiles();
        return {
          ok: false,
          httpStatus: 409,
          code: 'DUPLICATE_EVIDENCE_FILE',
          error: `A imagem ${i + 1} já foi utilizada por você na missão "${sameParticipantReuse.mission_title}". Envie evidências inéditas.`,
        };
      }

      const otherParticipantReuse = (targetDb
        .prepare(
          `SELECT id, mission_id, mission_title, participant_id
           FROM mission_completions
           WHERE evidence_sha256 = ?
             AND participant_id != ?
             AND status IN ('Pendente', 'Aprovada')
           LIMIT 1`
        )
        .get(vf.sha256, params.participantId) ||
        targetDb
          .prepare(
            `SELECT mc.id, mc.mission_id, mc.mission_title, mc.participant_id
             FROM mission_completion_files mcf
             INNER JOIN mission_completions mc ON mc.id = mcf.completion_id
             WHERE mcf.sha256 = ?
               AND mc.participant_id != ?
               AND mc.status IN ('Pendente', 'Aprovada')
             LIMIT 1`
          )
          .get(vf.sha256, params.participantId)) as
        | { id: string; mission_id: string; mission_title: string; participant_id: string }
        | undefined;

      if (otherParticipantReuse) {
        const isAllowedCollectivePhoto =
          allowSharedEvidence && otherParticipantReuse.mission_id === String(missionRow.id);
        if (!isAllowedCollectivePhoto) {
          targetDb.exec('ROLLBACK;');
          cleanupWrittenFiles();
          return {
            ok: false,
            httpStatus: 409,
            code: 'DUPLICATE_EVIDENCE_FILE',
            error: `A imagem ${i + 1} já foi enviada anteriormente em outra submissão. Utilize registros inéditos.`,
          };
        }
      }
    }

    // 5. Insere UMA única conclusão em mission_completions espelhando a 1ª imagem nas colunas legadas
    targetDb
      .prepare(`
        INSERT INTO mission_completions (
          id, participant_id, participant_name, mission_id, mission_title,
          startup_id, startup_name, submitted_at, evidence_description,
          evidence_code, evidence_file_name, evidence_stored_name,
          evidence_mime_type, evidence_size_bytes, evidence_sha256,
          evidence_duration_seconds, points_awarded, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendente')
      `)
      .run(
        newId,
        params.participantId,
        params.participantName,
        String(missionRow.id),
        String(missionRow.title),
        String(missionRow.startup_id),
        String(missionRow.startup_name),
        nowStr,
        description,
        evidenceCode,
        firstFile.safeDisplayName,
        firstFile.storedName,
        firstFile.mimeType,
        firstFile.sizeBytes,
        firstFile.sha256,
        firstFile.durationSeconds,
        completionPoints
      );

    // 6. Insere os 3 registros na tabela filha mission_completion_files
    const insertChildStmt = targetDb.prepare(`
      INSERT INTO mission_completion_files (
        id, completion_id, file_order, file_name, stored_name,
        mime_type, size_bytes, sha256, duration_seconds, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < validatedFiles.length; i += 1) {
      const vf = validatedFiles[i];
      const childId = `evf-${nowMs}-${i + 1}-${Math.random().toString(36).slice(2, 6)}`;
      insertChildStmt.run(
        childId,
        newId,
        i + 1,
        vf.safeDisplayName,
        vf.storedName,
        vf.mimeType,
        vf.sizeBytes,
        vf.sha256,
        vf.durationSeconds,
        nowIso
      );
    }

    // 7. Registra conclusão única e credita pontos imediatos uma única vez
    if (isOfficial) {
      const frozenElapsed = existingPm?.started_at_ms
        ? Math.max(0, Math.round((nowMs - Number(existingPm.started_at_ms)) / 1000))
        : 0;
      targetDb
        .prepare(
          `UPDATE participant_missions
           SET status = 'Em andamento',
               submitted_at_ms = ?,
               elapsed_seconds = ?
           WHERE participant_id = ? AND mission_id = ?`
        )
        .run(nowMs, frozenElapsed, params.participantId, String(missionRow.id));

      const seqResult = completeSequentialMissionInSql({
        participantId: params.participantId,
        missionId: String(missionRow.id),
        sourceType: 'Missão',
        useExistingTransaction: true,
        targetDb,
        sourceCompletionId: newId,
      });

      if (!seqResult.ok) {
        targetDb.exec('ROLLBACK;');
        cleanupWrittenFiles();
        return {
          ok: false,
          httpStatus: seqResult.httpStatus,
          code: seqResult.status,
          error: seqResult.message,
        };
      }

      targetDb
        .prepare('UPDATE mission_completions SET points_awarded = ? WHERE id = ?')
        .run(seqResult.missionPointsAwarded, newId);
    } else {
      const extraRes = completeExtraMissionInExistingTx({
        targetDb,
        participantId: params.participantId,
        missionRow,
        sourceCompletionId: newId,
        nowMs,
      });
      if (!extraRes.ok) {
        targetDb.exec('ROLLBACK;');
        cleanupWrittenFiles();
        return {
          ok: false,
          httpStatus: extraRes.httpStatus,
          code: 'EXTRA_MISSION_ERROR',
          error: extraRes.error,
        };
      }
      targetDb
        .prepare('UPDATE mission_completions SET points_awarded = ? WHERE id = ?')
        .run(extraRes.pointsAwarded, newId);
    }

    targetDb.exec('COMMIT;');
  } catch (err: any) {
    try {
      targetDb.exec('ROLLBACK;');
    } catch {
      // transação já revertida
    }
    cleanupWrittenFiles();
    if (String(err?.message || '').includes('UNIQUE constraint failed')) {
      return {
        ok: false,
        httpStatus: 409,
        code: 'EVIDENCE_ALREADY_SUBMITTED',
        error: 'Você já possui uma evidência ativa ou aprovada para esta missão.',
      };
    }
    throw err;
  }

  if (targetDb === db) {
    recalculateRankingsInDb();
  }
  revalidateActiveHomologationsInDb(
    targetDb,
    'Novo envio em lote de evidências com pontuação contabilizada'
  );

  const created = targetDb
    .prepare('SELECT * FROM mission_completions WHERE id = ?')
    .get(newId) as Record<string, unknown>;
  const filesMap = getEvidenceFilesForCompletions([newId], targetDb);

  return {
    ok: true,
    httpStatus: 201,
    validation: mapValidationRow(created, filesMap.get(newId)),
  };
}

const evidenceBatchMultipartMiddleware = express.raw({
  type: 'multipart/form-data',
  limit: '20mb',
});

app.post(
  '/api/evidences/upload-batch',
  evidenceUploadRateLimiter,
  (req, res, next) => {
    evidenceBatchMultipartMiddleware(req, res, (err?: any) => {
      if (err) {
        if (err.type === 'entity.too.large' || err.status === 413 || err.statusCode === 413) {
          res.status(413).json({
            error: 'O conjunto de arquivos excede o limite máximo permitido (5 MB por imagem).',
            code: 'FILE_TOO_LARGE',
          });
          return;
        }
        res.status(400).json({
          error: 'Falha ao processar os arquivos enviados.',
          code: 'INVALID_UPLOAD_PAYLOAD',
        });
        return;
      }
      next();
    });
  },
  async (req, res) => {
    const session = resolveSessionFromRequest(req);
    if (!session) {
      res.status(401).json({
        error: 'Não autenticado. Faça login para enviar evidências.',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    if (session.role !== 'PARTICIPANT') {
      res.status(403).json({
        error: 'Apenas participantes autenticados podem enviar evidências de missões.',
        code: 'PARTICIPANT_ROLE_REQUIRED',
      });
      return;
    }

    const participantRow = db
      .prepare("SELECT * FROM participants WHERE id = ? AND UPPER(role) = 'PARTICIPANT' LIMIT 1")
      .get(session.userId) as Record<string, unknown> | undefined;

    if (!participantRow) {
      res.status(401).json({
        error: 'Sessão de participante inválida ou expirada.',
        code: 'AUTH_REQUIRED',
      });
      return;
    }

    const currentParticipant = mapParticipantRow(participantRow);

    const eligibility = assertParticipantEligibleForCompetition(db, currentParticipant.id);
    if (!eligibility.ok) {
      res.status(eligibility.httpStatus).json({
        error: eligibility.error,
        code: eligibility.code,
      });
      return;
    }

    const headerParticipantId = String(req.headers['x-participant-id'] || '').trim();
    if (headerParticipantId && headerParticipantId !== currentParticipant.id) {
      res.status(403).json({
        error: 'Operação negada: não é permitido enviar evidências em nome de outro participante.',
        code: 'FORBIDDEN_PARTICIPANT_MISMATCH',
      });
      return;
    }

    const contentType = String(req.headers['content-type'] || '');
    if (!contentType.toLowerCase().includes('multipart/form-data') || !Buffer.isBuffer(req.body)) {
      res.status(400).json({
        error: 'Envio inválido: utilize multipart/form-data com as 3 imagens.',
        code: 'INVALID_MULTIPART_PAYLOAD',
      });
      return;
    }

    let formData: FormData;
    try {
      const parseReq = new Request('http://localhost/api/evidences/upload-batch', {
        method: 'POST',
        headers: { 'content-type': contentType },
        body: new Uint8Array(req.body),
      });
      formData = await parseReq.formData();
    } catch {
      res.status(400).json({
        error: 'Não foi possível ler os arquivos do formulário multipart.',
        code: 'INVALID_MULTIPART_PAYLOAD',
      });
      return;
    }

    const missionId = String(
      formData.get('missionId') || req.headers['x-mission-id'] || ''
    ).trim();
    const description = String(formData.get('description') || '').trim();

    const rawEntries = [
      ...formData.getAll('files'),
      ...formData.getAll('files[]'),
      ...formData.getAll('file'),
    ];
    const parsedFiles: Array<{
      buffer: Buffer;
      originalName: string;
      declaredMimeType: string;
    }> = [];

    for (const entry of rawEntries) {
      if (entry && typeof entry !== 'string' && typeof (entry as Blob).arrayBuffer === 'function') {
        const fileObj = entry as File;
        const arrBuf = await fileObj.arrayBuffer();
        parsedFiles.push({
          buffer: Buffer.from(arrBuf),
          originalName: fileObj.name || `imagem-${parsedFiles.length + 1}.jpg`,
          declaredMimeType: fileObj.type || 'application/octet-stream',
        });
      }
    }

    const result = submitEvidenceBatchInDb(db, {
      participantId: currentParticipant.id,
      participantName: currentParticipant.name,
      missionId,
      files: parsedFiles,
      description,
    });

    if (!result.ok) {
      res.status(result.httpStatus).json({
        error: result.error,
        code: result.code,
      });
      return;
    }

    res.status(201).json({
      ok: true,
      validation: result.validation,
      message:
        'As 3 evidências foram registradas com sucesso em uma única conclusão. Pontuação contabilizada e missão concluída (sujeita à conferência final).',
    });
  }
);

app.get('/api/evidences/me', (req, res) => {
  const session = resolveSessionFromRequest(req);
  if (!session) {
    res.status(401).json({
      error: 'Não autenticado. Faça login para consultar suas evidências.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  const rows = db
    .prepare('SELECT * FROM mission_completions WHERE participant_id = ? ORDER BY rowid DESC')
    .all(session.userId) as Record<string, unknown>[];
  const filesMap = getEvidenceFilesForCompletions(rows.map((r) => String(r.id)));
  res.json(rows.map((r) => mapValidationRow(r, filesMap.get(String(r.id)))));
});

app.get('/api/evidences/:id/file', (req, res) => {
  const session = resolveSessionFromRequest(req);
  if (!session) {
    res.status(401).json({
      error: 'Não autenticado. Faça login para acessar evidências.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  const { id } = req.params;
  const row = db
    .prepare('SELECT * FROM mission_completions WHERE id = ? LIMIT 1')
    .get(id) as Record<string, unknown> | undefined;

  if (!row || !row.evidence_stored_name) {
    res.status(404).json({
      error: 'Arquivo de evidência não encontrado.',
      code: 'EVIDENCE_FILE_NOT_FOUND',
    });
    return;
  }

  const isOwner = String(row.participant_id) === session.userId;
  const isAdminUser = session.role === 'ADMIN';
  if (!isOwner && !isAdminUser) {
    res.status(403).json({
      error: 'Acesso negado: você só pode consultar suas próprias evidências.',
      code: 'FORBIDDEN_EVIDENCE_ACCESS',
    });
    return;
  }

  try {
    const filePath = resolveSafeEvidenceFilePath(String(row.evidence_stored_name));
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        error: 'Arquivo físico de evidência não encontrado no servidor.',
        code: 'EVIDENCE_FILE_MISSING',
      });
      return;
    }

    const mimeType = String(row.evidence_mime_type || 'application/octet-stream');
    const rawDisplayName = String(row.evidence_file_name || 'evidencia')
      .replace(/[\r\n\x00-\x1f\x7f]+/g, '_')
      .trim() || 'evidencia';
    const asciiFallback =
      rawDisplayName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7e]/g, '_')
        .replace(/["\\;]/g, '_')
        .trim() || 'evidencia';
    const encodedUtf8 = encodeURIComponent(rawDisplayName).replace(
      /['()*]/g,
      (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
    );
    const isPdf = mimeType === 'application/pdf';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader(
      'Content-Disposition',
      `${isPdf ? 'attachment' : 'inline'}; filename="${asciiFallback}"; filename*=UTF-8''${encodedUtf8}`
    );
    res.sendFile(filePath);
  } catch {
    res.status(400).json({
      error: 'Referência de arquivo inválida.',
      code: 'INVALID_EVIDENCE_REFERENCE',
    });
  }
});

app.get('/api/evidences/:id/files/:fileId', (req, res) => {
  const session = resolveSessionFromRequest(req);
  if (!session) {
    res.status(401).json({
      error: 'Não autenticado. Faça login para acessar evidências.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  const { id, fileId } = req.params;
  const row = db
    .prepare(
      `SELECT mcf.id, mcf.completion_id, mcf.file_name, mcf.stored_name, mcf.mime_type,
              mc.participant_id
       FROM mission_completion_files mcf
       INNER JOIN mission_completions mc ON mc.id = mcf.completion_id
       WHERE mcf.completion_id = ? AND mcf.id = ?
       LIMIT 1`
    )
    .get(id, fileId) as Record<string, unknown> | undefined;

  if (!row || !row.stored_name) {
    res.status(404).json({
      error: 'Arquivo de evidência não encontrado.',
      code: 'EVIDENCE_FILE_NOT_FOUND',
    });
    return;
  }

  const isOwner = String(row.participant_id) === session.userId;
  const isAdminUser = session.role === 'ADMIN';
  if (!isOwner && !isAdminUser) {
    res.status(403).json({
      error: 'Acesso negado: você só pode consultar suas próprias evidências.',
      code: 'FORBIDDEN_EVIDENCE_ACCESS',
    });
    return;
  }

  try {
    const filePath = resolveSafeEvidenceFilePath(String(row.stored_name));
    if (!fs.existsSync(filePath)) {
      res.status(404).json({
        error: 'Arquivo físico de evidência não encontrado no servidor.',
        code: 'EVIDENCE_FILE_MISSING',
      });
      return;
    }

    const mimeType = String(row.mime_type || 'application/octet-stream');
    const rawDisplayName =
      String(row.file_name || 'evidencia')
        .replace(/[\r\n\x00-\x1f\x7f]+/g, '_')
        .trim() || 'evidencia';
    const asciiFallback =
      rawDisplayName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\x20-\x7e]/g, '_')
        .replace(/["\\;]/g, '_')
        .trim() || 'evidencia';
    const encodedUtf8 = encodeURIComponent(rawDisplayName).replace(
      /['()*]/g,
      (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
    );
    const isPdf = mimeType === 'application/pdf';

    res.setHeader('Content-Type', mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader(
      'Content-Disposition',
      `${isPdf ? 'attachment' : 'inline'}; filename="${asciiFallback}"; filename*=UTF-8''${encodedUtf8}`
    );
    res.sendFile(filePath);
  } catch {
    res.status(400).json({
      error: 'Referência de arquivo inválida.',
      code: 'INVALID_EVIDENCE_REFERENCE',
    });
  }
});

function getEnrichedAdminValidations() {
  const rows = db
    .prepare(`
      SELECT mc.*,
             m.track_id AS track_id,
             p.image_publicity_consent AS participant_image_consent,
             p.image_publicity_consent_version AS participant_image_consent_version,
             CASE
               WHEN mc.evidence_sha256 IS NOT NULL THEN (
                 SELECT COUNT(DISTINCT mc2.participant_id)
                 FROM mission_completions mc2
                 WHERE mc2.evidence_sha256 = mc.evidence_sha256
                   AND mc2.mission_id = mc.mission_id
                   AND mc2.status IN ('Pendente', 'Aprovada')
               )
               ELSE 0
             END AS shared_evidence_count
      FROM mission_completions mc
      LEFT JOIN participants p ON p.id = mc.participant_id
      LEFT JOIN missions m ON m.id = mc.mission_id
      ORDER BY mc.rowid DESC
    `)
    .all() as Record<string, unknown>[];

  const filesMap = getEvidenceFilesForCompletions(rows.map((r) => String(r.id)));

  return rows.map((r) => ({
    ...mapValidationRow(r, filesMap.get(String(r.id))),
    sharedEvidenceCount: Number(r.shared_evidence_count || 0),
    participantImageConsent: Boolean(r.participant_image_consent),
    participantImageConsentVersion: r.participant_image_consent_version
      ? String(r.participant_image_consent_version)
      : null,
  }));
}

app.get('/api/validations', requireAdmin, (_req, res) => {
  res.json(getEnrichedAdminValidations());
});

app.post('/api/validations', (req, res) => {
  const session = resolveSessionFromRequest(req);
  if (!session) {
    res.status(401).json({
      error: 'Não autenticado. Faça login para enviar validações.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  if (session.role !== 'PARTICIPANT') {
    res.status(403).json({
      error: 'Apenas participantes autenticados podem enviar submissões de validação.',
      code: 'PARTICIPANT_ROLE_REQUIRED',
    });
    return;
  }

  const participantRow = db
    .prepare("SELECT * FROM participants WHERE id = ? AND UPPER(role) = 'PARTICIPANT' LIMIT 1")
    .get(session.userId) as Record<string, unknown> | undefined;

  if (!participantRow) {
    res.status(401).json({
      error: 'Sessão de participante inválida.',
      code: 'AUTH_REQUIRED',
    });
    return;
  }

  const currentParticipant = mapParticipantRow(participantRow);

  const eligibility = assertParticipantEligibleForCompetition(db, currentParticipant.id);
  if (!eligibility.ok) {
    res.status(eligibility.httpStatus).json({
      error: eligibility.error,
      code: eligibility.code,
    });
    return;
  }

  const p = (req.body || {}) as Record<string, unknown>;

  if (
    p.participantId !== undefined &&
    p.participantId !== null &&
    String(p.participantId).trim() !== '' &&
    String(p.participantId) !== currentParticipant.id
  ) {
    res.status(403).json({
      error: 'Operação negada: não é permitido enviar validações em nome de outro participante.',
      code: 'FORBIDDEN_PARTICIPANT_MISMATCH',
    });
    return;
  }

  const targetParticipantId = currentParticipant.id;
  const missionId = String(p.missionId || '').trim();

  ensureParticipantFirstMissionUnlockedInDb(targetParticipantId);

  const missionRow = db
    .prepare('SELECT * FROM missions WHERE id = ? AND active = 1 LIMIT 1')
    .get(missionId) as Record<string, unknown> | undefined;

  if (!missionRow) {
    res.status(404).json({ error: 'Missão não encontrada ou inativa.' });
    return;
  }

  const evType = String(missionRow.evidence_type || '').toLowerCase();
  if (Boolean(missionRow.requires_evidence) && evType !== 'text') {
    res.status(400).json({
      error: `A missão "${missionRow.title}" exige o envio de arquivo de evidência pela rota oficial de upload.`,
      status: 'EVIDENCE_REQUIRED',
      code: 'EVIDENCE_REQUIRED',
    });
    return;
  }

  const rawTextEvidence = String(p.evidenceDescription || '').trim();
  if (evType === 'text' && rawTextEvidence.length < 5) {
    res.status(400).json({
      error: 'Escreva uma resposta em texto válida (mínimo de 5 caracteres) para concluir esta missão.',
      code: 'TEXT_EVIDENCE_REQUIRED',
    });
    return;
  }

  const isOfficial = missionRow.sequence_order !== null && missionRow.sequence_order !== undefined;
  const missionTrackKey = missionRow.track_id ? String(missionRow.track_id) : 'default';
  let completionPoints = 0;

  if (isOfficial) {
    const rawComp = missionRow.completion_points;
    if (
      rawComp === null ||
      rawComp === undefined ||
      !Number.isInteger(Number(rawComp)) ||
      Number(rawComp) <= 0
    ) {
      res.status(500).json({
        error: `A missão oficial "${missionRow.title}" não possui completion_points dinâmico válido no banco.`,
        code: 'INVALID_CIRCUIT_SCORING',
      });
      return;
    }
    completionPoints = Number(rawComp);
  } else {
    completionPoints = Number(missionRow.points || 0);
  }

  const newId = `val-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const nowMs = Date.now();
  const nowStr = new Date(nowMs).toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const evidenceDescription = rawTextEvidence || 'Registro enviado para validação';
  const evidenceCode = String(p.evidenceCode || `EV-${Date.now().toString().slice(-6)}`).trim();

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    if (isOfficial && Number(missionRow.sequence_order) > 1) {
      const seqOrder = Number(missionRow.sequence_order);
      const prevMission = db
        .prepare(
          "SELECT id, title FROM missions WHERE COALESCE(track_id, 'default') = ? AND sequence_order = ? AND active = 1 LIMIT 1"
        )
        .get(missionTrackKey, seqOrder - 1) as { id: string; title: string } | undefined;

      if (prevMission) {
        const prevCompleteTx = findActiveTransactionByEventKeys(targetParticipantId, [
          `COMPLETE:${targetParticipantId}:${prevMission.id}`,
          `COMPLETE:${targetParticipantId}:${prevMission.id}:POST_SIM_REV`,
        ]);
        const prevPm = db
          .prepare(
            'SELECT status FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1'
          )
          .get(targetParticipantId, prevMission.id) as { status: string } | undefined;

        if (!prevCompleteTx && (!prevPm || prevPm.status !== 'Concluída')) {
          db.exec('ROLLBACK;');
          res.status(403).json({
            error: `Bloqueio sequencial: conclua e aguarde a aprovação da Missão 0${seqOrder - 1} antes de enviar evidências desta missão.`,
            code: 'MISSION_LOCKED',
          });
          return;
        }
      }
    }

    const existingCompleteTx = findActiveTransactionByEventKeys(targetParticipantId, [
      `COMPLETE:${targetParticipantId}:${missionId}`,
      `COMPLETE:${targetParticipantId}:${missionId}:POST_SIM_REV`,
    ]);
    const existingPm = db
      .prepare(
        'SELECT status, started_at_ms, target_end_at_ms FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1'
      )
      .get(targetParticipantId, missionId) as
      | { status: string; started_at_ms: number | null; target_end_at_ms: number | null }
      | undefined;
    const existingSubmission = db
      .prepare(
        "SELECT id, status FROM mission_completions WHERE participant_id = ? AND mission_id = ? AND status IN ('Pendente', 'Aprovada') LIMIT 1"
      )
      .get(targetParticipantId, missionId) as { id: string; status: string } | undefined;

    if (
      existingCompleteTx ||
      (existingPm && existingPm.status === 'Concluída') ||
      existingSubmission
    ) {
      db.exec('ROLLBACK;');
      res.status(409).json({
        error:
          existingSubmission?.status === 'Pendente'
            ? 'Você já possui uma validação pendente para esta missão.'
            : 'Esta missão já foi concluída e validada anteriormente.',
        code: 'EVIDENCE_ALREADY_SUBMITTED',
      });
      return;
    }

    // Cronômetro é critério exclusivo de bônus de velocidade (calculado em completeSequentialMissionInSql);
    // a expiração zera o bônus, mas não impede envio, conclusão ou desbloqueio.

    db.prepare(`
      INSERT INTO mission_completions (
        id, participant_id, participant_name, mission_id, mission_title,
        startup_id, startup_name, submitted_at, evidence_description,
        evidence_code, points_awarded, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendente')
    `).run(
      newId,
      targetParticipantId,
      currentParticipant.name,
      String(missionRow.id),
      String(missionRow.title),
      String(missionRow.startup_id),
      String(missionRow.startup_name),
      nowStr,
      evidenceDescription,
      evidenceCode,
      completionPoints
    );

    if (isOfficial) {
      const frozenElapsed = existingPm?.started_at_ms
        ? Math.max(0, Math.round((nowMs - Number(existingPm.started_at_ms)) / 1000))
        : 0;
      db.prepare(
        `UPDATE participant_missions
         SET status = 'Em andamento',
             submitted_at_ms = ?,
             elapsed_seconds = ?
         WHERE participant_id = ? AND mission_id = ?`
      ).run(nowMs, frozenElapsed, targetParticipantId, String(missionRow.id));

      const seqResult = completeSequentialMissionInSql({
        participantId: targetParticipantId,
        missionId: String(missionRow.id),
        sourceType: 'Missão',
        useExistingTransaction: true,
        targetDb: db,
        sourceCompletionId: newId,
      });

      if (!seqResult.ok) {
        db.exec('ROLLBACK;');
        res.status(seqResult.httpStatus).json({
          error: seqResult.message,
          code: seqResult.status,
        });
        return;
      }

      db.prepare('UPDATE mission_completions SET points_awarded = ? WHERE id = ?').run(
        seqResult.missionPointsAwarded,
        newId
      );
    } else {
      const extraRes = completeExtraMissionInExistingTx({
        targetDb: db,
        participantId: targetParticipantId,
        missionRow,
        sourceCompletionId: newId,
        nowMs,
      });
      if (!extraRes.ok) {
        db.exec('ROLLBACK;');
        res.status(extraRes.httpStatus).json({ error: extraRes.error });
        return;
      }
      db.prepare('UPDATE mission_completions SET points_awarded = ? WHERE id = ?').run(
        extraRes.pointsAwarded,
        newId
      );
    }
    db.exec('COMMIT;');
  } catch (err: any) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // transação já revertida
    }
    if (String(err?.message || '').includes('UNIQUE constraint failed')) {
      res.status(409).json({
        error: 'Você já possui uma validação ativa ou aprovada para esta missão.',
        code: 'EVIDENCE_ALREADY_SUBMITTED',
      });
      return;
    }
    throw err;
  }

  recalculateRankingsInDb();
  revalidateActiveHomologationsInDb(db, 'Novo envio de evidência em texto com pontuação contabilizada');

  const created = db
    .prepare('SELECT * FROM mission_completions WHERE id = ?')
    .get(newId) as Record<string, unknown>;
  res.status(201).json(mapValidationRow(created));
});

app.patch('/api/validations/:id/review', requireAdmin, (req: RequestWithAuth, res) => {
  const { id } = req.params;
  const { decision, rejectionReason } = (req.body || {}) as {
    decision?: 'Aprovada' | 'Rejeitada';
    rejectionReason?: string;
  };
  const normalizedRejectionReason =
    typeof rejectionReason === 'string' && rejectionReason.trim().length > 0
      ? rejectionReason.trim().slice(0, 500)
      : null;

  if (decision !== 'Aprovada' && decision !== 'Rejeitada') {
    res.status(400).json({
      error: 'Decisão inválida. Utilize "Aprovada" ou "Rejeitada".',
      code: 'INVALID_DECISION',
    });
    return;
  }

  if (decision === 'Rejeitada' && !normalizedRejectionReason) {
    res.status(400).json({
      error: 'Justificativa administrativa obrigatória para rejeitar e estornar uma evidência.',
      code: 'REJECTION_REASON_REQUIRED',
    });
    return;
  }

  const adminReviewer = req.authSession?.email || req.authSession?.userId || 'admin';
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const nowBrStr = new Date(nowMs).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const row = db
    .prepare('SELECT * FROM mission_completions WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Item de validação não encontrado' });
    return;
  }

  const item = mapValidationRow(row);

  if (decision === 'Aprovada') {
    if (item.status === 'Aprovada') {
      res.status(409).json({
        error: 'Esta evidência já foi conferida e aprovada anteriormente.',
        code: 'VALIDATION_ALREADY_APPROVED',
      });
      return;
    }
    if (item.status === 'Rejeitada') {
      res.status(409).json({
        error: 'Esta evidência já foi rejeitada e estornada e não pode ser aprovada.',
        code: 'VALIDATION_ALREADY_REJECTED',
      });
      return;
    }

    // Conferência final (homologação da evidência): NÃO executa motor de pontuação novamente
    // e NÃO gera transações adicionais — preserva a pontuação já contabilizada no envio.
    const claimResult = db
      .prepare(
        `UPDATE mission_completions
         SET status = 'Aprovada',
             reviewed_by = ?,
             reviewed_at = ?
         WHERE id = ? AND status = 'Pendente'`
      )
      .run(adminReviewer, nowIso, id);

    if (Number(claimResult.changes) === 0) {
      res.status(409).json({
        error: 'Este item de conferência já foi revisado anteriormente.',
        code: 'VALIDATION_ALREADY_REVIEWED',
      });
      return;
    }

    revalidateActiveHomologationsInDb(db, `Conferência administrativa aprovada (${item.missionTitle})`);
    res.json(getEnrichedAdminValidations());
    return;
  }

  // decision === 'Rejeitada' -> Estorno cirúrgico, atômico, idempotente e contabilmente consistente
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const lockedRow = db
      .prepare('SELECT * FROM mission_completions WHERE id = ? LIMIT 1')
      .get(id) as Record<string, unknown> | undefined;

    if (!lockedRow) {
      db.exec('ROLLBACK;');
      res.status(404).json({ error: 'Item de validação não encontrado.' });
      return;
    }

    if (String(lockedRow.status) === 'Rejeitada' || lockedRow.reversed_at) {
      db.exec('ROLLBACK;');
      res.status(409).json({
        error: 'Esta evidência já foi rejeitada e estornada anteriormente.',
        code: 'VALIDATION_ALREADY_REJECTED',
      });
      return;
    }

    const participantRow = db
      .prepare('SELECT * FROM participants WHERE id = ? LIMIT 1')
      .get(item.participantId) as Record<string, unknown> | undefined;

    if (!participantRow) {
      db.exec('ROLLBACK;');
      res.status(404).json({ error: 'Participante associado não encontrado.' });
      return;
    }

    const missionRow = db
      .prepare('SELECT id, title, sequence_order FROM missions WHERE id = ? LIMIT 1')
      .get(item.missionId) as { id: string; title: string; sequence_order: number | null } | undefined;

    // 1. Identifica exclusivamente as transações positivas originadas desta evidência
    let targetTxs = db
      .prepare(
        `SELECT id, source_type, source_title, points_delta, event_key, mission_id
         FROM points_transactions
         WHERE participant_id = ?
           AND source_completion_id = ?
           AND points_delta > 0
           AND source_type IN ('Missão', 'QR Code')
         ORDER BY rowid ASC`
      )
      .all(item.participantId, id) as Array<{
      id: string;
      source_type: string;
      source_title: string;
      points_delta: number;
      event_key: string | null;
      mission_id: string | null;
    }>;

    // Fallback estrito apenas para registros legados anteriores à coluna source_completion_id
    if (targetTxs.length === 0) {
      const isSeqOne = missionRow?.sequence_order === 1;
      const legacyCandidates = db
        .prepare(
          `SELECT id, source_type, source_title, points_delta, event_key, mission_id
           FROM points_transactions
           WHERE participant_id = ?
             AND mission_id = ?
             AND points_delta > 0
             AND source_type IN ('Missão', 'QR Code')
           ORDER BY rowid ASC`
        )
        .all(item.participantId, item.missionId) as Array<{
        id: string;
        source_type: string;
        source_title: string;
        points_delta: number;
        event_key: string | null;
        mission_id: string | null;
      }>;

      targetTxs = legacyCandidates.filter((tx) => {
        const key = String(tx.event_key || '');
        if (key.startsWith('COMPLETE:') || key.startsWith('SPEED_BONUS:')) return true;
        if (isSeqOne && (key.startsWith('UNLOCK:') || key.startsWith('UNLOCK_VALIDATED:'))) {
          return true;
        }
        return false;
      });
    }

    let runningBalance = Math.max(0, Number(participantRow.points || 0));
    let totalEffectiveReversed = 0;
    let reversedCompletionCount = 0;

    for (const origTx of targetTxs) {
      const reversalEventKey = `REVERSAL_EVIDENCE:${id}:${origTx.id}`;
      const alreadyReversed = db
        .prepare('SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1')
        .get(reversalEventKey) as { id: string } | undefined;

      if (alreadyReversed) continue;

      const origPoints = Math.max(0, Math.trunc(Number(origTx.points_delta || 0)));
      if (origPoints <= 0) continue;

      // Encadeamento contábil exato: participants.points === new_balance === SUM(points_delta)
      const effectiveDelta = Math.max(-origPoints, -runningBalance);
      const previousBalance = runningBalance;
      const newBalance = previousBalance + effectiveDelta;
      runningBalance = newBalance;

      if (effectiveDelta < 0) {
        totalEffectiveReversed += Math.abs(effectiveDelta);
      }

      if (String(origTx.event_key || '').startsWith('COMPLETE:')) {
        reversedCompletionCount = 1;
      }

      const revTxId = `tx-rev-${nowMs}-${Math.random().toString(36).slice(2, 7)}`;
      db.prepare(
        `INSERT INTO points_transactions (
           id, participant_id, participant_name, source_type, source_title,
           points_delta, previous_balance, new_balance, created_at, created_at_ms,
           event_key, mission_id, source_completion_id
         ) VALUES (?, ?, ?, 'Ajuste Administrativo', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).run(
        revTxId,
        item.participantId,
        String(participantRow.name),
        `Estorno de evidência irregular (${item.missionTitle}): ${normalizedRejectionReason}`,
        effectiveDelta,
        previousBalance,
        newBalance,
        nowBrStr,
        nowMs,
        reversalEventKey,
        origTx.mission_id || item.missionId,
        id
      );
    }

    const updatedCompletedCount = Math.max(
      0,
      Number(participantRow.completed_missions_count || 0) - reversedCompletionCount
    );

    db.prepare(
      `UPDATE participants
       SET points = ?,
           completed_missions_count = ?
       WHERE id = ?`
    ).run(runningBalance, updatedCompletedCount, item.participantId);

    db.prepare(
      `UPDATE mission_completions
       SET status = 'Rejeitada',
           rejection_reason = ?,
           reviewed_by = ?,
           reviewed_at = ?,
           reversed_points = ?,
           reversed_at = ?
       WHERE id = ?`
    ).run(
      normalizedRejectionReason,
      adminReviewer,
      nowIso,
      totalEffectiveReversed,
      nowIso,
      id
    );

    db.exec('COMMIT;');
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // transação já revertida
    }
    throw err;
  }

  recalculateRankingsInDb();
  revalidateActiveHomologationsInDb(
    db,
    `Estorno administrativo de evidência irregular (${item.missionTitle})`
  );

  res.json(getEnrichedAdminValidations());
});

// ============================================================================
// 6. RANKING, CONQUISTAS E TRANSAÇÕES (AJUSTES PROTEGIDOS POR ADMIN)
// ============================================================================

app.get('/api/ranking/public', (req, res) => {
  const session = resolveSessionFromRequest(req);
  res.json(getPublicRankingFromDb(session?.userId));
});

app.get('/api/ranking/transactions', requireAdmin, (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM points_transactions ORDER BY rowid DESC')
    .all() as Record<string, unknown>[];
  res.json(rows.map(mapTransactionRow));
});

app.get('/api/ranking/reservation/:participantId', requireAdmin, (req, res) => {
  const { participantId } = req.params;
  const targetRow = db
    .prepare('SELECT id FROM participants WHERE id = ? LIMIT 1')
    .get(participantId);

  if (!targetRow) {
    res.status(404).json({ error: 'Participante não encontrado.' });
    return;
  }

  ensureParticipantFirstMissionUnlockedInDb(participantId);
  res.json(calculateParticipantReservedPoints(participantId));
});

app.post('/api/ranking/adjust', requireAdmin, (req, res) => {
  const { participantId, pointsDelta, reason } = req.body as {
    participantId: string;
    pointsDelta: number;
    reason: string;
  };

  const targetRow = db
    .prepare('SELECT * FROM participants WHERE id = ? LIMIT 1')
    .get(participantId) as Record<string, unknown> | undefined;

  if (!targetRow) {
    res.status(404).json({ error: 'Participante não encontrado.' });
    return;
  }

  const currentPoints = Number(targetRow.points || 0);
  const numericDelta = Math.trunc(Number(pointsDelta) || 0);

  if (numericDelta === 0) {
    res.status(400).json({ error: 'Informe um delta de pontuação diferente de zero.' });
    return;
  }

  // 1. Proteção dos pontos das missões contra ajustes positivos
  if (numericDelta > 0) {
    ensureParticipantFirstMissionUnlockedInDb(participantId);
    const reservation = calculateParticipantReservedPoints(participantId);

    if (currentPoints >= MAX_PARTICIPANT_POINTS) {
      res.status(400).json({
        error: `Limite global atingido: o participante já possui ${MAX_PARTICIPANT_POINTS} pontos (pontuação máxima permitida).`,
        code: 'MAX_POINTS_LIMIT_REACHED',
        currentPoints,
        maxPoints: MAX_PARTICIPANT_POINTS,
        reservation,
      });
      return;
    }

    if (numericDelta > reservation.freeMargin) {
      res.status(400).json({
        error: `Ajuste administrativo positivo bloqueado: existem ${reservation.totalReservedPoints} pontos reservados para as missões e bônus de velocidade planejados. Saldo livre disponível para ajustes: ${reservation.freeMargin} ponto(s) (máximo permitido: +${reservation.freeMargin}).`,
        code: 'POINTS_RESERVED_FOR_MISSIONS',
        currentPoints,
        totalReservedPoints: reservation.totalReservedPoints,
        freeMargin: reservation.freeMargin,
        requestedDelta: numericDelta,
        maxPoints: MAX_PARTICIPANT_POINTS,
        reservation,
      });
      return;
    }
  }

  // 2. Ajustes negativos: respeitam o piso mínimo de zero
  if (numericDelta < 0 && currentPoints <= 0) {
    res.status(400).json({
      error: 'O participante já possui 0 pontos. Ajustes negativos não podem reduzir o saldo abaixo de zero.',
      code: 'MIN_POINTS_LIMIT_REACHED',
    });
    return;
  }

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    creditPointsInSql({
      participantId,
      pointsDelta: numericDelta,
      sourceType: 'Ajuste Administrativo',
      sourceTitle: reason || 'Ajuste manual de auditoria',
    });
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  revalidateActiveHomologationsInDb(db, 'Ajuste administrativo manual de pontuação');

  res.json({
    publicRanking: getPublicRankingFromDb(),
    transactions: (
      db.prepare('SELECT * FROM points_transactions ORDER BY rowid DESC').all() as Record<
        string,
        unknown
      >[]
    ).map(mapTransactionRow),
    reservation: calculateParticipantReservedPoints(participantId),
  });
});

// ============================================================================
// 7B. DESCLASSIFICAÇÃO ADMINISTRATIVA E HOMOLOGAÇÃO DE VENCEDORES (ETAPA 2)
// ============================================================================

app.post('/api/admin/participants/:id/disqualify', requireAdmin, (req: RequestWithAuth, res) => {
  const { id } = req.params;
  const { reason, confirmed } = (req.body || {}) as {
    reason?: string;
    confirmed?: boolean;
  };

  const normalizedReason = typeof reason === 'string' ? reason.trim().slice(0, 500) : '';
  if (normalizedReason.length < 5) {
    res.status(400).json({
      error: 'Informe uma justificativa administrativa obrigatória (mínimo de 5 caracteres) para desclassificação.',
      code: 'DISQUALIFICATION_REASON_REQUIRED',
    });
    return;
  }

  if (confirmed !== true) {
    res.status(400).json({
      error: 'A desclassificação exige confirmação administrativa explícita.',
      code: 'DISQUALIFICATION_CONFIRMATION_REQUIRED',
    });
    return;
  }

  const targetRow = db
    .prepare("SELECT * FROM participants WHERE id = ? AND UPPER(role) = 'PARTICIPANT' LIMIT 1")
    .get(id) as Record<string, unknown> | undefined;

  if (!targetRow) {
    res.status(404).json({ error: 'Participante não encontrado.' });
    return;
  }

  if (String(targetRow.status) === 'Desclassificado') {
    res.status(409).json({
      error: 'Este participante já está desclassificado.',
      code: 'ALREADY_DISQUALIFIED',
    });
    return;
  }

  const adminActor = req.authSession?.email || req.authSession?.userId || 'admin';
  const nowIso = new Date().toISOString();

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    db.prepare(
      `UPDATE participants
       SET status = 'Desclassificado',
           disqualified_at = ?,
           disqualified_by = ?,
           disqualification_reason = ?
       WHERE id = ? AND UPPER(role) = 'PARTICIPANT'`
    ).run(nowIso, adminActor, normalizedReason, id);
    db.exec('COMMIT;');
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // transação já revertida
    }
    throw err;
  }

  recalculateRankingsInDb();
  revalidateActiveHomologationsInDb(
    db,
    `Desclassificação administrativa de ${String(targetRow.name)}`
  );

  const updatedRow = db
    .prepare('SELECT * FROM participants WHERE id = ? LIMIT 1')
    .get(id) as Record<string, unknown>;

  res.json({
    ok: true,
    participant: mapParticipantRow(updatedRow),
    publicRanking: getPublicRankingFromDb(),
    dailyRankings: getDailyRankingsFromDb(db),
  });
});

app.get('/api/homologations', requireAdmin, (_req, res) => {
  const rows = (
    db
      .prepare('SELECT * FROM winner_homologations ORDER BY homologated_at_ms DESC')
      .all() as Record<string, unknown>[]
  ).map(mapHomologationRow);

  const generalSnapshot = computeHomologationSnapshot(db, 'GERAL', null);
  const dailySnapshots = DAILY_AWARD_DAYS.map((day) => ({
    eventDate: day.eventDate,
    dayLabel: day.dayLabel,
    ...computeHomologationSnapshot(db, 'DIARIO', day.eventDate),
  }));

  res.json({
    homologations: rows,
    snapshots: {
      general: generalSnapshot,
      daily: dailySnapshots,
    },
  });
});

app.post('/api/admin/homologations', requireAdmin, (req: RequestWithAuth, res) => {
  const { scope, eventDate, participantId, conferenceCompleted } = (req.body || {}) as {
    scope?: 'GERAL' | 'DIARIO';
    eventDate?: string | null;
    participantId?: string;
    conferenceCompleted?: boolean;
  };

  if (scope !== 'GERAL' && scope !== 'DIARIO') {
    res.status(400).json({
      error: 'Escopo inválido. Utilize "GERAL" ou "DIARIO".',
      code: 'INVALID_HOMOLOGATION_SCOPE',
    });
    return;
  }

  const normalizedEventDate =
    scope === 'DIARIO' && typeof eventDate === 'string' ? eventDate.trim() : null;
  if (scope === 'DIARIO' && !DAILY_AWARD_DAYS.some((d) => d.eventDate === normalizedEventDate)) {
    res.status(400).json({
      error: 'Data do ranking diário inválida ou não cadastrada no evento.',
      code: 'INVALID_EVENT_DATE',
    });
    return;
  }

  if (conferenceCompleted !== true) {
    res.status(400).json({
      error: 'É obrigatório confirmar que a conferência das evidências foi concluída antes de homologar.',
      code: 'CONFERENCE_CONFIRMATION_REQUIRED',
    });
    return;
  }

  recalculateRankingsInDb();
  const snapshot = computeHomologationSnapshot(db, scope, normalizedEventDate);

  if (!snapshot.leader) {
    res.status(400).json({
      error: 'Não há participante elegível em 1º lugar para homologação neste ranking.',
      code: 'NO_ELIGIBLE_LEADER',
    });
    return;
  }

  if (participantId && participantId !== snapshot.leader.participantId) {
    res.status(409).json({
      error:
        'A classificação mudou durante a conferência: o participante informado não é mais o atual 1º colocado elegível. Atualize e confira o novo líder.',
      code: 'LEADER_CHANGED',
      currentLeader: snapshot.leader,
    });
    return;
  }

  const adminActor = req.authSession?.email || req.authSession?.userId || 'admin';
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const newId = `hom-${scope.toLowerCase()}-${nowMs}-${Math.random().toString(36).slice(2, 6)}`;

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    if (scope === 'GERAL') {
      db.prepare(
        `UPDATE winner_homologations
         SET status = 'Invalidado',
             invalidated_reason = COALESCE(invalidated_reason, 'Substituída por nova homologação administrativa'),
             invalidated_at = COALESCE(invalidated_at, ?)
         WHERE scope = 'GERAL' AND status = 'Homologado'`
      ).run(nowIso);
    } else {
      db.prepare(
        `UPDATE winner_homologations
         SET status = 'Invalidado',
             invalidated_reason = COALESCE(invalidated_reason, 'Substituída por nova homologação administrativa'),
             invalidated_at = COALESCE(invalidated_at, ?)
         WHERE scope = 'DIARIO' AND event_date = ? AND status = 'Homologado'`
      ).run(nowIso, normalizedEventDate);
    }

    db.prepare(
      `INSERT INTO winner_homologations (
         id, scope, event_date, participant_id, participant_name, points, ranking_position,
         evidence_summary_json, data_fingerprint, homologated_by, homologated_at, homologated_at_ms, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Homologado')`
    ).run(
      newId,
      scope,
      normalizedEventDate,
      snapshot.leader.participantId,
      snapshot.leader.participantName,
      snapshot.leader.points,
      snapshot.leader.position,
      JSON.stringify(snapshot.evidenceSummary),
      snapshot.dataFingerprint,
      adminActor,
      nowIso,
      nowMs
    );

    db.exec('COMMIT;');
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // transação já revertida
    }
    throw err;
  }

  const createdRow = db
    .prepare('SELECT * FROM winner_homologations WHERE id = ? LIMIT 1')
    .get(newId) as Record<string, unknown>;

  res.status(201).json({
    ok: true,
    homologation: mapHomologationRow(createdRow),
    homologations: (
      db
        .prepare('SELECT * FROM winner_homologations ORDER BY homologated_at_ms DESC')
        .all() as Record<string, unknown>[]
    ).map(mapHomologationRow),
  });
});

// ============================================================================
// 8. CONFIGURAÇÕES DO EVENTO, MÉTRICAS E GOVERNANÇA — 12 PLANOS (ADMIN ONLY)
// ============================================================================

app.get('/api/ranking/daily', (req, res) => {
  const session = resolveSessionFromRequest(req);
  res.json(getDailyRankingsFromDb(db, { currentUserId: session?.userId }));
});

app.get('/api/admin/daily-awards', requireAdmin, (_req, res) => {
  res.json(getDailyRankingsFromDb(db));
});

app.get('/api/admin/metrics', requireAdmin, (_req, res) => {
  res.json(getAdminMetricsFromDb());
});

app.get('/api/admin/settings', (_req, res) => {
  const row = db
    .prepare('SELECT * FROM event_settings WHERE id = 1')
    .get() as Record<string, unknown>;
  res.json(mapEventSettingsRow(row));
});

app.put('/api/admin/settings', requireAdmin, (req: RequestWithAuth, res) => {
  const row = db
    .prepare('SELECT * FROM event_settings WHERE id = 1')
    .get() as Record<string, unknown>;
  const current = mapEventSettingsRow(row);
  const u = req.body;

  const currentDefaultTimer = Number(row.default_mission_timer_minutes || 5);
  const defaultTimer =
    u.defaultMissionTimerMinutes !== undefined
      ? Math.max(
          MIN_MISSION_TIMER_MINUTES,
          Math.min(MAX_MISSION_TIMER_MINUTES, Math.trunc(Number(u.defaultMissionTimerMinutes)))
        )
      : currentDefaultTimer;

  if (
    defaultTimer !== currentDefaultTimer &&
    hasActiveInProgressTimerForDefaultMissionsInDb(db)
  ) {
    res.status(409).json({
      error:
        'Há participante(s) com cronômetro em andamento em missão oficial que utiliza o tempo padrão global. Aguarde a conclusão ou expiração antes de alterar o tempo padrão.',
      code: 'MISSION_TIMER_IN_PROGRESS',
    });
    return;
  }

  db.prepare(`
    UPDATE event_settings
    SET event_name = ?, dates = ?, location = ?, city = ?,
        description = ?, active_period = ?, scoring_rules_json = ?,
        tie_breaker_criteria_json = ?, rewards_enabled = ?, rewards_description = ?,
        default_mission_timer_minutes = ?
    WHERE id = 1
  `).run(
    u.eventName ?? current.eventName,
    u.dates ?? current.dates,
    u.location ?? current.location,
    u.city ?? current.city,
    u.description ?? current.description,
    u.activePeriod ?? current.activePeriod,
    JSON.stringify(u.scoringRules ?? current.scoringRules),
    JSON.stringify(u.tieBreakerCriteria ?? current.tieBreakerCriteria),
    (u.rewardsEnabled ?? current.rewardsEnabled) ? 1 : 0,
    u.rewardsDescription ?? current.rewardsDescription,
    defaultTimer
  );

  const updated = db
    .prepare('SELECT * FROM event_settings WHERE id = 1')
    .get() as Record<string, unknown>;
  res.json(mapEventSettingsRow(updated));
});

// Consulta de configurações globais e individuais de cronômetros (Etapa 3 - ADMIN ONLY)
app.get('/api/admin/timers', requireAdmin, (_req, res) => {
  const settingsRow = db
    .prepare('SELECT default_mission_timer_minutes FROM event_settings WHERE id = 1 LIMIT 1')
    .get() as { default_mission_timer_minutes?: number } | undefined;
  const defaultTimerMinutes = Number(settingsRow?.default_mission_timer_minutes || 5);

  const missionsRows = db
    .prepare(
      'SELECT id, title, sequence_order, timer_minutes FROM missions WHERE active = 1 ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC'
    )
    .all() as {
      id: string;
      title: string;
      sequence_order: number | null;
      timer_minutes: number | null;
    }[];

  res.json({
    defaultTimerMinutes,
    minMinutes: MIN_MISSION_TIMER_MINUTES,
    maxMinutes: MAX_MISSION_TIMER_MINUTES,
    missions: missionsRows.map((m) => ({
      id: m.id,
      title: m.title,
      sequenceOrder: m.sequence_order,
      timerMinutes: m.timer_minutes !== null ? Number(m.timer_minutes) : null,
      effectiveTimerMinutes:
        m.timer_minutes !== null ? Number(m.timer_minutes) : defaultTimerMinutes,
      source: m.timer_minutes !== null ? ('individual' as const) : ('global' as const),
    })),
  });
});

// Atualização de configurações de cronômetros com validação de 1 a 30 minutos (Etapa 3 - ADMIN ONLY)
app.put('/api/admin/timers', requireAdmin, (req, res) => {
  const body = req.body as {
    defaultTimerMinutes?: number;
    missionTimers?: Record<string, number | null>;
  };

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const nowMs = Date.now();

    if (body.defaultTimerMinutes !== undefined) {
      const defMin = Math.trunc(Number(body.defaultTimerMinutes));
      if (isNaN(defMin) || defMin < MIN_MISSION_TIMER_MINUTES || defMin > MAX_MISSION_TIMER_MINUTES) {
        db.exec('ROLLBACK;');
        res.status(400).json({
          error: `O tempo padrão deve ser um número inteiro entre ${MIN_MISSION_TIMER_MINUTES} e ${MAX_MISSION_TIMER_MINUTES} minutos.`,
        });
        return;
      }

      const settingsRowCurrent = db
        .prepare('SELECT default_mission_timer_minutes FROM event_settings WHERE id = 1 LIMIT 1')
        .get() as { default_mission_timer_minutes?: number } | undefined;
      const currentDef = Number(settingsRowCurrent?.default_mission_timer_minutes || 5);
      if (defMin !== currentDef && hasActiveInProgressTimerForDefaultMissionsInDb(db, nowMs)) {
        db.exec('ROLLBACK;');
        res.status(409).json({
          error:
            'Há participante(s) com cronômetro em andamento em missão oficial que utiliza o tempo padrão global. Aguarde a conclusão ou expiração antes de alterar o tempo padrão.',
          code: 'MISSION_TIMER_IN_PROGRESS',
        });
        return;
      }

      db.prepare(
        'UPDATE event_settings SET default_mission_timer_minutes = ? WHERE id = 1'
      ).run(defMin);
    }

    if (body.missionTimers && typeof body.missionTimers === 'object') {
      const updateMissionTimer = db.prepare('UPDATE missions SET timer_minutes = ? WHERE id = ?');
      for (const [mId, val] of Object.entries(body.missionTimers)) {
        const mMission = db
          .prepare('SELECT id, title, sequence_order, timer_minutes FROM missions WHERE id = ?')
          .get(mId) as
          | { id: string; title: string; sequence_order: number | null; timer_minutes: number | null }
          | undefined;
        if (!mMission) continue;

        const isOfficial = mMission.sequence_order !== null && mMission.sequence_order !== undefined;
        const currentVal = mMission.timer_minutes;
        const targetVal =
          val === null || val === undefined || String(val) === ''
            ? null
            : Math.trunc(Number(val));

        if (isOfficial && targetVal !== currentVal && hasActiveInProgressTimerForMissionInDb(db, mId, nowMs)) {
          db.exec('ROLLBACK;');
          res.status(409).json({
            error: `Há participante(s) com o cronômetro da missão "${mMission.title}" em andamento neste momento. Aguarde a conclusão ou expiração antes de alterar este tempo.`,
            code: 'MISSION_TIMER_IN_PROGRESS',
          });
          return;
        }

        if (targetVal === null) {
          updateMissionTimer.run(null, mId);
        } else {
          if (
            isNaN(targetVal) ||
            targetVal < MIN_MISSION_TIMER_MINUTES ||
            targetVal > MAX_MISSION_TIMER_MINUTES
          ) {
            db.exec('ROLLBACK;');
            res.status(400).json({
              error: `O tempo individual da missão ${mId} deve estar entre ${MIN_MISSION_TIMER_MINUTES} e ${MAX_MISSION_TIMER_MINUTES} minutos (ou nulo para herdar o padrão global).`,
            });
            return;
          }
          updateMissionTimer.run(targetVal, mId);
        }
      }
    }

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  const settingsRow = db
    .prepare('SELECT default_mission_timer_minutes FROM event_settings WHERE id = 1 LIMIT 1')
    .get() as { default_mission_timer_minutes?: number } | undefined;
  const defaultTimerMinutes = Number(settingsRow?.default_mission_timer_minutes || 5);

  const missionsRows = db
    .prepare(
      'SELECT id, title, sequence_order, timer_minutes FROM missions WHERE active = 1 ORDER BY CASE WHEN sequence_order IS NOT NULL THEN 0 ELSE 1 END, sequence_order ASC, rowid ASC'
    )
    .all() as {
      id: string;
      title: string;
      sequence_order: number | null;
      timer_minutes: number | null;
    }[];

  res.json({
    success: true,
    message: 'Configurações de cronômetro atualizadas com sucesso!',
    defaultTimerMinutes,
    minMinutes: MIN_MISSION_TIMER_MINUTES,
    maxMinutes: MAX_MISSION_TIMER_MINUTES,
    missions: missionsRows.map((m) => ({
      id: m.id,
      title: m.title,
      sequenceOrder: m.sequence_order,
      timerMinutes: m.timer_minutes !== null ? Number(m.timer_minutes) : null,
      effectiveTimerMinutes:
        m.timer_minutes !== null ? Number(m.timer_minutes) : defaultTimerMinutes,
      source: m.timer_minutes !== null ? ('individual' as const) : ('global' as const),
    })),
  });
});

app.get('/api/admin/governance', requireAdmin, (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM governance_plans ORDER BY code ASC')
    .all() as Record<string, unknown>[];
  res.json(rows.map(mapGovernancePlanRow));
});

app.put('/api/admin/governance/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const row = db
    .prepare('SELECT * FROM governance_plans WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json({ error: 'Plano de governança não encontrado' });
    return;
  }

  const current = mapGovernancePlanRow(row);
  const u = req.body;

  db.prepare(`
    UPDATE governance_plans
    SET name = ?, objective = ?, description = ?, responsible = ?,
        indicators = ?, status = ?, related_documents_json = ?
    WHERE id = ?
  `).run(
    u.name ?? current.name,
    u.objective ?? current.objective,
    u.description ?? current.description,
    u.responsible ?? current.responsible,
    u.indicators ?? current.indicators,
    u.status ?? current.status,
    JSON.stringify(u.relatedDocuments ?? current.relatedDocuments),
    id
  );

  const rows = db
    .prepare('SELECT * FROM governance_plans ORDER BY code ASC')
    .all() as Record<string, unknown>[];
  res.json(rows.map(mapGovernancePlanRow));
});

// Garante resposta JSON 404 para rotas /api/* inexistentes antes do fallback do frontend
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Endpoint da API não encontrado.', code: 'API_NOT_FOUND' });
});

// Serve o frontend compilado (dist/) em produção / deploy único na Hostinger
const DIST_DIR = path.resolve(process.cwd(), 'dist');
const DIST_INDEX_FILE = path.join(DIST_DIR, 'index.html');
if (fs.existsSync(DIST_INDEX_FILE)) {
  // Cache em memória dos assets estáticos já comprimidos em Gzip (~150 KB totais em RAM):
  // evita reler disco e recomprimir sob alta concorrência na Hostinger.
  const staticGzipCache = new Map<
    string,
    { mtimeMs: number; contentType: string; compressed: Buffer }
  >();

  // Compressão Gzip sob demanda com cache em memória para JS/CSS/HTML em dist/
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next();
      return;
    }
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    const acceptEncoding = String(req.headers['accept-encoding'] || '');
    if (!acceptEncoding.includes('gzip')) {
      next();
      return;
    }
    if (!/\.(js|css|svg|html|json)$/i.test(req.path)) {
      next();
      return;
    }

    const normalizedRel = req.path.replace(/^\/+/, '');
    const fullPath = path.resolve(DIST_DIR, normalizedRel);
    if (!fullPath.startsWith(DIST_DIR) || !fs.existsSync(fullPath)) {
      next();
      return;
    }

    try {
      const stat = fs.statSync(fullPath);
      if (!stat.isFile() || stat.size < 1024) {
        next();
        return;
      }

      let entry = staticGzipCache.get(fullPath);
      if (!entry || entry.mtimeMs !== stat.mtimeMs) {
        const ext = path.extname(fullPath).toLowerCase();
        const contentType =
          ext === '.js'
            ? 'application/javascript; charset=utf-8'
            : ext === '.css'
            ? 'text/css; charset=utf-8'
            : ext === '.svg'
            ? 'image/svg+xml'
            : ext === '.json'
            ? 'application/json; charset=utf-8'
            : 'text/html; charset=utf-8';
        const compressed = zlib.gzipSync(fs.readFileSync(fullPath));
        entry = { mtimeMs: stat.mtimeMs, contentType, compressed };
        if (staticGzipCache.size < 100) {
          staticGzipCache.set(fullPath, entry);
        }
      }

      res.setHeader('Content-Type', entry.contentType);
      res.setHeader('Content-Encoding', 'gzip');
      res.setHeader('Vary', 'Accept-Encoding');
      res.setHeader('Content-Length', String(entry.compressed.length));
      if (req.path.startsWith('/assets/')) {
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      } else {
        res.setHeader('Cache-Control', 'no-cache');
      }
      if (req.method === 'HEAD') {
        res.end();
      } else {
        res.end(entry.compressed);
      }
      return;
    } catch {
      next();
    }
  });

  app.use(
    express.static(DIST_DIR, {
      index: 'index.html',
      setHeaders: (res, filePath) => {
        if (filePath.includes(`${path.sep}assets${path.sep}`)) {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        } else if (filePath.endsWith('index.html')) {
          res.setHeader('Cache-Control', 'no-cache');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=86400');
        }
      },
    })
  );
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) {
      next();
      return;
    }
    res.setHeader('Cache-Control', 'no-cache');
    res.sendFile(DIST_INDEX_FILE);
  });
}

// Middleware global de tratamento de erros (JSON padronizado, sem exposição de stack trace ou caminhos físicos)
app.use(
  (
    err: any,
    _req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (res.headersSent) {
      next(err);
      return;
    }

    const status =
      typeof err?.status === 'number' && err.status >= 400 && err.status < 600
        ? err.status
        : typeof err?.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 600
        ? err.statusCode
        : 500;

    const code =
      err?.code === 'CORS_ORIGIN_FORBIDDEN'
        ? 'CORS_ORIGIN_FORBIDDEN'
        : err?.type === 'entity.too.large' || status === 413
        ? 'FILE_TOO_LARGE'
        : err?.type === 'entity.parse.failed'
        ? 'INVALID_JSON_PAYLOAD'
        : status >= 500
        ? 'INTERNAL_SERVER_ERROR'
        : String(err?.code || 'REQUEST_ERROR');

    const safeMessage =
      code === 'CORS_ORIGIN_FORBIDDEN'
        ? 'Origem não autorizada pela política de CORS.'
        : code === 'FILE_TOO_LARGE'
        ? 'O arquivo ou payload excede o limite máximo permitido.'
        : code === 'INVALID_JSON_PAYLOAD'
        ? 'Corpo da requisição JSON inválido.'
        : status >= 500
        ? 'Erro interno no servidor. Tente novamente em instantes.'
        : String(err?.message || 'Não foi possível processar a requisição.');

    if (status >= 500) {
      console.error(`[API Error] status=${status} code=${code} message=${err?.message || 'unknown'}`);
    }

    res.status(status).json({
      error: safeMessage,
      code,
    });
  }
);

const server = app.listen(PORT);
let dailyCloseTimer: ReturnType<typeof setInterval> | null = null;

server.on('listening', () => {
  console.log(`[API + SQLite + RBAC] Servidor Express rodando em http://localhost:${PORT}`);
  console.log(`[API + SQLite + RBAC] Arquivo SQLite ativo: ${DB_FILE_PATH}`);

  // Verificação periódica automática para encerramento diário às 16h30 (Horário de Brasília)
  // Executa de forma idempotente mesmo sem nenhum administrador ou participante conectado.
  dailyCloseTimer = setInterval(() => {
    if (isShuttingDown) return;
    try {
      const { closedDates } = ensureDailyRankingsClosedUpTo(db);
      if (closedDates.length > 0) {
        console.log(`[DailyRanking] Encerramento automático concluído para: ${closedDates.join(', ')}`);
      }
    } catch (err) {
      console.error('[DailyRanking] Erro na rotina automática de encerramento diário:', err);
    }
  }, 15_000);
  dailyCloseTimer.unref();
});

const GRACEFUL_SHUTDOWN_TIMEOUT_MS = 10_000;

function gracefulShutdown(signal: string): void {
  if (isShuttingDown) return;
  isShuttingDown = true;
  console.log(`[Shutdown] Sinal ${signal} recebido. Iniciando encerramento controlado...`);

  if (dailyCloseTimer) {
    clearInterval(dailyCloseTimer);
    dailyCloseTimer = null;
  }

  const forceTimer = setTimeout(() => {
    console.error('[Shutdown] Timeout de encerramento atingido. Finalizando com fechamento do SQLite.');
    try {
      closeDatabaseGracefully();
    } finally {
      process.exit(1);
    }
  }, GRACEFUL_SHUTDOWN_TIMEOUT_MS);
  forceTimer.unref();

  server.close((closeErr) => {
    let exitCode = 0;
    if (closeErr) {
      console.error('[Shutdown] Erro ao encerrar servidor HTTP:', closeErr);
      exitCode = 1;
    }

    try {
      // Garante que nenhum fechamento diário pendente seja perdido antes de encerrar
      ensureDailyRankingsClosedUpTo(db);
    } catch (err) {
      console.error('[Shutdown] Erro ao verificar snapshots diários no encerramento:', err);
    }

    const dbCloseResult = closeDatabaseGracefully();
    if (!dbCloseResult.closed) {
      exitCode = 1;
    }

    clearTimeout(forceTimer);
    console.log(
      `[Shutdown] Encerramento concluído (wal_checkpoint=${dbCloseResult.checkpointed}, db_closed=${dbCloseResult.closed}).`
    );
    process.exit(exitCode);
  });
}

process.once('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.once('SIGINT', () => gracefulShutdown('SIGINT'));

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `[API + SQLite + RBAC] Erro EADDRINUSE: A porta ${PORT} já está em uso por outra instância do servidor.`
    );
    console.error(
      `[API + SQLite + RBAC] Encerre o processo que ocupa a porta ${PORT} ou defina outra porta na variável PORT.`
    );
  } else {
    console.error(`[API + SQLite + RBAC] Falha ao iniciar o servidor HTTP na porta ${PORT}:`, err);
  }
  process.exitCode = 1;
});
