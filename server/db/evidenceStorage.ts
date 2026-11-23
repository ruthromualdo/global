import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const EVIDENCE_STORAGE_DIR = process.env.DESAFIO_EVIDENCE_DIR
  ? path.resolve(process.env.DESAFIO_EVIDENCE_DIR)
  : path.resolve(__dirname, '../storage/evidences');
export const MAX_EVIDENCE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export type EvidenceRequirementType = 'photo' | 'file' | 'both';

interface AllowedFormatSpec {
  canonicalExt: 'jpg' | 'png' | 'webp' | 'pdf';
  extensions: string[];
  mimeTypes: string[];
  isImage: boolean;
  matchesMagicBytes: (buf: Buffer) => boolean;
}

const ALLOWED_FORMATS: AllowedFormatSpec[] = [
  {
    canonicalExt: 'jpg',
    extensions: ['.jpg', '.jpeg'],
    mimeTypes: ['image/jpeg', 'image/jpg'],
    isImage: true,
    matchesMagicBytes: (buf) =>
      buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  {
    canonicalExt: 'png',
    extensions: ['.png'],
    mimeTypes: ['image/png'],
    isImage: true,
    matchesMagicBytes: (buf) =>
      buf.length >= 8 &&
      buf[0] === 0x89 &&
      buf[1] === 0x50 &&
      buf[2] === 0x4e &&
      buf[3] === 0x47 &&
      buf[4] === 0x0d &&
      buf[5] === 0x0a &&
      buf[6] === 0x1a &&
      buf[7] === 0x0a,
  },
  {
    canonicalExt: 'webp',
    extensions: ['.webp'],
    mimeTypes: ['image/webp'],
    isImage: true,
    matchesMagicBytes: (buf) =>
      buf.length >= 12 &&
      buf.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buf.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  {
    canonicalExt: 'pdf',
    extensions: ['.pdf'],
    mimeTypes: ['application/pdf'],
    isImage: false,
    matchesMagicBytes: (buf) =>
      buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-',
  },
];

export function sanitizeDisplayFileName(rawName: string): string {
  const base = path.basename(String(rawName || 'evidencia')).replace(/[\x00-\x1f\x7f<>:"/\\|?*]+/g, '_').trim();
  return base.slice(0, 120) || 'evidencia';
}

export function validateAndDetectEvidenceFile(params: {
  buffer: Buffer;
  originalName: string;
  declaredMimeType: string;
  requiredType: EvidenceRequirementType;
}):
  | {
      ok: true;
      canonicalExt: string;
      mimeType: string;
      isImage: boolean;
      safeDisplayName: string;
      storedName: string;
      sizeBytes: number;
      sha256: string;
    }
  | {
      ok: false;
      httpStatus: number;
      code: string;
      error: string;
    } {
  const { buffer, originalName, declaredMimeType, requiredType } = params;

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'EMPTY_FILE',
      error: 'Nenhum arquivo válido foi enviado.',
    };
  }

  if (buffer.length > MAX_EVIDENCE_SIZE_BYTES) {
    return {
      ok: false,
      httpStatus: 413,
      code: 'FILE_TOO_LARGE',
      error: 'O arquivo excede o limite máximo permitido de 5 MB.',
    };
  }

  const safeDisplayName = sanitizeDisplayFileName(originalName);
  const ext = path.extname(safeDisplayName).toLowerCase();
  const normMime = String(declaredMimeType || '').split(';')[0].trim().toLowerCase();

  // 1. Verifica extensão permitida
  const formatByExt = ALLOWED_FORMATS.find((f) => f.extensions.includes(ext));
  if (!formatByExt) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'UNSUPPORTED_EXTENSION',
      error: 'Formato de arquivo não permitido. Utilize JPG, JPEG, PNG, WEBP ou PDF.',
    };
  }

  // 2. Verifica compatibilidade do MIME type informado com a extensão
  if (!formatByExt.mimeTypes.includes(normMime)) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'MIME_MISMATCH',
      error: 'O tipo MIME do arquivo não corresponde à sua extensão.',
    };
  }

  // 3. Valida assinatura real (magic bytes) — impede arquivos maliciosos disfarçados
  if (!formatByExt.matchesMagicBytes(buffer)) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'INVALID_FILE_SIGNATURE',
      error: 'Conteúdo do arquivo inválido ou incompatível com o formato declarado.',
    };
  }

  // 4. Verifica compatibilidade com o tipo exigido pela missão
  if (requiredType === 'photo' && !formatByExt.isImage) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'PHOTO_REQUIRED',
      error: 'Esta missão exige o envio de uma foto (JPG, JPEG, PNG ou WEBP).',
    };
  }

  const storedName = `${crypto.randomUUID()}.${formatByExt.canonicalExt}`;
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const canonicalMime = formatByExt.mimeTypes[0];

  return {
    ok: true,
    canonicalExt: formatByExt.canonicalExt,
    mimeType: canonicalMime,
    isImage: formatByExt.isImage,
    safeDisplayName,
    storedName,
    sizeBytes: buffer.length,
    sha256,
  };
}

export function ensureEvidenceStorageDir(storageDir: string = EVIDENCE_STORAGE_DIR): void {
  fs.mkdirSync(storageDir, { recursive: true });
}

export function saveEvidenceFileToDisk(
  buffer: Buffer,
  storedName: string,
  storageDir: string = EVIDENCE_STORAGE_DIR
): string {
  ensureEvidenceStorageDir(storageDir);
  const fullPath = resolveSafeEvidenceFilePath(storedName, storageDir);
  fs.writeFileSync(fullPath, buffer, { flag: 'wx' });
  return fullPath;
}

export function deleteEvidenceFileIfExists(
  storedName: string,
  storageDir: string = EVIDENCE_STORAGE_DIR
): void {
  try {
    const fullPath = resolveSafeEvidenceFilePath(storedName, storageDir);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch {
    // ignora limpeza se caminho inválido ou inexistente
  }
}

export function resolveSafeEvidenceFilePath(
  storedName: string,
  storageDir: string = EVIDENCE_STORAGE_DIR
): string {
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp|pdf)$/i.test(storedName)) {
    throw new Error('INVALID_STORED_EVIDENCE_NAME');
  }
  const resolvedDir = path.resolve(storageDir);
  const fullPath = path.resolve(resolvedDir, storedName);
  if (!fullPath.startsWith(resolvedDir + path.sep)) {
    throw new Error('PATH_TRAVERSAL_BLOCKED');
  }
  return fullPath;
}
