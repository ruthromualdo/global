import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  initialAchievements,
  initialEventSettings,
  initialGovernancePlans,
  initialMissions,
  initialQRCodes,
  initialStartups,
} from '../../src/mocks/mockData';
import {
  Achievement,
  AdminDashboardMetrics,
  EventSettings,
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DB_FILE_PATH = path.join(__dirname, 'desafio_global.sqlite');
const SCHEMA_FILE_PATH = path.join(__dirname, 'schema.sql');

export const db = new DatabaseSync(DB_FILE_PATH);

export const MAX_PARTICIPANT_POINTS = 1000;
export const MISSION_UNLOCK_POINTS = 20;
export const MISSION_COMPLETION_POINTS = 180;
export const MISSION_MAX_SPEED_BONUS = 50;
export const SEQUENTIAL_MISSION_IDS = ['ms-01', 'ms-04', 'ms-06', 'ms-08'] as const;

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

    const unlockTx = db
      .prepare('SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1')
      .get(`UNLOCK:${participantId}:${m.id}`);
    const completeTx = db
      .prepare('SELECT id FROM points_transactions WHERE event_key = ? LIMIT 1')
      .get(`COMPLETE:${participantId}:${m.id}`);

    const isUnlocked =
      Boolean(unlockTx) ||
      (pm !== undefined && Number(pm.unlock_points_awarded || 0) > 0) ||
      (pm !== undefined && String(pm.status) !== 'Bloqueada');

    const isCompleted =
      Boolean(completeTx) ||
      (pm !== undefined &&
        (String(pm.status) === 'Concluída' || Number(pm.completion_points_awarded || 0) > 0));

    // 1. Desbloqueio: se não foi creditado ainda, reservar 20 pts
    const remainingUnlock = isUnlocked ? 0 : Number(m.unlock_points) || MISSION_UNLOCK_POINTS;

    // 2. Conclusão: se não foi creditado ainda, reservar 180 pts
    const remainingCompletion = isCompleted
      ? 0
      : Number(m.completion_points) || MISSION_COMPLETION_POINTS;

    // 3. Bônus potencial de velocidade: preservar até 50 pontos por missão pendente
    // Quando a missão é concluída, o bônus de velocidade já foi avaliado e creditado
    // no saldo do participante (ou 0 se expirada), portanto deixa de ser reservado.
    const maxBonus = Number(m.max_speed_bonus) || MISSION_MAX_SPEED_BONUS;
    const awardedBonus = pm ? Number(pm.speed_bonus_awarded || 0) : 0;
    const remainingSpeedBonus = isCompleted ? 0 : Math.max(0, maxBonus - awardedBonus);

    const totalMissionReserved = remainingUnlock + remainingCompletion + remainingSpeedBonus;
    totalReservedPoints += totalMissionReserved;

    let computedStatus = 'Bloqueada';
    if (isCompleted) {
      computedStatus = 'Concluída';
    } else if (isUnlocked) {
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
 * inicializadas em participant_missions, com a Missão 1 desbloqueada e seus +20 pontos
 * creditados exatamente uma única vez.
 *
 * Utiliza SAVEPOINT nomeado para operar com segurança tanto isoladamente quanto dentro
 * de transações BEGIN já abertas sem causar erro de transações aninhadas.
 * A concessão de pontos é condicionada estritamente ao sucesso da inserção da transação única
 * (changes === 1) via índice único em event_key.
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
        'SELECT * FROM missions WHERE sequence_order IS NOT NULL AND active = 1 ORDER BY sequence_order ASC'
      )
      .all() as Record<string, unknown>[];
    if (seqMissions.length === 0) {
      db.exec(`RELEASE ${savepointName};`);
      return;
    }

    const nowMs = Date.now();
    const nowStr = new Date().toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    for (const mRow of seqMissions) {
      const mId = String(mRow.id);
      const mTitle = String(mRow.title);
      const seqOrder = Number(mRow.sequence_order);

      if (seqOrder === 1) {
        const unlockEventKey = `UNLOCK:${participantId}:${mId}`;

        // Obtém o saldo e dados mais recentes do participante
        const freshPart = db
          .prepare('SELECT id, name, points FROM participants WHERE id = ?')
          .get(participantId) as { id: string; name: string; points: number };
        const prevBalance = Math.max(0, Math.min(MAX_PARTICIPANT_POINTS, Number(freshPart.points || 0)));
        const remainingCap = Math.max(0, MAX_PARTICIPANT_POINTS - prevBalance);
        const delta = Math.min(MISSION_UNLOCK_POINTS, remainingCap);
        const newBalance = prevBalance + delta;

        const txId = `tx-unlock-${nowMs}-${Math.random().toString(36).replace(/[^a-zA-Z0-9_]/g, '').slice(0, 6)}`;

        // Inserção atômica no histórico com restrição de chave única por event_key
        const txInsertRes = db.prepare(`
          INSERT OR IGNORE INTO points_transactions (
            id, participant_id, participant_name, source_type, source_title,
            points_delta, previous_balance, new_balance, created_at, event_key, mission_id
          ) VALUES (?, ?, ?, 'Missão', ?, ?, ?, ?, ?, ?, ?)
        `).run(
          txId,
          participantId,
          String(freshPart.name),
          `Desbloqueio: ${mTitle}`,
          delta,
          prevBalance,
          newBalance,
          nowStr,
          unlockEventKey,
          mId
        );

        let awardedUnlockPts = 0;
        // O crédito de pontos ocorre estritamente se e somente se a transação única foi inserida (changes === 1)
        if (Number(txInsertRes.changes) === 1) {
          if (delta > 0) {
            db.prepare('UPDATE participants SET points = points + ? WHERE id = ?').run(
              delta,
              participantId
            );
          }
          awardedUnlockPts = delta;
        } else {
          // Já inserido anteriormente por outra chamada. Recupera os pontos registrados originalmente
          const existingTx = db
            .prepare('SELECT points_delta FROM points_transactions WHERE event_key = ? LIMIT 1')
            .get(unlockEventKey) as { points_delta: number } | undefined;
          awardedUnlockPts = existingTx ? Number(existingTx.points_delta) : MISSION_UNLOCK_POINTS;
        }

        // Garante o registro da Missão 1 em participant_missions sem sobrescrever conclusão existente
        db.prepare(`
          INSERT INTO participant_missions (
            id, participant_id, mission_id, sequence_order, status,
            unlocked_at_ms, unlock_points_awarded, completion_points_awarded,
            speed_bonus_awarded, total_points_awarded
          ) VALUES (?, ?, ?, 1, 'Disponível', ?, ?, 0, 0, ?)
          ON CONFLICT(participant_id, mission_id) DO UPDATE SET
            status = CASE WHEN participant_missions.status = 'Concluída' THEN 'Concluída' ELSE 'Disponível' END,
            unlocked_at_ms = COALESCE(participant_missions.unlocked_at_ms, excluded.unlocked_at_ms),
            unlock_points_awarded = CASE WHEN participant_missions.unlock_points_awarded > 0 THEN participant_missions.unlock_points_awarded ELSE excluded.unlock_points_awarded END,
            total_points_awarded = (CASE WHEN participant_missions.unlock_points_awarded > 0 THEN participant_missions.unlock_points_awarded ELSE excluded.unlock_points_awarded END) + participant_missions.completion_points_awarded + participant_missions.speed_bonus_awarded
        `).run(
          `pm-${participantId}-${mId}`,
          participantId,
          mId,
          nowMs,
          awardedUnlockPts,
          awardedUnlockPts
        );
      } else {
        // As missões subsequentes (2, 3 e 4) são inicializadas como Bloqueadas
        db.prepare(`
          INSERT INTO participant_missions (
            id, participant_id, mission_id, sequence_order, status,
            unlock_points_awarded, completion_points_awarded,
            speed_bonus_awarded, total_points_awarded
          ) VALUES (?, ?, ?, ?, 'Bloqueada', 0, 0, 0, 0)
          ON CONFLICT(participant_id, mission_id) DO NOTHING
        `).run(`pm-${participantId}-${mId}`, participantId, mId, seqOrder);
      }
    }

    db.exec(`RELEASE ${savepointName};`);
  } catch (err) {
    db.exec(`ROLLBACK TO ${savepointName};`);
    db.exec(`RELEASE ${savepointName};`);
    throw err;
  }
}

