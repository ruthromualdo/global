import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_EVIDENCE_DIR = fs.existsSync(path.join(__dirname, 'schema.sql'))
  ? path.resolve(__dirname, '../storage/evidences')
  : path.resolve(process.cwd(), 'server/storage/evidences');

export const EVIDENCE_STORAGE_DIR = process.env.DESAFIO_EVIDENCE_DIR
  ? path.resolve(process.env.DESAFIO_EVIDENCE_DIR)
  : DEFAULT_EVIDENCE_DIR;
export const MAX_EVIDENCE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB para fotos, prints e PDF
export const MAX_VIDEO_EVIDENCE_SIZE_BYTES = Number(
  process.env.MAX_VIDEO_EVIDENCE_BYTES || 25 * 1024 * 1024
); // 25 MB exclusivamente para missões que aceitam vídeo

export type EvidenceRequirementType =
  | 'photo'
  | 'print'
  | 'video'
  | 'photo_or_video'
  | 'text'
  | 'file'
  | 'both';

interface AllowedFormatSpec {
  canonicalExt: 'jpg' | 'png' | 'webp' | 'pdf' | 'mp4' | 'mov' | 'webm';
  extensions: string[];
  mimeTypes: string[];
  isImage: boolean;
  isVideo: boolean;
  matchesMagicBytes: (buf: Buffer) => boolean;
}

const ALLOWED_FORMATS: AllowedFormatSpec[] = [
  {
    canonicalExt: 'jpg',
    extensions: ['.jpg', '.jpeg'],
    mimeTypes: ['image/jpeg', 'image/jpg'],
    isImage: true,
    isVideo: false,
    matchesMagicBytes: (buf) =>
      buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff,
  },
  {
    canonicalExt: 'png',
    extensions: ['.png'],
    mimeTypes: ['image/png'],
    isImage: true,
    isVideo: false,
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
    isVideo: false,
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
    isVideo: false,
    matchesMagicBytes: (buf) =>
      buf.length >= 5 && buf.subarray(0, 5).toString('ascii') === '%PDF-',
  },
  {
    canonicalExt: 'mp4',
    extensions: ['.mp4'],
    mimeTypes: ['video/mp4'],
    isImage: false,
    isVideo: true,
    matchesMagicBytes: (buf) =>
      buf.length >= 12 && buf.subarray(4, 8).toString('ascii') === 'ftyp',
  },
  {
    canonicalExt: 'mov',
    extensions: ['.mov'],
    mimeTypes: ['video/quicktime', 'video/mp4'],
    isImage: false,
    isVideo: true,
    matchesMagicBytes: (buf) =>
      buf.length >= 12 && buf.subarray(4, 8).toString('ascii') === 'ftyp',
  },
  {
    canonicalExt: 'webm',
    extensions: ['.webm'],
    mimeTypes: ['video/webm'],
    isImage: false,
    isVideo: true,
    matchesMagicBytes: (buf) =>
      buf.length >= 4 &&
      buf[0] === 0x1a &&
      buf[1] === 0x45 &&
      buf[2] === 0xdf &&
      buf[3] === 0xa3,
  },
];

/**
 * Extrai a duração em segundos de um container ISO BMFF (MP4/MOV) lendo o átomo moov -> mvhd.
 */
export function extractMp4DurationSeconds(buf: Buffer): number | null {
  const findBox = (
    start: number,
    end: number,
    targetType: string
  ): { dataStart: number; boxEnd: number } | null => {
    let offset = start;
    while (offset + 8 <= end) {
      let size = buf.readUInt32BE(offset);
      const type = buf.subarray(offset + 4, offset + 8).toString('ascii');
      let headerSize = 8;
      if (size === 1) {
        if (offset + 16 > end) return null;
        size = Number(buf.readBigUInt64BE(offset + 8));
        headerSize = 16;
      } else if (size === 0) {
        size = end - offset;
      }
      if (size < headerSize || offset + size > end) return null;
      if (type === targetType) {
        return { dataStart: offset + headerSize, boxEnd: offset + size };
      }
      offset += size;
    }
    return null;
  };

  const moov = findBox(0, buf.length, 'moov');
  if (!moov) return null;

  const mvhd = findBox(moov.dataStart, moov.boxEnd, 'mvhd');
  if (!mvhd || mvhd.dataStart + 20 > mvhd.boxEnd) return null;

  const version = buf[mvhd.dataStart];
  if (version === 0) {
    const timescale = buf.readUInt32BE(mvhd.dataStart + 12);
    const duration = buf.readUInt32BE(mvhd.dataStart + 16);
    if (timescale <= 0) return null;
    return duration / timescale;
  }
  if (version === 1) {
    if (mvhd.dataStart + 32 > mvhd.boxEnd) return null;
    const timescale = buf.readUInt32BE(mvhd.dataStart + 20);
    const duration = Number(buf.readBigUInt64BE(mvhd.dataStart + 24));
    if (timescale <= 0) return null;
    return duration / timescale;
  }
  return null;
}

