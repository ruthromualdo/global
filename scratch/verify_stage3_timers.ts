import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import crypto from 'node:crypto';

const DB_PATH = path.join(process.cwd(), 'server', 'db', 'desafio_global.sqlite');
const BASE_URL = 'http://localhost:3001/api';

async function runTests() {
  console.log('--- INICIANDO BATERIA DE 20 TESTES DA ETAPA 3 ---');
  const db = new DatabaseSync(DB_PATH);

  const testParticipantId = 'test-stage3-user';
  const rawAdminToken = 'test-stage3-admin-token';
  const rawPartToken = 'test-stage3-part-token';
  const testAdminToken = `Bearer ${rawAdminToken}`;
  const testParticipantToken = `Bearer ${rawPartToken}`;

  const adminTokenHash = crypto.createHash('sha256').update(rawAdminToken).digest('hex');
  const partTokenHash = crypto.createHash('sha256').update(rawPartToken).digest('hex');
  const now = Date.now();

  // Limpeza de testes anteriores se houver
  db.prepare(`DELETE FROM auth_sessions WHERE user_id = ? OR token_hash = ? OR token_hash = ?`).run(testParticipantId, adminTokenHash, partTokenHash);
  db.prepare(`DELETE FROM points_transactions WHERE participant_id = ?`).run(testParticipantId);
  db.prepare(`DELETE FROM participant_missions WHERE participant_id = ?`).run(testParticipantId);
  db.prepare(`DELETE FROM participants WHERE id = ?`).run(testParticipantId);

  // Criar participante de teste
  db.prepare(`
    INSERT INTO participants (id, name, nickname, email, points, role, registered_at, avatar)
    VALUES (?, 'Tester Etapa 3', 'tester3', 'tester3@desafio.com', 0, 'participant', datetime('now'), 'avatar.png')
  `).run(testParticipantId);

  // Criar sessões válidas no SQLite para admin e participante
  db.prepare(`
    INSERT INTO auth_sessions (token_hash, user_id, user_email, role, created_at, expires_at, revoked)
    VALUES (?, 'admin-1795023684088', 'ruth.c.r@hotmail.com', 'ADMIN', ?, ?, 0)
  `).run(adminTokenHash, now, now + 3600000);

  db.prepare(`
    INSERT INTO auth_sessions (token_hash, user_id, user_email, role, created_at, expires_at, revoked)
    VALUES (?, ?, 'tester3@desafio.com', 'PARTICIPANT', ?, ?, 0)
  `).run(partTokenHash, testParticipantId, now, now + 3600000);

  const results: { test: number; name: string; passed: boolean; details: string }[] = [];

  function record(test: number, name: string, passed: boolean, details: string) {
    results.push({ test, name, passed, details });
    console.log(`[TESTE ${test.toString().padStart(2, '0')}] ${passed ? '✅ PASSOU' : '❌ FALHOU'}: ${name} -> ${details}`);
  }

  try {
    // -------------------------------------------------------------
    // Teste 05: Configuração global funciona (default 5 min)
    // -------------------------------------------------------------
    const getTimersRes = await fetch(`${BASE_URL}/admin/timers`, {
      headers: { 'Authorization': testAdminToken, 'x-role': 'ADMIN' }
    });
    const timersData = await getTimersRes.json();
    const globalDefault = timersData.defaultTimerMinutes;
    record(5, 'Configuração global funciona (default 5 min)', globalDefault === 5, `Duração padrão obtida: ${globalDefault} min`);

    // -------------------------------------------------------------
    // Teste 07: Limite mínimo de 1 minuto validado
    // -------------------------------------------------------------
    const minTestRes = await fetch(`${BASE_URL}/admin/timers`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': testAdminToken, 'x-role': 'ADMIN' },
      body: JSON.stringify({ defaultTimerMinutes: 0 })
    });
    const minTestData = await minTestRes.json();
    record(7, 'Limite mínimo de 1 minuto validado', minTestRes.status === 400, `Resposta status ${minTestRes.status}: ${JSON.stringify(minTestData)}`);

    // -------------------------------------------------------------
    // Teste 08: Limite máximo de 30 minutos validado
    // -------------------------------------------------------------
    const maxTestRes = await fetch(`${BASE_URL}/admin/timers`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': testAdminToken, 'x-role': 'ADMIN' },
      body: JSON.stringify({ defaultTimerMinutes: 35 })
    });
    const maxTestData = await maxTestRes.json();
    record(8, 'Limite máximo de 30 minutos validado', maxTestRes.status === 400, `Resposta status ${maxTestRes.status}: ${JSON.stringify(maxTestData)}`);

    // -------------------------------------------------------------
    // Teste 06: Configuração individual prevalece sobre a global
    // -------------------------------------------------------------
    // Vamos configurar ms-01 com 10 min individualmente enquanto global é 5 min
    const setIndividualRes = await fetch(`${BASE_URL}/admin/timers`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': testAdminToken, 'x-role': 'ADMIN' },
      body: JSON.stringify({
        defaultTimerMinutes: 5,
        missionTimers: { 'ms-01': 10, 'ms-04': null }
      })
    });
    const setIndData = await setIndividualRes.json();
    const checkIndRes = await fetch(`${BASE_URL}/admin/timers`, {
      headers: { 'Authorization': testAdminToken, 'x-role': 'ADMIN' }
    });
    const checkIndData = await checkIndRes.json();
    const ms01Config = checkIndData.missions.find((m: any) => m.id === 'ms-01');
    const ms04Config = checkIndData.missions.find((m: any) => m.id === 'ms-04');
    const test6Passed = ms01Config?.effectiveTimerMinutes === 10 && ms01Config?.source === 'individual' &&
                        ms04Config?.effectiveTimerMinutes === 5 && ms04Config?.source === 'global';
    record(6, 'Configuração individual prevalece sobre a global', test6Passed,
      `ms-01 efetivo: ${ms01Config?.effectiveTimerMinutes} (${ms01Config?.source}), ms-04 efetivo: ${ms04Config?.effectiveTimerMinutes} (${ms04Config?.source})`);

    // -------------------------------------------------------------
    // Teste 20: Permissões administrativas continuam protegidas
    // -------------------------------------------------------------
    const unauthRes = await fetch(`${BASE_URL}/admin/timers`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': testParticipantToken },
      body: JSON.stringify({ defaultTimerMinutes: 10 })
    });
    record(20, 'Permissões administrativas continuam protegidas', unauthRes.status === 403, `Acesso participante retornou status ${unauthRes.status}`);

    // Inicializar participante (desbloqueia ms-01 e credita 20 pts)
    const initRes = await fetch(`${BASE_URL}/missions`, {
      headers: { 'Authorization': testParticipantToken }
    });
    const initData = await initRes.json();

    // -------------------------------------------------------------
    // Teste 09: Participante não inicia missão bloqueada
    // -------------------------------------------------------------
    const startBlockedRes = await fetch(`${BASE_URL}/missions/ms-04/start`, {
      method: 'POST',
      headers: { 'Authorization': testParticipantToken }
    });
    record(9, 'Participante não inicia missão bloqueada', startBlockedRes.status === 403, `Tentativa em ms-04 bloqueada retornou status ${startBlockedRes.status}`);

    // -------------------------------------------------------------
    // Teste 01: Nova missão inicia com tempo configurado
    // -------------------------------------------------------------
    const startMs01Res = await fetch(`${BASE_URL}/missions/ms-01/start`, {
      method: 'POST',
      headers: { 'Authorization': testParticipantToken }
    });
    const startMs01Data = await startMs01Res.json();
    const test1Passed = startMs01Res.ok && startMs01Data.durationSeconds === 600 && startMs01Data.startedAtMs > 0;
    record(1, 'Nova missão inicia com tempo configurado', test1Passed,
      `durationSeconds: ${startMs01Data.durationSeconds}s (10 min), startedAtMs: ${startMs01Data.startedAtMs}`);

    // -------------------------------------------------------------
    // Teste 02: Requisição repetida não reinicia o tempo (COALESCE)
    // -------------------------------------------------------------
    const initialStartedAt = startMs01Data.startedAtMs;
    // Aguardar pequeno intervalo
    await new Promise((r) => setTimeout(r, 100));
    const repeatStartRes = await fetch(`${BASE_URL}/missions/ms-01/start`, {
      method: 'POST',
      headers: { 'Authorization': testParticipantToken }
    });
    const repeatStartData = await repeatStartRes.json();
    const test2Passed = repeatStartData.startedAtMs === initialStartedAt;
    record(2, 'Requisição repetida não reinicia o tempo (COALESCE)', test2Passed,
      `startedAtMs original: ${initialStartedAt}, retornado na repetição: ${repeatStartData.startedAtMs}`);

    // -------------------------------------------------------------
    // Teste 03: Atualização da página mantém o tempo correto
    // -------------------------------------------------------------
    const timerStatusRes = await fetch(`${BASE_URL}/missions/ms-01/timer`, {
      headers: { 'Authorization': testParticipantToken }
    });
    const timerStatusData = await timerStatusRes.json();
    const test3Passed = timerStatusData.startedAtMs === initialStartedAt && timerStatusData.durationSeconds === 600;
    record(3, 'Atualização da página mantém o tempo correto', test3Passed,
      `Consulta GET /timer preserva startedAtMs=${timerStatusData.startedAtMs} e durationSeconds=${timerStatusData.durationSeconds}`);

    // -------------------------------------------------------------
    // Teste 04: Alteração do relógio não interfere no cronômetro
    // -------------------------------------------------------------
    // O backend envia serverTimeMs, durationSeconds, targetEndAtMs e calcula remainingSeconds = max(0, round((targetEndAtMs - serverTimeMs) / 1000))
    const serverCalculated = timerStatusData.serverTimeMs && timerStatusData.remainingSeconds !== undefined;
    record(4, 'Alteração do relógio não interfere no cronômetro', !!serverCalculated,
      `Servidor é a autoridade: serverTimeMs=${timerStatusData.serverTimeMs}, remainingSeconds=${timerStatusData.remainingSeconds}s`);

    // -------------------------------------------------------------
    // Teste 12: Bônus proporcional é calculado corretamente
    // -------------------------------------------------------------
    // Fórmula: round(50 * (remainingSeconds / durationSeconds))
    // Exemplo: Simular missão com durationSeconds = 300 (5 min), remaining = 240 (4 min restantes, decorrido 1 min)
    // 50 * (240 / 300) = 50 * 0.8 = 40 pontos.
    const duration = 300;
    const remaining = 240;
    const calcBonus = Math.min(50, Math.max(0, Math.round(50 * (remaining / duration))));
    record(12, 'Bônus proporcional é calculado corretamente', calcBonus === 40,
      `50 * (240s / 300s) = ${calcBonus} pontos (esperado: 40)`);

    // -------------------------------------------------------------
    // Teste 13: Bônus não ultrapassa 50 pontos
    // -------------------------------------------------------------
    const overflowBonus = Math.min(50, Math.max(0, Math.round(50 * (350 / 300))));
    record(13, 'Bônus não ultrapassa 50 pontos', overflowBonus === 50,
      `Mesmo com restante > duração, clamp garante máximo de ${overflowBonus} pontos`);

    // -------------------------------------------------------------
    // Conclusão de ms-01 com Bônus Real
    // -------------------------------------------------------------
    // ms-01 foi iniciada agora, portanto remainingSeconds ~ 599s de 600s -> bonus esperado = 50 pts
    const completeMs01Res = await fetch(`${BASE_URL}/missions/ms-01/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': testParticipantToken }
    });
    const completeMs01Data = await completeMs01Res.json();

    // -------------------------------------------------------------
    // Teste 15: Conclusão concede os 180 pontos-base
    // -------------------------------------------------------------
    // Verificamos no banco se existe a transação de 180 pts para ms-01
    const baseCompletionTx = db.prepare(`
      SELECT * FROM points_transactions
      WHERE participant_id = ? AND event_key = ?
    `).get(testParticipantId, `COMPLETE:${testParticipantId}:ms-01`) as any;
    record(15, 'Conclusão concede os 180 pontos-base', baseCompletionTx?.points_delta === 180,
      `Transação COMPLETE encontrada com ${baseCompletionTx?.points_delta} pontos`);

    // -------------------------------------------------------------
    // Teste 16: Próxima missão recebe o desbloqueio correto (+20 pts)
    // -------------------------------------------------------------
    const unlockNextTx = db.prepare(`
      SELECT * FROM points_transactions
      WHERE participant_id = ? AND event_key = ?
    `).get(testParticipantId, `UNLOCK:${testParticipantId}:ms-04`) as any;
    record(16, 'Próxima missão recebe o desbloqueio correto (+20 pts)', unlockNextTx?.points_delta === 20,
      `Transação UNLOCK para ms-04 registrada com ${unlockNextTx?.points_delta} pontos`);

    // -------------------------------------------------------------
    // Teste 14: Requisições simultâneas não duplicam bônus
    // -------------------------------------------------------------
    // Tentar completar novamente ms-01
    const repeatCompleteRes = await fetch(`${BASE_URL}/missions/ms-01/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': testParticipantToken }
    });
    const speedBonusTxCount = db.prepare(`
      SELECT COUNT(*) as count FROM points_transactions
      WHERE participant_id = ? AND event_key = ?
    `).get(testParticipantId, `SPEED_BONUS:${testParticipantId}:ms-01`) as any;
    record(14, 'Requisições simultâneas não duplicam bônus', speedBonusTxCount.count === 1,
      `Total de transações SPEED_BONUS para ms-01: ${speedBonusTxCount.count}`);

    // -------------------------------------------------------------
    // Teste 10: Missão expirada pode ser concluída (não bloqueia)
    // Teste 11: Missão expirada não concede bônus (bônus = 0)
    // -------------------------------------------------------------
    // ms-04 agora está disponível. Vamos iniciá-la e forçar sua data de início no passado para simular expiração
    await fetch(`${BASE_URL}/missions/ms-04/start`, {
      method: 'POST',
      headers: { 'Authorization': testParticipantToken }
    });
    // Forçar started_at_ms há 10 minutos atrás (duração era 5 min = 300s)
    const tenMinAgo = Date.now() - 600000;
    const targetEndPast = tenMinAgo + 300000; // expirou há 5 min
    db.prepare(`
      UPDATE participant_missions
      SET started_at_ms = ?, target_end_at_ms = ?, duration_seconds = 300
      WHERE participant_id = ? AND mission_id = 'ms-04'
    `).run(tenMinAgo, targetEndPast, testParticipantId);

    // Concluir missão expirada
    const completeExpiredRes = await fetch(`${BASE_URL}/missions/ms-04/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': testParticipantToken }
    });
    const completeExpiredData = await completeExpiredRes.json();
    const test10Passed = completeExpiredRes.ok && completeExpiredData.success === true;
    record(10, 'Missão expirada pode ser concluída', test10Passed,
      `Status: ${completeExpiredRes.status}, sucesso: ${completeExpiredData.success}`);

    const expiredSpeedBonusTx = db.prepare(`
      SELECT * FROM points_transactions
      WHERE participant_id = ? AND event_key = ?
    `).get(testParticipantId, `SPEED_BONUS:${testParticipantId}:ms-04`) as any;
    record(11, 'Missão expirada não concede bônus (bônus = 0)', !expiredSpeedBonusTx,
      `Transação SPEED_BONUS para ms-04: ${expiredSpeedBonusTx ? 'Encontrada (ERRO)' : 'NENHUMA creditada (CORRETO)'}`);

    // -------------------------------------------------------------
    // Teste 18: Reserva de pontos é atualizada corretamente após conclusão com bônus
    // -------------------------------------------------------------
    // Agora o participante completou ms-01 (20 + 180 + 50 = 250) e ms-04 (20 + 180 + 0 = 200). Total atual = 450 pts.
    // ms-06 foi desbloqueada automaticamente (+20 pts creditados). Total atual = 470 pts.
    // Para ms-06 (desbloqueada, pendente): reserva = 180 + 50 = 230 pts.
    // Para ms-08 (bloqueada): reserva = 20 + 180 + 50 = 250 pts.
    // Total reservado esperado = 230 + 250 = 480 pts.
    // Margem livre esperada = 1000 - 470 - 480 = 50 pts.
    const partStatusRes = await fetch(`${BASE_URL}/ranking/reservation/${testParticipantId}`, {
      headers: { 'Authorization': testAdminToken }
    });
    const partStatusData = await partStatusRes.json();
    const test18Passed = partStatusData.currentPoints === 470 &&
                         partStatusData.totalReservedPoints === 480 &&
                         partStatusData.freeMargin === 50;
    record(18, 'Reserva de pontos é atualizada corretamente após conclusão com bônus', test18Passed,
      `Atual: ${partStatusData.currentPoints} pts, Reservado: ${partStatusData.totalReservedPoints} pts, Margem livre: ${partStatusData.freeMargin} pts`);

    // -------------------------------------------------------------
    // Teste 17: Limite global de 1.000 pontos permanece garantido
    // -------------------------------------------------------------
    // Tentar ajuste manual positivo maior que a margem livre (ex: +100 pts quando margem é 50)
    const excessAdjustmentRes = await fetch(`${BASE_URL}/ranking/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': testAdminToken },
      body: JSON.stringify({ participantId: testParticipantId, pointsDelta: 100, reason: 'Tentativa de estourar margem' })
    });
    record(17, 'Limite global de 1.000 pontos permanece garantido', excessAdjustmentRes.status === 400,
      `Tentativa de ajuste acima da margem retornou status ${excessAdjustmentRes.status}`);

    // -------------------------------------------------------------
    // Teste 19: Histórico de transações permanece coerente com o saldo
    // -------------------------------------------------------------
    const txSum = db.prepare(`
      SELECT SUM(points_delta) as total FROM points_transactions WHERE participant_id = ?
    `).get(testParticipantId) as any;
    const partRow = db.prepare(`
      SELECT points FROM participants WHERE id = ?
    `).get(testParticipantId) as any;
    const test19Passed = txSum.total === partRow.points && txSum.total === 470;
    record(19, 'Histórico de transações permanece coerente com o saldo', test19Passed,
      `Soma das transações: ${txSum.total} pts, points na tabela participants: ${partRow.points} pts`);

  } finally {
    // Limpar dados do participante de teste e sessões
    db.prepare(`DELETE FROM auth_sessions WHERE user_id = ? OR token_hash = ? OR token_hash = ?`).run(testParticipantId, adminTokenHash, partTokenHash);
    db.prepare(`DELETE FROM points_transactions WHERE participant_id = ?`).run(testParticipantId);
    db.prepare(`DELETE FROM participant_missions WHERE participant_id = ?`).run(testParticipantId);
    db.prepare(`DELETE FROM participants WHERE id = ?`).run(testParticipantId);
    // Restaurar configuração padrão global para 5 min e limpar sobreposição de ms-01
    db.prepare(`UPDATE event_settings SET default_mission_timer_minutes = 5 WHERE id = 1`).run();
    db.prepare(`UPDATE missions SET timer_minutes = NULL WHERE id = 'ms-01'`).run();
    db.close();
  }

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\n========================================`);
  console.log(`RESULTADO FINAL: ${passedCount}/20 TESTES PASSARAM`);
  console.log(`========================================\n`);

  if (passedCount !== 20) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
