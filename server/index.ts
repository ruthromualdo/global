import express from 'express';
import cors from 'cors';
import {
  calculateParticipantReservedPoints,
  db,
  DB_FILE_PATH,
  DEFAULT_MISSION_TIMER_MINUTES,
  ensureParticipantFirstMissionUnlockedInDb,
  getAdminMetricsFromDb,
  getMissionConfiguredDurationSeconds,
  getParticipantAchievementsFromDb,
  getPublicRankingFromDb,
  initializeDatabase,
  mapEventSettingsRow,
  mapGovernancePlanRow,
  mapMissionRow,
  mapParticipantRow,
  mapQRCodeRow,
  mapStartupRow,
  mapTransactionRow,
  mapValidationRow,
  MAX_MISSION_TIMER_MINUTES,
  MAX_PARTICIPANT_POINTS,
  MIN_MISSION_TIMER_MINUTES,
  MISSION_COMPLETION_POINTS,
  MISSION_UNLOCK_POINTS,
  ParticipantPointsReservation,
  recalculateRankingsInDb,
} from './db/database';
import {
  createSessionInDb,
  extractBearerToken,
  hashPassword,
  requireAdmin,
  RequestWithAuth,
  resolveSessionFromRequest,
  revokeSessionTokenInDb,
  verifyPassword,
} from './security/auth';

initializeDatabase();

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(cors());
app.use(express.json());

