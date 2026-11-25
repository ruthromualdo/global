import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __envDir = path.dirname(fileURLToPath(import.meta.url));

function resolveDefaultEnvPath(): string {
  const candidates = [
    path.resolve(__envDir, '.env'),
    path.resolve(__envDir, '..', '.env'),
    path.resolve(process.cwd(), '.env'),
  ];
  return candidates.find((p) => fs.existsSync(p)) || candidates[0];
}

/**
 * Carrega variáveis de um arquivo .env na raiz do projeto sem sobrescrever
 * variáveis já definidas no ambiente do processo (painel Hostinger, PM2, Docker, etc.).
 */
export function loadEnvFileIfExists(envPath = resolveDefaultEnvPath()): void {
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, 'utf-8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex <= 0) continue;

    const key = line.slice(0, eqIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFileIfExists();
