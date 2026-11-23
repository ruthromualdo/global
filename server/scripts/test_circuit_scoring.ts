/**
 * Suíte de Testes da Pontuação Dinâmica do Circuito Oficial (Etapa 1)
 *
 * Executa testes unitários e de integração em banco SQLite ISOLADO EM MEMÓRIA (:memory:).
 * O banco de dados de produção NÃO é tocado nem modificado.
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  distributeCircuitPoints,
  recalculateCircuitMissionPointsInDb,
  TOTAL_CIRCUIT_POINTS,
  TOTAL_UNLOCK_POINTS,
  TOTAL_COMPLETION_POINTS,
  TOTAL_SPEED_BONUS_POINTS,
} from '../db/circuitScoring.ts';

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FALHA: ${message}`);
    throw new Error(`Falha no teste: ${message}`);
  }
}

function calculateFileHash(filePath: string): string {
  if (!fs.existsSync(filePath)) return 'NOT_FOUND';
  const buffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

console.log('================================================================');
console.log('INICIANDO SUÍTE DE TESTES — ETAPA 1: PONTUAÇÃO DINÂMICA');
console.log('================================================================\n');

// Snapshot de integridade do banco real de produção
const prodDbPath = path.resolve('server/db/desafio_global.sqlite');
const initialProdHash = calculateFileHash(prodDbPath);
console.log(`[PROD DB CHECK] Hash inicial de ${path.basename(prodDbPath)}: ${initialProdHash.slice(0, 16)}...`);

let totalTestsRun = 0;
let totalPassed = 0;

function runTest(name: string, fn: () => void) {
  totalTestsRun++;
  try {
    fn();
    totalPassed++;
    console.log(`✅ [PASS] ${name}`);
  } catch (err: unknown) {
    console.error(`❌ [FAIL] ${name}:`, (err as Error).message);
    throw err;
  }
}

// ============================================================================
// BLOCO 1: TESTES UNITÁRIOS DA FUNÇÃO PURA distributeCircuitPoints
// ============================================================================

runTest('1. Distribuição pura com N = 1 missão', () => {
  const dist = distributeCircuitPoints(1);
  assert(dist.length === 1, 'Deveria retornar 1 item');
  assert(dist[0].sequenceOrder === 1, 'sequenceOrder deve ser 1');
  assert(dist[0].unlockPoints === 80, 'Desbloqueio deve ser 80');
  assert(dist[0].completionPoints === 720, 'Conclusão deve ser 720');
  assert(dist[0].maxSpeedBonus === 200, 'Bônus de velocidade deve ser 200');
  assert(dist[0].points === 720, 'points deve ser idêntico a completionPoints');
  assert(dist[0].totalPotentialPoints === 1000, 'Total deve ser 1.000');
});

runTest('2. Distribuição pura com N = 2 missões (Exemplo do Usuário: 40/360/100)', () => {
  const dist = distributeCircuitPoints(2);
  assert(dist.length === 2, 'Deveria retornar 2 itens');
  
  // Missão 1
  assert(dist[0].unlockPoints === 40, 'M1 desbloqueio deve ser 40');
  assert(dist[0].completionPoints === 360, 'M1 conclusão deve ser 360');
  assert(dist[0].maxSpeedBonus === 100, 'M1 bônus deve ser 100');
  assert(dist[0].points === 360, 'M1 points deve ser 360');
  assert(dist[0].totalPotentialPoints === 500, 'M1 total deve ser 500');

  // Missão 2
  assert(dist[1].unlockPoints === 40, 'M2 desbloqueio deve ser 40');
  assert(dist[1].completionPoints === 360, 'M2 conclusão deve ser 360');
  assert(dist[1].maxSpeedBonus === 100, 'M2 bônus deve ser 100');
  assert(dist[1].points === 360, 'M2 points deve ser 360');
  assert(dist[1].totalPotentialPoints === 500, 'M2 total deve ser 500');

  assert(dist[0].totalPotentialPoints + dist[1].totalPotentialPoints === 1000, 'Soma total deve ser 1.000');
});

runTest('3. Distribuição pura com N = 3 missões (Exemplo do Usuário: 27/240/67 e 26/240/66)', () => {
  const dist = distributeCircuitPoints(3);
  assert(dist.length === 3, 'Deveria retornar 3 itens');

  // Missão 1: 27, 240, 67
  assert(dist[0].unlockPoints === 27, 'M1 desbloqueio deve ser 27');
  assert(dist[0].completionPoints === 240, 'M1 conclusão deve ser 240');
  assert(dist[0].maxSpeedBonus === 67, 'M1 bônus deve ser 67');
  assert(dist[0].points === 240, 'M1 points deve ser 240');
  assert(dist[0].totalPotentialPoints === 334, 'M1 total deve ser 334');

  // Missão 2: 27, 240, 67
  assert(dist[1].unlockPoints === 27, 'M2 desbloqueio deve ser 27');
  assert(dist[1].completionPoints === 240, 'M2 conclusão deve ser 240');
  assert(dist[1].maxSpeedBonus === 67, 'M2 bônus deve ser 67');
  assert(dist[1].points === 240, 'M2 points deve ser 240');
  assert(dist[1].totalPotentialPoints === 334, 'M2 total deve ser 334');

  // Missão 3: 26, 240, 66
  assert(dist[2].unlockPoints === 26, 'M3 desbloqueio deve ser 26');
  assert(dist[2].completionPoints === 240, 'M3 conclusão deve ser 240');
  assert(dist[2].maxSpeedBonus === 66, 'M3 bônus deve ser 66');
  assert(dist[2].points === 240, 'M3 points deve ser 240');
  assert(dist[2].totalPotentialPoints === 332, 'M3 total deve ser 332');

  const totalUnlock = dist[0].unlockPoints + dist[1].unlockPoints + dist[2].unlockPoints;
  const totalComp = dist[0].completionPoints + dist[1].completionPoints + dist[2].completionPoints;
  const totalSpeed = dist[0].maxSpeedBonus + dist[1].maxSpeedBonus + dist[2].maxSpeedBonus;
  const totalGen = dist[0].totalPotentialPoints + dist[1].totalPotentialPoints + dist[2].totalPotentialPoints;

  assert(totalUnlock === 80, 'Soma dos desbloqueios deve ser 80');
  assert(totalComp === 720, 'Soma das conclusões deve ser 720');
  assert(totalSpeed === 200, 'Soma dos bônus deve ser 200');
  assert(totalGen === 1000, 'Soma geral deve ser exatamente 1.000');
});

runTest('4. Distribuição pura com N = 4 missões (Configuração Padrão: 20/180/50)', () => {
  const dist = distributeCircuitPoints(4);
  assert(dist.length === 4, 'Deveria retornar 4 itens');
  for (let i = 0; i < 4; i++) {
    assert(dist[i].unlockPoints === 20, `M${i + 1} desbloqueio deve ser 20`);
    assert(dist[i].completionPoints === 180, `M${i + 1} conclusão deve ser 180`);
    assert(dist[i].maxSpeedBonus === 50, `M${i + 1} bônus deve ser 50`);
    assert(dist[i].points === 180, `M${i + 1} points deve ser 180`);
    assert(dist[i].totalPotentialPoints === 250, `M${i + 1} total deve ser 250`);
  }
  const sum = dist.reduce((acc, m) => acc + m.totalPotentialPoints, 0);
  assert(sum === 1000, 'Soma total deve ser 1.000');
});

runTest('5. Distribuição pura com N = 5 missões (Exemplo do Usuário: 16/144/40)', () => {
  const dist = distributeCircuitPoints(5);
  assert(dist.length === 5, 'Deveria retornar 5 itens');
  for (let i = 0; i < 5; i++) {
    assert(dist[i].unlockPoints === 16, `M${i + 1} desbloqueio deve ser 16`);
    assert(dist[i].completionPoints === 144, `M${i + 1} conclusão deve ser 144`);
    assert(dist[i].maxSpeedBonus === 40, `M${i + 1} bônus deve ser 40`);
    assert(dist[i].points === 144, `M${i + 1} points deve ser 144`);
    assert(dist[i].totalPotentialPoints === 200, `M${i + 1} total deve ser 200`);
  }
  const sum = dist.reduce((acc, m) => acc + m.totalPotentialPoints, 0);
  assert(sum === 1000, 'Soma total deve ser 1.000');
});

runTest('6. Distribuição pura com N = 6 missões (Matriz auditada: [14, 14, 13, 13, 13, 13])', () => {
  const dist = distributeCircuitPoints(6);
  assert(dist.length === 6, 'Deveria retornar 6 itens');
  
  // Desbloqueios: 80 / 6 = 13 (resto 2) -> primeiros 2 recebem 14, demais 13
  assert(dist[0].unlockPoints === 14 && dist[1].unlockPoints === 14, 'M1 e M2 desbloqueio devem ser 14');
  assert(dist[2].unlockPoints === 13 && dist[3].unlockPoints === 13 && dist[4].unlockPoints === 13 && dist[5].unlockPoints === 13, 'M3 a M6 desbloqueio devem ser 13');

  // Conclusões: 720 / 6 = 120 (resto 0) -> todos recebem 120
  for (let i = 0; i < 6; i++) {
    assert(dist[i].completionPoints === 120, `M${i + 1} conclusão deve ser 120`);
  }

  // Bônus: 200 / 6 = 33 (resto 2) -> primeiros 2 recebem 34, demais 33
  assert(dist[0].maxSpeedBonus === 34 && dist[1].maxSpeedBonus === 34, 'M1 e M2 bônus devem ser 34');
  assert(dist[2].maxSpeedBonus === 33 && dist[3].maxSpeedBonus === 33 && dist[4].maxSpeedBonus === 33 && dist[5].maxSpeedBonus === 33, 'M3 a M6 bônus devem ser 33');

  const totalUnlock = dist.reduce((acc, m) => acc + m.unlockPoints, 0);
  const totalComp = dist.reduce((acc, m) => acc + m.completionPoints, 0);
  const totalSpeed = dist.reduce((acc, m) => acc + m.maxSpeedBonus, 0);
  const totalSum = dist.reduce((acc, m) => acc + m.totalPotentialPoints, 0);

  assert(totalUnlock === 80, 'Soma desbloqueio deve ser 80');
  assert(totalComp === 720, 'Soma conclusão deve ser 720');
  assert(totalSpeed === 200, 'Soma bônus deve ser 200');
  assert(totalSum === 1000, 'Soma total deve ser exatamente 1.000');
});

runTest('7. Validação exata das somas para N de 1 a 12 (sempre 80, 720, 200, 1000 inteiros)', () => {
  for (let n = 1; n <= 12; n++) {
    const dist = distributeCircuitPoints(n);
    let uSum = 0;
    let cSum = 0;
    let bSum = 0;
    let totSum = 0;

    for (let i = 0; i < n; i++) {
      const item = dist[i];
      assert(Number.isInteger(item.unlockPoints) && item.unlockPoints > 0, `Unlock deve ser inteiro positivo em N=${n}`);
      assert(Number.isInteger(item.completionPoints) && item.completionPoints > 0, `Completion deve ser inteiro positivo em N=${n}`);
      assert(Number.isInteger(item.maxSpeedBonus) && item.maxSpeedBonus > 0, `Bonus deve ser inteiro positivo em N=${n}`);
      assert(item.points === item.completionPoints, `points deve ser igual a completionPoints em N=${n}`);
      assert(item.totalPotentialPoints === item.unlockPoints + item.completionPoints + item.maxSpeedBonus, `Total da missão inconsistente em N=${n}`);

      uSum += item.unlockPoints;
      cSum += item.completionPoints;
      bSum += item.maxSpeedBonus;
      totSum += item.totalPotentialPoints;
    }

    assert(uSum === TOTAL_UNLOCK_POINTS, `Soma unlock (${uSum}) != 80 para N=${n}`);
    assert(cSum === TOTAL_COMPLETION_POINTS, `Soma completion (${cSum}) != 720 para N=${n}`);
    assert(bSum === TOTAL_SPEED_BONUS_POINTS, `Soma bonus (${bSum}) != 200 para N=${n}`);
    assert(totSum === TOTAL_CIRCUIT_POINTS, `Soma total (${totSum}) != 1000 para N=${n}`);
  }
});

runTest('8. Rejeição de entradas inválidas em distributeCircuitPoints (0, negativos, não-inteiros)', () => {
  let threw0 = false;
  try { distributeCircuitPoints(0); } catch { threw0 = true; }
  assert(threw0, 'Deve rejeitar N = 0');

  let threwNeg = false;
  try { distributeCircuitPoints(-3); } catch { threwNeg = true; }
  assert(threwNeg, 'Deve rejeitar N negativo');

  let threwFloat = false;
  try { distributeCircuitPoints(3.5); } catch { threwFloat = true; }
  assert(threwFloat, 'Deve rejeitar N com casa decimal');
});

// ============================================================================
// BLOCO 2: TESTES DE BANCO DE DADOS EM MEMÓRIA (:memory:)
// ============================================================================

function createTestDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE missions (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      startup_id TEXT NOT NULL DEFAULT 'st-01',
      startup_name TEXT NOT NULL DEFAULT 'Startup Teste',
      category TEXT NOT NULL DEFAULT 'Geral',
      points INTEGER NOT NULL DEFAULT 180,
      estimated_time TEXT NOT NULL DEFAULT '4 min',
      status TEXT NOT NULL DEFAULT 'Disponível',
      period TEXT NOT NULL DEFAULT '24 a 26/11/2026',
      completion_criteria TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      sequence_order INTEGER,
      timer_minutes INTEGER,
      unlock_points INTEGER NOT NULL DEFAULT 20,
      completion_points INTEGER NOT NULL DEFAULT 180,
      max_speed_bonus INTEGER NOT NULL DEFAULT 50
    );
  `);
  return db;
}

runTest('9. Recálculo no SQLite em memória com 3 missões oficiais e 2 missões extras', () => {
  const db = createTestDatabase();

  // Inserir 3 missões oficiais (com valores iniciais genéricos)
  db.prepare(`
    INSERT INTO missions (id, title, sequence_order, active, points, unlock_points, completion_points, max_speed_bonus)
    VALUES 
      ('ms-of-01', 'Missão Oficial 1', 1, 1, 999, 999, 999, 999),
      ('ms-of-02', 'Missão Oficial 2', 2, 1, 999, 999, 999, 999),
      ('ms-of-03', 'Missão Oficial 3', 3, 1, 999, 999, 999, 999)
  `).run();

  // Inserir 2 missões extras (uma ativa e uma inativa, com pontuações manuais fixas)
  db.prepare(`
    INSERT INTO missions (id, title, sequence_order, active, points, unlock_points, completion_points, max_speed_bonus)
    VALUES 
      ('ms-ex-01', 'Missão Extra Ativa', NULL, 1, 350, 0, 350, 0),
      ('ms-ex-02', 'Missão Extra Inativa', NULL, 0, 500, 0, 500, 0)
  `).run();

  // Executar recálculo
  const result = recalculateCircuitMissionPointsInDb(db);

  assert(result.success === true, 'Recálculo deve retornar sucesso');
  assert(result.missionCount === 3, 'Deve identificar exatamente 3 missões oficiais');
  assert(result.summary.totalCircuitPoints === 1000, 'Soma resumo deve ser 1.000');

  // Verificar missões oficiais no SQLite
  const m1 = db.prepare('SELECT * FROM missions WHERE id = ?').get('ms-of-01') as Record<string, unknown>;
  const m2 = db.prepare('SELECT * FROM missions WHERE id = ?').get('ms-of-02') as Record<string, unknown>;
  const m3 = db.prepare('SELECT * FROM missions WHERE id = ?').get('ms-of-03') as Record<string, unknown>;

  // M1: 27 / 240 / 67 (points = 240)
  assert(Number(m1.unlock_points) === 27, 'M1 unlock_points deve ser 27');
  assert(Number(m1.completion_points) === 240, 'M1 completion_points deve ser 240');
  assert(Number(m1.max_speed_bonus) === 67, 'M1 max_speed_bonus deve ser 67');
  assert(Number(m1.points) === 240, 'M1 points deve ser 240 (idêntico a completion)');

  // M2: 27 / 240 / 67 (points = 240)
  assert(Number(m2.unlock_points) === 27, 'M2 unlock_points deve ser 27');
  assert(Number(m2.completion_points) === 240, 'M2 completion_points deve ser 240');
  assert(Number(m2.max_speed_bonus) === 67, 'M2 max_speed_bonus deve ser 67');
  assert(Number(m2.points) === 240, 'M2 points deve ser 240');

  // M3: 26 / 240 / 66 (points = 240)
  assert(Number(m3.unlock_points) === 26, 'M3 unlock_points deve ser 26');
  assert(Number(m3.completion_points) === 240, 'M3 completion_points deve ser 240');
  assert(Number(m3.max_speed_bonus) === 66, 'M3 max_speed_bonus deve ser 66');
  assert(Number(m3.points) === 240, 'M3 points deve ser 240');

  // PRESERVAÇÃO INTEGRAL DAS MISSÕES EXTRAS
  const ex1 = db.prepare('SELECT * FROM missions WHERE id = ?').get('ms-ex-01') as Record<string, unknown>;
  const ex2 = db.prepare('SELECT * FROM missions WHERE id = ?').get('ms-ex-02') as Record<string, unknown>;

  assert(Number(ex1.points) === 350, 'Missão extra 1 deve manter points = 350 intacto');
  assert(Number(ex1.completion_points) === 350, 'Missão extra 1 deve manter completion = 350 intacto');
  assert(Number(ex2.points) === 500, 'Missão extra 2 deve manter points = 500 intacto');
  assert(Number(ex2.completion_points) === 500, 'Missão extra 2 deve manter completion = 500 intacto');
});

runTest('10. Rejeição com erro e rollback atômico em sequência com ordem duplicada', () => {
  const db = createTestDatabase();

  db.prepare(`
    INSERT INTO missions (id, title, sequence_order, active, points)
    VALUES 
      ('ms-01', 'M1', 1, 1, 180),
      ('ms-02', 'M2', 2, 1, 180),
      ('ms-03', 'M3_duplicada', 2, 1, 180)
  `).run();

  let threw = false;
  try {
    recalculateCircuitMissionPointsInDb(db);
  } catch (err: unknown) {
    threw = true;
    assert((err as Error).message.includes('duplicada'), 'Mensagem deve indicar ordem duplicada');
  }
  assert(threw, 'Deve lançar exceção');

  // Garante que nenhuma missão foi alterada
  const m1 = db.prepare('SELECT points FROM missions WHERE id = ?').get('ms-01') as Record<string, unknown>;
  assert(Number(m1.points) === 180, 'Rollback deve preservar valores originais');
});

runTest('11. Rejeição com erro e rollback atômico em sequência com lacuna (gaps)', () => {
  const db = createTestDatabase();

  // Ordem 1, 2, 4 (lacuna na posição 3)
  db.prepare(`
    INSERT INTO missions (id, title, sequence_order, active, points)
    VALUES 
      ('ms-01', 'M1', 1, 1, 180),
      ('ms-02', 'M2', 2, 1, 180),
      ('ms-04', 'M4_gap', 4, 1, 180)
  `).run();

  let threw = false;
  try {
    recalculateCircuitMissionPointsInDb(db);
  } catch (err: unknown) {
    threw = true;
    assert((err as Error).message.includes('contígua'), 'Mensagem deve indicar que a sequência não é contígua');
  }
  assert(threw, 'Deve lançar exceção para lacuna');

  const m1 = db.prepare('SELECT points FROM missions WHERE id = ?').get('ms-01') as Record<string, unknown>;
  assert(Number(m1.points) === 180, 'Rollback deve preservar valores originais');
});

runTest('12. Rejeição quando não há missões oficiais ativas', () => {
  const db = createTestDatabase();

  // Apenas missões extras ou inativas
  db.prepare(`
    INSERT INTO missions (id, title, sequence_order, active, points)
    VALUES 
      ('ms-ex-01', 'Extra 1', NULL, 1, 200),
      ('ms-of-inativa', 'Oficial Inativa', 1, 0, 180)
  `).run();

  let threw = false;
  try {
    recalculateCircuitMissionPointsInDb(db);
  } catch (err: unknown) {
    threw = true;
    assert((err as Error).message.includes('Nenhuma missão oficial ativa'), 'Mensagem deve indicar ausência de missões');
  }
  assert(threw, 'Deve lançar exceção');
});

runTest('13. Rejeição quando sequência não começa em 1 (ex.: 2, 3, 4)', () => {
  const db = createTestDatabase();

  db.prepare(`
    INSERT INTO missions (id, title, sequence_order, active, points)
    VALUES 
      ('ms-02', 'M2', 2, 1, 180),
      ('ms-03', 'M3', 3, 1, 180)
  `).run();

  let threw = false;
  try {
    recalculateCircuitMissionPointsInDb(db);
  } catch (err: unknown) {
    threw = true;
    assert((err as Error).message.includes('contígua a partir de 1'), 'Mensagem deve indicar início diferente de 1');
  }
  assert(threw, 'Deve lançar exceção');
});

// ============================================================================
// VALIDAÇÃO FINAL DE INTEGRIDADE DO BANCO DE PRODUÇÃO
// ============================================================================
const finalProdHash = calculateFileHash(prodDbPath);
assert(
  initialProdHash === finalProdHash,
  `VIOLAÇÃO DE SEGURANÇA: O banco de dados de produção foi alterado durante os testes! Inicial: ${initialProdHash}, Final: ${finalProdHash}`
);

console.log('\n================================================================');
console.log(`SUÍTE EXECUTADA COM SUCESSO: ${totalPassed}/${totalTestsRun} TESTES APROVADOS!`);
console.log(`[PROD DB INTEGRITY] Hash de produção inalterado: ${finalProdHash.slice(0, 16)}... (100% íntegro)`);
console.log('================================================================\n');