// Helper para obter o participante ativo da sessão atual no SQLite
function getCurrentParticipantFromDb(req?: express.Request) {
  if (req) {
    const session = resolveSessionFromRequest(req);
    if (session) {
      const bySession = db
        .prepare('SELECT * FROM participants WHERE id = ? LIMIT 1')
        .get(session.userId) as Record<string, unknown> | undefined;
      if (bySession) return mapParticipantRow(bySession);
    }
  }

  let row = db
    .prepare(
      "SELECT * FROM participants WHERE is_current_session = 1 AND UPPER(role) = 'PARTICIPANT' LIMIT 1"
    )
    .get() as Record<string, unknown> | undefined;
  if (!row) {
    row = db
      .prepare("SELECT * FROM participants WHERE UPPER(role) = 'PARTICIPANT' LIMIT 1")
      .get() as Record<string, unknown> | undefined;
  }
  if (!row) {
    row = db.prepare('SELECT * FROM participants LIMIT 1').get() as Record<string, unknown>;
  }
  return mapParticipantRow(row);
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
function creditPointsInSql(params: {
  participantId: string;
  pointsDelta: number;
  sourceType: 'Missão' | 'QR Code' | 'Conquista' | 'Ajuste Administrativo';
  sourceTitle: string;
  visitedStartupId?: string;
  incrementMissionCount?: boolean;
  eventKey?: string;
  missionId?: string;
}) {
  const row = db
    .prepare('SELECT * FROM participants WHERE id = ?')
    .get(params.participantId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const participant = mapParticipantRow(row);

  // Proteção idempotente: se eventKey já foi processada, não credita novamente
  if (params.eventKey) {
    const existingTx = db
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

  // Avaliar desbloqueio real de medalhas para o participante
  const unlockedSet = new Set<string>(participant.unlockedAchievementIds);
  if (newMissionCount >= 1) unlockedSet.add('ach-01');
  if (visitedStartups.length >= 2) unlockedSet.add('ach-02');
  if (newMissionCount >= 2) unlockedSet.add('ach-03');
  if (visitedStartups.length >= 3) unlockedSet.add('ach-04');
  if (visitedStartups.length >= 4 && newBalance >= 800) unlockedSet.add('ach-05');

  const unlockedList = Array.from(unlockedSet);

  const nowStr = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  db.prepare(`
    UPDATE participants
    SET points = ?,
        completed_missions_count = ?,
        visited_startups_json = ?,
        unlocked_achievements_json = ?
    WHERE id = ?
  `).run(
    newBalance,
    newMissionCount,
    JSON.stringify(visitedStartups),
    JSON.stringify(unlockedList),
    participant.id
  );

  const txId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  db.prepare(`
    INSERT INTO points_transactions (
      id, participant_id, participant_name, source_type, source_title,
      points_delta, previous_balance, new_balance, created_at, event_key, mission_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    txId,
    participant.id,
    participant.name,
    params.sourceType,
    params.sourceTitle,
    effectiveDelta,
    previousBalance,
    newBalance,
    nowStr,
    params.eventKey || null,
    params.missionId || null
  );

  recalculateRankingsInDb();

  const updatedRow = db
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

  const completedSeqOrders = new Set<number>();
  for (const mRow of baseMissionsRows) {
    const mId = String(mRow.id);
    const seq = Number(mRow.sequence_order);
    const pm = pmByMissionId.get(mId);
    const completeTx = db
      .prepare('SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1')
      .get(`COMPLETE:${participant.id}:${mId}`) as { id: string } | undefined;

    if ((pm && String(pm.status) === 'Concluída') || completeTx) {
      completedSeqOrders.add(seq);
    }
  }

  const nowMs = Date.now();

  return baseMissionsRows.map((mRow) => {
    const m = mapMissionRow(mRow);
    const seq = Number(mRow.sequence_order);
    const pm = pmByMissionId.get(m.id);
    const isCompleted = completedSeqOrders.has(seq);

    let computedStatus: 'Disponível' | 'Em andamento' | 'Aguardando validação' | 'Concluída' | 'Bloqueada' = 'Disponível';
    if (isCompleted) {
      computedStatus = 'Concluída';
    } else if (seq > 1 && !completedSeqOrders.has(seq - 1)) {
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
    const targetEndAtMs = pm?.target_end_at_ms
      ? Number(pm.target_end_at_ms)
      : (startedAtMs ? startedAtMs + durationSeconds * 1000 : null);
    const completedAtMs = pm?.completed_at_ms ? Number(pm.completed_at_ms) : null;
    const speedBonusAwarded = Number(pm?.speed_bonus_awarded || 0);

    let elapsedSeconds = 0;
    let remainingSeconds = durationSeconds;
    let isExpired = false;
    let potentialSpeedBonus = 50;

    if (isCompleted) {
      if (startedAtMs && completedAtMs) {
        elapsedSeconds = Math.max(0, Math.round((completedAtMs - startedAtMs) / 1000));
        remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
      } else {
        elapsedSeconds = Number(pm?.elapsed_seconds || 0);
        remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
      }
      isExpired = remainingSeconds <= 0;
      potentialSpeedBonus = 0;
    } else if (startedAtMs && targetEndAtMs) {
      elapsedSeconds = Math.max(0, Math.round((nowMs - startedAtMs) / 1000));
      remainingSeconds = Math.max(0, Math.ceil((targetEndAtMs - nowMs) / 1000));
      isExpired = remainingSeconds <= 0;
      potentialSpeedBonus = isExpired
        ? 0
        : Math.max(
            0,
            Math.min(50, Math.round(50 * (remainingSeconds / durationSeconds)))
          );
    }

    return {
      ...m,
      status: computedStatus,
      durationSeconds,
      startedAtMs,
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
}

// Helper transacional atômico para concluir missão sequencial (+180 pts) e desbloquear a próxima (+20 pts)
function completeSequentialMissionInSql(params: {
  participantId: string;
  missionId: string;
  sourceType: 'Missão' | 'QR Code';
  qrCodeRow?: ReturnType<typeof mapQRCodeRow>;
}) {
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    ensureParticipantFirstMissionUnlockedInDb(params.participantId);

    const missionRow = db
      .prepare('SELECT * FROM missions WHERE id = ? LIMIT 1')
      .get(params.missionId) as Record<string, unknown> | undefined;

    if (!missionRow) {
      db.exec('ROLLBACK;');
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
      db.exec('ROLLBACK;');
      return {
        ok: false,
        httpStatus: 400,
        status: 'INVALID_MISSION' as const,
        message: `A missão "${mission.title}" não faz parte da trilha ativa no momento.`,
      };
    }

    const completeEventKey = `COMPLETE:${params.participantId}:${mission.id}`;
    const existingCompleteTx = db
      .prepare('SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1')
      .get(completeEventKey) as { id: string } | undefined;

    const pmRow = db
      .prepare(
        'SELECT * FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1'
      )
      .get(params.participantId, mission.id) as Record<string, unknown> | undefined;

    if (existingCompleteTx || (pmRow && String(pmRow.status) === 'Concluída')) {
      db.exec('ROLLBACK;');
      return {
        ok: false,
        httpStatus: 409,
        status: 'ALREADY_USED' as const,
        alreadyUsed: true,
        alreadyCompleted: true,
        message: `A missão "${mission.title}" já foi concluída anteriormente e seus pontos já foram creditados.`,
      };
    }

    // Verifica bloqueio sequencial estrito: Missão N exige Missão N-1 concluída pelo participante
    if (seqOrder > 1) {
      const prevMissionRow = db
        .prepare('SELECT id, title FROM missions WHERE sequence_order = ? AND active = 1 LIMIT 1')
        .get(seqOrder - 1) as { id: string; title: string } | undefined;

      if (prevMissionRow) {
        const prevCompleteTx = db
          .prepare('SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1')
          .get(`COMPLETE:${params.participantId}:${prevMissionRow.id}`) as
          | { id: string }
          | undefined;
        const prevPm = db
          .prepare(
            'SELECT status FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1'
          )
          .get(params.participantId, prevMissionRow.id) as { status: string } | undefined;

        const isPrevCompleted =
          Boolean(prevCompleteTx) || (prevPm && String(prevPm.status) === 'Concluída');

        if (!isPrevCompleted) {
          db.exec('ROLLBACK;');
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
      const existingScan = db
        .prepare(
          'SELECT id FROM qr_scans WHERE qr_code_id = ? AND participant_id = ? LIMIT 1'
        )
        .get(params.qrCodeRow.id, params.participantId) as { id: string } | undefined;

      if (existingScan) {
        db.exec('ROLLBACK;');
        return {
          ok: false,
          httpStatus: 409,
          status: 'ALREADY_USED' as const,
          alreadyUsed: true,
          alreadyCompleted: true,
          message: `Código ${params.qrCodeRow.code} já utilizado! Você já concluiu a missão "${mission.title}".`,
        };
      }

      db.prepare('UPDATE qr_codes SET scans_count = scans_count + 1 WHERE id = ?').run(
        params.qrCodeRow.id
      );
      db.prepare(
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

    const startedAtMs = pmRow?.started_at_ms ? Number(pmRow.started_at_ms) : null;
    const durationSeconds = pmRow?.duration_seconds
      ? Number(pmRow.duration_seconds)
      : getMissionConfiguredDurationSeconds(mission.id);

    let elapsedSeconds = 0;
    let speedBonus = 0;

    if (startedAtMs) {
      elapsedSeconds = Math.max(0, Math.round((nowMs - startedAtMs) / 1000));
      const remainingSeconds = Math.max(0, durationSeconds - elapsedSeconds);
      if (remainingSeconds > 0 && durationSeconds > 0) {
        speedBonus = Math.round(50 * (remainingSeconds / durationSeconds));
        speedBonus = Math.max(0, Math.min(50, speedBonus));
      }
    }

    // 1. Concede 180 pontos pela conclusão válida da missão
    const completionCredit = creditPointsInSql({
      participantId: params.participantId,
      pointsDelta: MISSION_COMPLETION_POINTS,
      sourceType: params.sourceType,
      sourceTitle: completionSourceTitle,
      visitedStartupId: mission.startupId,
      incrementMissionCount: true,
      eventKey: completeEventKey,
      missionId: mission.id,
    });

    const awardedCompletionPoints = completionCredit?.effectiveDelta ?? 0;

    // 1.5 Concede até 50 pontos de bônus de velocidade proporcional (Etapa 3)
    let awardedSpeedBonus = 0;
    if (speedBonus > 0) {
      const speedBonusEventKey = `SPEED_BONUS:${params.participantId}:${mission.id}`;
      const bonusCredit = creditPointsInSql({
        participantId: params.participantId,
        pointsDelta: speedBonus,
        sourceType: 'Missão',
        sourceTitle: `Bônus de Velocidade (+${speedBonus} pts): ${mission.title}`,
        incrementMissionCount: false,
        eventKey: speedBonusEventKey,
        missionId: mission.id,
      });
      awardedSpeedBonus = bonusCredit?.effectiveDelta ?? 0;
    }

    db.prepare(`
      UPDATE participant_missions
      SET status = 'Concluída',
          completed_at_ms = ?,
          elapsed_seconds = ?,
          completion_points_awarded = ?,
          speed_bonus_awarded = ?,
          total_points_awarded = unlock_points_awarded + ? + ?
      WHERE participant_id = ? AND mission_id = ?
    `).run(
      nowMs,
      elapsedSeconds,
      awardedCompletionPoints,
      awardedSpeedBonus,
      awardedCompletionPoints,
      awardedSpeedBonus,
      params.participantId,
      mission.id
    );

    // 2. Desbloqueia automaticamente a próxima missão na sequência (se houver, i.e., seqOrder < 4) e concede +20 pts
    let nextMissionUnlockedTitle: string | null = null;
    let awardedNextUnlockPoints = 0;

    const nextMissionRow = db
      .prepare('SELECT * FROM missions WHERE sequence_order = ? AND active = 1 LIMIT 1')
      .get(seqOrder + 1) as Record<string, unknown> | undefined;

    if (nextMissionRow) {
      const nextMissionId = String(nextMissionRow.id);
      const nextMissionTitle = String(nextMissionRow.title);
      const nextUnlockEventKey = `UNLOCK:${params.participantId}:${nextMissionId}`;

      const unlockCredit = creditPointsInSql({
        participantId: params.participantId,
        pointsDelta: MISSION_UNLOCK_POINTS,
        sourceType: 'Missão',
        sourceTitle: `Desbloqueio: ${nextMissionTitle}`,
        incrementMissionCount: false,
        eventKey: nextUnlockEventKey,
        missionId: nextMissionId,
      });

      awardedNextUnlockPoints = unlockCredit?.effectiveDelta ?? 0;
      nextMissionUnlockedTitle = nextMissionTitle;

      db.prepare(`
        INSERT INTO participant_missions (
          id, participant_id, mission_id, sequence_order, status,
          unlocked_at_ms, unlock_points_awarded, completion_points_awarded,
          speed_bonus_awarded, total_points_awarded
        ) VALUES (?, ?, ?, ?, 'Disponível', ?, ?, 0, 0, ?)
        ON CONFLICT(participant_id, mission_id) DO UPDATE SET
          status = CASE WHEN participant_missions.status = 'Concluída' THEN 'Concluída' ELSE 'Disponível' END,
          unlocked_at_ms = COALESCE(participant_missions.unlocked_at_ms, excluded.unlocked_at_ms),
          unlock_points_awarded = CASE WHEN participant_missions.unlock_points_awarded > 0 THEN participant_missions.unlock_points_awarded ELSE excluded.unlock_points_awarded END,
          total_points_awarded = (CASE WHEN participant_missions.unlock_points_awarded > 0 THEN participant_missions.unlock_points_awarded ELSE excluded.unlock_points_awarded END) + participant_missions.completion_points_awarded + participant_missions.speed_bonus_awarded
      `).run(
        `pm-${params.participantId}-${nextMissionId}`,
        params.participantId,
        nextMissionId,
        seqOrder + 1,
        nowMs,
        awardedNextUnlockPoints,
        awardedNextUnlockPoints
      );
    }

    db.exec('COMMIT;');

    const updatedParticipant = db
      .prepare('SELECT * FROM participants WHERE id = ?')
      .get(params.participantId) as Record<string, unknown>;

    const bonusMsg =
      awardedSpeedBonus > 0
        ? ` com Bônus de Velocidade (+${awardedSpeedBonus} pts)! Total na missão: ${awardedCompletionPoints + awardedSpeedBonus} pts.`
        : ' (sem bônus de velocidade adicional).';
    const unlockMsg = nextMissionUnlockedTitle
      ? ` Próxima missão "${nextMissionUnlockedTitle}" desbloqueada automaticamente (+${awardedNextUnlockPoints} pts)!`
      : ' Você concluiu todas as 4 missões principais do circuito!';

    return {
      ok: true,
      httpStatus: 200,
      status: 'VALIDATED' as const,
      missionId: mission.id,
      missionTitle: mission.title,
      completionPointsAwarded: awardedCompletionPoints,
      speedBonusAwarded: awardedSpeedBonus,
      unlockPointsAwarded: awardedNextUnlockPoints,
      pointsAwarded: awardedCompletionPoints + awardedSpeedBonus + awardedNextUnlockPoints,
      nextMissionUnlocked: nextMissionUnlockedTitle,
      participant: mapParticipantRow(updatedParticipant),
      message: `Missão "${mission.title}" concluída (+${awardedCompletionPoints} pts)${bonusMsg}${unlockMsg}`,
    };
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // ignore rollback if already closed
    }
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
// 1. HEALTH & BOOTSTRAP (COM FILTRAGEM RBAC NO SERVIDOR)
// ============================================================================

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    engine: 'node:sqlite (SQLite3)',
    rbac: 'enabled (PARTICIPANT | ADMIN)',
    hasConfiguredAdmin: hasAdminAccountInDb(),
    databaseFile: DB_FILE_PATH,
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/bootstrap', (req, res) => {
  recalculateRankingsInDb();

  const session = resolveSessionFromRequest(req);
  const isAdmin = session?.role === 'ADMIN';

  const initialParticipant = getCurrentParticipantFromDb(req);
  const missions = isAdmin
    ? (
        db
          .prepare(
            'SELECT * FROM missions WHERE sequence_order IS NOT NULL ORDER BY sequence_order ASC'
          )
          .all() as Record<string, unknown>[]
      ).map(mapMissionRow)
    : getParticipantMissionsFromDb(initialParticipant);

  // Recarrega participante após eventual desbloqueio inicial idempotente da Missão 1 (+20 pts)
  const participant = getCurrentParticipantFromDb(req);
  recalculateRankingsInDb();

  const startups = (
    db.prepare('SELECT * FROM startups').all() as Record<string, unknown>[]
  ).map(mapStartupRow);

  const achievements = getParticipantAchievementsFromDb(participant);

  const qrCodes = (
    db.prepare('SELECT * FROM qr_codes').all() as Record<string, unknown>[]
  ).map(mapQRCodeRow);

  const publicRanking = getPublicRankingFromDb();

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

  const validationQueue = isAdmin
    ? (
        db.prepare('SELECT * FROM mission_completions ORDER BY rowid DESC').all() as Record<
          string,
          unknown
        >[]
      ).map(mapValidationRow)
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
        activeParticipants: publicRanking.length,
        completedMissions: 0,
        qrCodesScanned: 0,
        registeredStartups: startups.length,
        totalPointsDistributed: 0,
        participationRate: 0,
        engagementByDay: [],
        participationByStartup: [],
      };

  res.json({
    participant,
    allParticipants,
    startups,
    missions,
    achievements,
    qrCodes,
    validationQueue,
    publicRanking,
    pointsTransactions,
    eventSettings,
    governancePlans,
    adminMetrics,
    auth: {
      authenticated: Boolean(session) || hasActiveParticipantSessionInDb(),
      role: session?.role || (hasActiveParticipantSessionInDb() ? 'PARTICIPANT' : null),
      userId: session?.userId || (hasActiveParticipantSessionInDb() ? participant.id : null),
      email: session?.email || (hasActiveParticipantSessionInDb() ? participant.email : null),
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

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body as { email?: string; password?: string };
  const cleanEmail = (email || '').trim().toLowerCase();

  let row = db
    .prepare('SELECT * FROM participants WHERE LOWER(email) = ?')
    .get(cleanEmail) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(401).json({
      error: 'Conta não encontrada para o e-mail informado.',
    });
    return;
  }

  const dbRole = String(row.role || 'PARTICIPANT').toUpperCase();
  const storedHash = String(row.password_hash || '');

  // Contas ADMIN exigem verificação estrita de hash scrypt mesmo no login geral
  if (dbRole === 'ADMIN') {
    if (!password || !verifyPassword(password, storedHash)) {
      res.status(401).json({
        error: 'E-mail ou senha inválidos.',
      });
      return;
    }
  } else if (password && password.length >= 6 && !password.includes('•')) {
    // Atualiza hash scrypt do participante caso informe senha no login
    const upgradedHash = hashPassword(password);
    db.prepare('UPDATE participants SET password_hash = ? WHERE id = ?').run(
      upgradedHash,
      String(row.id)
    );
  }

  if (String(row.role).toUpperCase() === 'PARTICIPANT') {
    db.prepare("UPDATE participants SET is_current_session = 0 WHERE UPPER(role) = 'PARTICIPANT'").run();
    db.prepare('UPDATE participants SET is_current_session = 1 WHERE id = ?').run(String(row.id));
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
app.post('/api/auth/admin/login', (req, res) => {
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

app.post('/api/auth/register', (req, res) => {
  const { name, email, password, role } = req.body as {
    name?: string;
    email?: string;
    password?: string;
    role?: string;
  };

  // Bloqueia tentativa de criar conta já como ADMIN via endpoint de cadastro
  if (role && String(role).toUpperCase() === 'ADMIN') {
    res.status(403).json({
      error:
        'Operação bloqueada (HTTP 403): não é permitido atribuir papel ADMIN pelo cadastro de participantes.',
      code: 'PRIVILEGE_ESCALATION_BLOCKED',
    });
    return;
  }

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

  const existing = db
    .prepare('SELECT * FROM participants WHERE LOWER(email) = ?')
    .get(cleanEmail) as Record<string, unknown> | undefined;

  if (existing) {
    if (String(existing.role).toUpperCase() === 'ADMIN') {
      res.status(403).json({
        error: 'Este e-mail pertence a uma conta administrativa restrita.',
      });
      return;
    }

    db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      db.prepare("UPDATE participants SET is_current_session = 0 WHERE UPPER(role) = 'PARTICIPANT'").run();
      db.prepare(
        'UPDATE participants SET is_current_session = 1, name = ?, nickname = ?, avatar = ?, password_hash = ? WHERE id = ?'
      ).run(cleanName, nickname, initials || 'PS', passwordHash, String(existing.id));
      ensureParticipantFirstMissionUnlockedInDb(String(existing.id));
      recalculateRankingsInDb();
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }

    const updated = db
      .prepare('SELECT * FROM participants WHERE id = ?')
      .get(String(existing.id)) as Record<string, unknown>;
    const user = mapParticipantRow(updated);
    const sessionToken = createSessionInDb({
      userId: user.id,
      email: user.email,
      role: 'PARTICIPANT',
    });

    res.json({
      token: sessionToken.token,
      expiresAt: sessionToken.expiresAt,
      user,
      message: 'Cadastro localizado e conectado ao banco SQLite!',
    });
    return;
  }

  const newId = `part-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const nowStr = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    db.prepare("UPDATE participants SET is_current_session = 0 WHERE UPPER(role) = 'PARTICIPANT'").run();
    db.prepare(`
      INSERT INTO participants (
        id, name, nickname, email, password_hash, role, avatar, points, ranking_position,
        completed_missions_count, visited_startups_json, unlocked_achievements_json,
        registered_at, status, show_nickname_in_public_ranking,
        allow_activity_notifications, share_startup_interests, is_current_session
      ) VALUES (?, ?, ?, ?, ?, 'PARTICIPANT', ?, 0, 1, 0, '[]', '[]', ?, 'Ativo', 1, 1, 0, 1)
    `).run(newId, cleanName, nickname, cleanEmail, passwordHash, initials || 'PS', nowStr);

    // Desbloqueia automaticamente a 1ª missão e concede os +20 pontos iniciais de desbloqueio
    ensureParticipantFirstMissionUnlockedInDb(newId);
    recalculateRankingsInDb();
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  const createdRow = db
    .prepare('SELECT * FROM participants WHERE id = ?')
    .get(newId) as Record<string, unknown>;
  const user = mapParticipantRow(createdRow);
  const sessionToken = createSessionInDb({
    userId: user.id,
    email: user.email,
    role: 'PARTICIPANT',
  });

  res.status(201).json({
    token: sessionToken.token,
    expiresAt: sessionToken.expiresAt,
    user,
    message: 'Cadastro gravado com sucesso no banco de dados SQLite!',
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

app.get('/api/participants/me', (req, res) => {
  recalculateRankingsInDb();
  res.json(getCurrentParticipantFromDb(req));
});

app.put('/api/participants/me', (req, res) => {
  const rawBody = req.body as Record<string, unknown>;

  // Bloqueia explicitamente qualquer tentativa de promover conta a ADMIN via perfil
  if (
    rawBody.role !== undefined ||
    rawBody.isAdmin !== undefined ||
    rawBody.permissions !== undefined
  ) {
    const session = resolveSessionFromRequest(req);
    if (!session || session.role !== 'ADMIN') {
      res.status(403).json({
        error:
          'Operação bloqueada (HTTP 403): participantes não podem alterar seu papel (role) ou promover privilégios.',
        code: 'PRIVILEGE_ESCALATION_BLOCKED',
      });
      return;
    }
  }

  const current = getCurrentParticipantFromDb(req);
  const updates = req.body as Partial<ReturnType<typeof mapParticipantRow>>;

  const name = updates.name ?? current.name;
  const nickname = updates.nickname ?? current.nickname;
  const email = updates.email ?? current.email;
  const avatar = updates.avatar ?? current.avatar;
  const showNick =
    updates.privacyPreferences?.showNicknameInPublicRanking ??
    current.privacyPreferences.showNicknameInPublicRanking;
  const allowNotif =
    updates.privacyPreferences?.allowActivityNotifications ??
    current.privacyPreferences.allowActivityNotifications;
  const shareInt =
    updates.privacyPreferences?.shareStartupInterests ??
    current.privacyPreferences.shareStartupInterests;

  db.prepare(`
    UPDATE participants
    SET name = ?, nickname = ?, email = ?, avatar = ?,
        show_nickname_in_public_ranking = ?,
        allow_activity_notifications = ?,
        share_startup_interests = ?
    WHERE id = ?
  `).run(
    name,
    nickname,
    email,
    avatar,
    showNick ? 1 : 0,
    allowNotif ? 1 : 0,
    shareInt ? 1 : 0,
    current.id
  );

  res.json(getCurrentParticipantFromDb(req));
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

// ============================================================================
// 4. STARTUPS EXPOSITORAS (LEITURA PÚBLICA / ESCRITA PROTEGIDA POR ADMIN)
// ============================================================================

app.get('/api/startups', (_req, res) => {
  const rows = db.prepare('SELECT * FROM startups').all() as Record<string, unknown>[];
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
        'SELECT * FROM missions WHERE sequence_order IS NOT NULL ORDER BY sequence_order ASC'
      )
      .all() as Record<string, unknown>[];
    res.json(rows.map(mapMissionRow));
    return;
  }
  const participant = getCurrentParticipantFromDb(req);
  res.json(getParticipantMissionsFromDb(participant));
});

app.post('/api/missions', requireAdmin, (req, res) => {
  const p = req.body;
  const newId = `ms-${Date.now()}`;
  db.prepare(`
    INSERT INTO missions (
      id, title, description, startup_id, startup_name, category,
      points, estimated_time, status, period, completion_criteria,
      active, qr_code_required, quiz_questions_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    newId,
    p.title,
    p.description,
    p.startupId,
    p.startupName,
    p.category,
    Number(p.points || 200),
    p.estimatedTime || '4 min',
    p.status || 'Disponível',
    p.period || '24 a 26/11/2026',
    p.completionCriteria || '',
    p.active === false ? 0 : 1,
    p.qrCodeRequired || null,
    p.quizQuestions ? JSON.stringify(p.quizQuestions) : null
  );

  const created = db
    .prepare('SELECT * FROM missions WHERE id = ?')
    .get(newId) as Record<string, unknown>;
  res.status(201).json(mapMissionRow(created));
});

app.put('/api/missions/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  const row = db
    .prepare('SELECT * FROM missions WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;
  if (!row) {
    res.status(404).json({ error: 'Missão não encontrada' });
    return;
  }
  const current = mapMissionRow(row);
  const u = req.body;

  db.prepare(`
    UPDATE missions
    SET title = ?, description = ?, startup_id = ?, startup_name = ?,
        category = ?, points = ?, estimated_time = ?, status = ?,
        period = ?, completion_criteria = ?, active = ?
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
    id
  );

  const rows = db.prepare('SELECT * FROM missions').all() as Record<string, unknown>[];
  res.json(rows.map(mapMissionRow));
});

// Helper centralizado para iniciar a missão com controle de cronômetro e idempotência
function startMissionForParticipant(participantId: string, missionId: string) {
  ensureParticipantFirstMissionUnlockedInDb(participantId);

  const missionRow = db
    .prepare('SELECT * FROM missions WHERE id = ? LIMIT 1')
    .get(missionId) as Record<string, unknown> | undefined;

  if (!missionRow || !missionRow.active || missionRow.sequence_order === null) {
    return {
      ok: false,
      httpStatus: 404,
      errorCode: 'MISSION_NOT_FOUND',
      error: 'Missão não encontrada ou inativa.',
    };
  }

  const seqOrder = Number(missionRow.sequence_order);

  // Se for missão > 1, exige que a missão anterior esteja Concluída pelo participante
  if (seqOrder > 1) {
    const prevMission = db
      .prepare('SELECT id, title FROM missions WHERE sequence_order = ? AND active = 1 LIMIT 1')
      .get(seqOrder - 1) as { id: string; title: string } | undefined;

    if (prevMission) {
      const prevCompleteTx = db
        .prepare('SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1')
        .get(`COMPLETE:${participantId}:${prevMission.id}`);
      const prevPm = db
        .prepare(
          'SELECT status FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1'
        )
        .get(participantId, prevMission.id) as { status: string } | undefined;

      const isPrevCompleted =
        Boolean(prevCompleteTx) || (prevPm && String(prevPm.status) === 'Concluída');
      if (!isPrevCompleted) {
        return {
          ok: false,
          httpStatus: 403,
          errorCode: 'MISSION_LOCKED',
          error: `Missão bloqueada: conclua primeiro a Missão 0${seqOrder - 1} ("${prevMission.title}") para desbloquear esta missão.`,
        };
      }
    }
  }

  const currentPm = db
    .prepare(
      'SELECT * FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1'
    )
    .get(participantId, missionId) as Record<string, unknown> | undefined;

  if (currentPm && String(currentPm.status) === 'Concluída') {
    return {
      ok: false,
      httpStatus: 409,
      errorCode: 'ALREADY_COMPLETED',
      error: 'Esta missão já foi concluída anteriormente.',
    };
  }

  const nowMs = Date.now();
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
  const potentialSpeedBonus = isExpired
    ? 0
    : Math.max(
        0,
        Math.min(50, Math.round(50 * (remainingSeconds / effectiveDurationSeconds)))
      );

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
}

// Iniciação explícita da missão e do cronômetro (Etapa 3)
app.post('/api/missions/:id/start', (req, res) => {
  const { id } = req.params;
  const currentParticipant = getCurrentParticipantFromDb(req);
  const result = startMissionForParticipant(currentParticipant.id, id);

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
app.get('/api/missions/:id/timer', (req, res) => {
  const { id } = req.params;
  const currentParticipant = getCurrentParticipantFromDb(req);

  const pm = db
    .prepare(
      'SELECT * FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1'
    )
    .get(currentParticipant.id, id) as Record<string, unknown> | undefined;

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
      potentialSpeedBonus: 50,
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
    : Math.max(0, Math.min(50, Math.round(50 * (remainingSeconds / durationSeconds))));

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

app.patch('/api/missions/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status?: string };
  const currentParticipant = getCurrentParticipantFromDb(req);

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

app.post('/api/missions/:id/complete', (req, res) => {
  const { id } = req.params;
  const currentParticipant = getCurrentParticipantFromDb(req);

  const result = completeSequentialMissionInSql({
    participantId: currentParticipant.id,
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
  db.prepare('UPDATE missions SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(
    id
  );
  const rows = db.prepare('SELECT * FROM missions').all() as Record<string, unknown>[];
  res.json(rows.map(mapMissionRow));
});

app.delete('/api/missions/:id', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare('DELETE FROM missions WHERE id = ?').run(id);
  const rows = db.prepare('SELECT * FROM missions').all() as Record<string, unknown>[];
  res.json(rows.map(mapMissionRow));
});

app.get('/api/validations', requireAdmin, (_req, res) => {
  const rows = db
    .prepare('SELECT * FROM mission_completions ORDER BY rowid DESC')
    .all() as Record<string, unknown>[];
  res.json(rows.map(mapValidationRow));
});

app.post('/api/validations', (req, res) => {
  const p = req.body;
  const currentParticipant = getCurrentParticipantFromDb(req);
  const targetParticipantId = p.participantId || currentParticipant.id;

  ensureParticipantFirstMissionUnlockedInDb(targetParticipantId);

  const missionRow = db
    .prepare('SELECT * FROM missions WHERE id = ? LIMIT 1')
    .get(p.missionId) as Record<string, unknown> | undefined;

  if (missionRow && missionRow.sequence_order !== null && Number(missionRow.sequence_order) > 1) {
    const seqOrder = Number(missionRow.sequence_order);
    const prevMission = db
      .prepare('SELECT id, title FROM missions WHERE sequence_order = ? AND active = 1 LIMIT 1')
      .get(seqOrder - 1) as { id: string; title: string } | undefined;

    if (prevMission) {
      const prevCompleteTx = db
        .prepare('SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1')
        .get(`COMPLETE:${targetParticipantId}:${prevMission.id}`) as
        | { id: string }
        | undefined;
      if (!prevCompleteTx) {
        res.status(403).json({
          error: `Bloqueio sequencial: conclua primeiro a Missão 0${seqOrder - 1} antes de enviar evidências desta missão.`,
        });
        return;
      }
    }
  }

  const newId = `val-${Date.now()}`;
  const nowStr = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    db.prepare(`
      INSERT INTO mission_completions (
        id, participant_id, participant_name, mission_id, mission_title,
        startup_id, startup_name, submitted_at, evidence_description,
        evidence_code, points_awarded, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendente')
    `).run(
      newId,
      targetParticipantId,
      p.participantName || currentParticipant.name,
      p.missionId,
      p.missionTitle,
      p.startupId,
      p.startupName,
      nowStr,
      p.evidenceDescription,
      p.evidenceCode,
      MISSION_COMPLETION_POINTS
    );

    db.prepare(
      "UPDATE participant_missions SET status = 'Aguardando validação' WHERE participant_id = ? AND mission_id = ?"
    ).run(targetParticipantId, p.missionId);
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  const created = db
    .prepare('SELECT * FROM mission_completions WHERE id = ?')
    .get(newId) as Record<string, unknown>;
  res.status(201).json(mapValidationRow(created));
});

app.patch('/api/validations/:id/review', requireAdmin, (req, res) => {
  const { id } = req.params;
  const { decision } = req.body as { decision: 'Aprovada' | 'Rejeitada' };

  const row = db
    .prepare('SELECT * FROM mission_completions WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({ error: 'Item de validação não encontrado' });
    return;
  }

  const item = mapValidationRow(row);
  if (item.status === 'Aprovada' && decision === 'Aprovada') {
    res.status(409).json({ error: 'Este item de validação já foi aprovado anteriormente.' });
    return;
  }

  if (decision === 'Aprovada') {
    const seqResult = completeSequentialMissionInSql({
      participantId: item.participantId,
      missionId: item.missionId,
      sourceType: 'Missão',
    });
    if (!seqResult.ok && seqResult.httpStatus !== 409) {
      res.status(seqResult.httpStatus).json({ error: seqResult.message });
      return;
    }
    db.prepare('UPDATE mission_completions SET status = ? WHERE id = ?').run(decision, id);
  } else {
    db.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      db.prepare('UPDATE mission_completions SET status = ? WHERE id = ?').run(decision, id);
      db.prepare(
        "UPDATE participant_missions SET status = 'Disponível' WHERE participant_id = ? AND mission_id = ? AND status != 'Concluída'"
      ).run(item.participantId, item.missionId);
      db.exec('COMMIT;');
    } catch (err) {
      db.exec('ROLLBACK;');
      throw err;
    }
  }

  const rows = db
    .prepare('SELECT * FROM mission_completions ORDER BY rowid DESC')
    .all() as Record<string, unknown>[];
  res.json(rows.map(mapValidationRow));
});

// ============================================================================
// 6. QR CODES E LEITURA (CRIAÇÃO/ATIVAÇÃO PROTEGIDAS POR ADMIN)
// ============================================================================

app.get('/api/qrcodes', (_req, res) => {
  const rows = db.prepare('SELECT * FROM qr_codes').all() as Record<string, unknown>[];
  res.json(rows.map(mapQRCodeRow));
});

app.post('/api/qrcodes', requireAdmin, (req, res) => {
  const p = req.body;
  const newId = `qr-${Date.now()}`;
  const nowStr = new Date().toLocaleDateString('pt-BR');

  db.prepare(`
    INSERT INTO qr_codes (
      id, code, label, startup_id, startup_name, mission_id,
      mission_title, points, scans_count, active, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    newId,
    String(p.code).toUpperCase(),
    p.label,
    p.startupId,
    p.startupName,
    p.missionId,
    p.missionTitle,
    Number(p.points || 200),
    p.active === false ? 0 : 1,
    nowStr
  );

  const created = db
    .prepare('SELECT * FROM qr_codes WHERE id = ?')
    .get(newId) as Record<string, unknown>;
  res.status(201).json(mapQRCodeRow(created));
});

app.patch('/api/qrcodes/:id/toggle', requireAdmin, (req, res) => {
  const { id } = req.params;
  db.prepare('UPDATE qr_codes SET active = CASE WHEN active = 1 THEN 0 ELSE 1 END WHERE id = ?').run(
    id
  );
  const rows = db.prepare('SELECT * FROM qr_codes').all() as Record<string, unknown>[];
  res.json(rows.map(mapQRCodeRow));
});

app.post('/api/qrcodes/scan', (req, res) => {
  const { code } = req.body as { code?: string };
  const normalized = (code || '').trim().toUpperCase();

  if (!normalized) {
    res.status(400).json({
      success: false,
      status: 'INVALID_CODE',
      message: 'Informe ou escaneie um código QR válido.',
    });
    return;
  }

  const row = db
    .prepare('SELECT * FROM qr_codes WHERE UPPER(code) = ?')
    .get(normalized) as Record<string, unknown> | undefined;

  if (!row) {
    res.status(404).json({
      success: false,
      status: 'INVALID_CODE',
      message: `Código QR "${normalized}" inválido ou não localizado no banco SQLite. Verifique o totem do estande (ex.: TUTU-2026, TUTU-SIMULADOR ou FUTURIZE-2030).`,
    });
    return;
  }

  const qr = mapQRCodeRow(row);
  if (!qr.active) {
    res.status(400).json({
      success: false,
      status: 'INACTIVE_CODE',
      qrCode: qr,
      message: `O código ${qr.code} está temporariamente desativado pela organização.`,
    });
    return;
  }

  // Valida se o código pertence a uma missão existente e ativa
  const missionRow = db
    .prepare('SELECT * FROM missions WHERE id = ?')
    .get(qr.missionId) as Record<string, unknown> | undefined;

  if (!missionRow) {
    res.status(400).json({
      success: false,
      status: 'INVALID_MISSION',
      qrCode: qr,
      message: `O código ${qr.code} não pertence a uma missão válida cadastrada no sistema.`,
    });
    return;
  }

  const linkedMission = mapMissionRow(missionRow);
  if (!linkedMission.active) {
    res.status(400).json({
      success: false,
      status: 'INVALID_MISSION',
      qrCode: qr,
      message: `A missão "${linkedMission.title}" vinculada ao código ${qr.code} está inativa no momento.`,
    });
    return;
  }

  const currentParticipant = getCurrentParticipantFromDb(req);

  const result = completeSequentialMissionInSql({
    participantId: currentParticipant.id,
    missionId: qr.missionId,
    sourceType: 'QR Code',
    qrCodeRow: qr,
  });

  if (!result.ok) {
    res.status(result.httpStatus).json({
      success: false,
      status: result.status,
      alreadyUsed: result.alreadyUsed || false,
      qrCode: qr,
      message: result.message,
    });
    return;
  }

  const updatedRow = db
    .prepare('SELECT * FROM qr_codes WHERE id = ?')
    .get(qr.id) as Record<string, unknown>;

  res.json({
    success: true,
    status: 'VALIDATED',
    qrCode: mapQRCodeRow(updatedRow),
    completionPointsAwarded: result.completionPointsAwarded,
    speedBonusAwarded: result.speedBonusAwarded,
    unlockPointsAwarded: result.unlockPointsAwarded,
    pointsAwarded: result.pointsAwarded,
    nextMissionUnlocked: result.nextMissionUnlocked,
    message: result.message,
  });
});

// ============================================================================
// 7. RANKING, CONQUISTAS E TRANSAÇÕES (AJUSTES PROTEGIDOS POR ADMIN)
// ============================================================================

app.get('/api/ranking/public', (_req, res) => {
  res.json(getPublicRankingFromDb());
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

app.get('/api/achievements', (req, res) => {
  const currentParticipant = getCurrentParticipantFromDb(req);
  res.json(getParticipantAchievementsFromDb(currentParticipant));
});

// ============================================================================
// 8. CONFIGURAÇÕES DO EVENTO, MÉTRICAS E GOVERNANÇA — 12 PLANOS (ADMIN ONLY)
// ============================================================================

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

  const defaultTimer =
    u.defaultMissionTimerMinutes !== undefined
      ? Math.max(
          MIN_MISSION_TIMER_MINUTES,
          Math.min(MAX_MISSION_TIMER_MINUTES, Math.trunc(Number(u.defaultMissionTimerMinutes)))
        )
      : Number(row.default_mission_timer_minutes || 5);

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
      'SELECT id, title, sequence_order, timer_minutes FROM missions WHERE sequence_order IS NOT NULL AND active = 1 ORDER BY sequence_order ASC'
    )
    .all() as {
      id: string;
      title: string;
      sequence_order: number;
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
    if (body.defaultTimerMinutes !== undefined) {
      const defMin = Math.trunc(Number(body.defaultTimerMinutes));
      if (isNaN(defMin) || defMin < MIN_MISSION_TIMER_MINUTES || defMin > MAX_MISSION_TIMER_MINUTES) {
        db.exec('ROLLBACK;');
        res.status(400).json({
          error: `O tempo padrão deve ser um número inteiro entre ${MIN_MISSION_TIMER_MINUTES} e ${MAX_MISSION_TIMER_MINUTES} minutos.`,
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
        if (val === null || val === undefined || String(val) === '') {
          updateMissionTimer.run(null, mId);
        } else {
          const numVal = Math.trunc(Number(val));
          if (
            isNaN(numVal) ||
            numVal < MIN_MISSION_TIMER_MINUTES ||
            numVal > MAX_MISSION_TIMER_MINUTES
          ) {
            db.exec('ROLLBACK;');
            res.status(400).json({
              error: `O tempo individual da missão ${mId} deve estar entre ${MIN_MISSION_TIMER_MINUTES} e ${MAX_MISSION_TIMER_MINUTES} minutos (ou nulo para herdar o padrão global).`,
            });
            return;
          }
          updateMissionTimer.run(numVal, mId);
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
      'SELECT id, title, sequence_order, timer_minutes FROM missions WHERE sequence_order IS NOT NULL AND active = 1 ORDER BY sequence_order ASC'
    )
    .all() as {
      id: string;
      title: string;
      sequence_order: number;
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

const server = app.listen(PORT);

server.on('listening', () => {
  console.log(`[API + SQLite + RBAC] Servidor Express rodando em http://localhost:${PORT}`);
  console.log(`[API + SQLite + RBAC] Arquivo SQLite ativo: ${DB_FILE_PATH}`);
});

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
