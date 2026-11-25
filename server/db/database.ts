import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  initialEventSettings,
  initialGovernancePlans,
  initialMissions,
  initialQRCodes,
  initialStartups,
} from '../../src/mocks/mockData';
import {
  AdminDashboardMetrics,
  EventSettings,
  EvidenceFileItem,
  GovernancePlan,
  Mission,
  MissionCompletion,
  Participant,
  PointsTransaction,
  PublicRankingEntry,
  QRCode,
  Startup,
  UserRole,
} from '../../src/types';
import { hashPassword } from '../security/auth';
import { seedOfficialCatalog2026InDb } from '../scripts/seedOfficialCatalog2026';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_DIR = fs.existsSync(path.join(__dirname, 'schema.sql'))
  ? __dirname
  : path.resolve(process.cwd(), 'server/db');

export const DB_FILE_PATH = process.env.DESAFIO_DB_PATH
  ? path.resolve(process.env.DESAFIO_DB_PATH)
  : path.join(DB_DIR, 'desafio_global.sqlite');
const SCHEMA_FILE_PATH = path.join(DB_DIR, 'schema.sql');

fs.mkdirSync(path.dirname(DB_FILE_PATH), { recursive: true });

export const db = new DatabaseSync(DB_FILE_PATH);

let isDatabaseClosed = false;

export function closeDatabaseGracefully(): { checkpointed: boolean; closed: boolean } {
  if (isDatabaseClosed) {
    return { checkpointed: true, closed: true };
  }
  let checkpointed = false;
  try {
    db.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    checkpointed = true;
  } catch (err) {
    console.error('[SQLite] Aviso ao executar wal_checkpoint(TRUNCATE) no encerramento:', err);
  }
  try {
    db.close();
    isDatabaseClosed = true;
    return { checkpointed, closed: true };
  } catch (err) {
    console.error('[SQLite] Erro ao fechar conexão SQLite:', err);
    return { checkpointed, closed: false };
  }
}

export const MAX_PARTICIPANT_POINTS = 1000;
export const MISSION_UNLOCK_POINTS = 20;
export const MISSION_COMPLETION_POINTS = 180;
export const MISSION_MAX_SPEED_BONUS = 50;
export const SEQUENTIAL_MISSION_IDS = ['ms-01', 'ms-04', 'ms-06', 'ms-08'] as const;

export * from './circuitScoring';
export * from './dailyRanking';
export * from './evidenceStorage';
import { ensureDailyRankingSchema, ensureDailyRankingsClosedUpTo } from './dailyRanking';
import { ensureEvidenceStorageDir } from './evidenceStorage';

export const DEFAULT_MISSION_TIMER_MINUTES = 5;
export const MIN_MISSION_TIMER_MINUTES = 1;
export const MAX_MISSION_TIMER_MINUTES = 30;

