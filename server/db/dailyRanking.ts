import { DatabaseSync } from 'node:sqlite';
import { DailyRankingDaySummary, DailyRankingEntry } from '../../src/types';

export interface OfficialEventDayConfig {
  eventDate: string; // YYYY-MM-DD (America/Sao_Paulo)
  dayLabel: string;
  dayStartMs: number; // 00:00:00.000 -03:00
  scheduledCloseAtMs: number; // 16:30:00.000 -03:00
  scheduledCloseLabel: string;
}

/**
 * Dias oficiais do Desafio Global Summit 2026 com encerramento às 16h30 (America/Sao_Paulo, UTC-3).
 */
export const DAILY_AWARD_DAYS: readonly OfficialEventDayConfig[] = [
  {
    eventDate: '2026-11-24',
    dayLabel: 'Dia 1 — 24/11/2026',
    dayStartMs: Date.parse('2026-11-24T00:00:00.000-03:00'),
    scheduledCloseAtMs: Date.parse('2026-11-24T16:30:00.000-03:00'),
    scheduledCloseLabel: '24/11/2026 às 16h30 (Brasília)',
  },
  {
    eventDate: '2026-11-25',
    dayLabel: 'Dia 2 — 25/11/2026',
    dayStartMs: Date.parse('2026-11-25T00:00:00.000-03:00'),
    scheduledCloseAtMs: Date.parse('2026-11-25T16:30:00.000-03:00'),
    scheduledCloseLabel: '25/11/2026 às 16h30 (Brasília)',
  },
  {
    eventDate: '2026-11-26',
    dayLabel: 'Dia 3 — 26/11/2026',
    dayStartMs: Date.parse('2026-11-26T00:00:00.000-03:00'),
    scheduledCloseAtMs: Date.parse('2026-11-26T16:30:00.000-03:00'),
    scheduledCloseLabel: '26/11/2026 às 16h30 (Brasília)',
  },
];

export function ensureDailyRankingSchema(targetDb: DatabaseSync): void {
  targetDb.exec(`
    CREATE TABLE IF NOT EXISTS daily_ranking_closures (
      event_date TEXT PRIMARY KEY,
      day_label TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Aberto',
      scheduled_close_at_ms INTEGER NOT NULL,
      closed_at_ms INTEGER,
      winner_participant_id TEXT,
      winner_display_name TEXT,
      winner_avatar TEXT,
      winner_daily_points INTEGER NOT NULL DEFAULT 0,
      winner_last_mission_completed_at_ms INTEGER,
      snapshot_json TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TRIGGER IF NOT EXISTS trg_daily_ranking_closures_immutable_update
    BEFORE UPDATE ON daily_ranking_closures
    WHEN OLD.status = 'Encerrado'
    BEGIN
      SELECT RAISE(ABORT, 'DAILY_RANKING_ALREADY_CLOSED');
    END;

    CREATE TRIGGER IF NOT EXISTS trg_daily_ranking_closures_immutable_delete
    BEFORE DELETE ON daily_ranking_closures
    WHEN OLD.status = 'Encerrado'
    BEGIN
      SELECT RAISE(ABORT, 'DAILY_RANKING_IMMUTABLE');
    END;
  `);

  const insertDay = targetDb.prepare(`
    INSERT OR IGNORE INTO daily_ranking_closures (
      event_date, day_label, status, scheduled_close_at_ms, snapshot_json
    ) VALUES (?, ?, 'Aberto', ?, '[]')
  `);
  for (const day of DAILY_AWARD_DAYS) {
    insertDay.run(day.eventDate, day.dayLabel, day.scheduledCloseAtMs);
  }
}

/**
 * Converte created_at_ms (prioritário, precisão de milissegundos) ou string created_at (pt-BR/ISO)
 * para timestamp Unix em milissegundos no fuso America/Sao_Paulo (UTC-3).
 */