/**
 * Inicializa o schema, executa migração compatível de RBAC (PARTICIPANT / ADMIN)
 * e garante os catálogos essenciais do sistema.
 */
export function initializeDatabase(): void {
  db.exec('PRAGMA journal_mode = WAL;');
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
              unlocked_achievements_json, registered_at, status,
              show_nickname_in_public_ranking, allow_activity_notifications,
              share_startup_interests, is_current_session
            ) VALUES (?, ?, ?, ?, ?, 'ADMIN', ?, 0, 1, 0, '[]', '[]', ?, 'Ativo', 1, 1, 0, 0)
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

    // 4. Achievements
    const achievementsCount = (
      db.prepare('SELECT COUNT(*) as total FROM achievements').get() as { total: number }
    ).total;
    if (achievementsCount === 0) {
      const insertAchievement = db.prepare(`
        INSERT OR IGNORE INTO achievements (
          id, name, description, unlock_condition, icon_name,
          points_bonus, unlocked, unlocked_at, progress_current, progress_total
        ) VALUES (?, ?, ?, ?, ?, ?, 0, NULL, 0, ?)
      `);
      for (const a of initialAchievements) {
        insertAchievement.run(
          a.id,
          a.name,
          a.description,
          a.unlockCondition,
          a.iconName,
          a.pointsBonus,
          a.progressTotal
        );
      }
    }

    // 5. QR Codes
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

    // 7. Migração Etapa 2 — Desbloqueio Sequencial (4 Startups, 4 Missões, Teto Global 1.000 pts)
    ensureColumnExists('missions', 'unlock_points', 'INTEGER NOT NULL DEFAULT 20');
    ensureColumnExists('missions', 'completion_points', 'INTEGER NOT NULL DEFAULT 180');
    ensureColumnExists('missions', 'max_speed_bonus', 'INTEGER NOT NULL DEFAULT 50');
    ensureColumnExists('missions', 'sequence_order', 'INTEGER');

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

    // Configura as 4 Startups com teto de 250 pontos cada (4 x 250 = 1.000 pts)
    db.prepare(
      "UPDATE startups SET available_points = 250 WHERE id IN ('st-tutu', 'st-escrevelab', 'st-futurize', 'st-convidada')"
    ).run();

    // Configura as 4 Missões Principais Sequenciais (20 desbloqueio + 180 conclusão + até 50 bônus na Etapa 3)
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

    // Mantém missões legadas secundárias preservadas no banco, porém fora da trilha principal de 4 missões
    db.prepare(
      "UPDATE missions SET sequence_order = NULL, active = 0 WHERE id IN ('ms-02', 'ms-03', 'ms-05', 'ms-07')"
    ).run();

    // Sincroniza pontuação de conclusão (180 pts) nos QR Codes e vincula qr-02 à Missão 1 (ms-01)
    db.prepare('UPDATE qr_codes SET points = ?').run(MISSION_COMPLETION_POINTS);
    db.prepare(
      "UPDATE qr_codes SET mission_id = 'ms-01', mission_title = 'Check-in no Estande Tutu (Ex Devedor)' WHERE id = 'qr-02'"
    ).run();

    // 8. Migração Etapa 3 — Cronômetro e Bônus de Velocidade
    ensureColumnExists(
      'event_settings',
      'default_mission_timer_minutes',
      'INTEGER NOT NULL DEFAULT 5'
    );
    ensureColumnExists('missions', 'timer_minutes', 'INTEGER');
    ensureColumnExists('participant_missions', 'duration_seconds', 'INTEGER');
    ensureColumnExists('participant_missions', 'target_end_at_ms', 'INTEGER');

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
    recalculateRankingsInDb();

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    console.error('[SQLite] Erro ao verificar inicialização do banco:', err);
    throw err;
  }
}

