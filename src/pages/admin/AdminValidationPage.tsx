import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  Film,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  ShieldCheck,
  Users,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { MissionCompletion } from '../../types';
import { formatPoints } from '../../utils/formatters';
import { fetchAuthenticatedEvidenceBlob } from '../../services/apiClient';

function formatEvidenceSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2).replace('.', ',')} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export const AdminValidationPage: React.FC = () => {
  const { validationQueue, reviewValidationItem, notify } = useAppStore();
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pendente' | 'Aprovada' | 'Rejeitada'>(
    'Todos'
  );
  const [loadingEvidenceId, setLoadingEvidenceId] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<{
    url: string;
    fileName: string;
    mimeType: string;
    participantName: string;
    missionTitle: string;
  } | null>(null);
  const [rejectTarget, setRejectTarget] = useState<MissionCompletion | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    return () => {
      if (previewModal?.url) URL.revokeObjectURL(previewModal.url);
    };
  }, [previewModal]);

  const handleOpenEvidence = async (item: MissionCompletion, mode: 'view' | 'download') => {
    setLoadingEvidenceId(item.id);
    const res = await fetchAuthenticatedEvidenceBlob(item.id);
    setLoadingEvidenceId(null);

    if (!res.ok || !res.blob) {
      notify(
        'Erro ao Carregar Evidência',
        res.error || 'Não foi possível acessar o arquivo de evidência.',
        'error'
      );
      return;
    }

    const mime = res.mimeType || item.evidenceMimeType || '';
    const fileName = res.fileName || item.evidenceFileName || 'evidencia';
    const blobUrl = URL.createObjectURL(res.blob);

    if (mode === 'view' && (mime.startsWith('image/') || mime.startsWith('video/'))) {
      setPreviewModal({
        url: blobUrl,
        fileName,
        mimeType: mime,
        participantName: item.participantName,
        missionTitle: item.missionTitle,
      });
      return;
    }

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
  };

  const filtered = validationQueue.filter((item) =>
    statusFilter === 'Todos' ? true : item.status === statusFilter
  );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
            Auditoria de Engajamento • Seção 6.5
          </span>
          <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
            Fila de Validação de Missões
          </h1>
          <p className="text-xs sm:text-sm text-tutu-light/80 leading-relaxed">
            Analise as evidências enviadas pelos participantes e aprove ou rejeite a liberação de pontos.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['Todos', 'Pendente', 'Aprovada', 'Rejeitada'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                statusFilter === st
                  ? 'bg-tutu-lime text-tutu-dark'
                  : 'bg-tutu-secondary/25 text-tutu-light/80 hover:text-tutu-light'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="tutu-card p-8 text-center space-y-2">
          <FileCheck className="w-8 h-8 text-tutu-lime mx-auto" />
          <h2 className="font-display font-bold text-lg text-tutu-light">
            Nenhuma submissão na fila para o filtro selecionado
          </h2>
          <p className="text-xs text-tutu-light/70">
            Quando participantes enviarem evidências de missões de compartilhamento, elas aparecerão aqui para aprovação.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="tutu-card p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 sm:gap-6"
            >
              <div className="space-y-2.5 max-w-3xl min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span
                    className={`px-2.5 py-1 rounded-full font-bold ${
                      item.status === 'Aprovada'
                        ? 'bg-tutu-lime text-tutu-dark'
                        : item.status === 'Rejeitada'
                        ? 'bg-tutu-dark text-tutu-light/60 border border-tutu-secondary/50'
                        : 'bg-tutu-blue text-tutu-light'
                    }`}
                  >
                    {item.status}
                  </span>
                  <span className="font-mono text-tutu-lime font-semibold">
                    Protocolo: {item.evidenceCode}
                  </span>
                  <span className="text-tutu-light/70 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 shrink-0" />
                    {item.submittedAt}
                  </span>
                </div>

                <h3 className="font-display font-bold text-lg sm:text-xl text-tutu-light break-words">
                  {item.participantName} — <span className="text-tutu-lime">{item.missionTitle}</span>
                </h3>
                <p className="text-xs text-tutu-light/75 flex flex-wrap items-center gap-2">
                  <span>
                    Startup / Trilha: <strong>{item.startupName}</strong>
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      item.participantImageConsent
                        ? 'bg-tutu-lime/20 text-tutu-lime border border-tutu-lime/40'
                        : 'bg-tutu-dark/80 text-tutu-light/60 border border-tutu-secondary/40'
                    }`}
                  >
                    <ShieldCheck className="w-3 h-3 shrink-0" />
                    {item.participantImageConsent
                      ? `LGPD: Divulgação autorizada${item.participantImageConsentVersion ? ` (${item.participantImageConsentVersion})` : ''}`
                      : 'LGPD: Sem autorização para divulgação pública'}
                  </span>
                  {(item.sharedEvidenceCount || 0) > 1 && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-200 border border-amber-400/40">
                      <Users className="w-3 h-3 shrink-0" />
                      Foto coletiva enviada por {item.sharedEvidenceCount} participantes
                    </span>
                  )}
                </p>

                {item.status === 'Rejeitada' && item.rejectionReason && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-400/40 text-xs text-red-200">
                    <span className="font-bold block">Motivo da rejeição:</span>
                    <span>{item.rejectionReason}</span>
                  </div>
                )}

                <div className="p-3.5 rounded-xl bg-tutu-dark/75 border border-tutu-secondary/40 text-xs text-tutu-light/90 flex items-start gap-2.5">
                  <FileCheck className="w-4 h-4 text-tutu-lime shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="font-bold text-tutu-lime block">Evidência Registrada:</span>
                    <span className="break-words">{item.evidenceDescription}</span>
                  </div>
                </div>

                {item.hasFile && (
                  <div className="p-3.5 rounded-xl bg-tutu-blue/15 border border-tutu-blue/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.evidenceMimeType?.startsWith('image/') ? (
                        <ImageIcon className="w-4 h-4 text-tutu-lime shrink-0" />
                      ) : item.evidenceMimeType?.startsWith('video/') ? (
                        <Film className="w-4 h-4 text-tutu-lime shrink-0" />
                      ) : item.evidenceMimeType === 'application/pdf' ? (
                        <FileText className="w-4 h-4 text-tutu-lime shrink-0" />
                      ) : (
                        <Paperclip className="w-4 h-4 text-tutu-lime shrink-0" />
                      )}
                      <div className="min-w-0">
                        <div className="font-semibold text-tutu-light truncate">
                          {item.evidenceFileName || 'Arquivo anexado'}
                        </div>
                        <div className="text-[11px] text-tutu-light/65">
                          {item.evidenceMimeType || 'application/octet-stream'} •{' '}
                          {formatEvidenceSize(item.evidenceSizeBytes)}
                          {item.evidenceDurationSeconds
                            ? ` • Duração: ${item.evidenceDurationSeconds}s`
                            : ''}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {(item.evidenceMimeType?.startsWith('image/') ||
                        item.evidenceMimeType?.startsWith('video/')) && (
                        <button
                          type="button"
                          onClick={() => handleOpenEvidence(item, 'view')}
                          disabled={loadingEvidenceId === item.id}
                          className="min-h-[36px] px-3 py-1.5 rounded-lg bg-tutu-lime/15 border border-tutu-lime/40 text-tutu-lime hover:bg-tutu-lime/25 text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                          {loadingEvidenceId === item.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                          <span>
                            {item.evidenceMimeType?.startsWith('video/')
                              ? 'Visualizar Vídeo'
                              : 'Visualizar Imagem'}
                          </span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEvidence(item, 'download')}
                        disabled={loadingEvidenceId === item.id}
                        className="min-h-[36px] px-3 py-1.5 rounded-lg bg-tutu-dark/80 border border-tutu-secondary/50 text-tutu-light hover:border-tutu-lime text-xs font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                      >
                        {loadingEvidenceId === item.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5 text-tutu-lime" />
                        )}
                        <span>
                          {item.evidenceMimeType === 'application/pdf'
                            ? 'Baixar PDF'
                            : 'Baixar Arquivo'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-tutu-secondary/30">
                <span className="px-3 py-2 rounded-xl bg-tutu-dark font-display font-bold text-sm text-tutu-lime flex items-center gap-1">
                  <Zap className="w-4 h-4 shrink-0" />+{formatPoints(item.pointsAwarded)}
                </span>

                <button
                  onClick={() => reviewValidationItem(item.id, 'Aprovada')}
                  disabled={item.status === 'Aprovada'}
                  className="min-h-[44px] flex-1 sm:flex-initial px-4 py-2.5 rounded-xl btn-tutu-lime text-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Aprovar</span>
                </button>

                <button
                  onClick={() => {
                    setRejectTarget(item);
                    setRejectionReason('');
                  }}
                  disabled={item.status === 'Rejeitada' || item.status === 'Aprovada'}
                  className="min-h-[44px] flex-1 sm:flex-initial px-4 py-2.5 rounded-xl btn-tutu-outline text-xs flex items-center justify-center gap-1.5 disabled:opacity-40"
                >
                  <XCircle className="w-4 h-4 shrink-0" />
                  <span>Rejeitar</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Visualização Segura de Imagem */}
      {previewModal && (
        <div className="fixed inset-0 z-50 bg-tutu-dark/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="tutu-card max-w-4xl w-full p-4 sm:p-6 space-y-4 border-2 border-tutu-lime">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-tutu-lime block">
                  {previewModal.participantName} — {previewModal.missionTitle}
                </span>
                <h3 className="font-display font-bold text-base sm:text-lg text-tutu-light truncate">
                  {previewModal.fileName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  URL.revokeObjectURL(previewModal.url);
                  setPreviewModal(null);
                }}
                className="min-h-[36px] px-3 py-1.5 rounded-lg bg-tutu-secondary/30 text-xs text-tutu-light hover:text-tutu-lime flex items-center gap-1 shrink-0"
              >
                <X className="w-4 h-4" />
                <span>Fechar</span>
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-tutu-dark border border-tutu-secondary/40 flex items-center justify-center max-h-[75vh]">
              {previewModal.mimeType.startsWith('video/') ? (
                <video
                  src={previewModal.url}
                  controls
                  playsInline
                  className="max-h-[75vh] w-full object-contain"
                />
              ) : (
                <img
                  src={previewModal.url}
                  alt={previewModal.fileName}
                  className="max-h-[75vh] w-auto object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Motivo de Rejeição */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-tutu-dark/90 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              reviewValidationItem(
                rejectTarget.id,
                'Rejeitada',
                rejectionReason.trim() || 'Evidência não atende aos critérios da missão.'
              );
              setRejectTarget(null);
              setRejectionReason('');
            }}
            className="tutu-card max-w-lg w-full p-5 sm:p-6 space-y-4 border-2 border-red-400/60"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-300 block">
                  Reprovar Evidência
                </span>
                <h3 className="font-display font-bold text-lg text-tutu-light">
                  {rejectTarget.participantName} — {rejectTarget.missionTitle}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="p-2 rounded-lg bg-tutu-secondary/30 text-tutu-light hover:text-tutu-lime"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-tutu-light/85">
                Motivo da reprovação (exibido ao participante) *
              </label>
              <textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex.: A foto não mostra os três representantes juntos ou está ilegível."
                className="input-tutu text-xs"
              />
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setRejectTarget(null)}
                className="min-h-[40px] px-4 py-2 rounded-xl btn-tutu-outline text-xs"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="min-h-[40px] px-4 py-2 rounded-xl bg-red-500/80 hover:bg-red-500 text-white text-xs font-bold"
              >
                Confirmar Rejeição
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