export function resolveTransactionTimestampMs(
  createdAtMs: number | null | undefined,
  createdAtText: string | null | undefined
): number | null {
  if (createdAtMs !== null && createdAtMs !== undefined && Number.isFinite(Number(createdAtMs))) {
    return Number(createdAtMs);
  }
  if (!createdAtText) return null;
  const text = String(createdAtText).trim();

  // Formato pt-BR: "DD/MM/AAAA, HH:MM" ou "DD/MM/AAAA, HH:MM:SS"
  const brMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})[,\s]+(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (brMatch) {
    const [, dd, mm, yyyy, hh, min, sec = '00'] = brMatch;
    const parsed = Date.parse(`${yyyy}-${mm}-${dd}T${hh}:${min}:${sec}.000-03:00`);
    return Number.isNaN(parsed) ? null : parsed;
  }

  // Formato ISO com timezone
  if (/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:?\d{2})$/.test(text)) {
    const parsed = Date.parse(text);
    return Number.isNaN(parsed) ? null : parsed;
  }

  // Formato SQLite naive "YYYY-MM-DD HH:MM:SS" assumido como America/Sao_Paulo (-03:00)
  const isoNaive = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (isoNaive) {
    const [, yyyy, mm, dd, hh, min, sec = '00'] = isoNaive;
    const parsed = Date.parse(`${yyyy}-${mm}-${dd}T${hh}:${min}:${sec}.000-03:00`);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

/**
 * Tipos de transação elegíveis para o ranking diário.
 * Exclui estritamente 'Ajuste Administrativo' e 'Ajuste' (estornos),
 * preservando apenas créditos legítimos de missões e QR Codes.
 */
export const ELIGIBLE_DAILY_RANKING_SOURCE_TYPES: ReadonlySet<string> = new Set([
  'Missão',
  'QR Code',
]);

/**
 * Calcula a classificação diária em tempo real para um dia específico,
 * considerando EXCLUSIVAMENTE créditos positivos efetivos (não estornados)
 * de atividades legítimas ('Missão' e 'QR Code') ocorridos na janela
 * semiaberta [00:00:00.000, 16:30:00.000) em America/Sao_Paulo.
 *
 * Critério de ordenação determinístico:
 * 1. Maior pontuação diária (`dailyPoints DESC`)
 * 2. Menor horário real de conclusão da última missão no dia (`lastMissionCompletedAtMs ASC`)
 * 3. Identificador do participante (`participantId ASC`) — desempate estável
 */
export function computeLiveDailyRanking(
  targetDb: DatabaseSync,
  dayConfig: OfficialEventDayConfig,
  currentUserId?: string
): DailyRankingEntry[] {
  const participantsRows = targetDb
    .prepare(`
      SELECT id, name, nickname, avatar, show_nickname_in_public_ranking, status
      FROM participants
      WHERE UPPER(role) = 'PARTICIPANT' AND status = 'Ativo'
    `)
    .all() as {
      id: string;
      name: string;
      nickname: string;
      avatar: string;
      show_nickname_in_public_ranking: number;
      status: string;
    }[];

  const participantMap = new Map(participantsRows.map((p) => [p.id, p]));

  const extraMissionIds = new Set<string>(
    (
      targetDb
        .prepare('SELECT id FROM missions WHERE sequence_order IS NULL')
        .all() as { id: string }[]
    ).map((m) => m.id)
  );

  const txRows = targetDb
    .prepare(`
      SELECT pt.id, pt.participant_id, pt.source_type, pt.points_delta, pt.created_at, pt.created_at_ms, pt.event_key, pt.mission_id
      FROM points_transactions pt
      INNER JOIN participants p ON p.id = pt.participant_id
      WHERE UPPER(p.role) = 'PARTICIPANT' AND p.status = 'Ativo'
    `)
    .all() as {
      id: string;
      participant_id: string;
      source_type: string;
      points_delta: number;
      created_at: string;
      created_at_ms: number | null;
      event_key: string | null;
      mission_id: string | null;
    }[];

  // Identifica transações estornadas (REVERSAL, REVERSAL_SIMULATION e REVERSAL_EVIDENCE)
  const legacyReversalKeys = new Set<string>();
  const reversedTxIds = new Set<string>();
  for (const tx of txRows) {
    if (!tx.event_key) continue;
    if (tx.event_key.startsWith('REVERSAL:')) {
      legacyReversalKeys.add(tx.event_key);
    } else if (
      tx.event_key.startsWith('REVERSAL_SIMULATION:') ||
      tx.event_key.startsWith('REVERSAL_EVIDENCE:')
    ) {
      const parts = tx.event_key.split(':');
      if (parts.length >= 3) {
        reversedTxIds.add(parts.slice(2).join(':'));
      }
    }
  }

  const dailyPointsByParticipant = new Map<string, number>();
  const lastCompletedMsByParticipant = new Map<string, number>();
  const completedCountByParticipant = new Map<string, number>();

  for (const tx of txRows) {
    // Exclui ajustes administrativos e quaisquer tipos não elegíveis
    if (!ELIGIBLE_DAILY_RANKING_SOURCE_TYPES.has(tx.source_type)) continue;

    const delta = Number(tx.points_delta);
    if (delta <= 0) continue;
    if (tx.event_key?.startsWith('REVERSAL')) continue;
    if (reversedTxIds.has(tx.id)) continue;
    if (tx.event_key && tx.event_key.startsWith('UNLOCK:')) {
      const suffix = tx.event_key.slice('UNLOCK:'.length);
      if (legacyReversalKeys.has(`REVERSAL:${suffix}`)) continue;
    }

    const txMs = resolveTransactionTimestampMs(tx.created_at_ms, tx.created_at);
    if (txMs === null) continue;
    // Janela semiaberta rigorosa: [00:00:00.000, 16:30:00.000) em America/Sao_Paulo
    if (txMs < dayConfig.dayStartMs || txMs >= dayConfig.scheduledCloseAtMs) continue;

    dailyPointsByParticipant.set(
      tx.participant_id,
      (dailyPointsByParticipant.get(tx.participant_id) || 0) + delta
    );

    // Missões extras: utiliza o timestamp gerado pelo backend em points_transactions
    if (
      tx.mission_id &&
      extraMissionIds.has(tx.mission_id) &&
      !tx.event_key?.startsWith('UNLOCK') &&
      !tx.event_key?.startsWith('SPEED_BONUS')
    ) {
      const prev = lastCompletedMsByParticipant.get(tx.participant_id);
      if (prev === undefined || txMs > prev) {
        lastCompletedMsByParticipant.set(tx.participant_id, txMs);
      }
      completedCountByParticipant.set(
        tx.participant_id,
        (completedCountByParticipant.get(tx.participant_id) || 0) + 1
      );
    }
  }

  // Busca último horário real de conclusão de missão oficial no dia (janela semiaberta [start, close)),
  // excluindo missões cuja evidência foi rejeitada e estornada administrativamente.
  const pmRows = targetDb
    .prepare(`
      SELECT pm.participant_id, pm.completed_at_ms
      FROM participant_missions pm
      INNER JOIN participants p ON p.id = pm.participant_id
      WHERE UPPER(p.role) = 'PARTICIPANT'
        AND p.status = 'Ativo'
        AND pm.status = 'Concluída'
        AND pm.completed_at_ms IS NOT NULL
        AND pm.completed_at_ms >= ?
        AND pm.completed_at_ms < ?
        AND NOT EXISTS (
          SELECT 1
          FROM mission_completions mc
          WHERE mc.participant_id = pm.participant_id
            AND mc.mission_id = pm.mission_id
            AND mc.status = 'Rejeitada'
            AND mc.reversed_at IS NOT NULL
        )
    `)
    .all(dayConfig.dayStartMs, dayConfig.scheduledCloseAtMs) as {
      participant_id: string;
      completed_at_ms: number;
    }[];

  for (const pm of pmRows) {
    const compMs = Number(pm.completed_at_ms);
    const prev = lastCompletedMsByParticipant.get(pm.participant_id);
    if (prev === undefined || compMs > prev) {
      lastCompletedMsByParticipant.set(pm.participant_id, compMs);
    }
    completedCountByParticipant.set(
      pm.participant_id,
      (completedCountByParticipant.get(pm.participant_id) || 0) + 1
    );
  }

  const entries: Omit<DailyRankingEntry, 'position'>[] = [];
  for (const [participantId, dailyPoints] of dailyPointsByParticipant.entries()) {
    if (dailyPoints <= 0) continue;
    const p = participantMap.get(participantId);
    if (!p) continue;

    const displayName = Boolean(p.show_nickname_in_public_ranking) ? p.nickname : p.name;
    entries.push({
      participantId: p.id,
      displayName,
      avatar: p.avatar,
      dailyPoints,
      completedMissionsInDay: completedCountByParticipant.get(p.id) || 0,
      lastMissionCompletedAtMs: lastCompletedMsByParticipant.get(p.id) ?? null,
      isCurrentUser: currentUserId ? p.id === currentUserId : false,
    });
  }

  entries.sort((a, b) => {
    // 1. Maior pontuação diária
    if (b.dailyPoints !== a.dailyPoints) {
      return b.dailyPoints - a.dailyPoints;
    }
    // 2. Quem concluiu a última missão primeiro (menor timestamp; quem concluiu missão vence de quem não tem timestamp)
    const aMs = a.lastMissionCompletedAtMs ?? Number.MAX_SAFE_INTEGER;
    const bMs = b.lastMissionCompletedAtMs ?? Number.MAX_SAFE_INTEGER;
    if (aMs !== bMs) {
      return aMs - bMs;
    }
    // 3. Critério secundário estável e determinístico
    return a.participantId.localeCompare(b.participantId);
  });

  return entries.map((entry, idx) => ({
    ...entry,
    position: idx + 1,
  }));
}

/**
 * Encerra automaticamente e de forma idempotente todos os dias cujo horário previsto (16h30 BRT)
 * já foi atingido (`nowMs >= scheduledCloseAtMs`), gravando snapshot imutável no SQLite.
 *
 * Não executa DDL nem escritas desnecessárias: realiza apenas leitura rápida quando não há
 * dias pendentes de fechamento e só abre `BEGIN IMMEDIATE` quando um dia precisa ser encerrado.
 */
export function ensureDailyRankingsClosedUpTo(
  targetDb: DatabaseSync,
  nowMs: number = Date.now()
): { closedDates: string[] } {
  const closedDates: string[] = [];
  const daysDue = DAILY_AWARD_DAYS.filter((day) => nowMs >= day.scheduledCloseAtMs);
  if (daysDue.length === 0) {
    return { closedDates };
  }

  // Leitura rápida sem lock de escrita para evitar contenção quando já estiver tudo encerrado
  const statusRows = targetDb
    .prepare('SELECT event_date, status FROM daily_ranking_closures')
    .all() as { event_date: string; status: string }[];
  const statusByDate = new Map(statusRows.map((r) => [r.event_date, r.status]));

  for (const day of daysDue) {
    if (statusByDate.get(day.eventDate) === 'Encerrado') {
      continue;
    }

    targetDb.exec('BEGIN IMMEDIATE TRANSACTION;');
    try {
      const existing = targetDb
        .prepare('SELECT status FROM daily_ranking_closures WHERE event_date = ? LIMIT 1')
        .get(day.eventDate) as { status: string } | undefined;

      if (existing && existing.status === 'Encerrado') {
        targetDb.exec('COMMIT;');
        continue;
      }

      const finalRanking = computeLiveDailyRanking(targetDb, day).map((entry) => ({
        position: entry.position,
        participantId: entry.participantId,
        displayName: entry.displayName,
        avatar: entry.avatar,
        dailyPoints: entry.dailyPoints,
        completedMissionsInDay: entry.completedMissionsInDay,
        lastMissionCompletedAtMs: entry.lastMissionCompletedAtMs,
      }));

      const winner = finalRanking[0] || null;

      targetDb
        .prepare(`
          UPDATE daily_ranking_closures
          SET status = 'Encerrado',
              closed_at_ms = ?,
              winner_participant_id = ?,
              winner_display_name = ?,
              winner_avatar = ?,
              winner_daily_points = ?,
              winner_last_mission_completed_at_ms = ?,
              snapshot_json = ?
          WHERE event_date = ? AND status != 'Encerrado'
        `)
        .run(
          nowMs,
          winner ? winner.participantId : null,
          winner ? winner.displayName : null,
          winner ? winner.avatar : null,
          winner ? winner.dailyPoints : 0,
          winner ? winner.lastMissionCompletedAtMs : null,
          JSON.stringify(finalRanking),
          day.eventDate
        );

      targetDb.exec('COMMIT;');
      closedDates.push(day.eventDate);
    } catch (err) {
      try {
        targetDb.exec('ROLLBACK;');
      } catch (_) {
        // transação já revertida
      }
      throw err;
    }
  }

  return { closedDates };
}

/**
 * Retorna os 3 dias do ranking diário (ao vivo quando 'Aberto', snapshot congelado quando 'Encerrado').
 * Nunca expõe dados pessoais sensíveis (e-mail, telefone ou hash).
 */
export function getDailyRankingsFromDb(
  targetDb: DatabaseSync,
  options?: { currentUserId?: string; nowMs?: number }
): DailyRankingDaySummary[] {
  const nowMs = options?.nowMs ?? Date.now();
  const currentUserId = options?.currentUserId;

  ensureDailyRankingsClosedUpTo(targetDb, nowMs);

  const closureRows = targetDb
    .prepare('SELECT * FROM daily_ranking_closures ORDER BY event_date ASC')
    .all() as {
      event_date: string;
      day_label: string;
      status: 'Aberto' | 'Encerrado';
      scheduled_close_at_ms: number;
      closed_at_ms: number | null;
      winner_participant_id: string | null;
      winner_display_name: string | null;
      winner_avatar: string | null;
      winner_daily_points: number;
      winner_last_mission_completed_at_ms: number | null;
      snapshot_json: string;
    }[];

  const closureByDate = new Map(closureRows.map((r) => [r.event_date, r]));

  return DAILY_AWARD_DAYS.map((day) => {
    const row = closureByDate.get(day.eventDate);
    const isClosed = row?.status === 'Encerrado';

    if (isClosed && row) {
      const parsedSnapshot = (JSON.parse(row.snapshot_json || '[]') as DailyRankingEntry[]).map(
        (entry) => ({
          ...entry,
          isCurrentUser: currentUserId ? entry.participantId === currentUserId : false,
        })
      );

      return {
        eventDate: day.eventDate,
        dayLabel: day.dayLabel,
        status: 'Encerrado',
        scheduledCloseAtMs: day.scheduledCloseAtMs,
        scheduledCloseLabel: day.scheduledCloseLabel,
        closedAtMs: row.closed_at_ms,
        winner: row.winner_participant_id
          ? {
              participantId: row.winner_participant_id,
              displayName: row.winner_display_name || 'Participante',
              avatar: row.winner_avatar || 'PS',
              dailyPoints: Number(row.winner_daily_points || 0),
              lastMissionCompletedAtMs: row.winner_last_mission_completed_at_ms,
            }
          : null,
        ranking: parsedSnapshot,
      };
    }

    const liveRanking = computeLiveDailyRanking(targetDb, day, currentUserId);
    return {
      eventDate: day.eventDate,
      dayLabel: day.dayLabel,
      status: 'Aberto',
      scheduledCloseAtMs: day.scheduledCloseAtMs,
      scheduledCloseLabel: day.scheduledCloseLabel,
      closedAtMs: null,
      winner: null,
      ranking: liveRanking,
    };
  });
}
