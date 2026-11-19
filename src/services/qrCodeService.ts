import { initialQRCodes } from '../mocks/mockData';
import { QRCode } from '../types';

let qrCodesStore: QRCode[] = initialQRCodes.map((q) => ({ ...q }));
const localScannedCodes = new Set<string>();

export const qrCodeService = {
  getQRCodes(): QRCode[] {
    return qrCodesStore.map((q) => ({ ...q }));
  },

  validateSimulatedScan(inputCode: string): {
    success: boolean;
    status?:
      | 'VALIDATED'
      | 'INVALID_CODE'
      | 'INACTIVE_CODE'
      | 'INVALID_MISSION'
      | 'ALREADY_USED'
      | 'CONNECTION_ERROR';
    alreadyUsed?: boolean;
    qrCode?: QRCode;
    message: string;
  } {
    const normalized = inputCode.trim().toUpperCase();
    const match = qrCodesStore.find((q) => q.code.toUpperCase() === normalized);

    if (!match) {
      return {
        success: false,
        status: 'INVALID_CODE',
        message: `Código QR "${normalized}" inválido ou não localizado. Utilize um dos códigos oficiais dos estandes (ex.: TUTU-2026, TUTU-SIMULADOR ou FUTURIZE-2030).`,
      };
    }

    if (!match.active) {
      return {
        success: false,
        status: 'INACTIVE_CODE',
        qrCode: { ...match },
        message: `O código ${match.code} está temporariamente desativado pela organização.`,
      };
    }

    if (localScannedCodes.has(match.code.toUpperCase())) {
      return {
        success: false,
        status: 'ALREADY_USED',
        alreadyUsed: true,
        qrCode: { ...match },
        message: `Código ${match.code} já utilizado! Você já concluiu a missão "${match.missionTitle}" e os pontos já foram creditados anteriormente.`,
      };
    }

    localScannedCodes.add(match.code.toUpperCase());
    qrCodesStore = qrCodesStore.map((q) =>
      q.id === match.id ? { ...q, scansCount: q.scansCount + 1 } : q
    );

    return {
      success: true,
      status: 'VALIDATED',
      qrCode: { ...match, scansCount: match.scansCount + 1 },
      message: `Leitura confirmada! +${match.points} pontos creditados pela missão "${match.missionTitle}".`,
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
