/**
 * Módulo de Pontuação Dinâmica do Circuito Oficial
 * Desafio Global Summit 2026
 *
 * Responsável por:
 * 1. Distribuir rigorosamente os 1.000 pontos do circuito oficial entre N missões oficiais ativas.
 * 2. Detectar atividade efetiva de participantes em missões oficiais (congelando alterações estruturais).
 * 3. Compactar ordens sequenciais (1 .. N) após mudanças estruturais antes do início.
 * 4. Recalcular e persistir transacionalmente os pontos das missões oficiais.
 */

import type { DatabaseSync } from 'node:sqlite';

export const TOTAL_CIRCUIT_POINTS = 1000;
export const TOTAL_UNLOCK_POINTS = 80;
export const TOTAL_COMPLETION_POINTS = 720;
export const TOTAL_SPEED_BONUS_POINTS = 200;

export interface MissionPointsDistribution {
  sequenceOrder: number;
  unlockPoints: number;
  completionPoints: number;
  maxSpeedBonus: number;
  points: number; // Estritamente idêntico a completionPoints
  totalPotentialPoints: number; // unlockPoints + completionPoints + maxSpeedBonus
}

export interface RecalculateCircuitResult {
  success: boolean;
  missionCount: number;
  updatedMissions: Array<{
    id: string;
    title: string;
    sequenceOrder: number;
    unlockPoints: number;
    completionPoints: number;
    maxSpeedBonus: number;
    points: number;
    totalPotentialPoints: number;
  }>;
  summary: {
    totalUnlock: number;
    totalCompletion: number;
    totalSpeedBonus: number;
    totalCircuitPoints: number;
  };
}

/**
 * Particiona um total inteiro proporcionalmente aos pesos relativos utilizando o
 * método das cotas inteiras e restos maiores (Hamilton), com desempate determinístico
 * pela ordem de entrada. Garante soma final identicamente igual a `total`.
 */
export function allocateByRelativeWeights(total: number, weights: number[]): number[] {
  if (!Number.isInteger(total) || total < 0) {
    throw new Error(`Total inválido para partição ponderada: ${total}`);
  }
  if (!Array.isArray(weights) || weights.length === 0) {
    throw new Error('A lista de pesos relativos deve conter pelo menos 1 item.');
  }
  const normalizedWeights = weights.map((w) => {
    const num = Number(w);
    return Number.isFinite(num) && num > 0 ? num : 1;
  });
  const totalWeight = normalizedWeights.reduce((acc, w) => acc + w, 0);

  const exact = normalizedWeights.map((w) => (total * w) / totalWeight);
  const floors = exact.map((val) => Math.floor(val));
  let remainder = total - floors.reduce((acc, f) => acc + f, 0);

  const rankedIndices = exact
    .map((val, idx) => ({ idx, frac: val - floors[idx] }))
    .sort((a, b) => {
      const diff = b.frac - a.frac;
      if (Math.abs(diff) > 1e-12) return diff;
      return a.idx - b.idx;
    });

  const result = [...floors];
  for (let k = 0; k < remainder; k++) {
    result[rankedIndices[k].idx] += 1;
  }

  return result;
}

/**
 * Função pura que calcula a partição exata dos 1.000 pontos entre missões oficiais
 * considerando pesos relativos. Soma final garantidamente igual a 1.000 pontos.
 */
export function distributeWeightedCircuitPoints(weights: number[]): MissionPointsDistribution[] {
  if (!Array.isArray(weights) || weights.length < 1) {
    throw new Error('A quantidade de missões deve ser um número inteiro maior ou igual a 1.');
  }

  const unlockAlloc = allocateByRelativeWeights(TOTAL_UNLOCK_POINTS, weights);
  const completionAlloc = allocateByRelativeWeights(TOTAL_COMPLETION_POINTS, weights);
  const speedBonusAlloc = allocateByRelativeWeights(TOTAL_SPEED_BONUS_POINTS, weights);

  const result: MissionPointsDistribution[] = [];
  for (let i = 0; i < weights.length; i++) {
    const unlockPoints = unlockAlloc[i];
    const completionPoints = completionAlloc[i];
    const maxSpeedBonus = speedBonusAlloc[i];
    const points = completionPoints;
    const totalPotentialPoints = unlockPoints + completionPoints + maxSpeedBonus;

    result.push({
      sequenceOrder: i + 1,
      unlockPoints,
      completionPoints,
      maxSpeedBonus,
      points,
      totalPotentialPoints,
    });
  }

  return result;
}

/**
 * Função pura que calcula a partição exata dos 1.000 pontos entre N missões oficiais
 * com pesos iguais (preservada para compatibilidade retroativa).
 */
