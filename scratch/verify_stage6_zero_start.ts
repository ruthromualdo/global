import { db, calculateParticipantReservedPoints, reconcileLegacyFirstMissionUnlockPointsInDb } from '../server/db/database';
import crypto from 'node:crypto';

const BASE_URL = 'http://localhost:3001/api';

async function runStage6Verification() {
  console.log('--- INICIANDO BATERIA DE VALIDAÇÃO DA ETAPA 6 (ZERO PONTOS & ESTORNO) ---');

  const results: { test: number; name: string; passed: boolean; details: string }[] = [];
  function record(test: number, name: string, passed: boolean, details: string) {
    results.push({ test, name, passed, details });
    console.log(`[TESTE ${test.toString().padStart(2, '0')}] ${passed ? '✅ PASSOU' : '❌ FALHOU'}: ${name} -> ${details}`);
  }

  const testEmail = `stage6.test.${Date.now()}@exemplo.com`;
  const testPassword = 'Password123!';
  let testUserId = '';
  let testUserToken = '';

  try {
    // ------------------------------------------------------------------------
    // 1. Novo participante começa com 0 pontos no cadastro
    // ------------------------------------------------------------------------
    const regRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Carlos Inicial Zero',
        email: testEmail,
        password: testPassword,
      }),
    });
    const regData = await regRes.json();
    testUserId = regData.user.id;
    testUserToken = `Bearer ${regData.token}`;

    const test1Passed = regData.user.points === 0;
    record(1, 'Novo participante começa com 0 pontos no cadastro', test1Passed,
      `Saldo no cadastro: ${regData.user.points} pts`);

    // ------------------------------------------------------------------------
    // 2. Login não gera pontos
    // ------------------------------------------------------------------------
    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginData = await loginRes.json();
    const test2Passed = loginData.user.points === 0;
    record(2, 'Login não gera pontos', test2Passed,
      `Saldo após login: ${loginData.user.points} pts`);

    // ------------------------------------------------------------------------
    // 3. Bootstrap não gera pontos
    // ------------------------------------------------------------------------
    const bootRes = await fetch(`${BASE_URL}/bootstrap`, {
      headers: { 'Authorization': testUserToken },
    });
    const bootData = await bootRes.json();
    const test3Passed = bootData.participant.points === 0;
    record(3, 'Bootstrap não gera pontos', test3Passed,
      `Saldo no bootstrap: ${bootData.participant.points} pts`);

    // ------------------------------------------------------------------------
    // 4. Inicialização / Verificação de disponibilidade da M1 não gera pontos
    // ------------------------------------------------------------------------
    const partInDb = db.prepare('SELECT points FROM participants WHERE id = ?').get(testUserId) as any;
    const pm1InDb = db.prepare('SELECT status, unlock_points_awarded FROM participant_missions WHERE participant_id = ? AND mission_id = ?')
      .get(testUserId, 'ms-01') as any;
    const test4Passed = partInDb.points === 0 && pm1InDb.status === 'Disponível' && pm1InDb.unlock_points_awarded === 0;
    record(4, 'Inicialização do servidor não gera pontos e mantém M1 disponível (0 pts)', test4Passed,
      `Banco: points=${partInDb.points}, status=${pm1InDb.status}, unlock_points_awarded=${pm1InDb.unlock_points_awarded}`);

    // ------------------------------------------------------------------------
    // 5. Consulta de missões não gera pontos
    // ------------------------------------------------------------------------
    const missionsRes = await fetch(`${BASE_URL}/missions`, {
      headers: { 'Authorization': testUserToken },
    });
    const missionsData = await missionsRes.json();
    const meRes5 = await fetch(`${BASE_URL}/participants/me`, {
      headers: { 'Authorization': testUserToken },
    });
    const meData5 = await meRes5.json();
    const test5Passed = meData5.points === 0 && missionsData.find((m: any) => m.id === 'ms-01')?.status === 'Disponível';
    record(5, 'Consulta de missões não gera pontos', test5Passed,
      `Saldo após GET /missions: ${meData5.points} pts`);

    // ------------------------------------------------------------------------
    // 6. Iniciar cronômetro não gera pontos
    // ------------------------------------------------------------------------
    const startM1Res = await fetch(`${BASE_URL}/missions/ms-01/start`, {
      method: 'POST',
      headers: { 'Authorization': testUserToken },
    });
    const startM1Data = await startM1Res.json();
    const meRes6 = await fetch(`${BASE_URL}/participants/me`, {
      headers: { 'Authorization': testUserToken },
    });
    const meData6 = await meRes6.json();
    const test6Passed = startM1Data.success && meData6.points === 0;
    record(6, 'Iniciar cronômetro não gera pontos', test6Passed,
      `Cronômetro iniciado (${startM1Data.status}), saldo: ${meData6.points} pts`);

    // ------------------------------------------------------------------------
    // 7. Validação inválida não gera pontos (ex: missão bloqueada ms-04)
    // ------------------------------------------------------------------------
    const invalidRes = await fetch(`${BASE_URL}/missions/ms-04/start`, {
      method: 'POST',
      headers: { 'Authorization': testUserToken },
    });
    const meRes7 = await fetch(`${BASE_URL}/participants/me`, {
      headers: { 'Authorization': testUserToken },
    });
    const meData7 = await meRes7.json();
    const test7Passed = invalidRes.status === 403 && meData7.points === 0;
    record(7, 'Validação inválida não gera pontos e retorna 403', test7Passed,
      `Status retornado: ${invalidRes.status}, saldo: ${meData7.points} pts`);

    // ------------------------------------------------------------------------
    // 8. Conclusão validada da Missão 1 credita +20 de desbloqueio e +180 de conclusão
    // 9. Bônus de velocidade continua funcionando
    // ------------------------------------------------------------------------
    const completeM1Res = await fetch(`${BASE_URL}/missions/ms-01/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': testUserToken },
    });
    const completeM1Data = await completeM1Res.json();
    const meRes8 = await fetch(`${BASE_URL}/participants/me`, {
      headers: { 'Authorization': testUserToken },
    });
    const meData8 = await meRes8.json();

    // Verificação de transações geradas para ms-01
    const unlockTxM1 = db.prepare("SELECT * FROM points_transactions WHERE participant_id = ? AND event_key LIKE 'UNLOCK%ms-01'").get(testUserId) as any;
    const completeTxM1 = db.prepare("SELECT * FROM points_transactions WHERE participant_id = ? AND event_key = ?").get(testUserId, `COMPLETE:${testUserId}:ms-01`) as any;
    const speedTxM1 = db.prepare("SELECT * FROM points_transactions WHERE participant_id = ? AND event_key = ?").get(testUserId, `SPEED_BONUS:${testUserId}:ms-01`) as any;

    const test8Passed = Boolean(unlockTxM1) && unlockTxM1.points_delta === 20 &&
                        Boolean(completeTxM1) && completeTxM1.points_delta === 180;
    record(8, 'Conclusão validada da Missão 1 credita +20 de desbloqueio e +180 de conclusão', test8Passed,
      `Transação UNLOCK: +${unlockTxM1?.points_delta} pts, Transação COMPLETE: +${completeTxM1?.points_delta} pts`);

    const test9Passed = Boolean(speedTxM1) && speedTxM1.points_delta > 0 && speedTxM1.points_delta <= 50;
    record(9, 'Bônus de velocidade continua funcionando', test9Passed,
      `Bônus concedido: +${speedTxM1?.points_delta} pts (faixa 0 a 50)`);

    // ------------------------------------------------------------------------
    // 10. Repetição da conclusão não duplica pontos
    // ------------------------------------------------------------------------
    const repeatRes = await fetch(`${BASE_URL}/missions/ms-01/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': testUserToken },
    });
    const meRes10 = await fetch(`${BASE_URL}/participants/me`, {
      headers: { 'Authorization': testUserToken },
    });
    const meData10 = await meRes10.json();
    const test10Passed = repeatRes.status === 409 && meData10.points === meData8.points;
    record(10, 'Repetição da conclusão não duplica pontos (status 409)', test10Passed,
      `Status repetição: ${repeatRes.status}, saldo permaneceu: ${meData10.points} pts`);

    // ------------------------------------------------------------------------
    // 11. Missões seguintes recebem os créditos de desbloqueio corretamente
    // ------------------------------------------------------------------------
    const unlockTxM2 = db.prepare("SELECT * FROM points_transactions WHERE participant_id = ? AND event_key = ?")
      .get(testUserId, `UNLOCK:${testUserId}:ms-04`) as any;
    const test11Passed = Boolean(unlockTxM2) && unlockTxM2.points_delta === 20;
    record(11, 'Missão 2 recebe os 20 pontos de desbloqueio na conclusão da Missão 1', test11Passed,
      `Desbloqueio de ms-04: +${unlockTxM2?.points_delta} pts`);

    // ------------------------------------------------------------------------
    // 12. Missões 2, 3 e 4 completadas; Missão 4 não libera uma quinta missão
    // ------------------------------------------------------------------------
    // Completar M2
    await fetch(`${BASE_URL}/missions/ms-04/start`, { method: 'POST', headers: { 'Authorization': testUserToken } });
    await fetch(`${BASE_URL}/missions/ms-04/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': testUserToken } });

    // Completar M3
    await fetch(`${BASE_URL}/missions/ms-06/start`, { method: 'POST', headers: { 'Authorization': testUserToken } });
    await fetch(`${BASE_URL}/missions/ms-06/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': testUserToken } });

    // Completar M4
    await fetch(`${BASE_URL}/missions/ms-08/start`, { method: 'POST', headers: { 'Authorization': testUserToken } });
    const completeM4Res = await fetch(`${BASE_URL}/missions/ms-08/complete`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': testUserToken } });
    const completeM4Data = await completeM4Res.json();

    const unlockM5Tx = db.prepare("SELECT * FROM points_transactions WHERE participant_id = ? AND event_key LIKE 'UNLOCK%:ms-05' OR event_key LIKE 'UNLOCK%:ms-09'")
      .get(testUserId);
    const test12Passed = completeM4Data.nextMissionUnlocked === null && !unlockM5Tx;
    record(12, 'Missão 4 não libera uma quinta missão nem gera crédito adicional de desbloqueio', test12Passed,
      `Próxima missão desbloqueada: ${completeM4Data.nextMissionUnlocked ?? 'Nenhuma (Circuito finalizado)'}`);

    // ------------------------------------------------------------------------
    // 13. Estorno antigo acontece uma única vez (idempotência)
    // 14. Transação original permanece no histórico
    // ------------------------------------------------------------------------
    // Executa a função de estorno novamente
    reconcileLegacyFirstMissionUnlockPointsInDb();
    reconcileLegacyFirstMissionUnlockPointsInDb();

    // Consultar Ruth Romualdo
    const ruthTxs = db.prepare("SELECT * FROM points_transactions WHERE participant_id = 'part-1794921152621' ORDER BY rowid ASC").all() as any[];
    const originalUnlockRuth = ruthTxs.find((t) => t.event_key === 'UNLOCK:part-1794921152621:ms-01');
    const reversalRuthList = ruthTxs.filter((t) => t.event_key === 'REVERSAL:part-1794921152621:ms-01');
    const ruthPart = db.prepare("SELECT points FROM participants WHERE id = 'part-1794921152621'").get() as any;

    const test13Passed = reversalRuthList.length === 1 && ruthPart.points === 0;
    record(13, 'Estorno antigo acontece uma única vez (idempotência rigorosa)', test13Passed,
      `Total de transações de estorno para Ruth: ${reversalRuthList.length}, Saldo: ${ruthPart.points} pts`);

    const test14Passed = Boolean(originalUnlockRuth) && originalUnlockRuth.points_delta === 20;
    record(14, 'Transação original permanece intacta no histórico de transações', test14Passed,
      `Transação original ID: ${originalUnlockRuth?.id}, delta: +${originalUnlockRuth?.points_delta} pts`);

    // ------------------------------------------------------------------------
    // 15. Participantes sem crédito antigo indevido não sofrem estorno
    // ------------------------------------------------------------------------
    const testUserReversals = db.prepare("SELECT * FROM points_transactions WHERE participant_id = ? AND event_key LIKE 'REVERSAL%'").all(testUserId);
    const test15Passed = testUserReversals.length === 0;
    record(15, 'Participantes sem crédito antigo indevido não sofrem estorno', test15Passed,
      `Estornos aplicados a novo participante: ${testUserReversals.length}`);

    // ------------------------------------------------------------------------
    // 16. Ranking reflete os saldos corrigidos
    // ------------------------------------------------------------------------
    const rankingRes = await fetch(`${BASE_URL}/ranking/public`);
    const rankingData = await rankingRes.json();
    const ruthInRanking = rankingData.find((p: any) => p.participantId === 'part-1794921152621');
    const douglasInRanking = rankingData.find((p: any) => p.participantId === 'part-1795105020131');
    const test16Passed = ruthInRanking?.points === 0 && douglasInRanking?.points === 0;
    record(16, 'Ranking reflete os saldos corrigidos (Ruth: 0 pts, Douglas: 0 pts)', test16Passed,
      `Ruth no ranking: ${ruthInRanking?.points} pts, Douglas no ranking: ${douglasInRanking?.points} pts`);

    // ------------------------------------------------------------------------
    // 17. Pontuação máxima permanece em 1.000 pontos
    // ------------------------------------------------------------------------
    const finalPartRes = await fetch(`${BASE_URL}/participants/me`, {
      headers: { 'Authorization': testUserToken },
    });
    const finalPartData = await finalPartRes.json();
    const test17Passed = finalPartData.points <= 1000 && finalPartData.points >= 800;
    record(17, 'Pontuação máxima respeita teto de 1.000 pontos', test17Passed,
      `Pontuação acumulada de 4 missões: ${finalPartData.points} pts (<= 1.000 pts)`);

    // ------------------------------------------------------------------------
    // 18. Reserva de pontuação reserva 250 pontos para Missão 1 pendente
    // ------------------------------------------------------------------------
    // Criar um participante novinho e checar getParticipantPointsReservation
    const freshTempId = `temp-${Date.now()}`;
    const freshTempEmail = `temp.${Date.now()}@res.com`;
    db.prepare(`
      INSERT INTO participants (id, name, nickname, email, points, completed_missions_count, role, registered_at, avatar, status)
      VALUES (?, 'Temp Reservation', 'Temp', ?, 0, 0, 'participant', '2026-11-22 10:00:00', 'TR', 'Ativo')
    `).run(freshTempId, freshTempEmail);

    const reservation = calculateParticipantReservedPoints(freshTempId);
    const m1Res = reservation.missionBreakdown.find((m) => m.missionId === 'ms-01');
    const test18Passed = reservation.totalReservedPoints === 1000 &&
                        m1Res?.remainingUnlock === 20 &&
                        m1Res?.remainingCompletion === 180 &&
                        m1Res?.remainingSpeedBonus === 50 &&
                        m1Res?.totalMissionReserved === 250;
    record(18, 'Reserva de pontuação reserva 250 pts para Missão 1 antes de validar', test18Passed,
      `Total reservado: ${reservation.totalReservedPoints} pts, M1: unlock=${m1Res?.remainingUnlock}, completion=${m1Res?.remainingCompletion}, bonus=${m1Res?.remainingSpeedBonus}`);

    // Limpar participante temporário
    db.prepare('DELETE FROM participants WHERE id = ?').run(freshTempId);

  } finally {
    if (testUserId) {
      db.prepare('DELETE FROM auth_sessions WHERE user_id = ?').run(testUserId);
      db.prepare('DELETE FROM points_transactions WHERE participant_id = ?').run(testUserId);
      db.prepare('DELETE FROM qr_scans WHERE participant_id = ?').run(testUserId);
      db.prepare('DELETE FROM participant_missions WHERE participant_id = ?').run(testUserId);
      db.prepare('DELETE FROM participants WHERE id = ?').run(testUserId);
    }
  }

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\n========================================`);
  console.log(`RESULTADO DA ETAPA 6: ${passedCount}/18 TESTES PASSARAM`);
  console.log(`========================================\n`);

  if (passedCount !== 18) {
    process.exit(1);
  }
}

runStage6Verification().catch((err) => {
  console.error('Erro na execução dos testes da Etapa 6:', err);
  process.exit(1);
});
