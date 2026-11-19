import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Camera,
  CameraOff,
  CheckCircle2,
  Info,
  Keyboard,
  QrCode,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  WifiOff,
  Zap,
} from 'lucide-react';
import { useAppStore, QRScanStatus } from '../hooks/useAppStore';
import { SimulatedQRMatrix } from '../components/UI';
import { formatPoints } from '../utils/formatters';
import {
  BarcodeDetectorInstance,
  createNativeBarcodeDetector,
  decodeVideoFrame,
  extractQRCodePayload,
} from '../utils/qrDecoder';

export const QRScannerPage: React.FC = () => {
  const { qrCodes, missions, scanQRCodeDemo } = useAppStore();
  const [searchParams] = useSearchParams();
  const [manualCode, setManualCode] = useState('');
  const [isScanningAnim, setIsScanningAnim] = useState(false);

  // Estados da câmera e decodificação óptica real
  const [cameraActive, setCameraActive] = useState(false);
  const [scanPaused, setScanPaused] = useState(false);
  const [cameraStatusMessage, setCameraStatusMessage] = useState<string | null>(null);
  const [cameraErrorKind, setCameraErrorKind] = useState<
    'PERMISSION_DENIED' | 'NO_CAMERA' | 'INSECURE_CONTEXT' | 'GENERIC' | null
  >(null);
  const [opticalRecognizedCode, setOpticalRecognizedCode] = useState<string | null>(null);
  const [decoderEngineLabel, setDecoderEngineLabel] = useState<string>('jsQR');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeDetectorRef = useRef<BarcodeDetectorInstance | null>(null);
  const scanIntervalRef = useRef<number | null>(null);

  // Travas contra leituras duplicadas consecutivas
  const isSubmittingRef = useRef<boolean>(false);
  const lastDecodedRef = useRef<{ code: string; timestamp: number }>({
    code: '',
    timestamp: 0,
  });

  const [lastResult, setLastResult] = useState<{
    success: boolean;
    status: QRScanStatus;
    alreadyUsed?: boolean;
    message: string;
    points?: number;
    code?: string;
    source?: 'optical' | 'manual' | 'simulation';
  } | null>(null);

  useEffect(() => {
    const prefilled = searchParams.get('code');
    if (prefilled) {
      setManualCode(extractQRCodePayload(prefilled));
    }
  }, [searchParams]);

  const clearScanLoop = useCallback(() => {
    if (scanIntervalRef.current !== null) {
      window.clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(
    (reasonMessage?: string) => {
      clearScanLoop();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
      setScanPaused(false);
      if (reasonMessage) {
        setCameraStatusMessage(reasonMessage);
      } else {
        setCameraStatusMessage(null);
        setCameraErrorKind(null);
      }
    },
    [clearScanLoop]
  );

  // Encerra os tracks de vídeo ao desmontar a página ou quando a aba/aplicativo vai para segundo plano
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && streamRef.current) {
        stopCamera(
          'A câmera foi encerrada automaticamente por segurança enquanto o aplicativo esteve em segundo plano. Toque em "Iniciar Leitura com Câmera" para retomar.'
        );
      }
    };

    const handlePageHide = () => {
      if (streamRef.current) {
        stopCamera();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      if (scanIntervalRef.current !== null) {
        window.clearInterval(scanIntervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, [stopCamera]);

  const executeBackendValidation = useCallback(
    async (rawCode: string, source: 'optical' | 'manual' | 'simulation') => {
      const normalized = extractQRCodePayload(rawCode);
      if (!normalized || isSubmittingRef.current) return;

      isSubmittingRef.current = true;
      setIsScanningAnim(true);
      setManualCode(normalized);

      if (source === 'optical') {
        setOpticalRecognizedCode(normalized);
        setScanPaused(true);
      }

      try {
        const res = await scanQRCodeDemo(normalized);
        setLastResult({
          success: res.success,
          status: res.status,
          alreadyUsed: res.alreadyUsed,
          message: res.message,
          points: res.pointsAwarded ?? res.qrCode?.points,
          code: normalized,
          source,
        });
      } finally {
        setIsScanningAnim(false);
        isSubmittingRef.current = false;
      }
    },
    [scanQRCodeDemo]
  );

  // Loop de decodificação óptica automática (BarcodeDetector API + fallback jsQR)
  useEffect(() => {
    clearScanLoop();

    if (!cameraActive || scanPaused) {
      return;
    }

    scanIntervalRef.current = window.setInterval(async () => {
      if (
        isSubmittingRef.current ||
        !videoRef.current ||
        !canvasRef.current ||
        document.hidden
      ) {
        return;
      }

      const detection = await decodeVideoFrame(
        videoRef.current,
        canvasRef.current,
        nativeDetectorRef.current
      );

      if (detection && detection.code) {
        const now = Date.now();
        // Evita leituras duplicadas consecutivas do mesmo frame/código dentro da janela de 3,5s
        if (
          lastDecodedRef.current.code === detection.code &&
          now - lastDecodedRef.current.timestamp < 3500
        ) {
          return;
        }

        lastDecodedRef.current = { code: detection.code, timestamp: now };
        setDecoderEngineLabel(
          detection.engine === 'BarcodeDetector' ? 'BarcodeDetector API' : 'jsQR Optical'
        );
        await executeBackendValidation(detection.code, 'optical');
      }
    }, 180);

    return () => {
      clearScanLoop();
    };
  }, [cameraActive, scanPaused, clearScanLoop, executeBackendValidation]);

  const requestCameraPreview = async () => {
    setCameraStatusMessage(null);
    setCameraErrorKind(null);
    setOpticalRecognizedCode(null);
    setScanPaused(false);

    // 1. Verifica contexto seguro (HTTPS ou localhost)
    const isLocalhost =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '[::1]';

    if (!window.isSecureContext && !isLocalhost) {
      setCameraErrorKind('INSECURE_CONTEXT');
      setCameraStatusMessage(
        'O acesso à câmera em navegadores móveis exige conexão segura (HTTPS). Utilize a digitação manual ou os totens de simulação abaixo.'
      );
      return;
    }

    // 2. Verifica disponibilidade da API getUserMedia
    if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
      setCameraErrorKind('NO_CAMERA');
      setCameraStatusMessage(
        'Seu navegador ou dispositivo não disponibilizou acesso direto à câmera (getUserMedia). Utilize o modo simulado ou digite o código manualmente.'
      );
      return;
    }

    try {
      // Inicializa detector nativo se suportado; mantém jsQR pronto como fallback universal
      const nativeDetector = await createNativeBarcodeDetector();
      nativeDetectorRef.current = nativeDetector;
      setDecoderEngineLabel(nativeDetector ? 'BarcodeDetector + jsQR' : 'jsQR Universal');

      // Prioriza câmera traseira (environment) em celulares e tablets
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 640 },
            height: { ideal: 640 },
          },
          audio: false,
        });
      } catch (firstErr) {
        const errName = (firstErr as DOMException)?.name || '';
        if (errName === 'OverconstrainedError' || errName === 'ConstraintNotSatisfiedError') {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } else {
          throw firstErr;
        }
      }

      streamRef.current = stream;
      setCameraActive(true);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {
          // O atributo autoPlay/playsInline lida com a reprodução após renderização
        });
      }
    } catch (err) {
      setCameraActive(false);
      const domErr = err as DOMException;
      const errName = domErr?.name || '';

      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCameraErrorKind('PERMISSION_DENIED');
        setCameraStatusMessage(
          'Permissão de câmera negada. Para ler o QR Code físico, autorize o uso da câmera nas configurações do navegador ou utilize a digitação manual e os totens abaixo.'
        );
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCameraErrorKind('NO_CAMERA');
        setCameraStatusMessage(
          'Nenhuma câmera foi identificada neste dispositivo. Utilize a inserção manual do código ou os totens demonstrativos ao lado.'
        );
      } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
        setCameraErrorKind('GENERIC');
        setCameraStatusMessage(
          'A câmera está ocupada por outro aplicativo no momento. Feche outros apps de vídeo ou utilize a digitação manual.'
        );
      } else {
        setCameraErrorKind('GENERIC');
        setCameraStatusMessage(
          'Não foi possível iniciar a câmera neste momento. O visor demonstrativo e a digitação manual continuam disponíveis para você pontuar.'
        );
      }
    }
  };

  // Vincula o stream ao elemento <video> assim que cameraActive muda para true
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      void videoRef.current.play().catch(() => undefined);
    }
  }, [cameraActive]);

  const handleResetForNewScan = () => {
    setLastResult(null);
    setOpticalRecognizedCode(null);
    lastDecodedRef.current = { code: '', timestamp: 0 };
    if (cameraActive) {
      setScanPaused(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void executeBackendValidation(manualCode, 'manual');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 sm:space-y-8">
      {/* Canvas oculto utilizado para captura e decodificação de pixels pelo jsQR */}
      <canvas ref={canvasRef} className="hidden" aria-hidden="true" />

      {/* Header */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
          Leitor de Totens • Arena BRB Mané Garrincha
        </span>
        <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
          Escaneamento de QR Code
        </h1>
        <p className="text-xs sm:text-sm text-tutu-light/80 leading-relaxed">
          Aponte a câmera para o QR Code físico nos totens das startups expositoras, simule a leitura instantânea ou digite o identificador manualmente abaixo.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
        {/* Visual Scanner Box */}
        <div className="lg:col-span-6 tutu-card p-4 sm:p-6 space-y-4 sm:space-y-5 border-2 border-tutu-blue">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-tutu-lime">
                <Camera className="w-4 h-4 shrink-0" />
                <span>Visor de Leitura Óptica</span>
              </span>
              {cameraActive && (
                <span className="px-2 py-0.5 rounded-full bg-tutu-lime/15 border border-tutu-lime/40 text-[10px] font-mono text-tutu-lime">
                  {decoderEngineLabel}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => (cameraActive ? stopCamera() : void requestCameraPreview())}
              className="min-h-[40px] px-3.5 py-2 rounded-xl bg-tutu-secondary/40 hover:bg-tutu-secondary/65 border border-tutu-lime/40 text-xs font-semibold text-tutu-light inline-flex items-center gap-1.5 transition-colors"
            >
              {cameraActive ? (
                <>
                  <CameraOff className="w-3.5 h-3.5 text-tutu-lime shrink-0" />
                  <span>Encerrar Câmera</span>
                </>
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 text-tutu-lime shrink-0" />
                  <span>Iniciar Leitura com Câmera</span>
                </>
              )}
            </button>
          </div>

          {cameraStatusMessage && (
            <div
              role="alert"
              className="p-3.5 rounded-xl bg-tutu-dark/90 border border-tutu-lime/40 text-xs text-tutu-light/90 flex items-start gap-2.5"
            >
              {cameraErrorKind === 'INSECURE_CONTEXT' ||
              cameraErrorKind === 'PERMISSION_DENIED' ? (
                <ShieldAlert className="w-4 h-4 text-tutu-lime shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-tutu-lime shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{cameraStatusMessage}</span>
            </div>
          )}

          {/* Viewfinder Frame — Adaptável em celulares verticais e horizontais */}
          <div className="relative aspect-square max-h-[240px] sm:max-h-72 mx-auto w-full rounded-2xl bg-tutu-dark border-2 border-dashed border-tutu-blue flex flex-col items-center justify-center p-4 sm:p-6 overflow-hidden">
            {/* Corner brackets */}
            <div className="absolute top-3 left-3 sm:top-4 sm:left-4 w-6 h-6 sm:w-7 sm:h-7 border-t-4 border-l-4 border-tutu-lime rounded-tl-lg pointer-events-none z-10" />
            <div className="absolute top-3 right-3 sm:top-4 sm:right-4 w-6 h-6 sm:w-7 sm:h-7 border-t-4 border-r-4 border-tutu-lime rounded-tr-lg pointer-events-none z-10" />
            <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 w-6 h-6 sm:w-7 sm:h-7 border-b-4 border-l-4 border-tutu-lime rounded-bl-lg pointer-events-none z-10" />
            <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 w-6 h-6 sm:w-7 sm:h-7 border-b-4 border-r-4 border-tutu-lime rounded-br-lg pointer-events-none z-10" />

            {cameraActive ? (
              <div className="relative w-full h-full flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover rounded-xl"
                />

                {/* Feedback visual de leitura óptica ativa ou QR Code reconhecido */}
                <div className="absolute inset-x-2 bottom-2 z-20">
                  {opticalRecognizedCode ? (
                    <div className="px-3 py-2 rounded-xl bg-tutu-dark/95 border border-tutu-lime text-center shadow-lg">
                      <p className="text-[11px] font-bold text-tutu-lime flex items-center justify-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>QR Code Reconhecido: {opticalRecognizedCode}</span>
                      </p>
                    </div>
                  ) : (
                    <div className="px-3 py-1.5 rounded-xl bg-tutu-dark/85 border border-tutu-blue/60 text-center">
                      <p className="text-[11px] text-tutu-light/90">
                        Aponte a câmera para o QR Code físico...
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                <SimulatedQRMatrix code={manualCode || 'TUTU-2026'} size={132} />
                <p className="text-xs text-tutu-light/80 mt-3 text-center truncate max-w-full px-2">
                  {isScanningAnim
                    ? 'Validando código no servidor...'
                    : `Código em foco: ${(manualCode || 'TUTU-2026').toUpperCase()}`}
                </p>
              </>
            )}
          </div>

          {cameraActive && scanPaused && (
            <button
              type="button"
              onClick={handleResetForNewScan}
              className="min-h-[44px] w-full py-2.5 px-4 rounded-xl btn-tutu-lime text-xs font-bold flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4 shrink-0" />
              <span>Realizar Nova Leitura Óptica</span>
            </button>
          )}

          {/* Instructions */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 space-y-2 text-xs text-tutu-light/85">
            <p className="font-bold text-tutu-lime">Instruções para leitura nos estandes:</p>
            <ol className="list-decimal list-inside space-y-1 text-tutu-light/80 leading-relaxed">
              <li>Toque em &ldquo;Iniciar Leitura com Câmera&rdquo; e aponte para a placa do estande.</li>
              <li>O código será detectado automaticamente e validado no servidor SQLite.</li>
              <li>Se preferir, digite o código manualmente ou use os totens abaixo.</li>
            </ol>
          </div>
        </div>

        {/* Manual Code Entry & Quick Simulation Buttons */}
        <div className="lg:col-span-6 space-y-5 sm:space-y-6">
          <div className="tutu-card p-5 sm:p-6 space-y-4 sm:space-y-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-tutu-lime">
                <Keyboard className="w-4 h-4 shrink-0" />
                <span>Inserir Código Manualmente</span>
              </div>
              {lastResult && (
                <button
                  type="button"
                  onClick={handleResetForNewScan}
                  className="text-[11px] font-semibold text-tutu-lime hover:underline inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Nova leitura</span>
                </button>
              )}
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="manual-qr-code"
                  className="block text-xs text-tutu-light/80 mb-1.5 font-medium"
                >
                  Código do Estande ou Missão
                </label>
                <input
                  id="manual-qr-code"
                  type="text"
                  required
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Ex.: TUTU-2026 ou TUTU-SIMULADOR"
                  className="input-tutu font-mono uppercase tracking-wider text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isScanningAnim}
                className="min-h-[48px] w-full py-3.5 px-4 rounded-xl btn-tutu-lime text-sm flex items-center justify-center gap-2 disabled:opacity-60"
              >
                <QrCode className="w-4 h-4 shrink-0" />
                <span>
                  {isScanningAnim ? 'Validando no servidor...' : 'Confirmar Leitura do Código'}
                </span>
              </button>
            </form>

            {/* Visual Feedback Banner — Sucesso, Código Já Utilizado, Inválido ou Erro de Conexão */}
            {lastResult && (
              <div
                role="alert"
                className={`p-4 rounded-xl border flex flex-col gap-3 ${
                  lastResult.success
                    ? 'bg-tutu-secondary/30 border-tutu-lime text-tutu-light'
                    : lastResult.status === 'ALREADY_USED'
                    ? 'bg-tutu-secondary/20 border-tutu-lime/60 text-tutu-light'
                    : 'bg-tutu-dark border-tutu-blue text-tutu-light'
                }`}
              >
                <div className="flex items-start gap-3">
                  {lastResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-tutu-lime shrink-0 mt-0.5" />
                  ) : lastResult.status === 'ALREADY_USED' ? (
                    <Info className="w-5 h-5 text-tutu-lime shrink-0 mt-0.5" />
                  ) : lastResult.status === 'CONNECTION_ERROR' ? (
                    <WifiOff className="w-5 h-5 text-tutu-lime shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-tutu-lime shrink-0 mt-0.5" />
                  )}

                  <div className="space-y-1 text-xs min-w-0 flex-1">
                    <p className="font-display font-bold text-sm text-tutu-light break-words">
                      {lastResult.success
                        ? `Sucesso! Código ${lastResult.code} Validado`
                        : lastResult.status === 'ALREADY_USED'
                        ? `Código ${lastResult.code} Já Utilizado`
                        : lastResult.status === 'INACTIVE_CODE'
                        ? `Código ${lastResult.code} Desativado`
                        : lastResult.status === 'INVALID_MISSION'
                        ? 'Missão Vinculada Indisponível'
                        : lastResult.status === 'CONNECTION_ERROR'
                        ? 'Erro de Conexão com o Servidor'
                        : 'Código QR Inválido'}
                    </p>
                    <p className="text-tutu-light/85 leading-relaxed break-words">
                      {lastResult.message}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleResetForNewScan}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-tutu-dark/80 hover:bg-tutu-dark border border-tutu-lime/40 text-xs font-semibold text-tutu-lime inline-flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5 shrink-0" />
                    <span>Ler Outro QR Code</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick Demo Codes List (Contingência e Simulação) */}
          <div className="tutu-card p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-tutu-lime flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 shrink-0" />
                <span>Códigos dos Estandes Disponíveis</span>
              </span>
              <span className="text-[11px] text-tutu-light/65">Simulação e contingência</span>
            </div>

            <div className="space-y-2.5">
              {qrCodes.map((qr) => {
                const missionCompleted =
                  missions.find((m) => m.id === qr.missionId)?.status === 'Concluída';

                return (
                  <div
                    key={qr.id}
                    className="p-3.5 rounded-xl bg-tutu-dark/75 border border-tutu-secondary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-mono font-bold text-xs text-tutu-lime">
                          {qr.code}
                        </span>
                        <span className="text-[11px] text-tutu-light/70 truncate">
                          • {qr.startupName}
                        </span>
                        {missionCompleted && (
                          <span className="px-2 py-0.5 rounded-full bg-tutu-lime/20 text-tutu-lime text-[10px] font-bold">
                            Já pontuado
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-tutu-light/85 break-words mt-0.5">
                        {qr.missionTitle}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-tutu-secondary/30">
                      <span className="text-xs font-bold text-tutu-lime flex items-center gap-0.5">
                        <Zap className="w-3.5 h-3.5 shrink-0" />
                        {formatPoints(qr.points)}
                      </span>
                      <button
                        type="button"
                        disabled={isScanningAnim}
                        onClick={() => {
                          setManualCode(qr.code);
                          void executeBackendValidation(qr.code, 'simulation');
                        }}
                        className="min-h-[40px] px-3.5 py-2 rounded-lg btn-tutu-primary text-xs disabled:opacity-60"
                      >
                        Simular
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
