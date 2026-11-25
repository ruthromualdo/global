/**
 * Compressão e redimensionamento de imagens no cliente antes do upload.
 *
 * Reduz fotos tiradas em câmeras de celular (3 MB – 12 MB, 12MP–48MP) para
 * ~150 KB – 350 KB (máx. 1600px, JPEG 80%), acelerando drasticamente o envio
 * em redes móveis 4G/Wi-Fi sem perda perceptível para conferência visual.
 *
 * Vídeos, PDFs e imagens já pequenas (<= 250 KB) são devolvidos intactos.
 */

const STANDARD_WEB_IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp']);
const EXTRA_CAMERA_IMAGE_EXTS = new Set(['jfif', 'heic', 'heif', 'bmp']);

// Evita recompressão dupla quando o arquivo já passou pela otimização na seleção
const alreadyOptimizedFiles = new WeakSet<File>();

export interface ImageCompressionOptions {
  maxDimension?: number;
  quality?: number;
  minBytesToCompress?: number;
}

function getFileExtension(fileName: string): string {
  const parts = (fileName || '').trim().split('.');
  return parts.length > 1 ? (parts.pop() || '').toLowerCase() : '';
}

function replaceExtensionWithJpg(fileName: string): string {
  const trimmed = (fileName || 'evidencia.jpg').trim();
  const base = trimmed.includes('.') ? trimmed.replace(/\.[^/.]+$/, '') : trimmed;
  return `${base || 'evidencia'}.jpg`;
}

function isLikelyImageFile(file: File): boolean {
  const mime = (file.type || '').toLowerCase();
  if (mime.startsWith('image/')) return true;
  if (!mime || mime === 'application/octet-stream') {
    const ext = getFileExtension(file.name);
    return STANDARD_WEB_IMAGE_EXTS.has(ext) || EXTRA_CAMERA_IMAGE_EXTS.has(ext);
  }
  return false;
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality);
  });
}

export async function compressImageForUpload(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<File> {
  if (alreadyOptimizedFiles.has(file)) {
    return file;
  }

  const maxDimension = options.maxDimension ?? 1600;
  const quality = options.quality ?? 0.8;
  const minBytesToCompress = options.minBytesToCompress ?? 250 * 1024; // 250 KB

  if (!isLikelyImageFile(file)) {
    return file;
  }

  const ext = getFileExtension(file.name);
  const mime = (file.type || '').toLowerCase();
  const hasStandardExt = STANDARD_WEB_IMAGE_EXTS.has(ext);
  const needsFormatNormalization = !hasStandardExt || EXTRA_CAMERA_IMAGE_EXTS.has(ext);

  if (!needsFormatNormalization && file.size <= minBytesToCompress) {
    alreadyOptimizedFiles.add(file);
    return file;
  }

  // Se veio da câmera como JPEG pequeno mas sem extensão (ex.: "image"), apenas normaliza para .jpg
  if (
    !hasStandardExt &&
    (mime === 'image/jpeg' || mime === 'image/jpg') &&
    file.size <= minBytesToCompress
  ) {
    const normalized = new File([file], replaceExtensionWithJpg(file.name), {
      type: 'image/jpeg',
      lastModified: file.lastModified || Date.now(),
    });
    alreadyOptimizedFiles.add(normalized);
    return normalized;
  }

  if (typeof document === 'undefined') {
    return file;
  }

  try {
    let sourceWidth = 0;
    let sourceHeight = 0;
    let drawable: CanvasImageSource;
    let bitmapToClose: ImageBitmap | null = null;

    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(file);
        sourceWidth = bitmap.width;
        sourceHeight = bitmap.height;
        drawable = bitmap;
        bitmapToClose = bitmap;
      } catch {
        const img = await loadImageElement(file);
        sourceWidth = img.naturalWidth || img.width;
        sourceHeight = img.naturalHeight || img.height;
        drawable = img;
      }
    } else {
      const img = await loadImageElement(file);
      sourceWidth = img.naturalWidth || img.width;
      sourceHeight = img.naturalHeight || img.height;
      drawable = img;
    }

    if (!sourceWidth || !sourceHeight) {
      if (bitmapToClose) bitmapToClose.close();
      return file;
    }

    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    const targetWidth = Math.max(1, Math.round(sourceWidth * scale));
    const targetHeight = Math.max(1, Math.round(sourceHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      if (bitmapToClose) bitmapToClose.close();
      return file;
    }

    // Fundo branco para evitar fundo preto caso a imagem original seja PNG transparente
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(drawable, 0, 0, targetWidth, targetHeight);

    if (bitmapToClose) {
      bitmapToClose.close();
    }

    const compressedBlob = await canvasToJpegBlob(canvas, quality);
    if (!compressedBlob || compressedBlob.size === 0) {
      return file;
    }

    if (!needsFormatNormalization && compressedBlob.size >= file.size) {
      alreadyOptimizedFiles.add(file);
      return file;
    }

    const outputFile = new File([compressedBlob], replaceExtensionWithJpg(file.name), {
      type: 'image/jpeg',
      lastModified: file.lastModified || Date.now(),
    });
    alreadyOptimizedFiles.add(outputFile);
    return outputFile;
  } catch {
    return file;
  }
}
