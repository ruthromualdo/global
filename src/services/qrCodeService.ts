import { initialQRCodes } from '../mocks/mockData';
import { QRCode } from '../types';

let qrCodesStore: QRCode[] = initialQRCodes.map((q) => ({ ...q }));

export const qrCodeService = {
  getQRCodes(): QRCode[] {
    return qrCodesStore.map((q) => ({ ...q }));
  },

  validateSimulatedScan(inputCode: string): {
    success: boolean;
    qrCode?: QRCode;
    message: string;
  } {
    const normalized = inputCode.trim().toUpperCase();
    const match = qrCodesStore.find((q) => q.code.toUpperCase() === normalized);

    if (!match) {
      return {
        success: false,
        message:
          'Código QR não localizado na base demonstrativa. Utilize um dos códigos sugeridos dos estandes (ex.: TUTU-SIMULADOR ou FUTURIZE-2030).',
      };
    }

    if (!match.active) {
      return {
        success: false,
        qrCode: { ...match },
        message: `O código ${match.code} está temporariamente desativado pela organização.`,
      };
    }

    qrCodesStore = qrCodesStore.map((q) =>
      q.id === match.id ? { ...q, scansCount: q.scansCount + 1 } : q
    );

    return {
      success: true,
      qrCode: { ...match, scansCount: match.scansCount + 1 },
      message: `Leitura simulada confirmada! +${match.points} pontos creditados pela missão "${match.missionTitle}".`,
    };
  },

  createQRCode(payload: Omit<QRCode, 'id' | 'scansCount' | 'createdAt'>): QRCode {
    const newQR: QRCode = {
      ...payload,
      id: `qr-${Date.now()}`,
      scansCount: 0,
      createdAt: '24/11/2026',
    };
    qrCodesStore = [newQR, ...qrCodesStore];
    return { ...newQR };
  },

  toggleQRCodeActive(id: string): QRCode[] {
    qrCodesStore = qrCodesStore.map((q) => (q.id === id ? { ...q, active: !q.active } : q));
    return this.getQRCodes();
  },
};
