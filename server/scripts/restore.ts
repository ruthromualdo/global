import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import type { BackupManifest } from './backup';
import { resolveSafeEvidenceFilePath } from '../db/evidenceStorage';

const __filename = fileURLToPath(import.meta.url);

function sha256File(filePath: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

/**
 * Restaura um backup consistente gerado por server/scripts/backup.ts para um destino específico.
 * Valida o manifesto, SHA-256 e PRAGMA integrity_check antes e depois da restauração.
 * Por segurança, recusa sobrescrever destino existente a menos que overwrite = true seja informado explicitamente.
 */
export function restoreConsistentBackup(options: {
  backupDir: string;
  targetDbPath: string;
  targetEvidenceDir: string;
  overwrite?: boolean;
}): {
  restoredDbPath: string;
  restoredEvidenceDir: string;
  restoredEvidenceCount: number;
  databaseSha256: string;
} {
  const backupDir = path.resolve(options.backupDir);
  const targetDbPath = path.resolve(options.targetDbPath);
  const targetEvidenceDir = path.resolve(options.targetEvidenceDir);
  const overwrite = Boolean(options.overwrite);

  const manifestPath = path.join(backupDir, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifesto não encontrado no backup: ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as BackupManifest;
  if (manifest.formatVersion !== 1 || !manifest.database?.relativePath) {
    throw new Error('Formato de manifesto de backup inválido.');
  }

  const backupDbPath = path.join(backupDir, manifest.database.relativePath);
  if (!fs.existsSync(backupDbPath)) {
    throw new Error(`Arquivo de banco ausente no backup: ${backupDbPath}`);
  }

  const actualDbSha = sha256File(backupDbPath);
  if (actualDbSha !== manifest.database.sha256) {
    throw new Error(
      `SHA-256 do banco no backup não confere com o manifesto (esperado=${manifest.database.sha256}, obtido=${actualDbSha}).`
    );
  }

  // Verifica integridade do banco no backup antes de restaurar
  const preCheckDb = new DatabaseSync(backupDbPath, { readOnly: true });
  try {
    const check = preCheckDb.prepare('PRAGMA integrity_check;').get() as
      | { integrity_check: string }
      | undefined;
    if (!check || check.integrity_check !== 'ok') {
      throw new Error(`Banco de backup corrompido: ${JSON.stringify(check)}`);
    }
  } finally {
    preCheckDb.close();
  }

  // Verifica todas as evidências do manifesto antes de restaurar
  for (const ev of manifest.evidences) {
    const srcEvPath = path.join(backupDir, ev.relativePath);
    if (!fs.existsSync(srcEvPath)) {
      throw new Error(`Arquivo de evidência ausente no backup: ${ev.relativePath}`);
    }
    const evSha = sha256File(srcEvPath);
    if (evSha !== ev.sha256) {
      throw new Error(
        `SHA-256 divergente na evidência ${ev.relativePath} (esperado=${ev.sha256}, obtido=${evSha}).`
      );
    }
  }

  if (fs.existsSync(targetDbPath) && !overwrite) {
    throw new Error(
      `Destino já existe (${targetDbPath}). Informe overwrite: true para autorizar sobrescrita.`
    );
  }

  fs.mkdirSync(path.dirname(targetDbPath), { recursive: true });
  fs.mkdirSync(targetEvidenceDir, { recursive: true });

  // Remove arquivos WAL/SHM antigos no destino quando sobrescrevendo
  if (overwrite) {
    for (const suffix of ['-wal', '-shm']) {
      const aux = `${targetDbPath}${suffix}`;
      if (fs.existsSync(aux)) fs.unlinkSync(aux);
    }
  }

  fs.copyFileSync(backupDbPath, targetDbPath);
  const restoredDbSha = sha256File(targetDbPath);
  if (restoredDbSha !== manifest.database.sha256) {
    throw new Error('Falha de integridade após copiar banco restaurado.');
  }

  for (const ev of manifest.evidences) {
    const srcEvPath = path.join(backupDir, ev.relativePath);
    const destEvPath = resolveSafeEvidenceFilePath(ev.storedName, targetEvidenceDir);
    fs.copyFileSync(srcEvPath, destEvPath);
    const restoredEvSha = sha256File(destEvPath);
    if (restoredEvSha !== ev.sha256) {
      throw new Error(`Falha de integridade após restaurar evidência ${ev.storedName}.`);
    }
  }

  return {
    restoredDbPath: targetDbPath,
    restoredEvidenceDir: targetEvidenceDir,
    restoredEvidenceCount: manifest.evidences.length,
    databaseSha256: restoredDbSha,
  };
}

const isDirectExecution =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename);

if (isDirectExecution) {
  try {
    const [backupDir, targetDbPath, targetEvidenceDir, flag] = process.argv.slice(2);
    if (!backupDir || !targetDbPath || !targetEvidenceDir) {
      console.error(
        'Uso: npx tsx server/scripts/restore.ts <backupDir> <targetDbPath> <targetEvidenceDir> [--overwrite]'
      );
      process.exit(1);
    }
    const result = restoreConsistentBackup({
      backupDir,
      targetDbPath,
      targetEvidenceDir,
      overwrite: flag === '--overwrite',
    });
    console.log(`[Restore] Restauração concluída e verificada em: ${result.restoredDbPath}`);
    console.log(
      `[Restore] Evidências restauradas: ${result.restoredEvidenceCount} | Banco SHA-256: ${result.databaseSha256}`
    );
  } catch (err) {
    console.error('[Restore] Falha na restauração:', err);
    process.exit(1);
  }
}
