import React, { useState } from 'react';
import { Eye, Plus, Power, QrCode as QrIcon, Zap } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { QRCode } from '../../types';
import { SimulatedQRMatrix } from '../../components/UI';
import { formatPoints } from '../../utils/formatters';

export const AdminQRCodesPage: React.FC = () => {
  const { qrCodes, startups, missions, createQRCode, toggleQRCodeActive } = useAppStore();

  const [showForm, setShowForm] = useState(false);
  const [previewQR, setPreviewQR] = useState<QRCode | null>(null);

  const [code, setCode] = useState('SUMMIT-NOVO');
  const [label, setLabel] = useState('');
  const [startupId, setStartupId] = useState(startups[0]?.id || 'st-tutu');
  const [missionId, setMissionId] = useState(missions[0]?.id || 'ms-01');
  const [points, setPoints] = useState(250);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const st = startups.find((s) => s.id === startupId);
    const ms = missions.find((m) => m.id === missionId);

    createQRCode({
      code: code.toUpperCase(),
      label: label || `Totem — ${st?.shortName || 'Estande'}`,
      startupId,
      startupName: st?.name || 'Tutu (Ex Devedor)',
      missionId,
      missionTitle: ms?.title || 'Missão Associada',
      points: Number(points),
      active: true,
    });
    setShowForm(false);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
            Totens & Identificadores • Seção 6.4
          </span>
          <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
            Gestão de QR Codes
          </h1>
          <p className="text-xs sm:text-sm text-tutu-light/80 leading-relaxed">
            Associe códigos QR às startups e missões, exiba a matriz visual para impressão e gerencie a ativação.
          </p>
        </div>

        <button
          onClick={() => setShowForm(!showForm)}
          className="min-h-[44px] w-full sm:w-auto px-5 py-3 rounded-xl btn-tutu-lime text-xs flex items-center justify-center gap-2 self-start shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Associar Novo QR Code</span>
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="tutu-card p-5 sm:p-8 space-y-5 border-2 border-tutu-lime"
        >
          <h2 className="font-display font-bold text-xl sm:text-2xl text-tutu-light">
            Associar QR Code a Startup & Missão
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Código Alfanumérico</label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="input-tutu text-sm font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Identificação do Totem</label>
              <input
                type="text"
                required
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Ex.: Balcão Central Estande A01"
                className="input-tutu text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Pontos Liberados</label>
              <input
                type="number"
                required
                min={50}
                step={50}
                value={points}
                onChange={(e) => setPoints(Number(e.target.value))}
                className="input-tutu text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Startup Associada</label>
              <select
                value={startupId}
                onChange={(e) => setStartupId(e.target.value)}
                className="input-tutu text-sm"
              >
                {startups.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Missão Associada</label>
              <select
                value={missionId}
                onChange={(e) => setMissionId(e.target.value)}
                className="input-tutu text-sm"
              >
                {missions.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title} ({m.startupName})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="min-h-[44px] px-4 py-2.5 rounded-xl btn-tutu-outline text-xs"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2.5 rounded-xl btn-tutu-lime text-xs"
            >
              Gerar e Associar QR Code
            </button>
          </div>
        </form>
      )}

      {/* QR Codes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {qrCodes.map((qr) => (
          <div
            key={qr.id}
            className={`tutu-card p-5 sm:p-6 flex flex-col sm:flex-row items-center gap-5 sm:gap-6 ${
              !qr.active ? 'opacity-65' : ''
            }`}
          >
            <SimulatedQRMatrix code={qr.code} size={112} />

            <div className="flex-1 space-y-2.5 w-full min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono font-bold text-xs sm:text-sm px-2.5 py-0.5 rounded bg-tutu-blue text-tutu-light break-all">
                  {qr.code}
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-bold shrink-0 ${
                    qr.active
                      ? 'bg-tutu-lime text-tutu-dark'
                      : 'bg-tutu-dark text-tutu-light/60 border border-tutu-secondary/40'
                  }`}
                >
                  {qr.active ? 'Ativo' : 'Inativo'}
                </span>
              </div>

              <div>
                <h3 className="font-display font-bold text-lg text-tutu-light break-words">
                  {qr.label}
                </h3>
                <p className="text-xs text-tutu-lime font-medium">{qr.startupName}</p>
                <p className="text-xs text-tutu-light/75 mt-0.5 break-words">
                  Missão: {qr.missionTitle}
                </p>
              </div>

              <div className="pt-2 border-t border-tutu-secondary/40 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-tutu-lime flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 shrink-0" />
                    {formatPoints(qr.points)}
                  </span>
                  <span className="text-tutu-light/70">{qr.scansCount} leituras</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPreviewQR(qr)}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg btn-tutu-primary text-xs flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5 shrink-0" />
                    <span>Visualizar</span>
                  </button>
                  <button
                    onClick={() => toggleQRCodeActive(qr.id)}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg btn-tutu-outline text-xs flex items-center gap-1"
                  >
                    <Power className="w-3.5 h-3.5 shrink-0" />
                    <span>{qr.active ? 'Desativar' : 'Ativar'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Display of QR Code Totem */}
      {previewQR && (
        <div className="fixed inset-0 z-50 bg-tutu-dark/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="tutu-card max-w-md w-full max-h-[90vh] overflow-y-auto p-5 sm:p-8 text-center space-y-5 border-2 border-tutu-lime">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-tutu-secondary/50 text-tutu-lime text-xs font-bold">
              <QrIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Totem de Estande</span>
            </div>
            <h3 className="font-display font-bold text-xl sm:text-2xl text-tutu-light break-words">
              {previewQR.startupName}
            </h3>
            <div className="flex justify-center">
              <SimulatedQRMatrix code={previewQR.code} size={168} />
            </div>
            <div className="p-3.5 rounded-xl bg-tutu-dark border border-tutu-secondary/50 space-y-1">
              <p className="text-xs text-tutu-light/70">Código de Leitura Manual:</p>
              <p className="font-mono font-bold text-lg sm:text-xl text-tutu-lime tracking-widest break-all">
                {previewQR.code}
              </p>
            </div>
            <p className="text-xs text-tutu-light/80">{previewQR.missionTitle}</p>
            <button
              onClick={() => setPreviewQR(null)}
              className="min-h-[44px] w-full py-2.5 rounded-xl btn-tutu-primary text-xs"
            >
              Fechar Visualização
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