// ============================================================================
// MAPPERS SQLITE ROW -> INTERFACES TYPESCRIPT
// ============================================================================

export function mapParticipantRow(row: Record<string, unknown>): Participant {
  const rawRole = String(row.role || 'PARTICIPANT').toUpperCase();
  const role: UserRole = rawRole === 'ADMIN' ? 'ADMIN' : 'PARTICIPANT';

  return {
    id: String(row.id),
    name: String(row.name),
    nickname: String(row.nickname),
    email: String(row.email),
    role,
    avatar: String(row.avatar),
    points: Number(row.points),
    rankingPosition: Number(row.ranking_position),
    completedMissionsCount: Number(row.completed_missions_count),
    visitedStartupsIds: JSON.parse(String(row.visited_startups_json || '[]')),
    unlockedAchievementIds: JSON.parse(String(row.unlocked_achievements_json || '[]')),
    registeredAt: String(row.registered_at),
    status: row.status as Participant['status'],
    privacyPreferences: {
      showNicknameInPublicRanking: Boolean(row.show_nickname_in_public_ranking),
      allowActivityNotifications: Boolean(row.allow_activity_notifications),
      shareStartupInterests: Boolean(row.share_startup_interests),
    },
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
  };
}

export function mapMissionRow(row: Record<string, unknown>): Mission {
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

export function mapValidationRow(row: Record<string, unknown>): MissionCompletion {
  return {
    id: String(row.id),
    participantId: String(row.participant_id),
    participantName: String(row.participant_name),
    missionId: String(row.mission_id),
    missionTitle: String(row.mission_title),
    startupId: String(row.startup_id),
    startupName: String(row.startup_name),
    submittedAt: String(row.submitted_at),
    evidenceDescription: String(row.evidence_description),
    evidenceCode: String(row.evidence_code),
    pointsAwarded: Number(row.points_awarded),
    status: row.status as MissionCompletion['status'],
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

export function mapAchievementRow(row: Record<string, unknown>): Achievement {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description),
    unlockCondition: String(row.unlock_condition),
    iconName: row.icon_name as Achievement['iconName'],
    pointsBonus: Number(row.points_bonus),
    unlocked: Boolean(row.unlocked),
    unlockedAt: row.unlocked_at ? String(row.unlocked_at) : undefined,
    progressCurrent: Number(row.progress_current),
    progressTotal: Number(row.progress_total),
  };
}

export function getParticipantAchievementsFromDb(participant: Participant): Achievement[] {
  const rows = db.prepare('SELECT * FROM achievements').all() as Record<string, unknown>[];
  return rows.map((row) => {
    const base = mapAchievementRow(row);
    const isUnlocked = participant.unlockedAchievementIds.includes(base.id);
    let progressCurrent = 0;

    if (base.id === 'ach-01') {
      progressCurrent = Math.min(base.progressTotal, participant.completedMissionsCount);
    } else if (base.id === 'ach-02') {
      progressCurrent = Math.min(base.progressTotal, participant.visitedStartupsIds.length);
    } else if (base.id === 'ach-03') {
      progressCurrent = isUnlocked
        ? base.progressTotal
        : Math.min(base.progressTotal, participant.completedMissionsCount);
    } else if (base.id === 'ach-04') {
      progressCurrent = Math.min(base.progressTotal, participant.visitedStartupsIds.length);
    } else if (base.id === 'ach-05') {
      progressCurrent = Math.min(base.progressTotal, participant.points);
    }

    return {
      ...base,
      unlocked: isUnlocked,
      unlockedAt: isUnlocked ? base.unlockedAt : undefined,
      progressCurrent: isUnlocked ? base.progressTotal : progressCurrent,
    };
  });
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
      "SELECT id FROM participants WHERE UPPER(role) = 'PARTICIPANT' ORDER BY points DESC, registered_at ASC"
    )
    .all() as { id: string }[];
  const updateRank = db.prepare('UPDATE participants SET ranking_position = ? WHERE id = ?');
  rows.forEach((r, idx) => {
    updateRank.run(idx + 1, r.id);
  });
}

