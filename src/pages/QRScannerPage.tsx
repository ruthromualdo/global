import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  QrCode,
  Sparkles,
  Zap,
  Camera,
  Keyboard,
} from 'lucide-react';
import { useAppStore } from '../hooks/useAppStore';
import { SimulatedQRMatrix } from '../components/UI';
import { formatPoints } from '../utils/formatters';

export const QRScannerPage: React.FC = () => {
  const { qrCodes, scanQRCodeDemo } = useAppStore();
  const [searchParams] = useSearchParams();
  const [manualCode, setManualCode] = useState('');
  const [isScanningAnim, setIsScanningAnim] = useState(false);
  const [lastResult, setLastResult] = useState<{
    success: boolean;
    message: string;
    points?: number;
    code?: string;
  } | null>(null);

  useEffect(() => {
    const prefilled = searchParams.get('code');
    if (prefilled) {
      setManualCode(prefilled);
    }
  }, [searchParams]);

  const triggerScan = (codeToUse: string) => {
    if (!codeToUse.trim()) return;
    setIsScanningAnim(true);
    setTimeout(() => {
      const res = scanQRCodeDemo(codeToUse);
      setIsScanningAnim(false);
      setLastResult({
        success: res.success,
        message: res.message,
        points: res.qrCode?.points,
        code: codeToUse.toUpperCase(),
      });
    }, 350);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    triggerScan(manualCode);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
          Leitor Demonstrativo • Arena BRB Mané Garrincha
        </span>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-tutu-light">
          Escaneamento de QR Code
        </h1>
        <p className="text-sm text-tutu-light/80">
          Simule a leitura dos totens nos estandes das startups expositoras ou digite o código manualmente abaixo. Nesta etapa, a câmera real não é acionada.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Visual Scanner Simulation Box */}
        <div className="lg:col-span-6 tutu-card p-6 space-y-5 border-2 border-tutu-blue">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-tutu-lime">
              <Camera className="w-4 h-4" />
              <span>Visor Simulado de Estande</span>
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-tutu-secondary/50 text-[11px] text-tutu-light">
              Modo Demonstração
            </span>
          </div>

          {/* Viewfinder Frame */}
          <div className="relative aspect-square max-h-72 mx-auto w-full rounded-2xl bg-tutu-dark border-2 border-dashed border-tutu-blue flex flex-col items-center justify-center p-6 overflow-hidden">
            {/* Corner brackets */}
            <div className="absolute top-4 left-4 w-7 h-7 border-t-4 border-l-4 border-tutu-lime rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-7 h-7 border-t-4 border-r-4 border-tutu-lime rounded-tr-lg" />
            <div className="absolute bottom-4 left-4 w-7 h-7 border-b-4 border-l-4 border-tutu-lime rounded-bl-lg" />
            <div className="absolute bottom-4 right-4 w-7 h-7 border-b-4 border-r-4 border-tutu-lime rounded-br-lg" />

            <SimulatedQRMatrix code={manualCode || 'TUTU-2026'} size={148} />

            <p className="text-xs text-tutu-light/80 mt-4 text-center">
              {isScanningAnim
                ? 'Processando leitura óptica simulada...'
                : `Código em foco: ${(manualCode || 'TUTU-2026').toUpperCase()}`}
            </p>
          </div>

          {/* Instructions */}
          <div className="p-4 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 space-y-2 text-xs text-tutu-light/85">
            <p className="font-bold text-tutu-lime">Instruções para leitura nos estandes:</p>
            <ol className="list-decimal list-inside space-y-1 text-tutu-light/80">
              <li>Localize a placa oficial do Desafio Global Summit 2026 no estande da startup.</li>
              <li>Posicione o código no quadro ou insira o identificador alfanumérico ao lado.</li>
              <li>Confirme para receber os pontos imediatamente no seu passaporte.</li>
            </ol>
          </div>
        </div>

        {/* Manual Code Entry & Quick Simulation Buttons */}
        <div className="lg:col-span-6 space-y-6">
          <div className="tutu-card p-6 space-y-5">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-tutu-lime">
              <Keyboard className="w-4 h-4" />
              <span>Inserir Código Manualmente</span>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-tutu-light/80 mb-1.5 font-medium">
                  Código do Estande ou Missão
                </label>
                <input
                  type="text"
                  required
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Ex.: TUTU-SIMULADOR ou FUTURIZE-2030"
                  className="input-tutu font-mono uppercase tracking-wider text-sm"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-xl btn-tutu-lime text-sm flex items-center justify-center gap-2"
              >
                <QrCode className="w-4 h-4" />
                <span>Confirmar Leitura do Código</span>
              </button>
            </form>

            {/* Visual Feedback Banner */}
            {lastResult && (
              <div
                className={`p-4 rounded-xl border flex items-start gap-3 ${
                  lastResult.success
                    ? 'bg-tutu-secondary/30 border-tutu-lime text-tutu-light'
                    : 'bg-tutu-dark border-tutu-blue text-tutu-light'
                }`}
              >
                {lastResult.success ? (
                  <CheckCircle2 className="w-5 h-5 text-tutu-lime shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-tutu-lime shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 text-xs">
                  <p className="font-display font-bold text-sm text-tutu-light">
                    {lastResult.success
                      ? `Sucesso! Código ${lastResult.code} Validado`
                      : 'Código Não Validado'}
                  </p>
                  <p className="text-tutu-light/85 leading-relaxed">{lastResult.message}</p>
                </div>
              </div>
            )}
          </div>

          {/* Quick Demo Codes List */}
          <div className="tutu-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-tutu-lime flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                <span>Códigos Demonstrativos Disponíveis</span>
              </span>
              <span className="text-[11px] text-tutu-light/65">Clique para testar</span>
            </div>

            <div className="space-y-2.5">
              {qrCodes.map((qr) => (
                <div
                  key={qr.id}
                  className="p-3 rounded-xl bg-tutu-dark/75 border border-tutu-secondary/40 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-tutu-lime">
                        {qr.code}
                      </span>
                      <span className="text-[11px] text-tutu-light/70 truncate">
                        • {qr.startupName}
                      </span>
                    </div>
                    <p className="text-xs text-tutu-light/85 truncate mt-0.5">{qr.missionTitle}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs font-bold text-tutu-lime flex items-center gap-0.5">
                      <Zap className="w-3.5 h-3.5" />
                      {formatPoints(qr.points)}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setManualCode(qr.code);
                        triggerScan(qr.code);
                      }}
                      className="px-3 py-1.5 rounded-lg btn-tutu-primary text-xs"
                    >
                      Simular
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
