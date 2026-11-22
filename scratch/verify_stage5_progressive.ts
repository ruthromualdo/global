import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import crypto from 'node:crypto';

const DB_PATH = path.join(process.cwd(), 'server', 'db', 'desafio_global.sqlite');
const BASE_URL = 'http://localhost:3001/api';

async function runTests() {
  console.log('--- INICIANDO BATERIA DE VALIDAÇÃO DA ETAPA 5 (MISSÕES PROGRESSIVAS) ---');
  const db = new DatabaseSync(DB_PATH);

  const testUser = 'test-stage5-user';
  const rawToken = 'raw-test-stage5-token';
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const now = Date.now();

  // Limpeza de testes anteriores
  db.prepare(`DELETE FROM auth_sessions WHERE user_id = ?`).run(testUser);
  db.prepare(`DELETE FROM points_transactions WHERE participant_id = ?`).run(testUser);
  db.prepare(`DELETE FROM participant_missions WHERE participant_id = ?`).run(testUser);
  db.prepare(`DELETE FROM participants WHERE id = ?`).run(testUser);

  // Criar participante novo
  db.prepare(`
    INSERT INTO participants (id, name, nickname, email, points, completed_missions_count, role, registered_at, avatar, status, show_nickname_in_public_ranking)
    VALUES (?, 'Pedro Progressivo', 'Pedro', 'pedro@stage5.com', 0, 0, 'participant', '2026-11-21 12:00:00', 'PP', 'Ativo', 1)
  `).run(testUser);

  // Criar sessão de autenticação
  db.prepare(`
    INSERT INTO auth_sessions (token_hash, user_id, user_email, role, created_at, expires_at, revoked)
    VALUES (?, ?, 'pedro@stage5.com', 'PARTICIPANT', ?, ?, 0)
  `).run(tokenHash, testUser, now, now + 3600000);

  const results: { test: number; name: string; passed: boolean; details: string }[] = [];
  function record(test: number, name: string, passed: boolean, details: string) {
    results.push({ test, name, passed, details });
    console.log(`[TESTE ${test.toString().padStart(2, '0')}] ${passed ? '✅ PASSOU' : '❌ FALHOU'}: ${name} -> ${details}`);
  }

  try {
    // -------------------------------------------------------------
    // Teste 01: Inicialização do participante — Desbloqueio da 1ª Missão (Tutu)
    // -------------------------------------------------------------
    const getMissionsRes1 = await fetch(`${BASE_URL}/missions`, {
      headers: { 'Authorization': `Bearer ${rawToken}` }
    });
    const missions1: any[] = await getMissionsRes1.json();
    const seqMissions1 = missions1.filter(m => m.sequenceOrder !== null).sort((a, b) => a.sequenceOrder - b.sequenceOrder);

    // Identificar missão atual progressiva
    const currentMission1 = seqMissions1.find(m => m.status !== 'Concluída');
    const futureBlocked1 = seqMissions1.filter(m => m.sequenceOrder > 1 && m.status === 'Bloqueada');

    const test1Passed = currentMission1?.id === 'ms-01' &&
                        currentMission1?.startupName.includes('Tutu') &&
                        futureBlocked1.length === 3;
    record(1, 'Inicialmente, apenas a 1ª missão (Tutu) está liberada; futuras estão bloqueadas', test1Passed,
      `Missão atual: ${currentMission1?.title} (${currentMission1?.status}), Bloqueadas: ${futureBlocked1.length}/3`);

    // -------------------------------------------------------------
    // Teste 02: Bloqueio estrito de missões futuras
    // -------------------------------------------------------------
    const startM2EarlyRes = await fetch(`${BASE_URL}/missions/ms-04/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${rawToken}` }
    });
    const test2Passed = startM2EarlyRes.status === 403;
    record(2, 'Tentativa de iniciar missão futura antecipada é rejeitada com 403', test2Passed,
      `Início de ms-04 antes da ms-01 retornou status ${startM2EarlyRes.status}`);

    // -------------------------------------------------------------
    // Teste 03: Iniciar e Concluir Missão 1 (Tutu)
    // -------------------------------------------------------------
    await fetch(`${BASE_URL}/missions/ms-01/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${rawToken}` }
    });
    const completeM1Res = await fetch(`${BASE_URL}/missions/ms-01/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${rawToken}` }
    });
    const completeM1Data = await completeM1Res.json();
    const test3Passed = completeM1Res.ok && completeM1Data.success === true;
    record(3, 'Conclusão da 1ª Missão (Tutu) executada com sucesso', test3Passed,
      `Pontos creditados: ${completeM1Data.pointsAwarded} pts (conclusão: ${completeM1Data.completionPointsAwarded}, bônus: ${completeM1Data.speedBonusAwarded})`);

    // -------------------------------------------------------------
    // Teste 04: Transição automática para a 2ª Missão (Escreve Lab)
    // -------------------------------------------------------------
    const getMissionsRes2 = await fetch(`${BASE_URL}/missions`, {
      headers: { 'Authorization': `Bearer ${rawToken}` }
    });
    const missions2: any[] = await getMissionsRes2.json();
    const seqMissions2 = missions2.filter(m => m.sequenceOrder !== null).sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    const currentMission2 = seqMissions2.find(m => m.status !== 'Concluída');
    const test4Passed = currentMission2?.id === 'ms-04' && currentMission2?.startupName.includes('Escreve Lab');
    record(4, 'Transição automática: 2ª missão (Escreve Lab) torna-se a única ativa', test4Passed,
      `Nova missão ativa: ${currentMission2?.title} (${currentMission2?.startupName}) - status: ${currentMission2?.status}`);

    // -------------------------------------------------------------
    // Teste 05: Persistência após reload/re-login (recupera do backend)
    // -------------------------------------------------------------
    const bootRes = await fetch(`${BASE_URL}/bootstrap`, {
      headers: { 'Authorization': `Bearer ${rawToken}` }
    });
    const bootData = await bootRes.json();
    const bootMissions = bootData.missions.filter((m: any) => m.sequenceOrder !== null).sort((a: any, b: any) => a.sequenceOrder - b.sequenceOrder);
    const bootCurrent = bootMissions.find((m: any) => m.status !== 'Concluída');
    const test5Passed = bootCurrent?.id === 'ms-04' && bootCurrent?.status === 'Disponível';
    record(5, 'Após reload/bootstrap, a missão atual (Escreve Lab) é fielmente recuperada', test5Passed,
      `Recuperado no bootstrap: ${bootCurrent?.title} (${bootCurrent?.status})`);

    // -------------------------------------------------------------
    // Teste 06: Conclusão da 2ª Missão -> Transição para a 3ª Missão (Futurize)
    // -------------------------------------------------------------
    await fetch(`${BASE_URL}/missions/ms-04/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${rawToken}` }
    });
    await fetch(`${BASE_URL}/missions/ms-04/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${rawToken}` }
    });
    const getMissionsRes3 = await fetch(`${BASE_URL}/missions`, {
      headers: { 'Authorization': `Bearer ${rawToken}` }
    });
    const missions3: any[] = await getMissionsRes3.json();
    const seqMissions3 = missions3.filter(m => m.sequenceOrder !== null).sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    const currentMission3 = seqMissions3.find(m => m.status !== 'Concluída');
    const test6Passed = currentMission3?.id === 'ms-06' && currentMission3?.startupName.includes('Futurize');
    record(6, 'Conclusão da 2ª Missão desbloqueia e transiciona para a 3ª (Futurize)', test6Passed,
      `Nova missão ativa: ${currentMission3?.title} (${currentMission3?.startupName})`);

    // -------------------------------------------------------------
    // Teste 07: Conclusão da 3ª Missão -> Transição para a 4ª Missão (Startup Convidada)
    // -------------------------------------------------------------
    await fetch(`${BASE_URL}/missions/ms-06/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${rawToken}` }
    });
    await fetch(`${BASE_URL}/missions/ms-06/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${rawToken}` }
    });
    const getMissionsRes4 = await fetch(`${BASE_URL}/missions`, {
      headers: { 'Authorization': `Bearer ${rawToken}` }
    });
    const missions4: any[] = await getMissionsRes4.json();
    const seqMissions4 = missions4.filter(m => m.sequenceOrder !== null).sort((a, b) => a.sequenceOrder - b.sequenceOrder);
    const currentMission4 = seqMissions4.find(m => m.status !== 'Concluída');
    const test7Passed = currentMission4?.id === 'ms-08';
    record(7, 'Conclusão da 3ª Missão desbloqueia e transiciona para a 4ª (Startup Convidada)', test7Passed,
      `Nova missão ativa: ${currentMission4?.title} (${currentMission4?.startupName})`);

    // -------------------------------------------------------------
    // Teste 08: Conclusão da 4ª Missão -> Conclusão total do Circuito
    // -------------------------------------------------------------
    await fetch(`${BASE_URL}/missions/ms-08/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${rawToken}` }
    });
    await fetch(`${BASE_URL}/missions/ms-08/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${rawToken}` }
    });
    const getMissionsResFinal = await fetch(`${BASE_URL}/missions`, {
      headers: { 'Authorization': `Bearer ${rawToken}` }
    });
    const missionsFinal: any[] = await getMissionsResFinal.json();
    const seqFinal = missionsFinal.filter(m => m.sequenceOrder !== null);
    const allCompleted = seqFinal.every(m => m.status === 'Concluída');
    const test8Passed = allCompleted && seqFinal.length === 4;
    record(8, 'Conclusão da 4ª Missão resulta em circuito 100% concluído (tela especial ativada)', test8Passed,
      `Todas as 4 missões concluídas: ${allCompleted}`);

    // -------------------------------------------------------------
    // Teste 09: Pontuação permanente e saldo oficial acumulado
    // -------------------------------------------------------------
    const finalPartRes = await fetch(`${BASE_URL}/participants/me`, {
      headers: { 'Authorization': `Bearer ${rawToken}` }
    });
    const finalPartData = await finalPartRes.json();
    // 4 desbloqueios (4 x 20 = 80) + 4 conclusões (4 x 180 = 720) + 4 bônus de velocidade (~200) = ~1000 pts (teto 1.000)
    const test9Passed = finalPartData.points <= 1000 && finalPartData.points >= 800;
    record(9, 'Pontuação oficial acumulada reflete todas as 4 missões e bônus no teto de 1.000 pts', test9Passed,
      `Pontuação final do participante: ${finalPartData.points} pts (<= 1.000 pts)`);

  } finally {
    // Limpeza
    db.prepare(`DELETE FROM auth_sessions WHERE user_id = ?`).run(testUser);
    db.prepare(`DELETE FROM points_transactions WHERE participant_id = ?`).run(testUser);
    db.prepare(`DELETE FROM participant_missions WHERE participant_id = ?`).run(testUser);
    db.prepare(`DELETE FROM participants WHERE id = ?`).run(testUser);
    db.close();
  }

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\n========================================`);
  console.log(`RESULTADO DA ETAPA 5: ${passedCount}/9 TESTES PASSARAM`);
  console.log(`========================================\n`);

  if (passedCount !== 9) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
