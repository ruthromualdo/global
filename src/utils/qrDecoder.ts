import jsQR from 'jsqr';

export interface DetectedBarcode {
  rawValue: string;
  format?: string;
}

export interface BarcodeDetectorInstance {
  detect: (image: ImageBitmapSource) => Promise<DetectedBarcode[]>;
}

interface BarcodeDetectorConstructor {
  new (options?: { formats: string[] }): BarcodeDetectorInstance;
  getSupportedFormats?: () => Promise<string[]>;
}

declare global {
  interface Window {
    BarcodeDetector?: BarcodeDetectorConstructor;
  }
}

/**
 * Extrai e normaliza o identificador do QR Code a partir do conteúdo bruto lido.
 * Suporta tanto códigos alfanuméricos diretos (ex.: "TUTU-2026") quanto URLs
 * que contenham o parâmetro `?code=TUTU-2026`.
 */
export function extractQRCodePayload(rawValue: string): string {
  const trimmed = (rawValue || '').trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.includes('?code=')) {
    try {
      const url = new URL(trimmed, 'https://desafio.exdevedor.com.br');
      const codeParam = url.searchParams.get('code');
      if (codeParam && codeParam.trim()) {
        return codeParam.trim().toUpperCase();
      }
    } catch {
      // Caso não seja uma URL válida, segue para extração direta
    }
  }

  return trimmed.toUpperCase();
}

/**
 * Decodifica uma matriz de pixels RGBA (Uint8ClampedArray) utilizando jsQR.
 * Compatível com todos os navegadores móveis e desktop (iOS Safari, Android Chrome, Firefox, Edge).
 */
export function decodeQRFromImageData(
  data: Uint8ClampedArray,
  width: number,
  height: number
): string | null {
  if (!data || width <= 0 || height <= 0) return null;

  const decoded = jsQR(data, width, height, {
    inversionAttempts: 'attemptBoth',
  });

  if (!decoded || !decoded.data) {
    return null;
  }

  const normalized = extractQRCodePayload(decoded.data);
  return normalized || null;
}

/**
 * Verifica se a API nativa BarcodeDetector está disponível no navegador atual
 * com suporte ao formato 'qr_code'.
 */
export async function createNativeBarcodeDetector(): Promise<BarcodeDetectorInstance | null> {
  if (typeof window === 'undefined' || !window.BarcodeDetector) {
    return null;
  }

  try {
    if (typeof window.BarcodeDetector.getSupportedFormats === 'function') {
      const formats = await window.BarcodeDetector.getSupportedFormats();
      if (!formats.includes('qr_code')) {
        return null;
      }
    }
    return new window.BarcodeDetector({ formats: ['qr_code'] });
  } catch {
    return null;
  }
}

/**
 * Analisa o frame atual do elemento <video> combinando BarcodeDetector API (quando suportada)
 * e fallback automático com jsQR via Canvas 2D para máxima compatibilidade mobile (iOS/Android).
 */
export async function decodeVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  nativeDetector: BarcodeDetectorInstance | null
): Promise<{ code: string; engine: 'BarcodeDetector' | 'jsQR' } | null> {
  if (
    video.readyState < HTMLMediaElement.HAVE_ENOUGH_DATA ||
    video.videoWidth <= 0 ||
    video.videoHeight <= 0
  ) {
    return null;
  }

  const maxDimension = 480;
  const scale = Math.min(1, maxDimension / Math.max(video.videoWidth, video.videoHeight));
  const width = Math.max(1, Math.floor(video.videoWidth * scale));
  const height = Math.max(1, Math.floor(video.videoHeight * scale));

  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  ctx.drawImage(video, 0, 0, width, height);

  // 1. Tenta decodificação acelerada por hardware via BarcodeDetector API (se suportada)
  if (nativeDetector) {
    try {
      const results = await nativeDetector.detect(canvas);
      if (results && results.length > 0 && results[0].rawValue) {
        const extracted = extractQRCodePayload(results[0].rawValue);
        if (extracted) {
          return { code: extracted, engine: 'BarcodeDetector' };
        }
      }
    } catch {
      // Em caso de falha na API nativa, prossegue automaticamente para o fallback jsQR
    }
  }

  // 2. Fallback universal com jsQR sobre os pixels do Canvas 2D (funciona em iOS Safari, Firefox, Android, Desktop)
  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const code = decodeQRFromImageData(imageData.data, width, height);
    if (code) {
      return { code, engine: 'jsQR' };
    }
  } catch {
    return null;
  }

  return null;
}