export function getPublicRankingFromDb(): PublicRankingEntry[] {
  recalculateRankingsInDb();
  const rows = db
    .prepare(
      "SELECT * FROM participants WHERE status = 'Ativo' AND UPPER(role) = 'PARTICIPANT' ORDER BY points DESC, ranking_position ASC"
    )
    .all() as Record<string, unknown>[];
  return rows.map((row, idx) => {
    const p = mapParticipantRow(row);
    return {
      position: idx + 1,
      participantId: p.id,
      displayName: p.privacyPreferences.showNicknameInPublicRanking ? p.nickname : p.name,
      avatar: p.avatar,
      points: p.points,
      medalsCount: p.unlockedAchievementIds.length,
      completedMissionsCount: p.completedMissionsCount,
      isCurrentUser: Boolean(row.is_current_session),
    };
  });
}

export function getAdminMetricsFromDb(): AdminDashboardMetrics {
  const totalParticipants = (
    db
      .prepare("SELECT COUNT(*) as total FROM participants WHERE UPPER(role) = 'PARTICIPANT'")
      .get() as { total: number }
  ).total;
  const activeParticipants = (
    db
      .prepare(
        "SELECT COUNT(*) as total FROM participants WHERE status = 'Ativo' AND UPPER(role) = 'PARTICIPANT'"
      )
      .get() as { total: number }
  ).total;
  const completedMissions = (
    db
      .prepare(
        "SELECT COALESCE(SUM(completed_missions_count), 0) as total FROM participants WHERE UPPER(role) = 'PARTICIPANT'"
      )
      .get() as { total: number }
  ).total;
  const qrCodesScanned = (
    db.prepare('SELECT COALESCE(SUM(scans_count), 0) as total FROM qr_codes').get() as {
      total: number;
    }
  ).total;
  const registeredStartups = (
    db.prepare('SELECT COUNT(*) as total FROM startups').get() as { total: number }
  ).total;
  const totalPointsDistributed = (
    db
      .prepare(
        "SELECT COALESCE(SUM(points), 0) as total FROM participants WHERE UPPER(role) = 'PARTICIPANT'"
      )
      .get() as { total: number }
  ).total;

  const participationRate =
    totalParticipants > 0
      ? Number(((activeParticipants / totalParticipants) * 100).toFixed(1))
      : 0;

  const startupsRows = db.prepare('SELECT id, name FROM startups').all() as {
    id: string;
    name: string;
  }[];
  const allParticipantsRows = (
    db
      .prepare("SELECT * FROM participants WHERE UPPER(role) = 'PARTICIPANT'")
      .all() as Record<string, unknown>[]
  ).map(mapParticipantRow);

  const participationByStartup = startupsRows.map((st) => {
    const visits = allParticipantsRows.filter((p) => p.visitedStartupsIds.includes(st.id)).length;
    const completedForStartup = (
      db
        .prepare(
          "SELECT COUNT(*) as total FROM missions WHERE startup_id = ? AND status = 'Concluída'"
        )
        .get(st.id) as { total: number }
    ).total;
    const pointsForStartup = (
      db
        .prepare(
          "SELECT COALESCE(SUM(points), 0) as total FROM missions WHERE startup_id = ? AND status = 'Concluída'"
        )
        .get(st.id) as { total: number }
    ).total;

    return {
      startupName: st.name,
      visits,
      missionsCompleted: completedForStartup,
      pointsIssued: pointsForStartup,
    };
  });

  return {
    registeredParticipants: totalParticipants,
    activeParticipants,
    completedMissions,
    qrCodesScanned,
    registeredStartups,
    totalPointsDistributed,
    participationRate,
    engagementByDay: [
      {
        day: 'Dia 1 — 24/11 (Ter)',
        scans: qrCodesScanned,
        missions: completedMissions,
        activeUsers: activeParticipants,
      },
      { day: 'Dia 2 — 25/11 (Qua)', scans: 0, missions: 0, activeUsers: 0 },
      { day: 'Dia 3 — 26/11 (Qui)', scans: 0, missions: 0, activeUsers: 0 },
    ],
    participationByStartup,
  };
}
