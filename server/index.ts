import express from 'express';
import cors from 'cors';
import {
  db,
  DB_FILE_PATH,
  getAdminMetricsFromDb,
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

// Helper para creditar pontos, registrar transação e calcular conquistas do participante no SQLite
function creditPointsInSql(params: {
  participantId: string;
  pointsDelta: number;
  sourceType: 'Missão' | 'QR Code' | 'Conquista' | 'Ajuste Administrativo';
  sourceTitle: string;
  visitedStartupId?: string;
  incrementMissionCount?: boolean;
}) {
  const row = db
    .prepare('SELECT * FROM participants WHERE id = ?')
    .get(params.participantId) as Record<string, unknown> | undefined;
  if (!row) return null;

  const participant = mapParticipantRow(row);
  const previousBalance = participant.points;
  const newBalance = previousBalance + params.pointsDelta;
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
  const completedQuizzes = (
    db
      .prepare(
        "SELECT COUNT(*) as total FROM missions WHERE category = 'Quiz' AND status = 'Concluída'"
      )
      .get() as { total: number }
  ).total;
  if (completedQuizzes >= 2) unlockedSet.add('ach-03');
  if (visitedStartups.length >= 3) unlockedSet.add('ach-04');
  if (visitedStartups.length >= 4 && newBalance >= 1500) unlockedSet.add('ach-05');

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

  const txId = `tx-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  db.prepare(`
    INSERT INTO points_transactions (
      id, participant_id, participant_name, source_type, source_title,
      points_delta, previous_balance, new_balance, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    txId,
    participant.id,
    participant.name,
    params.sourceType,
    params.sourceTitle,
    params.pointsDelta,
    previousBalance,
    newBalance,
    nowStr
  );

  recalculateRankingsInDb();

  const updatedRow = db
    .prepare('SELECT * FROM participants WHERE id = ?')
    .get(participant.id) as Record<string, unknown>;
  return mapParticipantRow(updatedRow);
}

// Helper para resolver o status das missões vinculado ao histórico real do participante ativo
function getParticipantMissionsFromDb(participant: ReturnType<typeof mapParticipantRow>) {
  const baseMissions = (
    db.prepare('SELECT * FROM missions').all() as Record<string, unknown>[]
  ).map(mapMissionRow);

  const scannedMissionRows = db
    .prepare(
      `SELECT q.mission_id as missionId
       FROM qr_scans s
       JOIN qr_codes q ON q.id = s.qr_code_id
       WHERE s.participant_id = ?`
    )
    .all(participant.id) as { missionId: string }[];
  const scannedMissionIds = new Set(scannedMissionRows.map((r) => String(r.missionId)));

  const txRows = db
    .prepare('SELECT source_title FROM points_transactions WHERE participant_id = ?')
    .all(participant.id) as { source_title: string }[];
  const txTitles = txRows.map((r) => String(r.source_title));

  const completionRows = db
    .prepare('SELECT mission_id, status FROM mission_completions WHERE participant_id = ?')
    .all(participant.id) as { mission_id: string; status: string }[];

  const approvedMissionIds = new Set(
    completionRows.filter((r) => r.status === 'Aprovada').map((r) => String(r.mission_id))
  );
  const pendingMissionIds = new Set(
    completionRows.filter((r) => r.status === 'Pendente').map((r) => String(r.mission_id))
  );

  // Conta quantas missões o participante efetivamente concluiu
  const completedIds = new Set<string>();
  for (const m of baseMissions) {
    const hasTx = txTitles.some(
      (t) =>
        t === m.title ||
        t.endsWith(`— ${m.title}`) ||
        t === `Validação Aprovada: ${m.title}`
    );
    if (scannedMissionIds.has(m.id) || approvedMissionIds.has(m.id) || hasTx) {
      completedIds.add(m.id);
    }
  }

  const unlockedSurprise = completedIds.size >= 3 || participant.completedMissionsCount >= 3;

  return baseMissions.map((m) => {
    if (completedIds.has(m.id)) {
      return { ...m, status: 'Concluída' as const };
    }
    if (pendingMissionIds.has(m.id)) {
      return { ...m, status: 'Aguardando validação' as const };
    }
    if (m.category === 'Missão surpresa' || m.id === 'ms-08') {
      return {
        ...m,
        status: unlockedSurprise ? ('Disponível' as const) : ('Bloqueada' as const),
      };
    }
    if (m.status === 'Em andamento') {
      return { ...m, status: 'Em andamento' as const };
    }
    return { ...m, status: 'Disponível' as const };
  });
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

  const participant = getCurrentParticipantFromDb(req);

  const startups = (
    db.prepare('SELECT * FROM startups').all() as Record<string, unknown>[]
  ).map(mapStartupRow);

  const missions = isAdmin
    ? (db.prepare('SELECT * FROM missions').all() as Record<string, unknown>[]).map(mapMissionRow)
    : getParticipantMissionsFromDb(participant);

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

    db.prepare("UPDATE participants SET is_current_session = 0 WHERE UPPER(role) = 'PARTICIPANT'").run();
    db.prepare(
      'UPDATE participants SET is_current_session = 1, name = ?, nickname = ?, avatar = ?, password_hash = ? WHERE id = ?'
    ).run(cleanName, nickname, initials || 'PS', passwordHash, String(existing.id));
    recalculateRankingsInDb();
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

  const newId = `part-${Date.now()}`;
  const nowStr = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  db.exec('BEGIN TRANSACTION;');
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

app.get('/api/missions', (_req, res) => {
  const rows = db.prepare('SELECT * FROM missions').all() as Record<string, unknown>[];
  res.json(rows.map(mapMissionRow));
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

app.patch('/api/missions/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body as { status: string };
  db.prepare('UPDATE missions SET status = ? WHERE id = ?').run(status, id);

  const completedCount = (
    db.prepare("SELECT COUNT(*) as total FROM missions WHERE status = 'Concluída'").get() as {
      total: number;
    }
  ).total;
  if (completedCount >= 3) {
    db.prepare("UPDATE missions SET status = 'Disponível' WHERE status = 'Bloqueada'").run();
  }

  const updated = db
    .prepare('SELECT * FROM missions WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;
  res.json(updated ? mapMissionRow(updated) : null);
});

app.post('/api/missions/:id/complete', (req, res) => {
  const { id } = req.params;
  const missionRow = db
    .prepare('SELECT * FROM missions WHERE id = ?')
    .get(id) as Record<string, unknown> | undefined;
  if (!missionRow) {
    res.status(404).json({ error: 'Missão não encontrada' });
    return;
  }

  const mission = mapMissionRow(missionRow);
  if (!mission.active) {
    res.status(400).json({ error: 'Esta missão está inativa no momento.' });
    return;
  }

  const currentParticipant = getCurrentParticipantFromDb(req);

  // Verifica se o participante já concluiu esta missão (via transação ou leitura de QR Code)
  const existingTx = db
    .prepare(
      'SELECT id FROM points_transactions WHERE participant_id = ? AND (source_title = ? OR source_title LIKE ?) LIMIT 1'
    )
    .get(currentParticipant.id, mission.title, `%— ${mission.title}`) as
    | { id: string }
    | undefined;

  const existingQrScan = db
    .prepare(
      `SELECT s.id FROM qr_scans s
       JOIN qr_codes q ON q.id = s.qr_code_id
       WHERE s.participant_id = ? AND q.mission_id = ?
       LIMIT 1`
    )
    .get(currentParticipant.id, mission.id) as { id: string } | undefined;

  if (existingTx || existingQrScan) {
    res.status(409).json({
      success: false,
      alreadyCompleted: true,
      error: `A missão "${mission.title}" já foi concluída por você anteriormente e os pontos já foram creditados.`,
    });
    return;
  }

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare("UPDATE missions SET status = 'Concluída' WHERE id = ?").run(id);

    const completedCount = (
      db.prepare("SELECT COUNT(*) as total FROM missions WHERE status = 'Concluída'").get() as {
        total: number;
      }
    ).total;
    if (completedCount >= 3) {
      db.prepare("UPDATE missions SET status = 'Disponível' WHERE status = 'Bloqueada'").run();
    }

    creditPointsInSql({
      participantId: currentParticipant.id,
      pointsDelta: mission.points,
      sourceType: 'Missão',
      sourceTitle: mission.title,
      visitedStartupId: mission.startupId,
      incrementMissionCount: true,
    });

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  res.json({ success: true, missionId: id, pointsAwarded: mission.points });
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
  const newId = `val-${Date.now()}`;
  const nowStr = new Date().toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare(`
      INSERT INTO mission_completions (
        id, participant_id, participant_name, mission_id, mission_title,
        startup_id, startup_name, submitted_at, evidence_description,
        evidence_code, points_awarded, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pendente')
    `).run(
      newId,
      p.participantId,
      p.participantName,
      p.missionId,
      p.missionTitle,
      p.startupId,
      p.startupName,
      nowStr,
      p.evidenceDescription,
      p.evidenceCode,
      Number(p.pointsAwarded || 200)
    );

    db.prepare("UPDATE missions SET status = 'Aguardando validação' WHERE id = ?").run(p.missionId);
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

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare('UPDATE mission_completions SET status = ? WHERE id = ?').run(decision, id);

    if (decision === 'Aprovada') {
      db.prepare("UPDATE missions SET status = 'Concluída' WHERE id = ?").run(item.missionId);
      creditPointsInSql({
        participantId: item.participantId,
        pointsDelta: item.pointsAwarded,
        sourceType: 'Missão',
        sourceTitle: `Validação Aprovada: ${item.missionTitle}`,
        visitedStartupId: item.startupId,
        incrementMissionCount: true,
      });
    }
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
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

  // Impede pontuação duplicada para o mesmo participante no mesmo QR Code ou na mesma missão
  const existingScan = db
    .prepare(
      'SELECT id, scanned_at FROM qr_scans WHERE qr_code_id = ? AND participant_id = ? LIMIT 1'
    )
    .get(qr.id, currentParticipant.id) as { id: string; scanned_at: string } | undefined;

  const existingMissionTx = db
    .prepare(
      'SELECT id FROM points_transactions WHERE participant_id = ? AND (source_title = ? OR source_title = ? OR source_title = ?) LIMIT 1'
    )
    .get(
      currentParticipant.id,
      linkedMission.title,
      `${qr.code} — ${qr.missionTitle}`,
      `${qr.code} — ${linkedMission.title}`
    ) as { id: string } | undefined;

  if (existingScan || existingMissionTx) {
    res.status(409).json({
      success: false,
      status: 'ALREADY_USED',
      alreadyUsed: true,
      qrCode: qr,
      message: `Código ${qr.code} já utilizado! Você já concluiu a missão "${qr.missionTitle}" e os pontos já foram creditados anteriormente.`,
    });
    return;
  }

  db.exec('BEGIN TRANSACTION;');
  try {
    db.prepare('UPDATE qr_codes SET scans_count = scans_count + 1 WHERE id = ?').run(qr.id);
    db.prepare(
      'INSERT INTO qr_scans (id, qr_code_id, participant_id, scanned_at) VALUES (?, ?, ?, ?)'
    ).run(`scan-${Date.now()}`, qr.id, currentParticipant.id, new Date().toISOString());

    db.prepare("UPDATE missions SET status = 'Concluída' WHERE id = ?").run(qr.missionId);

    const completedCount = (
      db.prepare("SELECT COUNT(*) as total FROM missions WHERE status = 'Concluída'").get() as {
        total: number;
      }
    ).total;
    if (completedCount >= 3) {
      db.prepare("UPDATE missions SET status = 'Disponível' WHERE status = 'Bloqueada'").run();
    }

    creditPointsInSql({
      participantId: currentParticipant.id,
      pointsDelta: qr.points,
      sourceType: 'QR Code',
      sourceTitle: `${qr.code} — ${qr.missionTitle}`,
      visitedStartupId: qr.startupId,
      incrementMissionCount: true,
    });

    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  const updatedRow = db
    .prepare('SELECT * FROM qr_codes WHERE id = ?')
    .get(qr.id) as Record<string, unknown>;

  res.json({
    success: true,
    status: 'VALIDATED',
    qrCode: mapQRCodeRow(updatedRow),
    pointsAwarded: qr.points,
    message: `Leitura confirmada e gravada no SQLite! +${qr.points} pontos creditados pela missão "${qr.missionTitle}".`,
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

app.post('/api/ranking/adjust', requireAdmin, (req, res) => {
  const { participantId, pointsDelta, reason } = req.body as {
    participantId: string;
    pointsDelta: number;
    reason: string;
  };

  db.exec('BEGIN TRANSACTION;');
  try {
    creditPointsInSql({
      participantId,
      pointsDelta: Number(pointsDelta),
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

  db.prepare(`
    UPDATE event_settings
    SET event_name = ?, dates = ?, location = ?, city = ?,
        description = ?, active_period = ?, scoring_rules_json = ?,
        tie_breaker_criteria_json = ?, rewards_enabled = ?, rewards_description = ?
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
    u.rewardsDescription ?? current.rewardsDescription
  );

  const updated = db
    .prepare('SELECT * FROM event_settings WHERE id = 1')
    .get() as Record<string, unknown>;
  res.json(mapEventSettingsRow(updated));
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