export function distributeCircuitPoints(n: number): MissionPointsDistribution[] {
  if (!Number.isInteger(n) || n < 1) {
    throw new Error(
      `A quantidade de missões deve ser um número inteiro maior ou igual a 1. Recebido: ${n}`
    );
  }
  return distributeWeightedCircuitPoints(Array.from({ length: n }, () => 1));
}

/**
 * Retorna a quantidade total de eventos/atividades registradas para missões oficiais.
 * Fontes monitoradas:
 * 1. participant_missions (status em andamento/aguardando/concluída, started_at_ms, completed_at_ms)
 * 2. mission_completions (evidências manuais submetidas)
 * 3. points_transactions (transações no ledger para missões oficiais)
 * 4. qr_scans (leituras de QR code vinculadas a missões oficiais)
 *
 * Considera EXCLUSIVAMENTE missões com sequence_order IS NOT NULL.
 * Missões extras (sequence_order IS NULL) são completamente ignoradas.
 */
export function getOfficialCircuitActivityCountInDb(database: DatabaseSync): number {
  const query = `
    SELECT (
      (SELECT COUNT(*)
       FROM participant_missions pm
       INNER JOIN missions m ON pm.mission_id = m.id
       WHERE m.sequence_order IS NOT NULL
         AND (
           pm.status IN ('Em andamento', 'Aguardando validação', 'Concluída')
           OR pm.started_at_ms IS NOT NULL
           OR pm.completed_at_ms IS NOT NULL
         )
      ) +
      (SELECT COUNT(*)
       FROM mission_completions mc
       INNER JOIN missions m ON mc.mission_id = m.id
       WHERE m.sequence_order IS NOT NULL
      ) +
      (SELECT COUNT(*)
       FROM points_transactions pt
       INNER JOIN missions m ON pt.mission_id = m.id
       WHERE m.sequence_order IS NOT NULL
      ) +
      (SELECT COUNT(*)
       FROM qr_scans qs
       INNER JOIN qr_codes q ON qs.qr_code_id = q.id
       INNER JOIN missions m ON q.mission_id = m.id
       WHERE m.sequence_order IS NOT NULL
      )
    ) AS total_activity
  `;

  const row = database.prepare(query).get() as { total_activity?: number } | undefined;
  return Number(row?.total_activity || 0);
}

/**
 * Retorna true se houver qualquer atividade de participante em missões oficiais do circuito.
 */
export function hasOfficialCircuitStartedInDb(database: DatabaseSync): boolean {
  return getOfficialCircuitActivityCountInDb(database) > 0;
}

/**
 * Compacta a numeração sequencial de todas as missões oficiais ativas (active = 1 AND sequence_order IS NOT NULL).
 * Garante que a numeração seja contígua de 1 até N (1, 2, ..., N), eliminando lacunas deixadas
 * por exclusões, desativações ou reordenações antes do início do evento.
 *
 * Qualquer missão desativada (active = 0) que ainda possua sequence_order tem seu sequence_order limpo para NULL.
 * Utiliza numeração intermediária negativa para prevenir colisões de unicidade.
 */
export function compactCircuitSequencesInDb(database: DatabaseSync): void {
  // Limpa sequence_order de missões inativas para não deixá-las como oficiais
  database
    .prepare('UPDATE missions SET sequence_order = NULL WHERE active = 0 AND sequence_order IS NOT NULL')
    .run();

  const activeOfficial = database
    .prepare(`
      SELECT id, sequence_order, COALESCE(track_id, 'default') AS track_key
      FROM missions
      WHERE active = 1 AND sequence_order IS NOT NULL
      ORDER BY track_key ASC, sequence_order ASC, rowid ASC
    `)
    .all() as { id: string; sequence_order: number; track_key: string }[];

  if (activeOfficial.length === 0) {
    return;
  }

  // Agrupa por trilha e compacta 1..K dentro de cada trilha independentemente
  const byTrack = new Map<string, { id: string; sequence_order: number }[]>();
  for (const row of activeOfficial) {
    const list = byTrack.get(row.track_key) || [];
    list.push({ id: row.id, sequence_order: row.sequence_order });
    byTrack.set(row.track_key, list);
  }

  const updateTemp = database.prepare('UPDATE missions SET sequence_order = ? WHERE id = ?');
  for (const [, list] of byTrack.entries()) {
    for (let i = 0; i < list.length; i++) {
      updateTemp.run(-(i + 1), list[i].id);
    }
  }

  database
    .prepare('UPDATE missions SET sequence_order = -sequence_order WHERE sequence_order < 0')
    .run();
}

