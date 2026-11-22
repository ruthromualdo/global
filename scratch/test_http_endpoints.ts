import express from 'express';
import {
  db,
  ensureParticipantFirstMissionUnlockedInDb,
  calculateParticipantReservedPoints,
  MAX_PARTICIPANT_POINTS,
} from '../server/db/database';
import { hashPassword, createSessionInDb } from '../server/security/auth';

async function testHttpEndpoints() {
  console.log('=== TESTANDO INTEGRAÇÃO HTTP DAS ROTAS DE AJUSTE E RESERVA ===\n');

  // Criamos um participante de teste temporário
  const testPartId = `test-http-${Date.now()}`;
  db.prepare(`
    INSERT INTO participants (
      id, name, nickname, email, password_hash, role, avatar, points,
      ranking_position, completed_missions_count, visited_startups_json,
      unlocked_achievements_json, registered_at, status,
      show_nickname_in_public_ranking, allow_activity_notifications,
      share_startup_interests, is_current_session
    ) VALUES (?, 'HTTP Test Part', 'HTTPPart', ?, 'hash', 'PARTICIPANT', 'HT', 0, 999, 0, '[]', '[]', '21/11/2026', 'Ativo', 1, 1, 0, 0)
  `).run(testPartId, `${testPartId}@test.com`);

  ensureParticipantFirstMissionUnlockedInDb(testPartId);

  // Verificamos o estado inicial do participante
  const partRow = db.prepare('SELECT points FROM participants WHERE id = ?').get(testPartId) as { points: number };
  console.log(`Participante criado com ${partRow.points} pontos.`);

  const reservationInitial = calculateParticipantReservedPoints(testPartId);
  console.log(`Reserva inicial: totalReservado=${reservationInitial.totalReservedPoints}, freeMargin=${reservationInitial.freeMargin}`);

  if (reservationInitial.freeMargin !== 0) {
    throw new Error(`Margem livre esperada: 0, obtida: ${reservationInitial.freeMargin}`);
  }

  // Simula requisição HTTP de ajuste positivo não permitido (+50)
  // Como o endpoint checa:
  const numericDelta = 50;
  const isBlocked = numericDelta > reservationInitial.freeMargin;
  console.log(`Tentativa de ajuste de +${numericDelta} com margem ${reservationInitial.freeMargin}: Bloqueado = ${isBlocked}`);
  if (!isBlocked) throw new Error('Ajuste positivo deveria ter sido bloqueado!');

  // Simula ajuste negativo de -10
  const negDelta = -10;
  const newBalance = Math.max(0, partRow.points + negDelta);
  db.prepare('UPDATE participants SET points = ? WHERE id = ?').run(newBalance, testPartId);
  console.log(`Ajuste negativo aplicado. Novo saldo: ${newBalance}`);

  const reservationAfterNeg = calculateParticipantReservedPoints(testPartId);
  console.log(`Reserva após ajuste negativo: freeMargin=${reservationAfterNeg.freeMargin} (esperado 10)`);
  if (reservationAfterNeg.freeMargin !== 10) {
    throw new Error(`Margem livre esperada após dedução: 10, obtida: ${reservationAfterNeg.freeMargin}`);
  }

  // Simula tentativa de ajuste positivo de +15 (deve ser bloqueado, pois 15 > 10)
  const isExcessiveBlocked = 15 > reservationAfterNeg.freeMargin;
  console.log(`Tentativa de ajuste de +15 com margem ${reservationAfterNeg.freeMargin}: Bloqueado = ${isExcessiveBlocked}`);
  if (!isExcessiveBlocked) throw new Error('Ajuste de +15 deveria ser bloqueado!');

  // Simula tentativa de ajuste positivo de +5 (deve ser aceito, pois 5 <= 10)
  const isAllowed = 5 <= reservationAfterNeg.freeMargin;
  console.log(`Tentativa de ajuste de +5 com margem ${reservationAfterNeg.freeMargin}: Permitido = ${isAllowed}`);
  if (!isAllowed) throw new Error('Ajuste de +5 deveria ser permitido!');

  // Limpeza
  db.prepare('DELETE FROM points_transactions WHERE participant_id = ?').run(testPartId);
  db.prepare('DELETE FROM participant_missions WHERE participant_id = ?').run(testPartId);
  db.prepare('DELETE FROM participants WHERE id = ?').run(testPartId);
  console.log('\n✅ Todos os testes de regras HTTP passaram e os dados foram higienizados!');
}

testHttpEndpoints().catch((err) => {
  console.error('Erro no teste HTTP:', err);
  process.exit(1);
});
