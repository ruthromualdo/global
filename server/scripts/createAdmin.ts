import { db, initializeDatabase } from '../db/database';
import { hashPassword } from '../security/auth';

initializeDatabase();

const email = (process.env.ADMIN_INITIAL_EMAIL || process.argv[2] || '').trim().toLowerCase();
const password = process.env.ADMIN_INITIAL_PASSWORD || process.argv[3] || '';
const name = (process.env.ADMIN_INITIAL_NAME || process.argv[4] || 'Administrador Geral').trim();

if (!email || !password) {
  console.error(
    'Uso: defina ADMIN_INITIAL_EMAIL e ADMIN_INITIAL_PASSWORD no ambiente (ou passe como argumentos: npm.cmd run setup:admin -- <email> <senha> [nome]).'
  );
  process.exit(1);
}

if (password.length < 8) {
  console.error('Erro: A senha administrativa deve ter no mínimo 8 caracteres.');
  process.exit(1);
}

const passwordHash = hashPassword(password);
const existing = db
  .prepare('SELECT id, role FROM participants WHERE LOWER(email) = ?')
  .get(email) as { id: string; role: string } | undefined;

if (existing) {
  db.prepare(
    "UPDATE participants SET role = 'ADMIN', password_hash = ?, status = 'Ativo' WHERE id = ?"
  ).run(passwordHash, existing.id);
  console.log(`[RBAC] Conta existente (${email}) configurada como ADMIN com hash scrypt seguro.`);
} else {
  const adminId = `admin-${Date.now()}`;
  const initials = name
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
    name,
    name.split(/\s+/)[0],
    email,
    passwordHash,
    initials || 'AD',
    nowStr
  );
  console.log(`[RBAC] Conta administrativa criada com sucesso: ${email} (ID: ${adminId}).`);
}
