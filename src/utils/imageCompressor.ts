/**
 * Compressão e redimensionamento de imagens no cliente antes do upload.
 *
 * Reduz fotos tiradas em câmeras de celular (3 MB – 12 MB, 12MP–48MP) para
 * ~150 KB – 350 KB (máx. 1600px, JPEG 80%), acelerando drasticamente o envio
 * em redes móveis 4G/Wi-Fi sem perda perceptível para conferência visual.
 *
 * Vídeos, PDFs e imagens já pequenas (<= 250 KB) são devolvidos intactos.
 */

const COMPRESSIBLE_IMAGE_MIMES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

export interface ImageCompressionOptions {
  maxDimension?: number;
  quality?: number;
  minBytesToCompress?: number;
}

function replaceExtensionWithJpg(fileName: string): string {
  const trimmed = (fileName || 'evidencia.jpg').trim();
  const base = trimmed.replace(/\.[^/.]+$/, '');
  return `${base || 'evidencia'}.jpg`;
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
  const maxDimension = options.maxDimension ?? 1600;
  const quality = options.quality ?? 0.8;
  const minBytesToCompress = options.minBytesToCompress ?? 250 * 1024; // 250 KB

  const mime = (file.type || '').toLowerCase();
  if (!COMPRESSIBLE_IMAGE_MIMES.has(mime)) {
    return file;
  }

  if (file.size <= minBytesToCompress) {
    return file;
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
    if (!compressedBlob || compressedBlob.size === 0 || compressedBlob.size >= file.size) {
      return file;
    }

    return new File([compressedBlob], replaceExtensionWithJpg(file.name), {
      type: 'image/jpeg',
      lastModified: file.lastModified || Date.now(),
    });
  } catch {
    return file;
  }
}