export function recalculateCircuitMissionPointsInDb(
  database: DatabaseSync
): RecalculateCircuitResult {
  const candidateRows = database
    .prepare(`
      SELECT id, title, sequence_order, COALESCE(track_id, 'default') AS track_key,
             COALESCE(relative_weight, 10) AS relative_weight,
             active, points, unlock_points, completion_points, max_speed_bonus
      FROM missions
      WHERE active = 1 AND sequence_order IS NOT NULL
      ORDER BY track_key ASC, sequence_order ASC, rowid ASC
    `)
    .all() as Record<string, unknown>[];

  // 1. Validação: Presença de missões elegíveis
  if (candidateRows.length === 0) {
    throw new Error(
      'Nenhuma missão oficial ativa encontrada no circuito para redistribuição de pontuação.'
    );
  }

  const n = candidateRows.length;

  // 2 e 3. Validação por trilha: inteiros positivos, ausência de duplicidade e contiguidade 1..K por trilha
  const byTrack = new Map<string, Record<string, unknown>[]>();
  for (const row of candidateRows) {
    const trackKey = String(row.track_key || 'default');
    const list = byTrack.get(trackKey) || [];
    list.push(row);
    byTrack.set(trackKey, list);
  }

  for (const [trackKey, trackRows] of byTrack.entries()) {
    const seenOrders = new Set<number>();
    for (const row of trackRows) {
      const seq = Number(row.sequence_order);
      if (!Number.isInteger(seq) || seq < 1) {
        throw new Error(
          `Ordem sequencial inválida detectada na missão "${row.title}" (ID: ${row.id}, trilha: ${trackKey}): ${row.sequence_order}. Deve ser um número inteiro positivo.`
        );
      }
      if (seenOrders.has(seq)) {
        throw new Error(
          `Ordem sequencial duplicada detectada na trilha "${trackKey}": posição ${seq} utilizada por mais de uma missão.`
        );
      }
      seenOrders.add(seq);
    }

    for (let i = 0; i < trackRows.length; i++) {
      const row = trackRows[i];
      const seq = Number(row.sequence_order);
      const expected = i + 1;
      if (seq !== expected) {
        throw new Error(
          `A sequência da trilha "${trackKey}" não é contígua a partir de 1: esperava posição ${expected}, mas encontrou posição ${seq} na missão "${row.title}" (ID: ${row.id}).`
        );
      }
    }
  }

  // 4. Cálculo da partição matemática ponderada pelos pesos relativos (soma global = 1.000 pts)
  const weights = candidateRows.map((row) => {
    const w = Number(row.relative_weight);
    return Number.isFinite(w) && w > 0 ? w : 10;
  });
  const distributions = distributeWeightedCircuitPoints(weights);

  // 5. Execução transacional atômica via SAVEPOINT (compatível com transação externa BEGIN IMMEDIATE)
  const savepointName = `sp_circuit_recalc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  database.exec(`SAVEPOINT ${savepointName};`);

  try {
    const updateStmt = database.prepare(`
      UPDATE missions
      SET unlock_points = ?,
          completion_points = ?,
          max_speed_bonus = ?,
          points = ?
      WHERE id = ?
    `);

    const updatedMissions: RecalculateCircuitResult['updatedMissions'] = [];

    for (let i = 0; i < n; i++) {
      const row = candidateRows[i];
      const dist = distributions[i];

      updateStmt.run(
        dist.unlockPoints,
        dist.completionPoints,
        dist.maxSpeedBonus,
        dist.points,
        row.id
      );

      updatedMissions.push({
        id: String(row.id),
        title: String(row.title),
        sequenceOrder: Number(row.sequence_order),
        unlockPoints: dist.unlockPoints,
        completionPoints: dist.completionPoints,
        maxSpeedBonus: dist.maxSpeedBonus,
        points: dist.points,
        totalPotentialPoints: dist.totalPotentialPoints,
      });
    }

    database.exec(`RELEASE ${savepointName};`);

    return {
      success: true,
      missionCount: n,
      updatedMissions,
      summary: {
        totalUnlock: TOTAL_UNLOCK_POINTS,
        totalCompletion: TOTAL_COMPLETION_POINTS,
        totalSpeedBonus: TOTAL_SPEED_BONUS_POINTS,
        totalCircuitPoints: TOTAL_CIRCUIT_POINTS,
      },
    };
  } catch (err) {
    database.exec(`ROLLBACK TO ${savepointName};`);
    database.exec(`RELEASE ${savepointName};`);
    throw err;
  }
}