function ensureColumnExists(tableName: string, columnName: string, columnDefinition: string): void {
  const cols = db.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
  const exists = cols.some((c) => c.name.toLowerCase() === columnName.toLowerCase());
  if (!exists) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnDefinition};`);
  }
}

/**
 * Retorna a duração configurada da missão em segundos (entre 1 e 30 minutos).
 * Se a missão possuir configuração individual, ela tem precedência;
 * caso contrário, herda a configuração global do evento (default 5 min).
 */
export function getMissionConfiguredDurationSeconds(missionId: string): number {
  const missionRow = db
    .prepare('SELECT timer_minutes FROM missions WHERE id = ? LIMIT 1')
    .get(missionId) as { timer_minutes: number | null } | undefined;

  if (missionRow && missionRow.timer_minutes !== null && missionRow.timer_minutes !== undefined) {
    const min = Math.max(
      MIN_MISSION_TIMER_MINUTES,
      Math.min(MAX_MISSION_TIMER_MINUTES, Math.trunc(Number(missionRow.timer_minutes)))
    );
    return min * 60;
  }

  const settingsRow = db
    .prepare('SELECT default_mission_timer_minutes FROM event_settings WHERE id = 1 LIMIT 1')
    .get() as { default_mission_timer_minutes: number | null } | undefined;

  const globalMin = settingsRow?.default_mission_timer_minutes
    ? Math.max(
        MIN_MISSION_TIMER_MINUTES,
        Math.min(
          MAX_MISSION_TIMER_MINUTES,
          Math.trunc(Number(settingsRow.default_mission_timer_minutes))
        )
      )
    : DEFAULT_MISSION_TIMER_MINUTES;

  return globalMin * 60;
}

export interface ParticipantPointsReservation {
  participantId: string;
  currentPoints: number;
  maxPoints: number;
  totalReservedPoints: number;
  freeMargin: number;
  missionBreakdown: {
    missionId: string;
    sequenceOrder: number;
    title: string;
    status: string;
    remainingUnlock: number;
    remainingCompletion: number;
    remainingSpeedBonus: number;
    totalMissionReserved: number;
  }[];
}

/**
 * Calcula de forma centralizada e determinística a reserva de pontos de cada participante,
 * considerando o estado real das 4 missões principais sequenciais e seus bônus de velocidade potenciais.
 *
 * Regras:
 * 1. Missão desbloqueada e não concluída: reserva 180 pts (conclusão) + até 50 pts (bônus potencial).
 * 2. Missão futura ainda bloqueada: reserva 20 pts (desbloqueio) + 180 pts (conclusão) + até 50 pts (bônus potencial).
 * 3. Missão concluída: não reserva pontos já creditados (desbloqueio e conclusão = 0); reserva bônus potencial restante.
 * 4. Saldo livre: MAX (0, 1.000 - pontosAtuais - totalReservado).
 */
/**
 * Verifica se uma transação específica foi estornada por lançamento compensatório
 * de simulação (`REVERSAL_SIMULATION:<participantId>:<transactionId>`).
 */
export function isTransactionReversedBySimulation(
  participantId: string,
  transactionId: string,
  targetDb: DatabaseSync = db
): boolean {
  const reversal = targetDb
    .prepare('SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1')
    .get(`REVERSAL_SIMULATION:${participantId}:${transactionId}`) as { id: string } | undefined;
  return Boolean(reversal);
}

/**
 * Consulta uma transação ativa (não estornada por REVERSAL_SIMULATION) por uma lista
 * de chaves candidatas (por exemplo, a chave base e a chave pós-estorno).
 */
export function findActiveTransactionByEventKeys(
  participantId: string,
  eventKeys: string[],
  targetDb: DatabaseSync = db
): { id: string; points_delta: number; event_key: string } | undefined {
  const stmt = targetDb.prepare(
    'SELECT id, points_delta, event_key FROM points_transactions WHERE event_key = ? LIMIT 1'
  );
  for (const key of eventKeys) {
    const tx = stmt.get(key) as { id: string; points_delta: number; event_key: string } | undefined;
    if (tx && !isTransactionReversedBySimulation(participantId, tx.id, targetDb)) {
      return tx;
    }
  }
  return undefined;
}

/**
 * Resolve a próxima chave de evento idempotente disponível para emissão de crédito,
 * preservando chaves históricas estornadas sem violar UNIQUE(event_key).
 */
export function resolveNextIdempotentEventKey(
  participantId: string,
  baseEventKey: string,
  postReversalEventKey: string = `${baseEventKey}:POST_SIM_REV`,
  targetDb: DatabaseSync = db
): string {
  const existingBase = targetDb
    .prepare('SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1')
    .get(baseEventKey) as { id: string } | undefined;

  if (existingBase && isTransactionReversedBySimulation(participantId, existingBase.id, targetDb)) {
    return postReversalEventKey;
  }
  return baseEventKey;
}

export function calculateParticipantReservedPoints(
  participantId: string
): ParticipantPointsReservation {
  const partRow = db
    .prepare('SELECT id, points FROM participants WHERE id = ? LIMIT 1')
    .get(participantId) as { id: string; points: number } | undefined;

  const currentPoints = partRow ? Number(partRow.points || 0) : 0;

  const seqMissions = db
    .prepare(`
      SELECT id, title, sequence_order, unlock_points, completion_points, max_speed_bonus
      FROM missions
      WHERE sequence_order IS NOT NULL AND active = 1
      ORDER BY sequence_order ASC
    `)
    .all() as {
      id: string;
      title: string;
      sequence_order: number;
      unlock_points: number;
      completion_points: number;
      max_speed_bonus: number;
    }[];

  const pmRows = db
    .prepare('SELECT * FROM participant_missions WHERE participant_id = ?')
    .all(participantId) as Record<string, unknown>[];
  const pmByMissionId = new Map<string, Record<string, unknown>>();
  for (const pm of pmRows) {
    pmByMissionId.set(String(pm.mission_id), pm);
  }

  let totalReservedPoints = 0;
  const missionBreakdown: ParticipantPointsReservation['missionBreakdown'] = [];

  for (const m of seqMissions) {
    const pm = pmByMissionId.get(m.id);
    const seq = Number(m.sequence_order);

    const unlockTx = findActiveTransactionByEventKeys(participantId, [
      `UNLOCK:${participantId}:${m.id}`,
      `UNLOCK:${participantId}:${m.id}:POST_SIM_REV`,
    ]);
    const reversalTx = db
      .prepare('SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1')
      .get(`REVERSAL:${participantId}:${m.id}`);
    const validatedUnlockTx = findActiveTransactionByEventKeys(participantId, [
      `UNLOCK_VALIDATED:${participantId}:${m.id}`,
      `UNLOCK_VALIDATED:${participantId}:${m.id}:POST_SIM_REV`,
    ]);
    const completeTx = findActiveTransactionByEventKeys(participantId, [
      `COMPLETE:${participantId}:${m.id}`,
      `COMPLETE:${participantId}:${m.id}:POST_SIM_REV`,
    ]);

    // Etapa 6 + Reconhecimento de estorno de simulação:
    // O desbloqueio só é considerado efetivamente creditado se:
    // a) Houver transação UNLOCK ativa (não estornada por REVERSAL nem REVERSAL_SIMULATION), ou
    // b) Houver transação UNLOCK_VALIDATED ativa (não estornada por REVERSAL_SIMULATION), ou
    // c) participant_missions já constar com unlock_points_awarded > 0
    const hasEffectiveUnlockPoints =
      (Boolean(unlockTx) && !Boolean(reversalTx)) ||
      Boolean(validatedUnlockTx) ||
      (pm !== undefined && Number(pm.unlock_points_awarded || 0) > 0);

    const isCompleted =
      Boolean(completeTx) ||
      (pm !== undefined &&
        (String(pm.status) === 'Concluída' || Number(pm.completion_points_awarded || 0) > 0));

    // 1. Desbloqueio: se não foi creditado efetivamente ainda, reservar o unlock_points dinâmico da missão
    const missionUnlock = m.unlock_points !== null && m.unlock_points !== undefined ? Number(m.unlock_points) : 0;
    const remainingUnlock = hasEffectiveUnlockPoints ? 0 : missionUnlock;

    // 2. Conclusão: se não foi creditado ainda, reservar o completion_points dinâmico da missão
    const missionCompletion = m.completion_points !== null && m.completion_points !== undefined ? Number(m.completion_points) : 0;
    const remainingCompletion = isCompleted ? 0 : missionCompletion;

    // 3. Bônus potencial de velocidade: reservar o max_speed_bonus dinâmico da missão
    // Quando a missão é concluída, o bônus de velocidade já foi avaliado e creditado
    // no saldo do participante (ou 0 se expirada), portanto deixa de ser reservado.
    const maxBonus = m.max_speed_bonus !== null && m.max_speed_bonus !== undefined ? Number(m.max_speed_bonus) : 0;
    const awardedBonus = pm ? Number(pm.speed_bonus_awarded || 0) : 0;
    const remainingSpeedBonus = isCompleted ? 0 : Math.max(0, maxBonus - awardedBonus);

    const totalMissionReserved = remainingUnlock + remainingCompletion + remainingSpeedBonus;
    totalReservedPoints += totalMissionReserved;

    let computedStatus = 'Bloqueada';
    const isAvailableOrUnlocked = seq === 1 || (pm !== undefined && String(pm.status) !== 'Bloqueada');
    if (isCompleted) {
      computedStatus = 'Concluída';
    } else if (isAvailableOrUnlocked) {
      computedStatus = pm ? String(pm.status) : 'Disponível';
    }

    missionBreakdown.push({
      missionId: m.id,
      sequenceOrder: seq,
      title: m.title,
      status: computedStatus,
      remainingUnlock,
      remainingCompletion,
      remainingSpeedBonus,
      totalMissionReserved,
    });
  }

  const freeMargin = Math.max(0, MAX_PARTICIPANT_POINTS - currentPoints - totalReservedPoints);

  return {
    participantId,
    currentPoints,
    maxPoints: MAX_PARTICIPANT_POINTS,
    totalReservedPoints,
    freeMargin,
    missionBreakdown,
  };
}

/**
 * Garante de forma idempotente e atômica que o participante tenha as 4 missões sequenciais
 * inicializadas em participant_missions, com a Missão 1 disponível desde o início.
 *
 * REGRA ETAPA 6: NENHUM PONTO é creditado nesta função. O participante inicia com 0 pontos.
 * Os 20 pontos de desbloqueio da Missão 1 só são creditados quando a atividade for efetivamente
 * validada no backend (em completeSequentialMissionInSql).
 */
export function ensureParticipantFirstMissionUnlockedInDb(participantId: string): void {
  const savepointName = `sp_unlock_${Date.now()}_${Math.random().toString(36).replace(/[^a-zA-Z0-9_]/g, '')}`;
  db.exec(`SAVEPOINT ${savepointName};`);
  try {
    const partRow = db
      .prepare("SELECT * FROM participants WHERE id = ? AND UPPER(role) = 'PARTICIPANT' LIMIT 1")
      .get(participantId) as Record<string, unknown> | undefined;
    if (!partRow) {
      db.exec(`RELEASE ${savepointName};`);
      return;
    }

    const seqMissions = db
      .prepare(
        "SELECT * FROM missions WHERE sequence_order IS NOT NULL AND active = 1 ORDER BY COALESCE(track_id, 'default') ASC, sequence_order ASC"
      )
      .all() as Record<string, unknown>[];
    if (seqMissions.length === 0) {
      db.exec(`RELEASE ${savepointName};`);
      return;
    }

    const nowMs = Date.now();

    for (const mRow of seqMissions) {
      const mId = String(mRow.id);
      const seqOrder = Number(mRow.sequence_order);

      if (seqOrder === 1) {
        // Garante o registro da 1ª missão de cada trilha como 'Disponível',
        // preservando estados ativos ('Concluída', 'Em andamento', 'Aguardando validação').
        // NÃO gera transação contábil nem altera participants.points!
        db.prepare(`
          INSERT INTO participant_missions (
            id, participant_id, mission_id, sequence_order, status,
            unlocked_at_ms, unlock_points_awarded, completion_points_awarded,
            speed_bonus_awarded, total_points_awarded
          ) VALUES (?, ?, ?, 1, 'Disponível', ?, 0, 0, 0, 0)
          ON CONFLICT(participant_id, mission_id) DO UPDATE SET
            status = CASE
              WHEN participant_missions.status IN ('Concluída', 'Em andamento', 'Aguardando validação')
                THEN participant_missions.status
              ELSE 'Disponível'
            END,
            unlocked_at_ms = COALESCE(participant_missions.unlocked_at_ms, excluded.unlocked_at_ms)
        `).run(
          `pm-${participantId}-${mId}`,
          participantId,
          mId,
          nowMs
        );
      } else {
        // Missões subsequentes (2..K) da trilha iniciam Bloqueadas até aprovação da anterior
        db.prepare(`
          INSERT INTO participant_missions (
            id, participant_id, mission_id, sequence_order, status,
            unlocked_at_ms, unlock_points_awarded, completion_points_awarded,
            speed_bonus_awarded, total_points_awarded
          ) VALUES (?, ?, ?, ?, 'Bloqueada', NULL, 0, 0, 0, 0)
          ON CONFLICT(participant_id, mission_id) DO NOTHING
        `).run(
          `pm-${participantId}-${mId}`,
          participantId,
          mId,
          seqOrder
        );
      }
    }

    db.exec(`RELEASE ${savepointName};`);
  } catch (err) {
    db.exec(`ROLLBACK TO ${savepointName};`);
    console.error(`[SQLite] Erro ao garantir disponibilidade da 1ª missão para ${participantId}:`, err);
  }
}

/**
 * ETAPA 6: Reconciliação e Estorno Idempotente dos Desbloqueios Antecipados da Missão 1.
 * Localiza transações automáticas antigas da Missão 1 concedidas pela regra anterior da Etapa 2
 * a participantes que NÃO concluíram validamente a missão, e emite uma transação compensatória
 * de estorno (-20 pts), preservando o registro histórico original.
 */
export function reconcileLegacyFirstMissionUnlockPointsInDb(): void {
  const savepointName = `sp_reconcile_${Date.now()}_${Math.random().toString(36).replace(/[^a-zA-Z0-9_]/g, '')}`;
  db.exec(`SAVEPOINT ${savepointName};`);
  try {
    const nowMs = Date.now();
    const nowStr = new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // 1. Localizar transações UNLOCK da Missão 1 de participantes do tipo PARTICIPANT
    const legacyUnlockTxs = db.prepare(`
      SELECT pt.id as tx_id, pt.participant_id, pt.points_delta, pt.event_key,
             p.name as participant_name, p.points as current_points, p.completed_missions_count
      FROM points_transactions pt
      JOIN participants p ON p.id = pt.participant_id
      WHERE pt.event_key LIKE 'UNLOCK:%:ms-01'
        AND pt.points_delta = 20
        AND UPPER(p.role) = 'PARTICIPANT'
    `).all() as {
      tx_id: string;
      participant_id: string;
      points_delta: number;
      event_key: string;
      participant_name: string;
      current_points: number;
      completed_missions_count: number;
    }[];

    for (const tx of legacyUnlockTxs) {
      const partId = String(tx.participant_id);
      const reversalEventKey = `REVERSAL:${partId}:ms-01`;

      // 2. Verificar se o estorno já foi realizado anteriormente (idempotência)
      const existingReversal = db.prepare(
        'SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1'
      ).get(reversalEventKey);

      if (existingReversal) {
        continue; // Já estornado anteriormente
      }

      // 3. Verificar se o participante cumpriu a atividade validada
      const completeTx = db.prepare(
        'SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1'
      ).get(`COMPLETE:${partId}:ms-01`);

      const pmRow = db.prepare(
        'SELECT status, completion_points_awarded FROM participant_missions WHERE participant_id = ? AND mission_id = ? LIMIT 1'
      ).get(partId, 'ms-01') as { status: string; completion_points_awarded: number } | undefined;

      const hasCompletedMission1 =
        Boolean(completeTx) ||
        (pmRow && (String(pmRow.status) === 'Concluída' || Number(pmRow.completion_points_awarded) > 0));

      if (hasCompletedMission1) {
        // Participante completou validamente a Missão 1; não estornar!
        continue;
      }

      // 4. Executa o estorno de exatamente 20 pontos de forma compensatória
      const freshPart = db.prepare('SELECT id, name, points FROM participants WHERE id = ?')
        .get(partId) as { id: string; name: string; points: number } | undefined;
      if (!freshPart) continue;

      const prevBal = Number(freshPart.points || 0);
      const newBal = Math.max(0, prevBal - 20);
      const reversalDelta = newBal - prevBal; // -20

      const reversalTxId = `tx-rev-${nowMs}-${Math.random().toString(36).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 6)}`;

      // 5. Registra nova transação compensatória preservando a original intacta
      const revInsertRes = db.prepare(`
        INSERT OR IGNORE INTO points_transactions (
          id, participant_id, participant_name, source_type, source_title,
          points_delta, previous_balance, new_balance, created_at, event_key, mission_id
        ) VALUES (?, ?, ?, 'Ajuste', 'Estorno: Desbloqueio antecipado da Missão 1 (Regra Etapa 6)', ?, ?, ?, ?, ?, 'ms-01')
      `).run(
        reversalTxId,
        partId,
        String(freshPart.name),
        reversalDelta,
        prevBal,
        newBal,
        nowStr,
        reversalEventKey
      );

      if (Number(revInsertRes.changes) === 1) {
        db.prepare('UPDATE participants SET points = ? WHERE id = ?').run(newBal, partId);

        // Atualiza participant_missions para refletir unlock_points_awarded = 0
        db.prepare(`
          UPDATE participant_missions
          SET unlock_points_awarded = 0,
              total_points_awarded = completion_points_awarded + speed_bonus_awarded
          WHERE participant_id = ? AND mission_id = 'ms-01'
        `).run(partId);
      }
    }

    db.exec(`RELEASE ${savepointName};`);
  } catch (err) {
    db.exec(`ROLLBACK TO ${savepointName};`);
    console.error('[SQLite] Erro ao executar estorno de desbloqueios antecipados da Missão 1:', err);
    throw err;
  }
}

/**
 * Inicializa o schema, executa migração compatível de RBAC (PARTICIPANT / ADMIN)
 * e garante os catálogos essenciais do sistema.
 */
export function initializeDatabase(): void {
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA synchronous = NORMAL;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec('PRAGMA foreign_keys = ON;');

  const schemaSql = fs.readFileSync(SCHEMA_FILE_PATH, 'utf-8');
  db.exec(schemaSql);

  db.exec('BEGIN TRANSACTION;');
  try {
    // Migração compatível de RBAC: normalizar valores legados 'participant' / 'admin'
    db.prepare(
      "UPDATE participants SET role = 'PARTICIPANT' WHERE LOWER(role) = 'participant' OR role IS NULL OR TRIM(role) = ''"
    ).run();
    db.prepare("UPDATE participants SET role = 'ADMIN' WHERE LOWER(role) = 'admin'").run();

    const participantCols = db.prepare('PRAGMA table_info(participants)').all() as { name: string }[];
    if (!participantCols.some((c) => c.name === 'startup_id')) {
      db.exec('ALTER TABLE participants ADD COLUMN startup_id TEXT;');
    }

    // Provisionamento opcional do primeiro ADMIN via variáveis de ambiente (sem credenciais fixas no código)
    const envAdminEmail = process.env.ADMIN_INITIAL_EMAIL?.trim().toLowerCase();
    const envAdminPassword = process.env.ADMIN_INITIAL_PASSWORD;
    const envAdminName = process.env.ADMIN_INITIAL_NAME?.trim() || 'Administrador Geral';

    if (envAdminEmail && envAdminPassword) {
      if (envAdminPassword.length < 8) {
        console.warn(
          '[RBAC] ADMIN_INITIAL_PASSWORD deve possuir no mínimo 8 caracteres. Provisionamento ignorado.'
        );
      } else {
        const passwordHash = hashPassword(envAdminPassword);
        const existingUser = db
          .prepare('SELECT id FROM participants WHERE LOWER(email) = ?')
          .get(envAdminEmail) as { id: string } | undefined;

        if (existingUser) {
          db.prepare(
            "UPDATE participants SET role = 'ADMIN', password_hash = ?, status = 'Ativo' WHERE id = ?"
          ).run(passwordHash, existingUser.id);
          console.log(`[RBAC] Conta administrativa atualizada via ambiente: ${envAdminEmail}`);
        } else {
          const adminId = `admin-${Date.now()}`;
          const initials = envAdminName
            .split(/\s+/)
            .map((p) => p[0])
            .join('')
            .slice(0, 2)
            .toUpperCase();
          const nowStr = new Date().toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
          db.prepare(`
            INSERT INTO participants (
              id, name, nickname, email, password_hash, role, avatar, points,
              ranking_position, completed_missions_count, visited_startups_json,
              registered_at, status,
              show_nickname_in_public_ranking, allow_activity_notifications,
              share_startup_interests, is_current_session
            ) VALUES (?, ?, ?, ?, ?, 'ADMIN', ?, 0, 1, 0, '[]', ?, 'Ativo', 1, 1, 0, 0)
          `).run(
            adminId,
            envAdminName,
            envAdminName.split(/\s+/)[0],
            envAdminEmail,
            passwordHash,
            initials || 'AD',
            nowStr
          );
          console.log(`[RBAC] Primeira conta administrativa criada via ambiente: ${envAdminEmail}`);
        }
      }
    }

    // Garante usuário admin padrão "Global" caso ainda não exista no banco
    const defaultGlobalAdminEmail = 'global@unne.cloud';
    const existingGlobalAdmin = db
      .prepare('SELECT id FROM participants WHERE LOWER(email) = ?')
      .get(defaultGlobalAdminEmail) as { id: string } | undefined;
    if (!existingGlobalAdmin) {
      const globalAdminHash = hashPassword('Gl0b4l2026');
      const nowStr = new Date().toLocaleString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
      db.prepare(`
        INSERT INTO participants (
          id, name, nickname, email, password_hash, role, avatar, points,
          ranking_position, completed_missions_count, visited_startups_json,
          registered_at, status,
          show_nickname_in_public_ranking, allow_activity_notifications,
          share_startup_interests, is_current_session
        ) VALUES ('admin-global', 'Global', 'Global', ?, ?, 'ADMIN', 'GL', 0, 1, 0, '[]', ?, 'Ativo', 1, 1, 0, 0)
      `).run(defaultGlobalAdminEmail, globalAdminHash, nowStr);
    }

    // 1. Event Settings
    const settingsCount = (
      db.prepare('SELECT COUNT(*) as total FROM event_settings').get() as { total: number }
    ).total;
    if (settingsCount === 0) {
      db.prepare(`
        INSERT OR IGNORE INTO event_settings (
          id, event_name, edition_year, dates, location, city, description,
          active_period, scoring_rules_json, tie_breaker_criteria_json,
          rewards_enabled, rewards_legal_note, rewards_description
        ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        initialEventSettings.eventName,
        initialEventSettings.editionYear,
        initialEventSettings.dates,
        initialEventSettings.location,
        initialEventSettings.city,
        initialEventSettings.description,
        initialEventSettings.activePeriod,
        JSON.stringify(initialEventSettings.scoringRules),
        JSON.stringify(initialEventSettings.tieBreakerCriteria),
        initialEventSettings.rewardsEnabled ? 1 : 0,
        initialEventSettings.rewardsLegalNote,
        initialEventSettings.rewardsDescription
      );
    }

    // 2. Startups
    const startupsCount = (
      db.prepare('SELECT COUNT(*) as total FROM startups').get() as { total: number }
    ).total;
    if (startupsCount === 0) {
      const insertStartup = db.prepare(`
        INSERT OR IGNORE INTO startups (
          id, name, short_name, tagline, description, category,
          solution_presentation, booth_number, logo_text, available_points,
          active, is_configurable_guest, website
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const s of initialStartups) {
        insertStartup.run(
          s.id,
          s.name,
          s.shortName,
          s.tagline,
          s.description,
          s.category,
          s.solutionPresentation,
          s.boothNumber,
          s.logoText,
          s.availablePoints,
          s.active ? 1 : 0,
          s.isConfigurableGuest ? 1 : 0,
          s.website || null
        );
      }
    }

    // 3. Missions
    const missionsCount = (
      db.prepare('SELECT COUNT(*) as total FROM missions').get() as { total: number }
    ).total;
    if (missionsCount === 0) {
      const insertMission = db.prepare(`
        INSERT OR IGNORE INTO missions (
          id, title, description, startup_id, startup_name, category,
          points, estimated_time, status, period, completion_criteria,
          active, qr_code_required, quiz_questions_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const m of initialMissions) {
        insertMission.run(
          m.id,
          m.title,
          m.description,
          m.startupId,
          m.startupName,
          m.category,
          m.points,
          m.estimatedTime,
          m.status,
          m.period,
          m.completionCriteria,
          m.active ? 1 : 0,
          m.qrCodeRequired || null,
          m.quizQuestions ? JSON.stringify(m.quizQuestions) : null
        );
      }
    }

    // 4. QR Codes
    const qrCount = (
      db.prepare('SELECT COUNT(*) as total FROM qr_codes').get() as { total: number }
    ).total;
    if (qrCount === 0) {
      const insertQR = db.prepare(`
        INSERT OR IGNORE INTO qr_codes (
          id, code, label, startup_id, startup_name, mission_id,
          mission_title, points, scans_count, active, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `);
      for (const q of initialQRCodes) {
        insertQR.run(
          q.id,
          q.code,
          q.label,
          q.startupId,
          q.startupName,
          q.missionId,
          q.missionTitle,
          q.points,
          q.active ? 1 : 0,
          q.createdAt
        );
      }
    }

    // 6. Governance Plans (12 Planos)
    const govCount = (
      db.prepare('SELECT COUNT(*) as total FROM governance_plans').get() as { total: number }
    ).total;
    if (govCount === 0) {
      const insertPlan = db.prepare(`
        INSERT OR IGNORE INTO governance_plans (
          id, code, name, objective, description, responsible,
          indicators, status, related_documents_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const plan of initialGovernancePlans) {
        insertPlan.run(
          plan.id,
          plan.code,
          plan.name,
          plan.objective,
          plan.description,
          plan.responsible,
          plan.indicators,
          plan.status,
          JSON.stringify(plan.relatedDocuments)
        );
      }
    }

    // 7. Migração Etapa 2 + Catálogo Oficial 2026 (colunas aditivas idempotentes)
    ensureColumnExists('missions', 'unlock_points', 'INTEGER NOT NULL DEFAULT 20');
    ensureColumnExists('missions', 'completion_points', 'INTEGER NOT NULL DEFAULT 180');
    ensureColumnExists('missions', 'max_speed_bonus', 'INTEGER NOT NULL DEFAULT 50');
    ensureColumnExists('missions', 'sequence_order', 'INTEGER');
    ensureColumnExists('missions', 'track_id', 'TEXT');
    ensureColumnExists('missions', 'relative_weight', 'INTEGER NOT NULL DEFAULT 10');
    ensureColumnExists('missions', 'max_video_seconds', 'INTEGER');
    ensureColumnExists('missions', 'allow_shared_evidence', 'INTEGER NOT NULL DEFAULT 0');
    ensureColumnExists('missions', 'is_surprise', 'INTEGER NOT NULL DEFAULT 0');
    ensureColumnExists('missions', 'external_link', 'TEXT');
    ensureColumnExists('missions', 'required_evidence_count', 'INTEGER NOT NULL DEFAULT 1');

    // Múltiplas evidências exclusivamente para a missão bônus etapa 5 (ms-2026-bonus-05)
    db.prepare(
      "UPDATE missions SET required_evidence_count = 3 WHERE id = 'ms-2026-bonus-05'"
    ).run();

    db.exec(`
      CREATE TABLE IF NOT EXISTS mission_completion_files (
        id TEXT PRIMARY KEY,
        completion_id TEXT NOT NULL,
        file_order INTEGER NOT NULL DEFAULT 1,
        file_name TEXT NOT NULL,
        stored_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        sha256 TEXT NOT NULL,
        duration_seconds INTEGER,
        created_at TEXT NOT NULL,
        FOREIGN KEY (completion_id) REFERENCES mission_completions(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_mission_completion_files_completion
        ON mission_completion_files(completion_id, file_order);
      CREATE INDEX IF NOT EXISTS idx_mission_completion_files_sha256
        ON mission_completion_files(sha256);
    `);

    ensureColumnExists('startups', 'instagram_url', 'TEXT');
    ensureColumnExists('startups', 'logo_path', 'TEXT');

    ensureColumnExists('points_transactions', 'event_key', 'TEXT');
    ensureColumnExists('points_transactions', 'mission_id', 'TEXT');

    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_points_tx_unique_event
      ON points_transactions(event_key)
      WHERE event_key IS NOT NULL;
    `);

    // Remove eventuais duplicatas históricas em qr_scans antes de aplicar índice único
    db.exec(`
      DELETE FROM qr_scans
      WHERE rowid NOT IN (
        SELECT MIN(rowid)
        FROM qr_scans
        GROUP BY qr_code_id, participant_id
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_qr_scans_unique_participant
      ON qr_scans(qr_code_id, participant_id);
    `);

    // Só aplica a sincronização legada das 4 missões se o catálogo oficial em 4 trilhas AINDA NÃO estiver carregado
    const hasOfficialTracksCatalog =
      Number(
        (
          db
            .prepare('SELECT COUNT(*) as total FROM missions WHERE track_id IS NOT NULL')
            .get() as { total: number }
        )?.total || 0
      ) > 0;

    if (!hasOfficialTracksCatalog) {
      // Configura as 4 Startups legadas com teto de 250 pontos cada (4 x 250 = 1.000 pts)
      db.prepare(
        "UPDATE startups SET available_points = 250 WHERE id IN ('st-tutu', 'st-escrevelab', 'st-futurize', 'st-convidada')"
      ).run();

      const sequentialMissionsConfig = [
        {
          id: 'ms-01',
          seq: 1,
          status: 'Disponível',
          criteria: 'Missão 01/04 • Desbloqueio: +20 pts | Conclusão (QR Code TUTU-2026): +180 pts.',
        },
        {
          id: 'ms-04',
          seq: 2,
          status: 'Bloqueada',
          criteria:
            'Missão 02/04 • Desbloqueada após concluir a Missão 01 (+20 pts) | Conclusão (QR Code ESCREVE-PITCH): +180 pts.',
        },
        {
          id: 'ms-06',
          seq: 3,
          status: 'Bloqueada',
          criteria:
            'Missão 03/04 • Desbloqueada após concluir a Missão 02 (+20 pts) | Conclusão (QR Code FUTURIZE-2030): +180 pts.',
        },
        {
          id: 'ms-08',
          seq: 4,
          status: 'Bloqueada',
          criteria:
            'Missão 04/04 • Desbloqueada após concluir a Missão 03 (+20 pts) | Conclusão (QR Code SUMMIT-SURPRESA): +180 pts.',
        },
      ];

      for (const cfg of sequentialMissionsConfig) {
        db.prepare(`
          UPDATE missions
          SET sequence_order = ?,
              points = ?,
              unlock_points = ?,
              completion_points = ?,
              max_speed_bonus = ?,
              status = ?,
              completion_criteria = ?,
              active = 1
          WHERE id = ?
        `).run(
          cfg.seq,
          MISSION_COMPLETION_POINTS,
          MISSION_UNLOCK_POINTS,
          MISSION_COMPLETION_POINTS,
          MISSION_MAX_SPEED_BONUS,
          cfg.status,
          cfg.criteria,
          cfg.id
        );
      }

      db.prepare(
        "UPDATE missions SET sequence_order = NULL, active = 0 WHERE id IN ('ms-02', 'ms-03', 'ms-05', 'ms-07')"
      ).run();

      db.prepare('UPDATE qr_codes SET points = ?').run(MISSION_COMPLETION_POINTS);
      db.prepare(
        "UPDATE qr_codes SET mission_id = 'ms-01', mission_title = 'Check-in no Estande Tutu (Ex Devedor)' WHERE id = 'qr-02'"
      ).run();
    }

    // 8. Migração Etapa 3 + Catálogo 2026 — Cronômetro, Evidências, Vídeo e LGPD
    ensureColumnExists(
      'event_settings',
      'default_mission_timer_minutes',
      'INTEGER NOT NULL DEFAULT 5'
    );
    ensureColumnExists('participants', 'phone', 'TEXT');
    ensureColumnExists('participants', 'image_publicity_consent', 'INTEGER NOT NULL DEFAULT 0');
    ensureColumnExists('participants', 'image_publicity_consent_updated_at', 'TEXT');
    ensureColumnExists('participants', 'image_publicity_consent_version', 'TEXT');
    ensureColumnExists('participants', 'disqualified_at', 'TEXT');
    ensureColumnExists('participants', 'disqualified_by', 'TEXT');
    ensureColumnExists('participants', 'disqualification_reason', 'TEXT');
    ensureColumnExists('points_transactions', 'created_at_ms', 'INTEGER');
    ensureColumnExists('points_transactions', 'source_completion_id', 'TEXT');
    db.exec(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_points_tx_unique_reversal_evidence
      ON points_transactions(event_key)
      WHERE event_key LIKE 'REVERSAL_EVIDENCE:%';
    `);
    ensureColumnExists('missions', 'timer_minutes', 'INTEGER');
    ensureColumnExists('missions', 'requires_evidence', 'INTEGER NOT NULL DEFAULT 0');
    ensureColumnExists('missions', 'evidence_type', 'TEXT');
    ensureColumnExists('mission_completions', 'evidence_file_name', 'TEXT');
    ensureColumnExists('mission_completions', 'evidence_stored_name', 'TEXT');
    ensureColumnExists('mission_completions', 'evidence_mime_type', 'TEXT');
    ensureColumnExists('mission_completions', 'evidence_size_bytes', 'INTEGER');
    ensureColumnExists('mission_completions', 'evidence_sha256', 'TEXT');
    ensureColumnExists('mission_completions', 'evidence_duration_seconds', 'INTEGER');
    ensureColumnExists('mission_completions', 'rejection_reason', 'TEXT');
    ensureColumnExists('mission_completions', 'reviewed_by', 'TEXT');
    ensureColumnExists('mission_completions', 'reviewed_at', 'TEXT');
    ensureColumnExists('mission_completions', 'reversed_points', 'INTEGER NOT NULL DEFAULT 0');
    ensureColumnExists('mission_completions', 'reversed_at', 'TEXT');
    db.exec(`
      CREATE TABLE IF NOT EXISTS winner_homologations (
        id TEXT PRIMARY KEY,
        scope TEXT NOT NULL CHECK (scope IN ('GERAL', 'DIARIO')),
        event_date TEXT,
        participant_id TEXT NOT NULL,
        participant_name TEXT NOT NULL,
        points INTEGER NOT NULL,
        ranking_position INTEGER NOT NULL,
        evidence_summary_json TEXT NOT NULL,
        data_fingerprint TEXT NOT NULL,
        homologated_by TEXT NOT NULL,
        homologated_at TEXT NOT NULL,
        homologated_at_ms INTEGER NOT NULL,
        status TEXT NOT NULL DEFAULT 'Homologado' CHECK (status IN ('Homologado', 'Invalidado')),
        invalidated_reason TEXT,
        invalidated_at TEXT
      );
      CREATE INDEX IF NOT EXISTS idx_winner_homologations_scope
      ON winner_homologations(scope, event_date, status);
    `);
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_mission_completions_sha256
      ON mission_completions(evidence_sha256)
      WHERE evidence_sha256 IS NOT NULL;
    `);

    // Índice único parcial para impedir mais de uma submissão ativa (Pendente/Aprovada) por participante e missão.
    // Verifica previamente se existem duplicidades legadas para preservar histórico sem falhar inicialização.
    const legacyActiveDuplicate = db
      .prepare(
        `SELECT participant_id, mission_id, COUNT(*) as total
         FROM mission_completions
         WHERE status IN ('Pendente', 'Aprovada')
         GROUP BY participant_id, mission_id
         HAVING total > 1
         LIMIT 1`
      )
      .get() as { total: number } | undefined;

    if (!legacyActiveDuplicate) {
      db.exec(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_mission_completions_active_unique
        ON mission_completions(participant_id, mission_id)
        WHERE status IN ('Pendente', 'Aprovada');
      `);
    }

    ensureColumnExists('participant_missions', 'duration_seconds', 'INTEGER');
    ensureColumnExists('participant_missions', 'target_end_at_ms', 'INTEGER');
    ensureColumnExists('participant_missions', 'submitted_at_ms', 'INTEGER');

    // Garante o limite global de 1.000 pontos e o desbloqueio inicial da Missão 1 (+20 pts) para participantes existentes
    db.prepare('UPDATE participants SET points = ? WHERE points > ?').run(
      MAX_PARTICIPANT_POINTS,
      MAX_PARTICIPANT_POINTS
    );
    const existingParticipants = db
      .prepare("SELECT id FROM participants WHERE UPPER(role) = 'PARTICIPANT'")
      .all() as { id: string }[];
    for (const p of existingParticipants) {
      ensureParticipantFirstMissionUnlockedInDb(p.id);
    }
    reconcileLegacyFirstMissionUnlockPointsInDb();
    recalculateRankingsInDb();

    db.exec('COMMIT;');

    // Auto-seed idempotente do Catálogo Oficial 2026 (3 startups + 14 missões em 4 trilhas)
    // em bancos novos ou que ainda só possuem o catálogo legado (track_id IS NULL).
    const officialTracksCount = Number(
      (
        db
          .prepare('SELECT COUNT(*) as total FROM missions WHERE track_id IS NOT NULL')
          .get() as { total: number }
      )?.total || 0
    );
    if (officialTracksCount === 0) {
      seedOfficialCatalog2026InDb(db);
      db.prepare(
        "UPDATE missions SET required_evidence_count = 3 WHERE id = 'ms-2026-bonus-05'"
      ).run();
      console.log(
        '[SQLite] Catálogo Oficial 2026 (3 startups e 14 missões em 4 trilhas) aplicado automaticamente.'
      );
    }

    ensureDailyRankingSchema(db);
    ensureDailyRankingsClosedUpTo(db);
    ensureEvidenceStorageDir();
  } catch (err) {
    try {
      db.exec('ROLLBACK;');
    } catch {
      // transação já finalizada ou revertida
    }
    console.error('[SQLite] Erro ao verificar inicialização do banco:', err);
    throw err;
  }
}

// ============================================================================
// MAPPERS SQLITE ROW -> INTERFACES TYPESCRIPT
// ============================================================================

export function mapParticipantRow(row: Record<string, unknown>): Participant {
  const rawRole = String(row.role || 'PARTICIPANT').toUpperCase();
  const role: UserRole =
    rawRole === 'ADMIN' ? 'ADMIN' : rawRole === 'STARTUP' ? 'STARTUP' : 'PARTICIPANT';

  return {
    id: String(row.id),
    name: String(row.name),
    nickname: String(row.nickname),
    email: String(row.email),
    phone: row.phone ? String(row.phone) : null,
    role,
    startupId: row.startup_id ? String(row.startup_id) : null,
    avatar: String(row.avatar),
    points: Number(row.points),
    rankingPosition: Number(row.ranking_position),
    completedMissionsCount: Number(row.completed_missions_count),
    visitedStartupsIds: JSON.parse(String(row.visited_startups_json || '[]')),
    registeredAt: String(row.registered_at),
    status: row.status as Participant['status'],
    disqualifiedAt: row.disqualified_at ? String(row.disqualified_at) : null,
    disqualifiedBy: row.disqualified_by ? String(row.disqualified_by) : null,
    disqualificationReason: row.disqualification_reason ? String(row.disqualification_reason) : null,
    privacyPreferences: {
      showNicknameInPublicRanking: Boolean(row.show_nickname_in_public_ranking),
      allowActivityNotifications: Boolean(row.allow_activity_notifications),
      shareStartupInterests: Boolean(row.share_startup_interests),
    },
    imagePublicityConsent: Boolean(row.image_publicity_consent),
    imagePublicityConsentUpdatedAt: row.image_publicity_consent_updated_at
      ? String(row.image_publicity_consent_updated_at)
      : null,
    imagePublicityConsentVersion: row.image_publicity_consent_version
      ? String(row.image_publicity_consent_version)
      : null,
  };
}

export function mapStartupRow(row: Record<string, unknown>): Startup {
  return {
    id: String(row.id),
    name: String(row.name),
    shortName: String(row.short_name),
    tagline: String(row.tagline),
    description: String(row.description),
    category: String(row.category),
    solutionPresentation: String(row.solution_presentation),
    boothNumber: String(row.booth_number),
    logoText: String(row.logo_text),
    availablePoints: Number(row.available_points),
    active: Boolean(row.active),
    isConfigurableGuest: Boolean(row.is_configurable_guest),
    website: row.website ? String(row.website) : undefined,
    instagramUrl: row.instagram_url ? String(row.instagram_url) : undefined,
    logoPath: row.logo_path ? String(row.logo_path) : undefined,
  };
}

export function mapMissionRow(row: Record<string, unknown>): Mission {
  const validEvidenceTypes = new Set([
    'photo',
    'print',
    'video',
    'photo_or_video',
    'text',
    'file',
    'both',
  ]);
  const rawEvType = row.evidence_type ? String(row.evidence_type) : '';
  return {
    id: String(row.id),
    title: String(row.title),
    description: String(row.description),
    startupId: String(row.startup_id),
    startupName: String(row.startup_name),
    category: row.category as Mission['category'],
    points: Number(row.points),
    estimatedTime: String(row.estimated_time),
    status: row.status as Mission['status'],
    period: String(row.period),
    completionCriteria: String(row.completion_criteria),
    active: Boolean(row.active),
    qrCodeRequired: row.qr_code_required ? String(row.qr_code_required) : undefined,
    quizQuestions: row.quiz_questions_json
      ? JSON.parse(String(row.quiz_questions_json))
      : undefined,
    timerMinutes:
      row.timer_minutes !== null && row.timer_minutes !== undefined
        ? Number(row.timer_minutes)
        : null,
    sequenceOrder:
      row.sequence_order !== null && row.sequence_order !== undefined
        ? Number(row.sequence_order)
        : undefined,
    trackId: row.track_id ? String(row.track_id) : null,
    relativeWeight:
      row.relative_weight !== null && row.relative_weight !== undefined
        ? Number(row.relative_weight)
        : 10,
    unlockPoints:
      row.unlock_points !== null && row.unlock_points !== undefined
        ? Number(row.unlock_points)
        : undefined,
    completionPoints:
      row.completion_points !== null && row.completion_points !== undefined
        ? Number(row.completion_points)
        : undefined,
    maxSpeedBonus:
      row.max_speed_bonus !== null && row.max_speed_bonus !== undefined
        ? Number(row.max_speed_bonus)
        : undefined,
    requiresEvidence: Boolean(row.requires_evidence),
    evidenceType: validEvidenceTypes.has(rawEvType)
      ? (rawEvType as Mission['evidenceType'])
      : undefined,
    requiredEvidenceCount:
      row.required_evidence_count !== null && row.required_evidence_count !== undefined
        ? Math.max(1, Number(row.required_evidence_count))
        : 1,
    maxVideoSeconds:
      row.max_video_seconds !== null && row.max_video_seconds !== undefined
        ? Number(row.max_video_seconds)
        : null,
    allowSharedEvidence: Boolean(row.allow_shared_evidence),
    externalLink: row.external_link ? String(row.external_link) : undefined,
  };
}

export function mapQRCodeRow(row: Record<string, unknown>): QRCode {
  return {
    id: String(row.id),
    code: String(row.code),
    label: String(row.label),
    startupId: String(row.startup_id),
    startupName: String(row.startup_name),
    missionId: String(row.mission_id),
    missionTitle: String(row.mission_title),
    points: Number(row.points),
    scansCount: Number(row.scans_count),
    active: Boolean(row.active),
    createdAt: String(row.created_at),
  };
}

export function getEvidenceFilesForCompletions(
  completionIds: string[],
  targetDb: DatabaseSync = db
): Map<string, EvidenceFileItem[]> {
  const result = new Map<string, EvidenceFileItem[]>();
  const uniqueIds = Array.from(new Set(completionIds.filter(Boolean)));
  if (uniqueIds.length === 0) return result;

  const placeholders = uniqueIds.map(() => '?').join(', ');
  const rows = targetDb
    .prepare(
      `SELECT id, completion_id, file_order, file_name, mime_type, size_bytes, duration_seconds, created_at
       FROM mission_completion_files
       WHERE completion_id IN (${placeholders})
       ORDER BY completion_id ASC, file_order ASC, rowid ASC`
    )
    .all(...uniqueIds) as Record<string, unknown>[];

  for (const r of rows) {
    const completionId = String(r.completion_id);
    const id = String(r.id);
    const list = result.get(completionId) || [];
    list.push({
      id,
      completionId,
      fileOrder: Number(r.file_order || list.length + 1),
      fileName: String(r.file_name),
      mimeType: String(r.mime_type),
      sizeBytes: Number(r.size_bytes || 0),
      durationSeconds:
        r.duration_seconds !== null && r.duration_seconds !== undefined
          ? Number(r.duration_seconds)
          : null,
      createdAt: r.created_at ? String(r.created_at) : undefined,
      url: `/api/evidences/${completionId}/files/${id}`,
    });
    result.set(completionId, list);
  }

  return result;
}

const BRASILIA_DATE_KEY_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/**
 * Extrai a data oficial de submissão no formato YYYY-MM-DD (America/Sao_Paulo)
 * exclusivamente a partir do momento em que o participante enviou a evidência
 * (submitted_at ou fallback pelo timestamp embutido no id val-<ms>-...),
 * nunca utilizando reviewed_at.
 */
export function resolveSubmissionDateKeyBrasilia(
  submittedAt?: string | null,
  recordId?: string | null
): string | null {
  const text = String(submittedAt || '').trim();

  // Formato pt-BR gravado no envio: "DD/MM/AAAA, HH:MM" ou "DD/MM/AAAA HH:MM"
  const brMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})\b/);
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch;
    return `${yyyy}-${mm}-${dd}`;
  }

  // Formato ISO com timezone explícito (converte para America/Sao_Paulo)
  if (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(text)) {
    const parsedMs = Date.parse(text);
    if (!Number.isNaN(parsedMs)) {
      return BRASILIA_DATE_KEY_FORMATTER.format(new Date(parsedMs));
    }
  }

  // Formato YYYY-MM-DD (naive, já assumido em America/Sao_Paulo)
  const isoDateMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoDateMatch) {
    const [, yyyy, mm, dd] = isoDateMatch;
    return `${yyyy}-${mm}-${dd}`;
  }

  // Fallback seguro: timestamp Unix em ms embutido no ID "val-<ms>-..."
  const idMatch = String(recordId || '').match(/^val-(\d{12,14})-/);
  if (idMatch) {
    const ms = Number(idMatch[1]);
    if (Number.isFinite(ms) && ms > 0) {
      return BRASILIA_DATE_KEY_FORMATTER.format(new Date(ms));
    }
  }

  return null;
}

export function mapValidationRow(
  row: Record<string, unknown>,
  evidenceFiles?: EvidenceFileItem[]
): MissionCompletion {
  const files = evidenceFiles && evidenceFiles.length > 0 ? evidenceFiles : undefined;
  const submittedAtStr = String(row.submitted_at);
  return {
    id: String(row.id),
    participantId: String(row.participant_id),
    participantName: String(row.participant_name),
    missionId: String(row.mission_id),
    missionTitle: String(row.mission_title),
    startupId: String(row.startup_id),
    startupName: String(row.startup_name),
    submittedAt: submittedAtStr,
    submittedDate: resolveSubmissionDateKeyBrasilia(submittedAtStr, String(row.id)),
    evidenceDescription: String(row.evidence_description),
    evidenceCode: String(row.evidence_code),
    evidenceFileName: row.evidence_file_name ? String(row.evidence_file_name) : undefined,
    evidenceMimeType: row.evidence_mime_type ? String(row.evidence_mime_type) : undefined,
    evidenceSizeBytes:
      row.evidence_size_bytes !== null && row.evidence_size_bytes !== undefined
        ? Number(row.evidence_size_bytes)
        : undefined,
    evidenceDurationSeconds:
      row.evidence_duration_seconds !== null && row.evidence_duration_seconds !== undefined
        ? Number(row.evidence_duration_seconds)
        : null,
    rejectionReason: row.rejection_reason ? String(row.rejection_reason) : null,
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null,
    reversedPoints:
      row.reversed_points !== null && row.reversed_points !== undefined
        ? Number(row.reversed_points)
        : 0,
    reversedAt: row.reversed_at ? String(row.reversed_at) : null,
    trackId: row.track_id ? String(row.track_id) : null,
    hasFile: Boolean(row.evidence_stored_name) || Boolean(files && files.length > 0),
    evidenceFiles: files,
    pointsAwarded: Number(row.points_awarded),
    status: row.status as MissionCompletion['status'],
  };
}

export function mapHomologationRow(row: Record<string, unknown>) {
  let evidenceSummary = { total: 0, approved: 0, pending: 0, rejected: 0 };
  try {
    const parsed = JSON.parse(String(row.evidence_summary_json || '{}'));
    evidenceSummary = {
      total: Number(parsed.total || 0),
      approved: Number(parsed.approved || 0),
      pending: Number(parsed.pending || 0),
      rejected: Number(parsed.rejected || 0),
    };
  } catch {
    // mantém padrão
  }

  return {
    id: String(row.id),
    scope: String(row.scope) as 'GERAL' | 'DIARIO',
    eventDate: row.event_date ? String(row.event_date) : null,
    participantId: String(row.participant_id),
    participantName: String(row.participant_name),
    points: Number(row.points || 0),
    rankingPosition: Number(row.ranking_position || 1),
    evidenceSummary,
    dataFingerprint: String(row.data_fingerprint),
    homologatedBy: String(row.homologated_by),
    homologatedAt: String(row.homologated_at),
    homologatedAtMs: Number(row.homologated_at_ms || 0),
    status: String(row.status) as 'Homologado' | 'Invalidado',
    invalidatedReason: row.invalidated_reason ? String(row.invalidated_reason) : null,
    invalidatedAt: row.invalidated_at ? String(row.invalidated_at) : null,
  };
}

export function mapTransactionRow(row: Record<string, unknown>): PointsTransaction {
  return {
    id: String(row.id),
    participantId: String(row.participant_id),
    participantName: String(row.participant_name),
    sourceType: row.source_type as PointsTransaction['sourceType'],
    sourceTitle: String(row.source_title),
    pointsDelta: Number(row.points_delta),
    previousBalance: Number(row.previous_balance),
    newBalance: Number(row.new_balance),
    createdAt: String(row.created_at),
  };
}

export function mapEventSettingsRow(row: Record<string, unknown>): EventSettings {
  return {
    eventName: String(row.event_name),
    editionYear: Number(row.edition_year),
    dates: String(row.dates),
    location: String(row.location),
    city: String(row.city),
    description: String(row.description),
    activePeriod: String(row.active_period),
    scoringRules: JSON.parse(String(row.scoring_rules_json || '[]')),
    tieBreakerCriteria: JSON.parse(String(row.tie_breaker_criteria_json || '[]')),
    rewardsEnabled: Boolean(row.rewards_enabled),
    rewardsLegalNote: String(row.rewards_legal_note),
    rewardsDescription: String(row.rewards_description),
    defaultMissionTimerMinutes: Number(row.default_mission_timer_minutes || 5),
  };
}

export function mapGovernancePlanRow(row: Record<string, unknown>): GovernancePlan {
  return {
    id: String(row.id),
    code: String(row.code),
    name: String(row.name),
    objective: String(row.objective),
    description: String(row.description),
    responsible: String(row.responsible),
    indicators: String(row.indicators),
    status: row.status as GovernancePlan['status'],
    relatedDocuments: JSON.parse(String(row.related_documents_json || '[]')),
  };
}

export function recalculateRankingsInDb(): void {
  const rows = db
    .prepare(
      "SELECT id FROM participants WHERE UPPER(role) = 'PARTICIPANT' ORDER BY points DESC, completed_missions_count DESC, registered_at ASC"
    )
    .all() as { id: string }[];
  const updateRank = db.prepare('UPDATE participants SET ranking_position = ? WHERE id = ?');
  rows.forEach((r, idx) => {
    updateRank.run(idx + 1, r.id);
  });
}

export function getPublicRankingFromDb(currentUserId?: string): PublicRankingEntry[] {
  recalculateRankingsInDb();
  const rows = db
    .prepare(
      "SELECT * FROM participants WHERE status = 'Ativo' AND UPPER(role) = 'PARTICIPANT' ORDER BY ranking_position ASC"
    )
    .all() as Record<string, unknown>[];
  return rows.map((row) => {
    const p = mapParticipantRow(row);
    const isCurrentUser = Boolean(currentUserId && p.id === currentUserId);
    return {
      position: p.rankingPosition,
      participantId: p.id,
      displayName: p.privacyPreferences.showNicknameInPublicRanking ? p.nickname : p.name,
      avatar: p.avatar,
      points: p.points,
      completedMissionsCount: p.completedMissionsCount,
      isCurrentUser,
    };
  });
}

const OFFICIAL_EVENT_DAYS = [
  { date: '2026-11-24', label: 'Dia 1 — 24/11 (Ter)' },
  { date: '2026-11-25', label: 'Dia 2 — 25/11 (Qua)' },
  { date: '2026-11-26', label: 'Dia 3 — 26/11 (Qui)' },
] as const;

const BRASILIA_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

export function formatMsToBrasiliaDate(ms: number): string | null {
  if (!Number.isFinite(ms)) return null;
  return BRASILIA_DATE_FORMATTER.format(new Date(ms));
}

export function parseStoredDateToBrasiliaIso(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = String(raw).trim();
  if (!text) return null;

  // Formato pt-BR: "DD/MM/AAAA, HH:MM" ou "DD/MM/AAAA"
  const brMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (brMatch) {
    const [, dd, mm, yyyy] = brMatch;
    return `${yyyy}-${mm}-${dd}`;
  }

  // Formato ISO com timezone explícito (Z ou ±HH:MM): converte para fuso America/Sao_Paulo
  if (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(text)) {
    const parsedMs = Date.parse(text);
    return Number.isNaN(parsedMs) ? null : formatMsToBrasiliaDate(parsedMs);
  }

  // Formato ISO sem timezone ("YYYY-MM-DD HH:MM:SS" ou "YYYY-MM-DD")
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch;
    return `${yyyy}-${mm}-${dd}`;
  }

  return null;
}

export function getAdminMetricsFromDb(
  targetDb: DatabaseSync = db,
  nowMs: number = Date.now()
): AdminDashboardMetrics {
  const allParticipantRows = (
    targetDb
      .prepare("SELECT * FROM participants WHERE UPPER(role) = 'PARTICIPANT'")
      .all() as Record<string, unknown>[]
  ).map(mapParticipantRow);

  const participantIdSet = new Set<string>(allParticipantRows.map((p) => p.id));
  const totalParticipants = allParticipantRows.length;

  const completedMissions = allParticipantRows.reduce(
    (acc, p) => acc + Number(p.completedMissionsCount || 0),
    0
  );
  const totalPointsDistributed = allParticipantRows.reduce(
    (acc, p) => acc + Number(p.points || 0),
    0
  );
  const qrCodesScanned = (
    targetDb.prepare('SELECT COALESCE(SUM(scans_count), 0) as total FROM qr_codes').get() as {
      total: number;
    }
  ).total;
  const registeredStartups = (
    targetDb.prepare('SELECT COUNT(*) as total FROM startups').get() as { total: number }
  ).total;

  // Carrega missões, participant_missions, qr_scans, mission_completions e points_transactions (somente PARTICIPANT)
  const missionsRows = targetDb
    .prepare('SELECT id, title, startup_id, startup_name, track_id, category, points, active FROM missions')
    .all() as {
      id: string;
      title: string;
      startup_id: string;
      startup_name: string;
      track_id: string | null;
      category: string;
      points: number;
      active: number;
    }[];
  const missionById = new Map(missionsRows.map((m) => [m.id, m]));

  const pmRows = targetDb
    .prepare(`
      SELECT pm.*
      FROM participant_missions pm
      INNER JOIN participants p ON p.id = pm.participant_id
      WHERE UPPER(p.role) = 'PARTICIPANT'
    `)
    .all() as {
      participant_id: string;
      mission_id: string;
      status: string;
      started_at_ms: number | null;
      completed_at_ms: number | null;
      elapsed_seconds: number | null;
      speed_bonus_awarded: number;
      total_points_awarded: number;
      target_end_at_ms: number | null;
    }[];

  const qrScanRows = targetDb
    .prepare(`
      SELECT qs.participant_id, qs.scanned_at, q.startup_id
      FROM qr_scans qs
      INNER JOIN participants p ON p.id = qs.participant_id
      LEFT JOIN qr_codes q ON q.id = qs.qr_code_id
      WHERE UPPER(p.role) = 'PARTICIPANT'
    `)
    .all() as { participant_id: string; scanned_at: string; startup_id: string | null }[];

  const completionRows = targetDb
    .prepare(`
      SELECT mc.participant_id, mc.startup_id, mc.submitted_at
      FROM mission_completions mc
      INNER JOIN participants p ON p.id = mc.participant_id
      WHERE UPPER(p.role) = 'PARTICIPANT'
    `)
    .all() as { participant_id: string; startup_id: string; submitted_at: string }[];

  const txRows = targetDb
    .prepare(`
      SELECT pt.id, pt.participant_id, pt.source_type, pt.points_delta, pt.created_at, pt.event_key, pt.mission_id
      FROM points_transactions pt
      INNER JOIN participants p ON p.id = pt.participant_id
      WHERE UPPER(p.role) = 'PARTICIPANT'
    `)
    .all() as {
      id: string;
      participant_id: string;
      source_type: string;
      points_delta: number;
      created_at: string;
      event_key: string | null;
      mission_id: string | null;
    }[];

  // Identifica transações estornadas (Etapa 6 REVERSAL e REVERSAL_SIMULATION)
  const legacyReversalKeys = new Set<string>();
  const simulationReversedTxIds = new Set<string>();
  for (const tx of txRows) {
    if (!tx.event_key) continue;
    if (tx.event_key.startsWith('REVERSAL:')) {
      legacyReversalKeys.add(tx.event_key);
    } else if (tx.event_key.startsWith('REVERSAL_SIMULATION:')) {
      const parts = tx.event_key.split(':');
      if (parts.length >= 3) {
        simulationReversedTxIds.add(parts.slice(2).join(':'));
      }
    }
  }

  const isEffectivePositiveCredit = (tx: (typeof txRows)[number]): boolean => {
    if (Number(tx.points_delta) <= 0) return false;
    if (tx.event_key?.startsWith('REVERSAL')) return false;
    if (simulationReversedTxIds.has(tx.id)) return false;
    if (tx.event_key && tx.event_key.startsWith('UNLOCK:')) {
      const suffix = tx.event_key.slice('UNLOCK:'.length);
      if (legacyReversalKeys.has(`REVERSAL:${suffix}`)) return false;
    }
    return true;
  };

  // Helper para determinar se um registro de participant_missions expirou (nunca confunde Bloqueada com Expirada)
  const isMissionExpired = (pm: (typeof pmRows)[number]): boolean => {
    if (pm.status === 'Bloqueada') return false;
    if (pm.target_end_at_ms === null || pm.target_end_at_ms === undefined) return false;
    const targetEnd = Number(pm.target_end_at_ms);
    if (pm.completed_at_ms !== null && pm.completed_at_ms !== undefined) {
      return Number(pm.completed_at_ms) > targetEnd;
    }
    return pm.status !== 'Concluída' && nowMs > targetEnd;
  };

  // BLOCO 2: Participantes efetivamente ativos (com atividade real) vs inativos
  const activeParticipantIds = new Set<string>();
  for (const p of allParticipantRows) {
    if (Number(p.points || 0) > 0 || Number(p.completedMissionsCount || 0) > 0) {
      activeParticipantIds.add(p.id);
    }
  }
  for (const pm of pmRows) {
    if (pm.started_at_ms !== null || pm.status === 'Concluída') {
      activeParticipantIds.add(pm.participant_id);
    }
  }
  for (const scan of qrScanRows) {
    if (participantIdSet.has(scan.participant_id)) {
      activeParticipantIds.add(scan.participant_id);
    }
  }
  for (const comp of completionRows) {
    if (participantIdSet.has(comp.participant_id)) {
      activeParticipantIds.add(comp.participant_id);
    }
  }

  const activeParticipants = activeParticipantIds.size;
  const inactiveParticipants = Math.max(0, totalParticipants - activeParticipants);
  const participationRate =
    totalParticipants > 0
      ? Number(((activeParticipants / totalParticipants) * 100).toFixed(1))
      : 0;

  // BLOCO 4: Indicadores globais de missões e cronômetros
  let startedMissions = 0;
  let completedOfficialMissions = 0;
  let expiredMissions = 0;
  let elapsedSum = 0;
  let elapsedCount = 0;
  let totalSpeedBonusAwarded = 0;

  for (const pm of pmRows) {
    if (pm.started_at_ms !== null) {
      startedMissions += 1;
    }
    if (pm.status === 'Concluída') {
      completedOfficialMissions += 1;
      if (pm.elapsed_seconds !== null && Number(pm.elapsed_seconds) > 0) {
        elapsedSum += Number(pm.elapsed_seconds);
        elapsedCount += 1;
      }
    }
    if (isMissionExpired(pm)) {
      expiredMissions += 1;
    }
    totalSpeedBonusAwarded += Number(pm.speed_bonus_awarded || 0);
  }

  const missionCompletionRate =
    startedMissions > 0
      ? Number(((completedOfficialMissions / startedMissions) * 100).toFixed(1))
      : 0;
  const averageCompletionSeconds =
    elapsedCount > 0 ? Math.round(elapsedSum / elapsedCount) : null;

  // BLOCO 1: Métricas por startup (exclusivamente startups ativas do catálogo oficial;
  // startups inativas permanecem preservadas no banco mas não aparecem nesta visualização)
  const startupsRows = targetDb
    .prepare('SELECT id, name FROM startups WHERE active = 1 ORDER BY rowid ASC')
    .all() as {
    id: string;
    name: string;
  }[];

  const participationByStartup = startupsRows.map((st) => {
    const startupMissionIds = new Set(
      missionsRows
        .filter((m) => m.startup_id === st.id && m.track_id !== 'bonus')
        .map((m) => m.id)
    );

    const startupParticipants = new Set<string>();
    for (const p of allParticipantRows) {
      if (p.visitedStartupsIds.includes(st.id)) {
        startupParticipants.add(p.id);
      }
    }

    let stStarted = 0;
    let stCompleted = 0;
    let stPending = 0;

    for (const pm of pmRows) {
      if (!startupMissionIds.has(pm.mission_id)) continue;
      if (pm.started_at_ms !== null || pm.status === 'Concluída') {
        startupParticipants.add(pm.participant_id);
      }
      if (pm.started_at_ms !== null) {
        stStarted += 1;
      }
      if (pm.status === 'Concluída') {
        stCompleted += 1;
      } else if (pm.status === 'Em andamento' || pm.status === 'Aguardando validação') {
        stPending += 1;
      }
    }

    for (const scan of qrScanRows) {
      if (scan.startup_id === st.id) {
        startupParticipants.add(scan.participant_id);
      }
    }
    for (const comp of completionRows) {
      if (comp.startup_id === st.id) {
        startupParticipants.add(comp.participant_id);
      }
    }

    let stPointsIssued = 0;
    for (const tx of txRows) {
      if (!tx.mission_id || !startupMissionIds.has(tx.mission_id)) continue;
      if (isEffectivePositiveCredit(tx)) {
        stPointsIssued += Number(tx.points_delta);
      }
    }

    const stCompletionRate =
      stStarted > 0 ? Number(((stCompleted / stStarted) * 100).toFixed(1)) : 0;

    return {
      startupId: st.id,
      startupName: st.name,
      visits: startupParticipants.size,
      uniqueParticipants: startupParticipants.size,
      missionsStarted: stStarted,
      missionsCompleted: stCompleted,
      missionsPending: stPending,
      completionRate: stCompletionRate,
      pointsIssued: stPointsIssued,
    };
  });

  // BLOCO 3: Evolução diária real nos 3 dias oficiais (24, 25 e 26/11/2026 — America/Sao_Paulo)
  const dayBuckets = new Map<
    string,
    {
      date: string;
      day: string;
      scans: number;
      missionsStarted: number;
      missionsCompleted: number;
      missionsExpired: number;
      pointsAwarded: number;
      activeUserIds: Set<string>;
    }
  >();

  for (const d of OFFICIAL_EVENT_DAYS) {
    dayBuckets.set(d.date, {
      date: d.date,
      day: d.label,
      scans: 0,
      missionsStarted: 0,
      missionsCompleted: 0,
      missionsExpired: 0,
      pointsAwarded: 0,
      activeUserIds: new Set<string>(),
    });
  }

  for (const pm of pmRows) {
    if (pm.started_at_ms !== null) {
      const startDate = formatMsToBrasiliaDate(Number(pm.started_at_ms));
      const bucket = startDate ? dayBuckets.get(startDate) : undefined;
      if (bucket) {
        bucket.missionsStarted += 1;
        bucket.activeUserIds.add(pm.participant_id);
      }
    }
    if (pm.status === 'Concluída' && pm.completed_at_ms !== null) {
      const compDate = formatMsToBrasiliaDate(Number(pm.completed_at_ms));
      const bucket = compDate ? dayBuckets.get(compDate) : undefined;
      if (bucket) {
        bucket.missionsCompleted += 1;
        bucket.activeUserIds.add(pm.participant_id);
      }
    }
    if (isMissionExpired(pm) && pm.target_end_at_ms !== null) {
      const expDate = formatMsToBrasiliaDate(Number(pm.target_end_at_ms));
      const bucket = expDate ? dayBuckets.get(expDate) : undefined;
      if (bucket) {
        bucket.missionsExpired += 1;
      }
    }
  }

  for (const scan of qrScanRows) {
    const scanDate = parseStoredDateToBrasiliaIso(scan.scanned_at);
    const bucket = scanDate ? dayBuckets.get(scanDate) : undefined;
    if (bucket) {
      bucket.scans += 1;
      bucket.activeUserIds.add(scan.participant_id);
    }
  }

  for (const comp of completionRows) {
    const subDate = parseStoredDateToBrasiliaIso(comp.submitted_at);
    const bucket = subDate ? dayBuckets.get(subDate) : undefined;
    if (bucket) {
      bucket.activeUserIds.add(comp.participant_id);
    }
  }

  for (const tx of txRows) {
    if (!isEffectivePositiveCredit(tx)) continue;
    const txDate = parseStoredDateToBrasiliaIso(tx.created_at);
    const bucket = txDate ? dayBuckets.get(txDate) : undefined;
    if (bucket) {
      bucket.pointsAwarded += Number(tx.points_delta);
      bucket.activeUserIds.add(tx.participant_id);
    }
  }

  const engagementByDay = OFFICIAL_EVENT_DAYS.map((d) => {
    const b = dayBuckets.get(d.date)!;
    const completionRate =
      b.missionsStarted > 0
        ? Number(((b.missionsCompleted / b.missionsStarted) * 100).toFixed(1))
        : 0;
    return {
      date: b.date,
      day: b.day,
      scans: b.scans,
      missions: b.missionsCompleted,
      missionsStarted: b.missionsStarted,
      missionsCompleted: b.missionsCompleted,
      missionsExpired: b.missionsExpired,
      completionRate,
      pointsAwarded: b.pointsAwarded,
      activeUsers: b.activeUserIds.size,
    };
  });

  // BLOCO 5: Desempenho por missão ordenado por conclusões reais
  const missionStatsMap = new Map<string, { starts: number; completions: number }>();
  for (const pm of pmRows) {
    const current = missionStatsMap.get(pm.mission_id) || { starts: 0, completions: 0 };
    if (pm.started_at_ms !== null) current.starts += 1;
    if (pm.status === 'Concluída') current.completions += 1;
    missionStatsMap.set(pm.mission_id, current);
  }

  const missionPerformance = missionsRows
    .filter((m) => Boolean(m.active))
    .map((m) => {
      const stats = missionStatsMap.get(m.id) || { starts: 0, completions: 0 };
      return {
        missionId: m.id,
        title: m.title,
        startupName: m.startup_name,
        category: m.category,
        points: Number(m.points),
        starts: stats.starts,
        completions: stats.completions,
      };
    })
    .sort((a, b) => b.completions - a.completions || b.starts - a.starts || a.title.localeCompare(b.title));

  return {
    registeredParticipants: totalParticipants,
    activeParticipants,
    inactiveParticipants,
    startedMissions,
    completedMissions,
    expiredMissions,
    missionCompletionRate,
    averageCompletionSeconds,
    totalSpeedBonusAwarded,
    qrCodesScanned,
    registeredStartups,
    totalPointsDistributed,
    participationRate,
    engagementByDay,
    participationByStartup,
    missionPerformance,
  };
}