/**
 * Extrai a duração em segundos de um container WebM (EBML/Matroska) lendo Segment -> Info -> Duration.
 */
export function extractWebmDurationSeconds(buf: Buffer): number | null {
  const readVint = (
    offset: number,
    maskFirstBit: boolean
  ): { value: number; length: number } | null => {
    if (offset >= buf.length) return null;
    const first = buf[offset];
    if (first === 0) return null;
    let length = 1;
    let mask = 0x80;
    while (length <= 8 && (first & mask) === 0) {
      mask >>= 1;
      length += 1;
    }
    if (length > 8 || offset + length > buf.length) return null;
    let value = maskFirstBit ? first & (mask - 1) : first;
    for (let i = 1; i < length; i++) {
      value = value * 256 + buf[offset + i];
    }
    return { value, length };
  };

  const scanInfo = (start: number, end: number): number | null => {
    let offset = start;
    let timecodeScale = 1_000_000; // padrão Matroska/WebM: 1ms = 1.000.000 ns
    let rawDuration: number | null = null;
    while (offset < end) {
      const idVint = readVint(offset, false);
      if (!idVint) break;
      offset += idVint.length;
      const sizeVint = readVint(offset, true);
      if (!sizeVint) break;
      offset += sizeVint.length;
      const dataEnd = Math.min(end, offset + sizeVint.value);
      if (idVint.value === 0x2ad7b1 && sizeVint.value > 0 && sizeVint.value <= 8) {
        let scale = 0;
        for (let i = offset; i < dataEnd; i++) {
          scale = scale * 256 + buf[i];
        }
        if (scale > 0) timecodeScale = scale;
      } else if (idVint.value === 0x4489) {
        if (sizeVint.value === 4 && offset + 4 <= end) {
          rawDuration = buf.readFloatBE(offset);
        } else if (sizeVint.value === 8 && offset + 8 <= end) {
          rawDuration = buf.readDoubleBE(offset);
        }
      }
      offset = dataEnd;
    }
    if (rawDuration === null || !Number.isFinite(rawDuration) || rawDuration <= 0) {
      return null;
    }
    return (rawDuration * timecodeScale) / 1e9;
  };

  let offset = 0;
  while (offset < buf.length) {
    const idVint = readVint(offset, false);
    if (!idVint) break;
    offset += idVint.length;
    const sizeVint = readVint(offset, true);
    if (!sizeVint) break;
    offset += sizeVint.length;
    const isUnknownSize = sizeVint.value === Math.pow(2, 7 * sizeVint.length) - 1;
    const dataEnd = isUnknownSize ? buf.length : Math.min(buf.length, offset + sizeVint.value);

    if (idVint.value === 0x18538067) {
      // Segment: varre filhos procurando Info (0x1549A966)
      let segOffset = offset;
      while (segOffset < dataEnd) {
        const childId = readVint(segOffset, false);
        if (!childId) break;
        segOffset += childId.length;
        const childSize = readVint(segOffset, true);
        if (!childSize) break;
        segOffset += childSize.length;
        const childEnd = Math.min(dataEnd, segOffset + childSize.value);
        if (childId.value === 0x1549a966) {
          return scanInfo(segOffset, childEnd);
        }
        segOffset = childEnd;
      }
      return null;
    }
    offset = dataEnd;
  }
  return null;
}

export function extractVideoDurationSeconds(
  buf: Buffer,
  canonicalExt: 'mp4' | 'mov' | 'webm'
): number | null {
  if (canonicalExt === 'webm') {
    return extractWebmDurationSeconds(buf);
  }
  return extractMp4DurationSeconds(buf);
}

