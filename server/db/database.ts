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
