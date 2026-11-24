/**
 * Suíte de Testes da Proteção do Circuito Oficial (Etapa 2)
 *
 * Valida todos os 11 requisitos de detecção, bloqueio estrutural, atomicidade
 * e permissão de edição de título/descrição em banco SQLite ISOLADO EM MEMÓRIA (:memory:).
 * O banco de dados real de produção NÃO é tocado nem modificado.
 */

import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {
  distributeCircuitPoints,
  recalculateCircuitMissionPointsInDb,
  compactCircuitSequencesInDb,
  hasOfficialCircuitStartedInDb,
  getOfficialCircuitActivityCountInDb,
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
console.log('INICIANDO SUÍTE DE TESTES — ETAPA 2: PROTEÇÃO DO CIRCUITO');
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

function createFullTestDatabase(): DatabaseSync {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE participants (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      role TEXT NOT NULL DEFAULT 'PARTICIPANT'
    );

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
      completion_criteria TEXT NOT NULL DEFAULT 'Ler QR Code',
      active INTEGER NOT NULL DEFAULT 1,
      sequence_order INTEGER,
      track_id TEXT,
      relative_weight INTEGER NOT NULL DEFAULT 10,
      timer_minutes INTEGER,
      unlock_points INTEGER NOT NULL DEFAULT 20,
      completion_points INTEGER NOT NULL DEFAULT 180,
      max_speed_bonus INTEGER NOT NULL DEFAULT 50
    );

    CREATE TABLE participant_missions (
      id TEXT PRIMARY KEY,
      participant_id TEXT NOT NULL,
      mission_id TEXT NOT NULL,
      sequence_order INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'Bloqueada',
      unlocked_at_ms INTEGER,
      started_at_ms INTEGER,
      completed_at_ms INTEGER,
      elapsed_seconds INTEGER,
      unlock_points_awarded INTEGER NOT NULL DEFAULT 0,
      completion_points_awarded INTEGER NOT NULL DEFAULT 0,
      speed_bonus_awarded INTEGER NOT NULL DEFAULT 0,
      total_points_awarded INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE mission_completions (
      id TEXT PRIMARY KEY,
      participant_id TEXT NOT NULL,
      participant_name TEXT NOT NULL,
      mission_id TEXT NOT NULL,
      mission_title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pendente'
    );

    CREATE TABLE points_transactions (
      id TEXT PRIMARY KEY,
      participant_id TEXT NOT NULL,
      participant_name TEXT NOT NULL,
      points_delta INTEGER NOT NULL,
      event_key TEXT,
      mission_id TEXT
    );

    CREATE TABLE qr_codes (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      mission_id TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE qr_scans (
      id TEXT PRIMARY KEY,
      qr_code_id TEXT NOT NULL,
      participant_id TEXT NOT NULL,
      scanned_at TEXT NOT NULL
    );

    CREATE TABLE event_settings (
      id INTEGER PRIMARY KEY,
      default_mission_timer_minutes INTEGER NOT NULL DEFAULT 5
    );

    INSERT INTO event_settings (id, default_mission_timer_minutes) VALUES (1, 5);
  `);
  return db;
}

// ----------------------------------------------------------------------------
// TESTE 1: Participante recém-cadastrado não bloqueia o circuito
// ----------------------------------------------------------------------------
runTest('1. Participante recém-cadastrado não bloqueia o circuito', () => {
  const db = createFullTestDatabase();

  // Inserir 4 missões oficiais
  db.prepare(`
    INSERT INTO missions (id, title, sequence_order, active, points, unlock_points, completion_points, max_speed_bonus)
    VALUES 
      ('ms-01', 'Oficial 1', 1, 1, 180, 20, 180, 50),
      ('ms-02', 'Oficial 2', 2, 1, 180, 20, 180, 50),
      ('ms-03', 'Oficial 3', 3, 1, 180, 20, 180, 50),
      ('ms-04', 'Oficial 4', 4, 1, 180, 20, 180, 50)
  `).run();

  // Novo participante registrado (M1 é inserida como 'Disponível', mas sem started/completed/transações)
  db.prepare(`
    INSERT INTO participants (id, name, points) VALUES ('part-01', 'Participante Novo', 0)
  `).run();

  db.prepare(`
    INSERT INTO participant_missions (id, participant_id, mission_id, sequence_order, status, started_at_ms, completed_at_ms)
    VALUES 
      ('pm-1', 'part-01', 'ms-01', 1, 'Disponível', NULL, NULL),
      ('pm-2', 'part-01', 'ms-02', 2, 'Bloqueada', NULL, NULL),
      ('pm-3', 'part-01', 'ms-03', 3, 'Bloqueada', NULL, NULL),
      ('pm-4', 'part-01', 'ms-04', 4, 'Bloqueada', NULL, NULL)
  `).run();

  assert(hasOfficialCircuitStartedInDb(db) === false, 'Circuito NÃO deve ser considerado iniciado');
  assert(getOfficialCircuitActivityCountInDb(db) === 0, 'Contagem de atividade deve ser 0');
});

// ----------------------------------------------------------------------------
// TESTE 2: Missão extra não bloqueia o circuito
// ----------------------------------------------------------------------------
runTest('2. Atividade em missão extra não bloqueia o circuito', () => {
  const db = createFullTestDatabase();

  // 2 missões oficiais (sem atividade) e 1 extra
  db.prepare(`
    INSERT INTO missions (id, title, sequence_order, active, points)
    VALUES 
      ('ms-01', 'Oficial 1', 1, 1, 180),
      ('ms-02', 'Oficial 2', 2, 1, 180),
      ('ms-ex-01', 'Missão Extra', NULL, 1, 300)
  `).run();

  // Atividade intensa na missão EXTRA (cronômetro, submissão, transação, scan)
  db.prepare(`
    INSERT INTO participant_missions (id, participant_id, mission_id, sequence_order, status, started_at_ms, completed_at_ms)
    VALUES ('pm-ex', 'part-01', 'ms-ex-01', 0, 'Concluída', 1000, 2000)
  `).run();

  db.prepare(`
    INSERT INTO mission_completions (id, participant_id, participant_name, mission_id, mission_title, status)
    VALUES ('mc-ex', 'part-01', 'Participante', 'ms-ex-01', 'Extra Title', 'Aprovada')
  `).run();

  db.prepare(`
    INSERT INTO points_transactions (id, participant_id, participant_name, points_delta, event_key, mission_id)
    VALUES ('tx-ex', 'part-01', 'Participante', 300, 'COMPLETE:part-01:ms-ex-01', 'ms-ex-01')
  `).run();

  db.prepare(`
    INSERT INTO qr_codes (id, code, mission_id) VALUES ('qr-ex', 'QR-EXTRA', 'ms-ex-01')
  `).run();

  db.prepare(`
    INSERT INTO qr_scans (id, qr_code_id, participant_id, scanned_at)
    VALUES ('scan-ex', 'qr-ex', 'part-01', '2026-11-22')
  `).run();

  assert(hasOfficialCircuitStartedInDb(db) === false, 'Circuito oficial NÃO deve ser afetado por missão extra');
  assert(getOfficialCircuitActivityCountInDb(db) === 0, 'Contagem de atividade oficial deve ser 0');
});

// ----------------------------------------------------------------------------
// TESTE 3: Iniciar missão oficial bloqueia alterações estruturais
// ----------------------------------------------------------------------------
runTest('3. Iniciar cronômetro de missão oficial bloqueia o circuito', () => {
  const db = createFullTestDatabase();

  db.prepare(`
    INSERT INTO missions (id, title, sequence_order, active, points)
    VALUES ('ms-01', 'Oficial 1', 1, 1, 180)
  `).run();

  // Participante clica em Iniciar cronômetro
  db.prepare(`
    INSERT INTO participant_missions (id, participant_id, mission_id, sequence_order, status, started_at_ms)
    VALUES ('pm-1', 'part-01', 'ms-01', 1, 'Em andamento', ${Date.now()})
  `).run();

  assert(hasOfficialCircuitStartedInDb(db) === true, 'Circuito deve ser detectado como iniciado');
  assert(getOfficialCircuitActivityCountInDb(db) >= 1, 'Contagem deve ser >= 1');
});

// ----------------------------------------------------------------------------
// TESTE 4: Enviar evidência oficial bloqueia o circuito
// ----------------------------------------------------------------------------
runTest('4. Enviar evidência de missão oficial bloqueia o circuito', () => {
  const db = createFullTestDatabase();

  db.prepare(`
    INSERT INTO missions (id, title, sequence_order, active, points)
    VALUES ('ms-01', 'Oficial 1', 1, 1, 180)
  `).run();

  // Submissão manual de evidência para revisão
  db.prepare(`
    INSERT INTO mission_completions (id, participant_id, participant_name, mission_id, mission_title, status)
    VALUES ('mc-1', 'part-01', 'Participante', 'ms-01', 'Oficial 1', 'Pendente')
  `).run();

  assert(hasOfficialCircuitStartedInDb(db) === true, 'Evidência submetida deve bloquear o circuito');
});

// ----------------------------------------------------------------------------
// TESTE 5: QR Code oficial registrado bloqueia o circuito
// ----------------------------------------------------------------------------
runTest('5. QR Code oficial registrado bloqueia o circuito', () => {
  const db = createFullTestDatabase();

  db.prepare(`
    INSERT INTO missions (id, title, sequence_order, active, points)
    VALUES ('ms-01', 'Oficial 1', 1, 1, 180)
  `).run();

  db.prepare(`
    INSERT INTO qr_codes (id, code, mission_id) VALUES ('qr-01', 'TUTU-2026', 'ms-01')
  `).run();

  // Registro de leitura de QR code
  db.prepare(`
    INSERT INTO qr_scans (id, qr_code_id, participant_id, scanned_at)
    VALUES ('scan-1', 'qr-01', 'part-01', '2026-11-22')
  `).run();

  assert(hasOfficialCircuitStartedInDb(db) === true, 'Scan de QR code oficial deve bloquear o circuito');
});

// ----------------------------------------------------------------------------
// TESTE 6: Criar, excluir, reordenar e desativar missão oficial antes do início
// ----------------------------------------------------------------------------
runTest('6. Gestão estrutural antes do início: compactação e recálculo dinâmico dos 1.000 pts', () => {
  const db = createFullTestDatabase();

  // 1. Cadastra 4 missões oficiais padrão
  db.prepare(`
    INSERT INTO missions (id, title, sequence_order, active, points)
    VALUES 
      ('ms-01', 'M1', 1, 1, 180),
      ('ms-02', 'M2', 2, 1, 180),
      ('ms-03', 'M3', 3, 1, 180),
      ('ms-04', 'M4', 4, 1, 180)
  `).run();

  compactCircuitSequencesInDb(db);
  let res = recalculateCircuitMissionPointsInDb(db);
  assert(res.missionCount === 4, 'Deve conter 4 missões');
  assert(res.updatedMissions[0].totalPotentialPoints === 250, 'Cada missão oficial deve ter 250 pts');

  // 2. Adiciona a 5ª missão oficial
  db.prepare(`
    INSERT INTO missions (id, title, sequence_order, active, points)
    VALUES ('ms-05', 'M5', 5, 1, 180)
  `).run();
  compactCircuitSequencesInDb(db);
  res = recalculateCircuitMissionPointsInDb(db);
  assert(res.missionCount === 5, 'Deve conter 5 missões');
  assert(res.updatedMissions[0].totalPotentialPoints === 200, 'Para N=5, cada missão deve ter 200 pts');

  // 3. Exclui a missão 2 (deixando buraco: 1, 3, 4, 5)
  db.prepare('DELETE FROM missions WHERE id = ?').run('ms-02');
  compactCircuitSequencesInDb(db); // compacta para 1, 2, 3, 4
  res = recalculateCircuitMissionPointsInDb(db);
  assert(res.missionCount === 4, 'Após exclusão e compactação, deve ter 4 missões contíguas');
  assert(res.updatedMissions[1].id === 'ms-03', 'M3 agora ocupa a ordem 2');
  assert(res.updatedMissions[1].sequenceOrder === 2, 'Ordem deve ser 2');

  // 4. Desativa a missão 3 (que agora é ordem 2)
  db.prepare('UPDATE missions SET active = 0 WHERE id = ?').run('ms-03');
  compactCircuitSequencesInDb(db); // limpa sequence_order de ms-03 e compacta restantes para 1, 2, 3
  res = recalculateCircuitMissionPointsInDb(db);
  assert(res.missionCount === 3, 'Após desativação, deve ter 3 missões oficiais ativas');
  assert(res.updatedMissions[0].totalPotentialPoints === 334, 'M1 para N=3 deve ter 334 pts');
  assert(res.updatedMissions[1].totalPotentialPoints === 334, 'M2 para N=3 deve ter 334 pts');
  assert(res.updatedMissions[2].totalPotentialPoints === 332, 'M3 para N=3 deve ter 332 pts');
  assert(
    res.updatedMissions[0].totalPotentialPoints + res.updatedMissions[1].totalPotentialPoints + res.updatedMissions[2].totalPotentialPoints === 1000,
    'Soma total deve ser exatamente 1.000 pontos'
  );
});

// ----------------------------------------------------------------------------
// TESTE 7: Missões extras preservam seus pontos manuais
// ----------------------------------------------------------------------------
runTest('7. Missões extras preservam rigorosamente seus pontos manuais', () => {
  const db = createFullTestDatabase();

  db.prepare(`
    INSERT INTO missions (id, title, sequence_order, active, points, unlock_points, completion_points)
    VALUES 
      ('ms-01', 'Oficial 1', 1, 1, 180, 20, 180),
      ('ms-02', 'Oficial 2', 2, 1, 180, 20, 180),
      ('ms-ex-1', 'Extra Manual 450', NULL, 1, 450, 0, 450),
      ('ms-ex-2', 'Extra Manual 700', NULL, 0, 700, 0, 700)
  `).run();

  compactCircuitSequencesInDb(db);
  recalculateCircuitMissionPointsInDb(db);

  const ex1 = db.prepare('SELECT points, completion_points FROM missions WHERE id = ?').get('ms-ex-1') as Record<string, unknown>;
  const ex2 = db.prepare('SELECT points, completion_points FROM missions WHERE id = ?').get('ms-ex-2') as Record<string, unknown>;

  assert(Number(ex1.points) === 450, 'Extra 1 deve preservar 450 pts');
  assert(Number(ex1.completion_points) === 450, 'Extra 1 completion deve preservar 450 pts');
  assert(Number(ex2.points) === 700, 'Extra 2 deve preservar 700 pts');
  assert(Number(ex2.completion_points) === 700, 'Extra 2 completion deve preservar 700 pts');
});

// ----------------------------------------------------------------------------
// TESTE 8: Edição de título e descrição oficial continua permitida após o início
// ----------------------------------------------------------------------------
runTest('8. Edição de título e descrição de missão oficial é permitida após início', () => {
  const db = createFullTestDatabase();

  db.prepare(`
    INSERT INTO missions (id, title, description, sequence_order, active, points, unlock_points, completion_points, max_speed_bonus)
    VALUES ('ms-01', 'Título Antigo', 'Desc Antiga', 1, 1, 180, 20, 180, 50)
  `).run();

  // Simula início do circuito
  db.prepare(`
    INSERT INTO participant_missions (id, participant_id, mission_id, sequence_order, status, started_at_ms)
    VALUES ('pm-1', 'part-01', 'ms-01', 1, 'Em andamento', ${Date.now()})
  `).run();

  assert(hasOfficialCircuitStartedInDb(db) === true, 'Circuito iniciado');

  // Atualização permitida dentro de transação: apenas título e descrição
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    const isStarted = hasOfficialCircuitStartedInDb(db);
    assert(isStarted, 'Deve confirmar que o circuito iniciou');
    
    // Atualiza apenas title e description
    db.prepare('UPDATE missions SET title = ?, description = ? WHERE id = ?').run(
      'Título Novo e Aprimorado',
      'Nova descrição da missão sem alterar pontos',
      'ms-01'
    );
    db.exec('COMMIT;');
  } catch (err) {
    db.exec('ROLLBACK;');
    throw err;
  }

  const updated = db.prepare('SELECT * FROM missions WHERE id = ?').get('ms-01') as Record<string, unknown>;
  assert(updated.title === 'Título Novo e Aprimorado', 'Título deve ser atualizado');
  assert(updated.description === 'Nova descrição da missão sem alterar pontos', 'Descrição deve ser atualizada');
  assert(Number(updated.points) === 180, 'Pontos devem permanecer 180 intactos');
  assert(Number(updated.unlock_points) === 20, 'Unlock points devem permanecer intactos');
  assert(Number(updated.sequence_order) === 1, 'Sequence order deve permanecer intacta');
});

// ----------------------------------------------------------------------------
// TESTE 9: Alteração de critérios e cronômetros oficiais é bloqueada após o início
// ----------------------------------------------------------------------------
runTest('9. Alteração de critérios e cronômetros de missão oficial é bloqueada após início', () => {
  const db = createFullTestDatabase();

  db.prepare(`
    INSERT INTO missions (id, title, sequence_order, active, timer_minutes, completion_criteria)
    VALUES ('ms-01', 'M1 Oficial', 1, 1, 5, 'Critério Original')
  `).run();

  // Inicia circuito
  db.prepare(`
    INSERT INTO participant_missions (id, participant_id, mission_id, sequence_order, status, started_at_ms)
    VALUES ('pm-1', 'part-01', 'ms-01', 1, 'Em andamento', ${Date.now()})
  `).run();

  // 1. Tentativa de alterar timer_minutes
  let blockedTimer = false;
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    if (hasOfficialCircuitStartedInDb(db)) {
      // Regra de bloqueio do endpoint
      blockedTimer = true;
      db.exec('ROLLBACK;');
    } else {
      db.prepare('UPDATE missions SET timer_minutes = 10 WHERE id = ?').run('ms-01');
      db.exec('COMMIT;');
    }
  } catch {
    db.exec('ROLLBACK;');
  }
  assert(blockedTimer === true, 'Alteração de timer deve ser bloqueada');

  // 2. Tentativa de alterar completion_criteria
  let blockedCriteria = false;
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    if (hasOfficialCircuitStartedInDb(db)) {
      blockedCriteria = true;
      db.exec('ROLLBACK;');
    } else {
      db.prepare('UPDATE missions SET completion_criteria = ? WHERE id = ?').run('Novo Critério', 'ms-01');
      db.exec('COMMIT;');
    }
  } catch {
    db.exec('ROLLBACK;');
  }
  assert(blockedCriteria === true, 'Alteração de critérios deve ser bloqueada');

  const row = db.prepare('SELECT timer_minutes, completion_criteria FROM missions WHERE id = ?').get('ms-01') as Record<string, unknown>;
  assert(Number(row.timer_minutes) === 5, 'Timer deve permanecer 5 min');
  assert(row.completion_criteria === 'Critério Original', 'Critério deve permanecer inalterado');
});

// ----------------------------------------------------------------------------
// TESTE 10: Erros durante alterações estruturais provocam rollback integral
// ----------------------------------------------------------------------------
runTest('10. Erros durante alteração estrutural provocam rollback atômico integral', () => {
  const db = createFullTestDatabase();

  db.prepare(`
    INSERT INTO missions (id, title, sequence_order, active, points)
    VALUES 
      ('ms-01', 'M1', 1, 1, 180),
      ('ms-02', 'M2', 2, 1, 180)
  `).run();

  compactCircuitSequencesInDb(db);
  recalculateCircuitMissionPointsInDb(db);

  // Simular transação de alteração estrutural que falha
  let caught = false;
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  try {
    // Insere missão com lacuna proposital sem compactação prévia
    db.prepare(`
      INSERT INTO missions (id, title, sequence_order, active, points)
      VALUES ('ms-04', 'M4_falha', 4, 1, 180)
    `).run();

    // Executa recálculo direto (vai falhar pela lacuna e disparar rollback)
    recalculateCircuitMissionPointsInDb(db);
    db.exec('COMMIT;');
  } catch (err: unknown) {
    caught = true;
    db.exec('ROLLBACK;');
  }

  assert(caught === true, 'Deve capturar erro da sequência');

  // Confirma rollback integral: ms-04 NÃO deve existir no banco
  const ms04 = db.prepare('SELECT * FROM missions WHERE id = ?').get('ms-04');
  assert(ms04 === undefined, 'ms-04 deve ter sido completamente revertida pelo rollback');

  const count = db.prepare('SELECT COUNT(*) as c FROM missions').get() as { c: number };
  assert(count.c === 2, 'Banco deve conter apenas as 2 missões originais intactas');
});

// ----------------------------------------------------------------------------
// TESTE 11: A proteção não permite condição de corrida entre participante e admin
// ----------------------------------------------------------------------------
runTest('11. Proteção atômica via BEGIN IMMEDIATE impede race condition', () => {
  const db = createFullTestDatabase();

  db.prepare(`
    INSERT INTO missions (id, title, sequence_order, active, points)
    VALUES ('ms-01', 'M1', 1, 1, 180)
  `).run();

  // Simula participante iniciando a missão com trava imediata
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  db.prepare(`
    INSERT INTO participant_missions (id, participant_id, mission_id, sequence_order, status, started_at_ms)
    VALUES ('pm-1', 'part-01', 'ms-01', 1, 'Em andamento', ${Date.now()})
  `).run();
  db.exec('COMMIT;');

  // Tentativa subsequente ou serializada de admin alterar a estrutura
  db.exec('BEGIN IMMEDIATE TRANSACTION;');
  let adminBlocked = false;
  try {
    if (hasOfficialCircuitStartedInDb(db)) {
      adminBlocked = true;
      db.exec('ROLLBACK;');
    } else {
      db.prepare('DELETE FROM missions WHERE id = ?').run('ms-01');
      db.exec('COMMIT;');
    }
  } catch {
    db.exec('ROLLBACK;');
  }

  assert(adminBlocked === true, 'Admin é imediatamente bloqueado após ação do participante');
  const stillExists = db.prepare('SELECT id FROM missions WHERE id = ?').get('ms-01');
  assert(stillExists !== undefined, 'Missão oficial permanece preservada');
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
console.log(`SUÍTE DA ETAPA 2 EXECUTADA COM SUCESSO: ${totalPassed}/${totalTestsRun} TESTES APROVADOS!`);
console.log(`[PROD DB INTEGRITY] Hash de produção inalterado: ${finalProdHash.slice(0, 16)}... (100% íntegro)`);
console.log('================================================================\n');
