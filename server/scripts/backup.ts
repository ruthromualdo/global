import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import { DB_FILE_PATH } from '../db/database';
import { EVIDENCE_STORAGE_DIR, resolveSafeEvidenceFilePath } from '../db/evidenceStorage';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const DEFAULT_BACKUP_DIR = process.env.DESAFIO_BACKUP_DIR
  ? path.resolve(process.env.DESAFIO_BACKUP_DIR)
  : path.resolve(__dirname, '../backups');

export interface BackupEvidenceEntry {
  validationId: string;
  storedName: string;
  relativePath: string;
  sizeBytes: number;
  sha256: string;
}

export interface BackupManifest {
  formatVersion: 1;
  createdAt: string;
  database: {
    relativePath: string;
    sizeBytes: number;
    sha256: string;
    integrityCheck: 'ok';
    foreignKeyViolations: number;
  };
  evidences: BackupEvidenceEntry[];
  counts: {
    participants: number;
    missions: number;
    pointsTransactions: number;
    missionCompletions: number;
    dailyRankingClosures: number;
    evidenceFiles: number;
  };
}

function sha256File(filePath: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

function formatTimestampForDir(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return [
    date.getUTCFullYear(),
    pad(date.getUTCMonth() + 1),
    pad(date.getUTCDate()),
    '-',
    pad(date.getUTCHours()),
    pad(date.getUTCMinutes()),
    pad(date.getUTCSeconds()),
  ].join('');
}

/**
 * Executa um backup consistente (ponto no tempo) do SQLite (via VACUUM INTO, mesclando WAL com segurança)
 * e de todos os arquivos físicos de evidência referenciados pelo snapshot do banco.
 * Nunca modifica ou apaga os arquivos originais.
 */
export function createConsistentBackup(options?: {
  dbPath?: string;
  evidenceDir?: string;
  outputDir?: string;
}): { backupDir: string; manifestPath: string; manifest: BackupManifest } {
  const sourceDbPath = path.resolve(options?.dbPath || DB_FILE_PATH);
  const sourceEvidenceDir = path.resolve(options?.evidenceDir || EVIDENCE_STORAGE_DIR);
  const targetRootDir = path.resolve(options?.outputDir || DEFAULT_BACKUP_DIR);

  if (!fs.existsSync(sourceDbPath)) {
    throw new Error(`Banco de dados de origem não encontrado: ${sourceDbPath}`);
  }

  fs.mkdirSync(targetRootDir, { recursive: true });

  const now = new Date();
  const suffix = crypto.randomBytes(3).toString('hex');
  const finalDirName = `backup-${formatTimestampForDir(now)}-${suffix}`;
  const stagingDir = path.join(targetRootDir, `.staging-${finalDirName}`);
  const finalBackupDir = path.join(targetRootDir, finalDirName);
  const stagingDbPath = path.join(stagingDir, 'database.sqlite');
  const stagingEvidencesDir = path.join(stagingDir, 'evidences');

  fs.mkdirSync(stagingEvidencesDir, { recursive: true });

  let sourceDb: DatabaseSync | null = null;
  let verifyDb: DatabaseSync | null = null;

  try {
    // 1. Snapshot consistente do SQLite via VACUUM INTO (lê estado consistente incluindo WAL sem alterar a origem)
    sourceDb = new DatabaseSync(sourceDbPath);
    sourceDb.exec('PRAGMA busy_timeout = 5000;');
    const escapedTarget = stagingDbPath.replace(/'/g, "''");
    sourceDb.exec(`VACUUM INTO '${escapedTarget}';`);
    sourceDb.close();
    sourceDb = null;

    // 2. Verifica integridade física e referencial do banco copiado
    verifyDb = new DatabaseSync(stagingDbPath, { readOnly: true });
    const integrityRow = verifyDb.prepare('PRAGMA integrity_check;').get() as
      | { integrity_check: string }
      | undefined;
    if (!integrityRow || integrityRow.integrity_check !== 'ok') {
      throw new Error(
        `Falha na verificação de integridade do backup SQLite: ${JSON.stringify(integrityRow)}`
      );
    }

    const fkRows = verifyDb.prepare('PRAGMA foreign_key_check;').all();
    if (fkRows.length > 0) {
      throw new Error(`Violação de chave estrangeira detectada no backup (${fkRows.length} registros).`);
    }

    // 3. Coleta contagens e lista exata de arquivos de evidência referenciados pelo snapshot
    const countOf = (table: string) =>
      Number((verifyDb!.prepare(`SELECT COUNT(*) as total FROM ${table}`).get() as { total: number }).total);

    const referencedEvidences = verifyDb
      .prepare(
        `SELECT id, evidence_stored_name, evidence_sha256
         FROM mission_completions
         WHERE evidence_stored_name IS NOT NULL AND TRIM(evidence_stored_name) != ''
         ORDER BY rowid ASC`
      )
      .all() as { id: string; evidence_stored_name: string; evidence_sha256: string | null }[];

    const counts = {
      participants: countOf('participants'),
      missions: countOf('missions'),
      pointsTransactions: countOf('points_transactions'),
      missionCompletions: countOf('mission_completions'),
      dailyRankingClosures: countOf('daily_ranking_closures'),
      evidenceFiles: referencedEvidences.length,
    };

    verifyDb.close();
    verifyDb = null;

    // 4. Copia cada evidência referenciada no snapshot e valida integridade SHA-256
    const evidenceEntries: BackupEvidenceEntry[] = [];
    for (const ref of referencedEvidences) {
      const safeSourceFile = resolveSafeEvidenceFilePath(ref.evidence_stored_name, sourceEvidenceDir);
      if (!fs.existsSync(safeSourceFile)) {
        throw new Error(
          `Arquivo físico de evidência ausente na origem para validação ${ref.id}: ${ref.evidence_stored_name}`
        );
      }
      const destFile = path.join(stagingEvidencesDir, ref.evidence_stored_name);
      fs.copyFileSync(safeSourceFile, destFile);

      const copiedHash = sha256File(destFile);
      if (ref.evidence_sha256 && copiedHash !== ref.evidence_sha256) {
        throw new Error(
          `Divergência de SHA-256 na evidência ${ref.evidence_stored_name} (esperado=${ref.evidence_sha256}, obtido=${copiedHash}).`
        );
      }

      const stat = fs.statSync(destFile);
      evidenceEntries.push({
        validationId: ref.id,
        storedName: ref.evidence_stored_name,
        relativePath: `evidences/${ref.evidence_stored_name}`,
        sizeBytes: stat.size,
        sha256: copiedHash,
      });
    }

    // 5. Gera manifesto sem segredos ou credenciais
    const dbStat = fs.statSync(stagingDbPath);
    const dbSha256 = sha256File(stagingDbPath);

    const manifest: BackupManifest = {
      formatVersion: 1,
      createdAt: now.toISOString(),
      database: {
        relativePath: 'database.sqlite',
        sizeBytes: dbStat.size,
        sha256: dbSha256,
        integrityCheck: 'ok',
        foreignKeyViolations: 0,
      },
      evidences: evidenceEntries,
      counts,
    };

    const stagingManifestPath = path.join(stagingDir, 'manifest.json');
    fs.writeFileSync(stagingManifestPath, JSON.stringify(manifest, null, 2), 'utf8');

    // 6. Promoção atômica do staging para o diretório final
    fs.renameSync(stagingDir, finalBackupDir);
    return {
      backupDir: finalBackupDir,
      manifestPath: path.join(finalBackupDir, 'manifest.json'),
      manifest,
    };
  } catch (err) {
    try {
      sourceDb?.close();
    } catch {
      // ignora
    }
    try {
      verifyDb?.close();
    } catch {
      // ignora
    }
    try {
      fs.rmSync(stagingDir, { recursive: true, force: true });
    } catch {
      // ignora
    }
    throw err;
  }
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectExecution) {
  try {
    const cliOutputDir = process.argv[2] ? path.resolve(process.argv[2]) : undefined;
    const result = createConsistentBackup({ outputDir: cliOutputDir });
    console.log(`[Backup] Concluído com sucesso em: ${result.backupDir}`);
    console.log(
      `[Backup] Banco SHA-256: ${result.manifest.database.sha256} (${result.manifest.database.sizeBytes} bytes)`
    );
    console.log(
      `[Backup] Evidências copiadas: ${result.manifest.evidences.length} | Participantes: ${result.manifest.counts.participants}`
    );
  } catch (err) {
    console.error('[Backup] Falha ao gerar backup consistente:', err);
    process.exit(1);
  }
}
