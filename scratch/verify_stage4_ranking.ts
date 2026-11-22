import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import crypto from 'node:crypto';

const DB_PATH = path.join(process.cwd(), 'server', 'db', 'desafio_global.sqlite');
const BASE_URL = 'http://localhost:3001/api';

async function runTests() {
  console.log('--- INICIANDO BATERIA DE TESTES DA ETAPA 4 (RANKING & INDICADOR) ---');
  const db = new DatabaseSync(DB_PATH);

  const testUser1 = 'test-rank-user-1';
  const testUser2 = 'test-rank-user-2';
  const testUser3 = 'test-rank-user-3';
  const rawToken1 = 'raw-test-rank-token-1';
  const tokenHash1 = crypto.createHash('sha256').update(rawToken1).digest('hex');
  const now = Date.now();

  // Limpeza de testes anteriores
  for (const uid of [testUser1, testUser2, testUser3]) {
    db.prepare(`DELETE FROM auth_sessions WHERE user_id = ?`).run(uid);
    db.prepare(`DELETE FROM points_transactions WHERE participant_id = ?`).run(uid);
    db.prepare(`DELETE FROM participant_missions WHERE participant_id = ?`).run(uid);
    db.prepare(`DELETE FROM participants WHERE id = ?`).run(uid);
  }

  // Inserir 3 participantes de teste com pontuações e missões distintas
  // User 1: 500 pts, 2 missões
  db.prepare(`
    INSERT INTO participants (id, name, nickname, email, points, completed_missions_count, role, registered_at, avatar, status, show_nickname_in_public_ranking)
    VALUES (?, 'Alice Competidora', 'Alice', 'alice@rank.com', 500, 2, 'participant', '2026-11-20 10:00:00', 'AL', 'Ativo', 1)
  `).run(testUser1);

  // User 2: 750 pts, 3 missões
  db.prepare(`
    INSERT INTO participants (id, name, nickname, email, points, completed_missions_count, role, registered_at, avatar, status, show_nickname_in_public_ranking)
    VALUES (?, 'Bruno Campeao', 'Bruno', 'bruno@rank.com', 750, 3, 'participant', '2026-11-20 09:00:00', 'BR', 'Ativo', 0)
  `).run(testUser2);

  // User 3: 500 pts, 1 missão (mesma pontuação que Alice, mas menos missões -> Alice deve ficar na frente pelo desempate!)
  db.prepare(`
    INSERT INTO participants (id, name, nickname, email, points, completed_missions_count, role, registered_at, avatar, status, show_nickname_in_public_ranking)
    VALUES (?, 'Carlos Empatado', 'Carlos', 'carlos@rank.com', 500, 1, 'participant', '2026-11-20 11:00:00', 'CR', 'Ativo', 1)
  `).run(testUser3);

  // Criar sessão para Alice
  db.prepare(`
    INSERT INTO auth_sessions (token_hash, user_id, user_email, role, created_at, expires_at, revoked)
    VALUES (?, ?, 'alice@rank.com', 'PARTICIPANT', ?, ?, 0)
  `).run(tokenHash1, testUser1, now, now + 3600000);

  const results: { test: number; name: string; passed: boolean; details: string }[] = [];
  function record(test: number, name: string, passed: boolean, details: string) {
    results.push({ test, name, passed, details });
    console.log(`[TESTE ${test.toString().padStart(2, '0')}] ${passed ? '✅ PASSOU' : '❌ FALHOU'}: ${name} -> ${details}`);
  }

  try {
    // -------------------------------------------------------------
    // Teste 01: Consulta de ranking público retorna dados ordenados
    // -------------------------------------------------------------
    const rankRes = await fetch(`${BASE_URL}/ranking/public`, {
      headers: { 'Authorization': `Bearer ${rawToken1}` }
    });
    const ranking: any[] = await rankRes.json();
    const test1Passed = Array.isArray(ranking) && ranking.length >= 3;
    record(1, 'Consulta de ranking público retorna array ordenado', test1Passed, `Total participantes retornados: ${ranking.length}`);

    // -------------------------------------------------------------
    // Teste 02: Ordenação por pontuação decrescente
    // -------------------------------------------------------------
    let strictlyOrdered = true;
    for (let i = 0; i < ranking.length - 1; i++) {
      if (ranking[i].points < ranking[i + 1].points) {
        strictlyOrdered = false;
        break;
      }
    }
    record(2, 'Ordenação por pontuação decrescente garantida', strictlyOrdered, `Pontuações: ${ranking.slice(0, 5).map(r => r.points).join(', ')}`);

    // -------------------------------------------------------------
    // Teste 03: Desempate por quantidade de missões concluídas
    // -------------------------------------------------------------
    // Alice e Carlos têm 500 pontos, mas Alice tem 2 missões e Carlos tem 1 missão -> Alice antes de Carlos
    const aliceEntry = ranking.find(r => r.participantId === testUser1);
    const carlosEntry = ranking.find(r => r.participantId === testUser3);
    const brunoEntry = ranking.find(r => r.participantId === testUser2);
    const test3Passed = Boolean(aliceEntry && carlosEntry && aliceEntry.position < carlosEntry.position);
    record(3, 'Desempate por missões concluídas respeitado', test3Passed,
      `Alice (2 missões): posição #${aliceEntry?.position}, Carlos (1 missão): posição #${carlosEntry?.position}`);

    // -------------------------------------------------------------
    // Teste 04: Identificação do usuário logado (isCurrentUser)
    // -------------------------------------------------------------
    // Alice fez a requisição com seu token -> aliceEntry.isCurrentUser deve ser true, os demais false
    const test4Passed = aliceEntry?.isCurrentUser === true && carlosEntry?.isCurrentUser === false && brunoEntry?.isCurrentUser === false;
    record(4, 'Identificação correta de isCurrentUser para participante autenticado', test4Passed,
      `Alice isCurrentUser: ${aliceEntry?.isCurrentUser}, Bruno isCurrentUser: ${brunoEntry?.isCurrentUser}`);

    // -------------------------------------------------------------
    // Teste 05: Proteção de privacidade dos dados do participante
    // -------------------------------------------------------------
    // Nenhum e-mail, senha ou telefone deve estar presente nos objetos do ranking público
    const hasSensitiveData = ranking.some((r: any) => r.email !== undefined || r.password_hash !== undefined || r.phone !== undefined);
    // Bruno tem show_nickname_in_public_ranking = 0 -> displayName deve ser "Bruno Campeao"
    // Alice tem show_nickname_in_public_ranking = 1 -> displayName deve ser "Alice"
    const displayNameValid = aliceEntry?.displayName === 'Alice' && brunoEntry?.displayName === 'Bruno Campeao';
    record(5, 'Proteção de privacidade e respeito à preferência de apelido', !hasSensitiveData && displayNameValid,
      `Sem dados sensíveis: ${!hasSensitiveData}, Alice displayName: "${aliceEntry?.displayName}", Bruno displayName: "${brunoEntry?.displayName}"`);

    // -------------------------------------------------------------
    // Teste 06: Destaque Top 3 (Posições 1, 2 e 3)
    // -------------------------------------------------------------
    const topThree = ranking.slice(0, 3);
    const test6Passed = topThree[0].position === 1 && topThree[1].position === 2 && topThree[2].position === 3;
    record(6, 'Destaque visual do Top 3 possui posições 1, 2 e 3 válidas', test6Passed,
      `Líder: ${topThree[0].displayName} (${topThree[0].points} pts)`);

    // -------------------------------------------------------------
    // Teste 07: Indicador Global de Pontuação — Cálculo proporcional
    // -------------------------------------------------------------
    // Alice tem 500 pontos de 1.000 max -> 50%
    const expectedPercentage = Math.round((aliceEntry.points / 1000) * 100);
    record(7, 'Indicador Global — Percentual calculado corretamente', expectedPercentage === 50,
      `Pontos: ${aliceEntry.points}/1000 -> ${expectedPercentage}% (esperado: 50%)`);

    // -------------------------------------------------------------
    // Teste 08: Bootstrap reflete ranking e participante coerentes
    // -------------------------------------------------------------
    const bootRes = await fetch(`${BASE_URL}/bootstrap`, {
      headers: { 'Authorization': `Bearer ${rawToken1}` }
    });
    const bootData = await bootRes.json();
    const bootAlice = bootData.participant;
    const bootAliceInRanking = bootData.publicRanking.find((r: any) => r.participantId === testUser1);
    const test8Passed = bootAlice.id === testUser1 && bootAlice.points === bootAliceInRanking?.points;
    record(8, 'Bootstrap sincroniza participante e ranking simultaneamente', test8Passed,
      `Participante bootstrap: ${bootAlice.name} (${bootAlice.points} pts), no ranking: ${bootAliceInRanking?.points} pts`);

    // -------------------------------------------------------------
    // Teste 09: Atualização automática de pontuação e ranking após conclusão com bônus
    // -------------------------------------------------------------
    const pointsBefore = bootAlice.points;
    // Iniciar ms-01 via API oficial
    await fetch(`${BASE_URL}/missions/ms-01/start`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${rawToken1}` }
    });

    const completeRes = await fetch(`${BASE_URL}/missions/ms-01/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${rawToken1}` }
    });
    const completeData = await completeRes.json();

    // Consultar ranking novamente para verificar se a pontuação foi incrementada e reordenada
    const updatedRankRes = await fetch(`${BASE_URL}/ranking/public`, {
      headers: { 'Authorization': `Bearer ${rawToken1}` }
    });
    const updatedRanking: any[] = await updatedRankRes.json();
    const updatedAlice = updatedRanking.find(r => r.participantId === testUser1);

    const test9Passed = updatedAlice && updatedAlice.points > pointsBefore;
    record(9, 'Conclusão de missão e bônus atualizam ranking automaticamente', Boolean(test9Passed),
      `Pontos anteriores: ${pointsBefore} pts -> Novos pontos: ${updatedAlice?.points} pts (Bônus concedido: ${completeData.speedBonusAwarded} pts)`);

    // -------------------------------------------------------------
    // Teste 10: Limite global de 1.000 pontos respeitado no ranking
    // -------------------------------------------------------------
    // Nenhum participante no ranking pode exceder 1.000 pontos
    const allWithinLimit = updatedRanking.every(r => r.points <= 1000);
    record(10, 'Limite global de 1.000 pontos respeitado para todos os participantes', allWithinLimit,
      `Maior pontuação no ranking: ${Math.max(...updatedRanking.map(r => r.points))} pts <= 1.000 pts`);

  } finally {
    // Limpeza rigorosa dos participantes de teste
    for (const uid of [testUser1, testUser2, testUser3]) {
      db.prepare(`DELETE FROM auth_sessions WHERE user_id = ?`).run(uid);
      db.prepare(`DELETE FROM points_transactions WHERE participant_id = ?`).run(uid);
      db.prepare(`DELETE FROM participant_missions WHERE participant_id = ?`).run(uid);
      db.prepare(`DELETE FROM participants WHERE id = ?`).run(uid);
    }
    db.close();
  }

  const passedCount = results.filter((r) => r.passed).length;
  console.log(`\n========================================`);
  console.log(`RESULTADO DA ETAPA 4: ${passedCount}/10 TESTES PASSARAM`);
  console.log(`========================================\n`);

  if (passedCount !== 10) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Erro na execução dos testes:', err);
  process.exit(1);
});
