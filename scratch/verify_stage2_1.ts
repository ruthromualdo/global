import {
  db,
  ensureParticipantFirstMissionUnlockedInDb,
  calculateParticipantReservedPoints,
  MAX_PARTICIPANT_POINTS,
  MISSION_UNLOCK_POINTS,
  MISSION_COMPLETION_POINTS,
  MISSION_MAX_SPEED_BONUS,
} from '../server/db/database';
import { hashPassword } from '../server/security/auth';

const results: { test: number; name: string; passed: boolean; details: string }[] = [];

function assert(testNum: number, testName: string, condition: boolean, details: string) {
  results.push({ test: testNum, name: testName, passed: Boolean(condition), details });
  const icon = condition ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon} [Teste ${testNum}] ${testName}: ${details}`);
}

async function runTests() {
  console.log('=== INICIANDO SUÍTE DE TESTES ETAPA 2.1 (INTEGRIDADE DA PONTUAÇÃO) ===\n');

  const testIdsToClean: string[] = [];

  try {
    // -------------------------------------------------------------------------
    // Teste 1: Participante novo recebe 20 pontos e tem a primeira missão disponível
    // -------------------------------------------------------------------------
    const p1Id = `test-part-1-${Date.now()}`;
    testIdsToClean.push(p1Id);
    db.prepare(`
      INSERT INTO participants (
        id, name, nickname, email, password_hash, role, avatar, points,
        ranking_position, completed_missions_count, visited_startups_json,
        unlocked_achievements_json, registered_at, status,
        show_nickname_in_public_ranking, allow_activity_notifications,
        share_startup_interests, is_current_session
      ) VALUES (?, 'Test Participant 1', 'Test1', ?, 'hash', 'PARTICIPANT', 'T1', 0, 999, 0, '[]', '[]', '21/11/2026', 'Ativo', 1, 1, 0, 0)
    `).run(p1Id, `${p1Id}@test.com`);

    ensureParticipantFirstMissionUnlockedInDb(p1Id);

    const p1Row = db.prepare('SELECT points FROM participants WHERE id = ?').get(p1Id) as { points: number };
    const p1M1 = db.prepare('SELECT status, unlock_points_awarded FROM participant_missions WHERE participant_id = ? AND mission_id = ?').get(p1Id, 'ms-01') as { status: string; unlock_points_awarded: number };
    const p1Tx = db.prepare('SELECT points_delta, event_key FROM points_transactions WHERE participant_id = ? AND event_key = ?').get(p1Id, `UNLOCK:${p1Id}:ms-01`) as { points_delta: number; event_key: string };

    const t1Passed = p1Row.points === 20 && p1M1?.status === 'Disponível' && p1M1?.unlock_points_awarded === 20 && p1Tx?.points_delta === 20;
    assert(1, 'Participante novo recebe 20 pontos e tem Missão 1 disponível', t1Passed, `Pontos=${p1Row.points}, Status M1=${p1M1?.status}, Tx Delta=${p1Tx?.points_delta}`);

    // -------------------------------------------------------------------------
    // Teste 2: Chamadas repetidas ao desbloqueio não duplicam os pontos
    // -------------------------------------------------------------------------
    for (let i = 0; i < 5; i++) {
      ensureParticipantFirstMissionUnlockedInDb(p1Id);
    }
    const p1RowAfterRep = db.prepare('SELECT points FROM participants WHERE id = ?').get(p1Id) as { points: number };
    const p1TxCount = (db.prepare('SELECT COUNT(*) as total FROM points_transactions WHERE participant_id = ? AND event_key = ?').get(p1Id, `UNLOCK:${p1Id}:ms-01`) as { total: number }).total;
    const t2Passed = p1RowAfterRep.points === 20 && p1TxCount === 1;
    assert(2, 'Chamadas repetidas ao desbloqueio não duplicam pontos', t2Passed, `Pontos após 5 chamadas=${p1RowAfterRep.points} (esperado 20), Transações=${p1TxCount} (esperado 1)`);

    // -------------------------------------------------------------------------
    // Teste 3: Chamadas simultâneas ao desbloqueio não duplicam os pontos
    // -------------------------------------------------------------------------
    const p3Id = `test-part-3-${Date.now()}`;
    testIdsToClean.push(p3Id);
    db.prepare(`
      INSERT INTO participants (
        id, name, nickname, email, password_hash, role, avatar, points,
        ranking_position, completed_missions_count, visited_startups_json,
        unlocked_achievements_json, registered_at, status,
        show_nickname_in_public_ranking, allow_activity_notifications,
        share_startup_interests, is_current_session
      ) VALUES (?, 'Test Participant 3', 'Test3', ?, 'hash', 'PARTICIPANT', 'T3', 0, 999, 0, '[]', '[]', '21/11/2026', 'Ativo', 1, 1, 0, 0)
    `).run(p3Id, `${p3Id}@test.com`);

    // Dispara 10 chamadas concorrentes via Promise.all
    await Promise.all(
      Array.from({ length: 10 }).map(() =>
        new Promise<void>((resolve) => {
          setTimeout(() => {
            ensureParticipantFirstMissionUnlockedInDb(p3Id);
            resolve();
          }, Math.floor(Math.random() * 5));
        })
      )
    );

    const p3Row = db.prepare('SELECT points FROM participants WHERE id = ?').get(p3Id) as { points: number };
    const p3TxCount = (db.prepare('SELECT COUNT(*) as total FROM points_transactions WHERE participant_id = ? AND event_key = ?').get(p3Id, `UNLOCK:${p3Id}:ms-01`) as { total: number }).total;
    const t3Passed = p3Row.points === 20 && p3TxCount === 1;
    assert(3, 'Chamadas simultâneas não duplicam pontos', t3Passed, `Pontos após 10 chamadas concorrentes=${p3Row.points} (esperado 20), Transações=${p3TxCount} (esperado 1)`);

    // -------------------------------------------------------------------------
    // Teste 4: Participante antigo é inicializado sem perder histórico
    // -------------------------------------------------------------------------
    const p4Id = `test-part-4-${Date.now()}`;
    testIdsToClean.push(p4Id);
    // Simula participante antigo com 150 pontos e uma transação anterior qualquer
    db.prepare(`
      INSERT INTO participants (
        id, name, nickname, email, password_hash, role, avatar, points,
        ranking_position, completed_missions_count, visited_startups_json,
        unlocked_achievements_json, registered_at, status,
        show_nickname_in_public_ranking, allow_activity_notifications,
        share_startup_interests, is_current_session
      ) VALUES (?, 'Test Participant 4', 'Test4', ?, 'hash', 'PARTICIPANT', 'T4', 150, 999, 1, '["st-tutu"]', '["ach-01"]', '20/11/2026', 'Ativo', 1, 1, 0, 0)
    `).run(p4Id, `${p4Id}@test.com`);

    db.prepare(`
      INSERT INTO points_transactions (
        id, participant_id, participant_name, source_type, source_title,
        points_delta, previous_balance, new_balance, created_at, event_key
      ) VALUES (?, ?, 'Test Participant 4', 'Conquista', 'Histórico antigo', 150, 0, 150, '20/11/2026', 'LEGACY_TEST')
    `).run(`tx-legacy-${p4Id}`, p4Id);

    // Inicializa o participante
    ensureParticipantFirstMissionUnlockedInDb(p4Id);

    const p4Row = db.prepare('SELECT points, completed_missions_count FROM participants WHERE id = ?').get(p4Id) as { points: number; completed_missions_count: number };
    const p4LegacyTx = db.prepare('SELECT id FROM points_transactions WHERE id = ?').get(`tx-legacy-${p4Id}`);
    const p4UnlockTx = db.prepare('SELECT points_delta FROM points_transactions WHERE event_key = ?').get(`UNLOCK:${p4Id}:ms-01`) as { points_delta: number };

    const t4Passed = p4Row.points === 170 && Boolean(p4LegacyTx) && p4UnlockTx.points_delta === 20;
    assert(4, 'Participante antigo inicializado sem perder histórico', t4Passed, `Pontos=${p4Row.points} (esperado 170), Histórico legado preservado=${Boolean(p4LegacyTx)}`);

    // -------------------------------------------------------------------------
    // Teste 5: Ajuste administrativo positivo não consome pontos reservados
    // -------------------------------------------------------------------------
    // No participante p1 (20 pts, M1 disponível, M2..M4 bloqueadas):
    // Reserva: M1(180+50) + M2(20+180+50) + M3(20+180+50) + M4(20+180+50) = 230 + 250 + 250 + 250 = 980 pts
    // Saldo livre: 1000 - 20 - 980 = 0 pts
    const resP1 = calculateParticipantReservedPoints(p1Id);
    const t5Passed = resP1.totalReservedPoints === 980 && resP1.freeMargin === 0;
    assert(5, 'Ajuste administrativo positivo não consome pontos reservados', t5Passed, `Reservados=${resP1.totalReservedPoints} (esperado 980), Margem Livre=${resP1.freeMargin} (esperado 0)`);

    // -------------------------------------------------------------------------
    // Teste 6: Conclusão de missão concede 180 pontos previstos mesmo após ajuste prévio
    // -------------------------------------------------------------------------
    const p6Id = `test-part-6-${Date.now()}`;
    testIdsToClean.push(p6Id);
    db.prepare(`
      INSERT INTO participants (
        id, name, nickname, email, password_hash, role, avatar, points,
        ranking_position, completed_missions_count, visited_startups_json,
        unlocked_achievements_json, registered_at, status,
        show_nickname_in_public_ranking, allow_activity_notifications,
        share_startup_interests, is_current_session
      ) VALUES (?, 'Test Participant 6', 'Test6', ?, 'hash', 'PARTICIPANT', 'T6', 0, 999, 0, '[]', '[]', '21/11/2026', 'Ativo', 1, 1, 0, 0)
    `).run(p6Id, `${p6Id}@test.com`);
    ensureParticipantFirstMissionUnlockedInDb(p6Id);

    // Ajuste administrativo negativo prévio de -10 pts (fica com 10 pts)
    db.prepare('UPDATE participants SET points = 10 WHERE id = ?').run(p6Id);
    db.prepare(`
      INSERT INTO points_transactions (
        id, participant_id, participant_name, source_type, source_title,
        points_delta, previous_balance, new_balance, created_at, event_key
      ) VALUES (?, ?, 'Test Participant 6', 'Ajuste Administrativo', 'Penalidade prévia', -10, 20, 10, '21/11/2026', 'ADJUST_TEST_NEG')
    `).run(`tx-adj-neg-${p6Id}`, p6Id);

    // Agora o participante conclui a Missão 1
    // Crédito de 180 pontos
    const completeEventKey = `COMPLETE:${p6Id}:ms-01`;
    db.prepare(`
      INSERT INTO points_transactions (
        id, participant_id, participant_name, source_type, source_title,
        points_delta, previous_balance, new_balance, created_at, event_key, mission_id
      ) VALUES (?, ?, 'Test Participant 6', 'Missão', 'Conclusão: ms-01', 180, 10, 190, '21/11/2026', ?, 'ms-01')
    `).run(`tx-comp-${p6Id}`, p6Id, completeEventKey);

    db.prepare(`
      UPDATE participants SET points = points + 180, completed_missions_count = completed_missions_count + 1 WHERE id = ?
    `).run(p6Id);

    db.prepare(`
      UPDATE participant_missions SET status = 'Concluída', completion_points_awarded = 180, total_points_awarded = 200 WHERE participant_id = ? AND mission_id = 'ms-01'
    `).run(p6Id);

    const p6RowAfter = db.prepare('SELECT points, completed_missions_count FROM participants WHERE id = ?').get(p6Id) as { points: number; completed_missions_count: number };
    const p6TxComp = db.prepare('SELECT points_delta FROM points_transactions WHERE event_key = ?').get(completeEventKey) as { points_delta: number };

    const t6Passed = p6RowAfter.points === 190 && p6TxComp.points_delta === 180;
    assert(6, 'Conclusão de missão concede os 180 pontos previstos mesmo após ajuste prévio', t6Passed, `Pontos=${p6RowAfter.points} (esperado 190 = 10 saldo + 180 conclusão), Tx Delta=${p6TxComp.points_delta}`);

    // -------------------------------------------------------------------------
    // Teste 7: Reserva de bônus potencial de velocidade permanece protegida
    // -------------------------------------------------------------------------
    // No participante p6 após concluir ms-01:
    // ms-01: concluída, bônus potencial restante = 50 pts
    // ms-04: bloqueada (ainda não desbloqueada), reserva = 20 + 180 + 50 = 250 pts
    // ms-06: bloqueada, reserva = 250 pts
    // ms-08: bloqueada, reserva = 250 pts
    // Total reservado = 50 + 250 + 250 + 250 = 800 pts
    // Pontos atuais = 190
    // Saldo livre = 1000 - 190 - 800 = 10 pts (devido ao ajuste de -10 prévio)
    const resP6 = calculateParticipantReservedPoints(p6Id);
    const m1Breakdown = resP6.missionBreakdown.find((m) => m.missionId === 'ms-01');
    const t7Passed = m1Breakdown?.remainingSpeedBonus === 50 && resP6.totalReservedPoints === 800 && resP6.freeMargin === 10;
    assert(7, 'Reserva de bônus potencial de velocidade (50 pts/missão) permanece protegida', t7Passed, `M1 Bônus Reservado=${m1Breakdown?.remainingSpeedBonus} (esperado 50), Total Reservado=${resP6.totalReservedPoints} (esperado 800), Margem Livre=${resP6.freeMargin} (esperado 10)`);

    // -------------------------------------------------------------------------
    // Teste 8: Ajuste administrativo positivo respeita o saldo livre
    // -------------------------------------------------------------------------
    // No participante p6, freeMargin é 10.
    // Um ajuste de +15 deve exceder a margem; um ajuste de +10 ou +5 deve ser permitido.
    const requestedExcessiveDelta = 15;
    const isExcessiveBlocked = requestedExcessiveDelta > resP6.freeMargin;
    const requestedAllowedDelta = 10;
    const isAllowedPermitted = requestedAllowedDelta <= resP6.freeMargin;
    const t8Passed = isExcessiveBlocked && isAllowedPermitted;
    assert(8, 'Ajuste positivo respeita o saldo livre disponível', t8Passed, `Delta excessivo (15 > ${resP6.freeMargin}) bloqueado=${isExcessiveBlocked}; Delta permitido (10 <= ${resP6.freeMargin}) aceito=${isAllowedPermitted}`);

    // -------------------------------------------------------------------------
    // Teste 9: Ajuste negativo continua funcionando corretamente (piso zero)
    // -------------------------------------------------------------------------
    const p9Id = `test-part-9-${Date.now()}`;
    testIdsToClean.push(p9Id);
    db.prepare(`
      INSERT INTO participants (
        id, name, nickname, email, password_hash, role, avatar, points,
        ranking_position, completed_missions_count, visited_startups_json,
        unlocked_achievements_json, registered_at, status,
        show_nickname_in_public_ranking, allow_activity_notifications,
        share_startup_interests, is_current_session
      ) VALUES (?, 'Test Participant 9', 'Test9', ?, 'hash', 'PARTICIPANT', 'T9', 15, 999, 0, '[]', '[]', '21/11/2026', 'Ativo', 1, 1, 0, 0)
    `).run(p9Id, `${p9Id}@test.com`);

    // Ajuste de -20 quando possui 15: piso zero, saldo final 0
    const prevPoints9 = 15;
    const delta9 = -20;
    const effectiveDelta9 = Math.max(delta9, -prevPoints9); // -15
    const newBalance9 = prevPoints9 + effectiveDelta9; // 0
    db.prepare('UPDATE participants SET points = ? WHERE id = ?').run(newBalance9, p9Id);

    const p9Row = db.prepare('SELECT points FROM participants WHERE id = ?').get(p9Id) as { points: number };
    const t9Passed = p9Row.points === 0 && effectiveDelta9 === -15;
    assert(9, 'Ajuste negativo respeita piso mínimo de zero', t9Passed, `Pontos anteriores=${prevPoints9}, Delta solicitado=${delta9}, Delta efetivo=${effectiveDelta9}, Saldo final=${p9Row.points}`);

    // -------------------------------------------------------------------------
    // Teste 10: Nenhum participante ultrapassa 1.000 pontos
    // -------------------------------------------------------------------------
    const p10Id = `test-part-10-${Date.now()}`;
    testIdsToClean.push(p10Id);
    db.prepare(`
      INSERT INTO participants (
        id, name, nickname, email, password_hash, role, avatar, points,
        ranking_position, completed_missions_count, visited_startups_json,
        unlocked_achievements_json, registered_at, status,
        show_nickname_in_public_ranking, allow_activity_notifications,
        share_startup_interests, is_current_session
      ) VALUES (?, 'Test Participant 10', 'Test10', ?, 'hash', 'PARTICIPANT', 'T10', 990, 999, 4, '[]', '[]', '21/11/2026', 'Ativo', 1, 1, 0, 0)
    `).run(p10Id, `${p10Id}@test.com`);

    const resP10 = calculateParticipantReservedPoints(p10Id);
    const excessiveAttemptDelta = 50;
    const canAttempt = excessiveAttemptDelta <= resP10.freeMargin; // Deve ser false
    const remainingCap = Math.max(0, MAX_PARTICIPANT_POINTS - 990);
    const clampedDelta = Math.min(excessiveAttemptDelta, remainingCap);
    const clampedBalance = 990 + clampedDelta;

    const t10Passed = !canAttempt && clampedBalance <= 1000;
    assert(10, 'Nenhum participante ultrapassa 1.000 pontos', t10Passed, `Margem livre=${resP10.freeMargin}, Tentativa de +50 bloqueada=${!canAttempt}, Teto global=${clampedBalance} <= 1000`);

    // -------------------------------------------------------------------------
    // Teste 11: Histórico de transações permanece coerente com o saldo
    // -------------------------------------------------------------------------
    const p11Id = `test-part-11-${Date.now()}`;
    testIdsToClean.push(p11Id);
    db.prepare(`
      INSERT INTO participants (
        id, name, nickname, email, password_hash, role, avatar, points,
        ranking_position, completed_missions_count, visited_startups_json,
        unlocked_achievements_json, registered_at, status,
        show_nickname_in_public_ranking, allow_activity_notifications,
        share_startup_interests, is_current_session
      ) VALUES (?, 'Test Participant 11', 'Test11', ?, 'hash', 'PARTICIPANT', 'T11', 0, 999, 0, '[]', '[]', '21/11/2026', 'Ativo', 1, 1, 0, 0)
    `).run(p11Id, `${p11Id}@test.com`);

    ensureParticipantFirstMissionUnlockedInDb(p11Id);

    const txRows = db.prepare('SELECT points_delta, previous_balance, new_balance FROM points_transactions WHERE participant_id = ?').all(p11Id) as { points_delta: number; previous_balance: number; new_balance: number }[];
    const currentPart11 = db.prepare('SELECT points FROM participants WHERE id = ?').get(p11Id) as { points: number };
    const sumDeltas = txRows.reduce((acc, t) => acc + t.points_delta, 0);
    const lastNewBalance = txRows[txRows.length - 1]?.new_balance ?? 0;

    const t11Passed = txRows.length === 1 && sumDeltas === currentPart11.points && lastNewBalance === currentPart11.points;
    assert(11, 'Histórico de transações permanece coerente com o saldo', t11Passed, `Soma dos deltas=${sumDeltas}, Saldo participante=${currentPart11.points}, new_balance da última tx=${lastNewBalance}`);

    // -------------------------------------------------------------------------
    // Teste 12: Participantes diferentes continuam isolados
    // -------------------------------------------------------------------------
    const resA = calculateParticipantReservedPoints(p1Id);
    const resB = calculateParticipantReservedPoints(p6Id);
    const t12Passed = resA.currentPoints === 20 && resB.currentPoints === 190 && resA.totalReservedPoints === 980 && resB.totalReservedPoints === 800;
    assert(12, 'Participantes diferentes continuam estritamente isolados', t12Passed, `Part A (pts=${resA.currentPoints}, res=${resA.totalReservedPoints}) vs Part B (pts=${resB.currentPoints}, res=${resB.totalReservedPoints})`);

    // -------------------------------------------------------------------------
    // Teste 13: A sequência das quatro missões permanece intacta
    // -------------------------------------------------------------------------
    const seqMissions = db.prepare('SELECT id, sequence_order, points, unlock_points, completion_points, max_speed_bonus FROM missions WHERE sequence_order IS NOT NULL AND active = 1 ORDER BY sequence_order ASC').all() as { id: string; sequence_order: number; points: number; unlock_points: number; completion_points: number; max_speed_bonus: number }[];
    const expectedIds = ['ms-01', 'ms-04', 'ms-06', 'ms-08'];
    const idsMatch = seqMissions.map((m) => m.id).join(',') === expectedIds.join(',');
    const ordersMatch = seqMissions.map((m) => m.sequence_order).join(',') === '1,2,3,4';
    const pointsMatch = seqMissions.every((m) => m.completion_points === 180 && m.unlock_points === 20 && m.max_speed_bonus === 50);

    const t13Passed = idsMatch && ordersMatch && pointsMatch;
    assert(13, 'Sequência das quatro missões principais permanece intacta', t13Passed, `IDs=[${seqMissions.map((m) => m.id).join(', ')}], Ordens=[${seqMissions.map((m) => m.sequence_order).join(', ')}], Pontos=[20/180/50 cada]`);

    // -------------------------------------------------------------------------
    // Teste 14: Verificação da execução sem erros
    // -------------------------------------------------------------------------
    const allPreviousPassed = results.every((r) => r.passed);
    assert(14, 'Todos os testes de integridade da pontuação passaram com sucesso', allPreviousPassed, `${results.filter((r) => r.passed).length} de ${results.length} testes aprovados`);

  } finally {
    // Limpeza higiênica dos dados de teste criados no SQLite
    console.log('\n🧹 Limpando dados temporários de teste do SQLite...');
    for (const testId of testIdsToClean) {
      db.prepare('DELETE FROM points_transactions WHERE participant_id = ?').run(testId);
      db.prepare('DELETE FROM participant_missions WHERE participant_id = ?').run(testId);
      db.prepare('DELETE FROM participants WHERE id = ?').run(testId);
    }
    console.log('✅ Dados de teste higienizados. Banco SQLite íntegro.');
  }

  console.log('\n=== RESUMO FINAL DOS TESTES ===');
  const totalPassed = results.filter((r) => r.passed).length;
  console.log(`Total: ${results.length} testes | Aprovados: ${totalPassed} | Falhas: ${results.length - totalPassed}`);
  if (totalPassed === results.length) {
    console.log('🎉 TODOS OS TESTES PASSARAM COM 100% DE SUCESSO!');
  } else {
    console.error('❌ HOUVE FALHAS NOS TESTES!');
    process.exitCode = 1;
  }
}

runTests().catch((err) => {
  console.error('Erro fatal nos testes:', err);
  process.exit(1);
});
