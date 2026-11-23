import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileCheck,
  FileText,
  Image as ImageIcon,
  Loader2,
  Paperclip,
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
    participantName: string;
    missionTitle: string;
  } | null>(null);

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

    if (mode === 'view' && mime.startsWith('image/')) {
      setPreviewModal({
        url: blobUrl,
        fileName,
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
                <p className="text-xs text-tutu-light/75">
                  Startup relacionada: <strong>{item.startupName}</strong>
                </p>

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
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {item.evidenceMimeType?.startsWith('image/') && (
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
                          <span>Visualizar Imagem</span>
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
                  onClick={() => reviewValidationItem(item.id, 'Rejeitada')}
                  disabled={item.status === 'Rejeitada'}
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
              <img
                src={previewModal.url}
                alt={previewModal.fileName}
                className="max-h-[75vh] w-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