export function sanitizeDisplayFileName(rawName: string): string {
  const base = path
    .basename(String(rawName || 'evidencia'))
    .replace(/[\x00-\x1f\x7f<>:"/\\|?*]+/g, '_')
    .trim();
  return base.slice(0, 120) || 'evidencia';
}

export function missionAcceptsVideo(requiredType: EvidenceRequirementType): boolean {
  return requiredType === 'video' || requiredType === 'photo_or_video';
}

export function validateAndDetectEvidenceFile(params: {
  buffer: Buffer;
  originalName: string;
  declaredMimeType: string;
  requiredType: EvidenceRequirementType;
  maxVideoSeconds?: number | null;
}):
  | {
      ok: true;
      canonicalExt: string;
      mimeType: string;
      isImage: boolean;
      isVideo: boolean;
      durationSeconds: number | null;
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
  const { buffer, originalName, declaredMimeType, requiredType, maxVideoSeconds } = params;

  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'EMPTY_FILE',
      error: 'Nenhum arquivo válido foi enviado.',
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
      error: missionAcceptsVideo(requiredType)
        ? 'Formato de arquivo não permitido. Utilize MP4, MOV, WEBM, JPG, JPEG, PNG ou WEBP conforme a missão.'
        : 'Formato de arquivo não permitido. Utilize JPG, JPEG, PNG, WEBP ou PDF.',
    };
  }

  // 2. Verifica compatibilidade com o tipo exigido pela missão ANTES do limite de tamanho
  if ((requiredType === 'photo' || requiredType === 'print') && !formatByExt.isImage) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'PHOTO_REQUIRED',
      error:
        requiredType === 'print'
          ? 'Esta missão exige o envio de um print em imagem (JPG, JPEG, PNG ou WEBP).'
          : 'Esta missão exige o envio de uma foto (JPG, JPEG, PNG ou WEBP).',
    };
  }

  if (requiredType === 'video' && !formatByExt.isVideo) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'VIDEO_REQUIRED',
      error:
        'Esta missão exige obrigatoriamente o envio de um vídeo (MP4, MOV ou WEBM). Não é permitido substituir por foto ou texto.',
    };
  }

  if (requiredType === 'photo_or_video' && !formatByExt.isImage && !formatByExt.isVideo) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'PHOTO_OR_VIDEO_REQUIRED',
      error: 'Esta missão aceita foto/print (JPG, PNG, WEBP) ou vídeo (MP4, MOV, WEBM).',
    };
  }

  if ((requiredType === 'file' || requiredType === 'both') && formatByExt.isVideo) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'VIDEO_NOT_ALLOWED',
      error: 'Esta missão não aceita vídeos. Envie JPG, JPEG, PNG, WEBP ou PDF.',
    };
  }

  // 3. Verifica limite de tamanho diferenciado (5 MB imagens/PDF; 25 MB vídeos quando permitido)
  const effectiveMaxBytes = formatByExt.isVideo
    ? MAX_VIDEO_EVIDENCE_SIZE_BYTES
    : MAX_EVIDENCE_SIZE_BYTES;
  if (buffer.length > effectiveMaxBytes) {
    const limitMb = Math.round(effectiveMaxBytes / (1024 * 1024));
    return {
      ok: false,
      httpStatus: 413,
      code: 'FILE_TOO_LARGE',
      error: `O arquivo excede o limite máximo permitido de ${limitMb} MB.`,
    };
  }

  // 4. Verifica compatibilidade do MIME type informado com a extensão
  if (!formatByExt.mimeTypes.includes(normMime)) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'MIME_MISMATCH',
      error: 'O tipo MIME do arquivo não corresponde à sua extensão.',
    };
  }

  // 5. Valida assinatura real (magic bytes) — impede arquivos maliciosos disfarçados
  if (!formatByExt.matchesMagicBytes(buffer)) {
    return {
      ok: false,
      httpStatus: 400,
      code: 'INVALID_FILE_SIGNATURE',
      error: 'Conteúdo do arquivo inválido ou incompatível com o formato declarado.',
    };
  }

  // 6. Valida duração real do vídeo no servidor quando aplicável
  let durationSeconds: number | null = null;
  if (formatByExt.isVideo) {
    const extracted = extractVideoDurationSeconds(
      buffer,
      formatByExt.canonicalExt as 'mp4' | 'mov' | 'webm'
    );
    if (extracted !== null && Number.isFinite(extracted) && extracted > 0) {
      durationSeconds = Math.ceil(extracted);
    }

    if (maxVideoSeconds !== null && maxVideoSeconds !== undefined && maxVideoSeconds > 0) {
      if (extracted === null || !Number.isFinite(extracted) || extracted <= 0) {
        return {
          ok: false,
          httpStatus: 400,
          code: 'INVALID_VIDEO_METADATA',
          error:
            'Não foi possível verificar a duração do vídeo enviado. Grave ou exporte o vídeo em MP4, MOV ou WEBM válido.',
        };
      }
      // Tolerância técnica de 1 segundo para arredondamento de container
      if (extracted > maxVideoSeconds + 1) {
        return {
          ok: false,
          httpStatus: 400,
          code: 'VIDEO_DURATION_EXCEEDED',
          error: `O vídeo excede a duração máxima permitida de ${maxVideoSeconds} segundos (duração detectada: ${Math.ceil(extracted)}s).`,
        };
      }
    }
  }

  const storedName = `${crypto.randomUUID()}.${formatByExt.canonicalExt}`;
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const canonicalMime = formatByExt.mimeTypes[0];

  return {
    ok: true,
    canonicalExt: formatByExt.canonicalExt,
    mimeType: canonicalMime,
    isImage: formatByExt.isImage,
    isVideo: formatByExt.isVideo,
    durationSeconds,
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
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp|pdf|mp4|mov|webm)$/i.test(storedName)) {
    throw new Error('INVALID_STORED_EVIDENCE_NAME');
  }
  const resolvedDir = path.resolve(storageDir);
  const fullPath = path.resolve(resolvedDir, storedName);
  if (!fullPath.startsWith(resolvedDir + path.sep)) {
    throw new Error('PATH_TRAVERSAL_BLOCKED');
  }
  return fullPath;
}
