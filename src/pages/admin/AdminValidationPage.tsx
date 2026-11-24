import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  Ban,
  CheckCircle2,
  Clock,
  Crown,
  Download,
  Eye,
  FileCheck,
  FileText,
  Film,
  Filter,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  RefreshCw,
  ShieldCheck,
  Users,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { EvidenceFileItem, MissionCompletion } from '../../types';
import { formatPoints } from '../../utils/formatters';
import { fetchAuthenticatedEvidenceBlob } from '../../services/apiClient';

const TRACK_OPTIONS = [
  { id: 'all', label: 'Todas as trilhas' },
  { id: 'ex_devedor', label: 'Ex Devedor' },
  { id: 'sign', label: 'Sign' },
  { id: 'editora_escreva', label: 'Editora Escreva' },
  { id: 'bonus', label: 'Missões Bônus' },
] as const;

function formatEvidenceSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 KB';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(2).replace('.', ',')} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatIsoBrasilia(iso?: string | null): string {
  if (!iso) return '—';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return iso;
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ms));
}

export const AdminValidationPage: React.FC = () => {
  const {
    validationQueue,
    allParticipants,
    publicRanking,
    missions,
    reviewValidationItem,
    disqualifyParticipantAdmin,
    refreshRanking,
    isRefreshingRanking,
    notify,
  } = useAppStore();

  const [searchParams, setSearchParams] = useSearchParams();
  const queryParticipantId = searchParams.get('participant') || 'all';

  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pendente' | 'Aprovada' | 'Rejeitada'>(
    'Todos'
  );
  const [participantFilter, setParticipantFilter] = useState<string>(queryParticipantId);
  const [trackFilter, setTrackFilter] = useState<string>('all');
  const [missionFilter, setMissionFilter] = useState<string>('all');

  const [loadingEvidenceId, setLoadingEvidenceId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [previewModal, setPreviewModal] = useState<{
    url: string;
    fileName: string;
    mimeType: string;
    participantName: string;
    missionTitle: string;
  } | null>(null);

  // Modal de rejeição + estorno
  const [rejectTarget, setRejectTarget] = useState<MissionCompletion | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectError, setRejectError] = useState<string | null>(null);
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Modal de desclassificação administrativa (separada do estorno)
  const [disqualifyTarget, setDisqualifyTarget] = useState<{
    participantId: string;
    participantName: string;
  } | null>(null);
  const [disqualifyReason, setDisqualifyReason] = useState('');
  const [disqualifyConfirmed, setDisqualifyConfirmed] = useState(false);
  const [disqualifyError, setDisqualifyError] = useState<string | null>(null);
  const [isSubmittingDisqualify, setIsSubmittingDisqualify] = useState(false);

  const didInitialSyncRef = useRef(false);
  useEffect(() => {
    if (didInitialSyncRef.current) return;
    didInitialSyncRef.current = true;
    void refreshRanking();
  }, [refreshRanking]);

  useEffect(() => {
    const qp = searchParams.get('participant');
    if (qp) {
      setParticipantFilter(qp);
    }
  }, [searchParams]);

  useEffect(() => {
    return () => {
      if (previewModal?.url) URL.revokeObjectURL(previewModal.url);
    };
  }, [previewModal]);

  const missionTrackMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of missions) {
      if (m.trackId) map.set(m.id, m.trackId);
    }
    return map;
  }, [missions]);

  const participantMap = useMemo(() => {
    return new Map(allParticipants.map((p) => [p.id, p]));
  }, [allParticipants]);

  const participantOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of allParticipants) {
      if (String(p.role || 'PARTICIPANT').toUpperCase() !== 'ADMIN') {
        map.set(p.id, p.name);
      }
    }
    for (const v of validationQueue) {
      if (!map.has(v.participantId)) {
        map.set(v.participantId, v.participantName);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allParticipants, validationQueue]);

  const missionOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const m of missions) {
      if (m.active) map.set(m.id, m.title);
    }
    for (const v of validationQueue) {
      if (!map.has(v.missionId)) map.set(v.missionId, v.missionTitle);
    }
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [missions, validationQueue]);

  const handleSelectParticipantFilter = (value: string) => {
    setParticipantFilter(value);
    if (value === 'all') {
      searchParams.delete('participant');
      setSearchParams(searchParams, { replace: true });
    } else {
      setSearchParams({ participant: value }, { replace: true });
    }
  };

  const handleOpenEvidence = async (
    item: MissionCompletion,
    mode: 'view' | 'download',
    fileItem?: EvidenceFileItem
  ) => {
    const loadKey = fileItem ? `${item.id}:${fileItem.id}` : item.id;
    setLoadingEvidenceId(loadKey);
    const res = await fetchAuthenticatedEvidenceBlob(item.id, fileItem?.id);
    setLoadingEvidenceId(null);

    if (!res.ok || !res.blob) {
      notify(
        'Erro ao Carregar Evidência',
        res.error || 'Não foi possível acessar o arquivo de evidência.',
        'error'
      );
      return;
    }

    const mime = res.mimeType || fileItem?.mimeType || item.evidenceMimeType || '';
    const fileName = res.fileName || fileItem?.fileName || item.evidenceFileName || 'evidencia';
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

  const handleApproveEvidence = async (item: MissionCompletion) => {
    setApprovingId(item.id);
    await reviewValidationItem(item.id, 'Aprovada');
    setApprovingId(null);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;
    const trimmed = rejectionReason.trim();
    if (trimmed.length < 3) {
      setRejectError('Informe uma justificativa administrativa válida para rejeitar e estornar.');
      return;
    }

    setIsSubmittingReject(true);
    setRejectError(null);
    const res = await reviewValidationItem(rejectTarget.id, 'Rejeitada', trimmed);
    setIsSubmittingReject(false);

    if (res.ok) {
      setRejectTarget(null);
      setRejectionReason('');
      setRejectError(null);
    } else {
      setRejectError(res.error || 'Não foi possível concluir a rejeição e estorno.');
    }
  };

  const handleConfirmDisqualify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disqualifyTarget) return;
    const trimmed = disqualifyReason.trim();
    if (trimmed.length < 5) {
      setDisqualifyError('Informe uma justificativa obrigatória (mínimo 5 caracteres).');
      return;
    }
    if (!disqualifyConfirmed) {
      setDisqualifyError('Marque a confirmação explícita antes de desclassificar o participante.');
      return;
    }

    setIsSubmittingDisqualify(true);
    setDisqualifyError(null);
    const res = await disqualifyParticipantAdmin(
      disqualifyTarget.participantId,
      trimmed,
      disqualifyConfirmed
    );
    setIsSubmittingDisqualify(false);

    if (res.ok) {
      setDisqualifyTarget(null);
      setDisqualifyReason('');
      setDisqualifyConfirmed(false);
      setDisqualifyError(null);
    } else {
      setDisqualifyError(res.error || 'Não foi possível concluir a desclassificação.');
    }
  };

  const filtered = validationQueue.filter((item) => {
    if (statusFilter !== 'Todos' && item.status !== statusFilter) return false;
    if (participantFilter !== 'all' && item.participantId !== participantFilter) return false;
    if (missionFilter !== 'all' && item.missionId !== missionFilter) return false;
    if (trackFilter !== 'all') {
      const itemTrack = item.trackId || missionTrackMap.get(item.missionId) || '';
      if (itemTrack !== trackFilter) return false;
    }
    return true;
  });

  const topThreeRanking = publicRanking.slice(0, 3);

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
            Conferência Final e Auditoria • Seção 6.5
          </span>
          <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
            Conferência de Evidências
          </h1>
          <p className="text-xs sm:text-sm text-tutu-light/80 leading-relaxed max-w-3xl">
            Os pontos são contabilizados no envio válido da evidência. Utilize este painel para conferir evidências (especialmente do 1º colocado provisório), homologar envios sem duplicar pontos, estornar missões irregulares ou desclassificar contas em casos graves.
          </p>
        </div>

        <button
          type="button"
          onClick={() => void refreshRanking()}
          disabled={isRefreshingRanking}
          className="min-h-[40px] px-3.5 py-2 rounded-xl bg-tutu-secondary/30 hover:bg-tutu-secondary/50 border border-tutu-secondary/60 text-xs text-tutu-light font-medium inline-flex items-center gap-2 shrink-0 self-start sm:self-auto disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 text-tutu-lime ${isRefreshingRanking ? 'animate-spin' : ''}`} />
          <span>{isRefreshingRanking ? 'Atualizando...' : 'Atualizar'}</span>
        </button>
      </div>

      {/* Atalhos rápidos para conferir 1º, 2º e 3º colocados provisórios */}
      {topThreeRanking.length > 0 && (
        <div className="tutu-card p-4 sm:p-5 border border-tutu-lime/40 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-tutu-lime flex items-center gap-1.5">
              <Crown className="w-4 h-4 shrink-0" />
              <span>Acesso Rápido — Conferência do Pódio Provisório</span>
            </span>
            {participantFilter !== 'all' && (
              <button
                type="button"
                onClick={() => handleSelectParticipantFilter('all')}
                className="text-[11px] text-tutu-lime hover:underline font-semibold"
              >
                Limpar filtro de participante
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {topThreeRanking.map((entry) => {
              const isSelected = participantFilter === entry.participantId;
              return (
                <button
                  key={entry.participantId}
                  type="button"
                  onClick={() => handleSelectParticipantFilter(entry.participantId)}
                  className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors ${
                    isSelected
                      ? 'bg-tutu-lime text-tutu-dark'
                      : 'bg-tutu-dark/80 text-tutu-light border border-tutu-secondary/50 hover:border-tutu-lime/50'
                  }`}
                >
                  <span>#{entry.position}º</span>
                  <span className="truncate max-w-[160px]">{entry.displayName}</span>
                  <span className={isSelected ? 'text-tutu-dark/80 font-mono' : 'text-tutu-lime font-mono'}>
                    ({formatPoints(entry.points)})
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="tutu-card p-4 sm:p-5 space-y-4 border border-tutu-secondary/40">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-tutu-light/80 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-tutu-lime" />
            <span>Filtros de Auditoria ({filtered.length} registro(s))</span>
          </span>

          <div className="flex flex-wrap gap-2">
            {(['Todos', 'Pendente', 'Aprovada', 'Rejeitada'] as const).map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                  statusFilter === st
                    ? 'bg-tutu-lime text-tutu-dark'
                    : 'bg-tutu-secondary/25 text-tutu-light/80 hover:text-tutu-light'
                }`}
              >
                {st === 'Pendente' ? 'Pendente de Conferência' : st}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[11px] text-tutu-light/70 mb-1">Participante</label>
            <select
              value={participantFilter}
              onChange={(e) => handleSelectParticipantFilter(e.target.value)}
              className="input-tutu text-xs"
            >
              <option value="all">Todos os participantes</option>
              {participantOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-tutu-light/70 mb-1">Trilha</label>
            <select
              value={trackFilter}
              onChange={(e) => setTrackFilter(e.target.value)}
              className="input-tutu text-xs"
            >
              {TRACK_OPTIONS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] text-tutu-light/70 mb-1">Missão</label>
            <select
              value={missionFilter}
              onChange={(e) => setMissionFilter(e.target.value)}
              className="input-tutu text-xs"
            >
              <option value="all">Todas as missões</option>
              {missionOptions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.title}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Lista de Evidências */}
      {filtered.length === 0 ? (
        <div className="tutu-card p-8 text-center space-y-2">
          <FileCheck className="w-8 h-8 text-tutu-lime mx-auto" />
          <h2 className="font-display font-bold text-lg text-tutu-light">
            Nenhuma evidência encontrada para os filtros selecionados
          </h2>
          <p className="text-xs text-tutu-light/70">
            Ajuste os filtros acima ou aguarde novas submissões dos participantes.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => {
            const pObj = participantMap.get(item.participantId);
            const isParticipantDisqualified = pObj?.status === 'Desclassificado';
            const canRejectAndReverse = item.status !== 'Rejeitada' && !item.reversedAt;

            return (
              <div
                key={item.id}
                className="tutu-card p-5 sm:p-6 flex flex-col lg:flex-row lg:items-start justify-between gap-5 sm:gap-6"
              >
                <div className="space-y-2.5 max-w-3xl min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`px-2.5 py-1 rounded-full font-bold ${
                        item.status === 'Aprovada'
                          ? 'bg-tutu-lime text-tutu-dark'
                          : item.status === 'Rejeitada'
                          ? 'bg-red-500/20 text-red-200 border border-red-400/40'
                          : 'bg-amber-500/20 text-amber-200 border border-amber-400/40'
                      }`}
                    >
                      {item.status === 'Pendente'
                        ? 'Pendente de Conferência'
                        : item.status === 'Aprovada'
                        ? 'Conferida e Aprovada'
                        : 'Rejeitada e Estornada'}
                    </span>

                    {isParticipantDisqualified && (
                      <span className="px-2.5 py-1 rounded-full bg-red-600/30 text-red-200 border border-red-400/50 text-[11px] font-bold">
                        Participante Desclassificado
                      </span>
                    )}

                    <span className="font-mono text-tutu-lime font-semibold">
                      Protocolo: {item.evidenceCode}
                    </span>
                    <span className="text-tutu-light/70 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 shrink-0" />
                      {item.submittedAt}
                    </span>
                  </div>

                  <h3 className="font-display font-bold text-lg sm:text-xl text-tutu-light break-words">
                    {item.participantName} —{' '}
                    <span className="text-tutu-lime">{item.missionTitle}</span>
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
                        ? `LGPD: Divulgação autorizada${
                            item.participantImageConsentVersion
                              ? ` (${item.participantImageConsentVersion})`
                              : ''
                          }`
                        : 'LGPD: Sem autorização para divulgação pública'}
                    </span>
                    {(item.sharedEvidenceCount || 0) > 1 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-400/20 text-amber-200 border border-amber-400/40">
                        <Users className="w-3 h-3 shrink-0" />
                        Foto coletiva enviada por {item.sharedEvidenceCount} participantes
                      </span>
                    )}
                  </p>

                  {/* Metadados de auditoria / conferência */}
                  {(item.reviewedBy || item.reviewedAt || item.reversedAt) && (
                    <div className="p-2.5 rounded-xl bg-tutu-dark/60 border border-tutu-secondary/40 text-[11px] text-tutu-light/75 flex flex-wrap gap-x-4 gap-y-1">
                      {item.reviewedBy && (
                        <span>
                          Conferido por: <strong className="text-tutu-light">{item.reviewedBy}</strong>
                        </span>
                      )}
                      {item.reviewedAt && (
                        <span>
                          Data/hora da conferência: <strong>{formatIsoBrasilia(item.reviewedAt)}</strong>
                        </span>
                      )}
                      {typeof item.reversedPoints === 'number' && item.reversedPoints > 0 && (
                        <span className="text-red-300 font-bold">
                          Estorno efetivo: -{formatPoints(item.reversedPoints)}
                        </span>
                      )}
                    </div>
                  )}

                  {item.status === 'Rejeitada' && item.rejectionReason && (
                    <div className="p-3 rounded-xl bg-red-500/10 border border-red-400/40 text-xs text-red-200">
                      <span className="font-bold block">Justificativa administrativa da rejeição:</span>
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

                  {item.evidenceFiles && item.evidenceFiles.length > 1 ? (
                    <div className="p-3.5 rounded-xl bg-tutu-blue/15 border border-tutu-blue/40 space-y-2.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-tutu-lime flex items-center gap-1.5">
                          <ImageIcon className="w-4 h-4 shrink-0" />
                          <span>
                            Conjunto de Evidências ({item.evidenceFiles.length} imagens na mesma conclusão)
                          </span>
                        </span>
                      </div>
                      <div className="space-y-2">
                        {item.evidenceFiles.map((ef) => {
                          const fileKey = `${item.id}:${ef.id}`;
                          return (
                            <div
                              key={ef.id}
                              className="p-2.5 rounded-lg bg-tutu-dark/70 border border-tutu-secondary/40 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="px-2 py-0.5 rounded bg-tutu-lime/15 border border-tutu-lime/40 text-tutu-lime text-[10px] font-bold shrink-0">
                                  Foto {ef.fileOrder}
                                </span>
                                <div className="min-w-0">
                                  <div className="font-semibold text-tutu-light truncate">
                                    {ef.fileName}
                                  </div>
                                  <div className="text-[11px] text-tutu-light/65">
                                    {ef.mimeType} • {formatEvidenceSize(ef.sizeBytes)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-2 shrink-0">
                                {ef.mimeType.startsWith('image/') && (
                                  <button
                                    type="button"
                                    onClick={() => handleOpenEvidence(item, 'view', ef)}
                                    disabled={loadingEvidenceId === fileKey}
                                    className="min-h-[34px] px-2.5 py-1 rounded-lg bg-tutu-lime/15 border border-tutu-lime/40 text-tutu-lime hover:bg-tutu-lime/25 text-[11px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                                  >
                                    {loadingEvidenceId === fileKey ? (
                                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                      <Eye className="w-3.5 h-3.5" />
                                    )}
                                    <span>Visualizar</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEvidence(item, 'download', ef)}
                                  disabled={loadingEvidenceId === fileKey}
                                  className="min-h-[34px] px-2.5 py-1 rounded-lg bg-tutu-dark/80 border border-tutu-secondary/50 text-tutu-light hover:border-tutu-lime text-[11px] font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                                >
                                  {loadingEvidenceId === fileKey ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Download className="w-3.5 h-3.5 text-tutu-lime" />
                                  )}
                                  <span>Baixar</span>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : item.hasFile && (
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
                                ? 'Reproduzir Vídeo'
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

                {/* Coluna de Pontuação e Ações Administrativas */}
                <div className="flex flex-col gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-tutu-secondary/30 lg:min-w-[210px]">
                  <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-tutu-dark border border-tutu-secondary/40 text-xs">
                    <span className="text-tutu-light/70">Pontuação da missão</span>
                    <span className="font-display font-bold text-sm text-tutu-lime flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 shrink-0" />+{formatPoints(item.pointsAwarded)}
                    </span>
                  </div>

                  {typeof item.reversedPoints === 'number' && item.reversedPoints > 0 && (
                    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-red-500/15 border border-red-400/40 text-xs">
                      <span className="text-red-200">Estornado</span>
                      <span className="font-display font-bold text-sm text-red-300">
                        -{formatPoints(item.reversedPoints)}
                      </span>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={() => void handleApproveEvidence(item)}
                    disabled={item.status !== 'Pendente' || approvingId === item.id}
                    className="min-h-[42px] px-4 py-2 rounded-xl btn-tutu-lime text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
                    title="Homologar evidência na conferência final sem duplicar pontos"
                  >
                    {approvingId === item.id ? (
                      <Loader2 className="w-4 h-4 shrink-0 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                    )}
                    <span>{item.status === 'Aprovada' ? 'Conferida' : 'Aprovar Conferência'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setRejectTarget(item);
                      setRejectionReason('');
                      setRejectError(null);
                    }}
                    disabled={!canRejectAndReverse}
                    className="min-h-[42px] px-4 py-2 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-400/40 text-red-200 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    <XCircle className="w-4 h-4 shrink-0" />
                    <span>{item.status === 'Rejeitada' ? 'Já Estornada' : 'Rejeitar e Estornar'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setDisqualifyTarget({
                        participantId: item.participantId,
                        participantName: item.participantName,
                      });
                      setDisqualifyReason('');
                      setDisqualifyConfirmed(false);
                      setDisqualifyError(null);
                    }}
                    disabled={isParticipantDisqualified}
                    className="min-h-[38px] px-3 py-1.5 rounded-xl bg-tutu-dark hover:bg-red-950/60 border border-red-500/35 text-red-300/90 text-[11px] font-semibold flex items-center justify-center gap-1.5 disabled:opacity-40"
                  >
                    <Ban className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {isParticipantDisqualified
                        ? 'Já Desclassificado'
                        : 'Desclassificar Participante'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Visualização Segura de Imagem / Vídeo */}
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

      {/* Modal de Rejeição e Estorno Automático */}
      {rejectTarget && (
        <div className="fixed inset-0 z-50 bg-tutu-dark/90 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={(e) => void handleConfirmReject(e)}
            className="tutu-card max-w-lg w-full p-5 sm:p-6 space-y-4 border-2 border-red-400/60"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-300 block">
                  Rejeitar Evidência e Estornar Missão
                </span>
                <h3 className="font-display font-bold text-lg text-tutu-light">
                  {rejectTarget.participantName} — {rejectTarget.missionTitle}
                </h3>
              </div>
              <button
                type="button"
                disabled={isSubmittingReject}
                onClick={() => setRejectTarget(null)}
                className="p-2 rounded-lg bg-tutu-secondary/30 text-tutu-light hover:text-tutu-lime disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-400/40 text-xs text-amber-100 leading-relaxed">
              Esta ação registrará transações compensatórias estornando exclusivamente os pontos creditados por esta missão ({formatPoints(rejectTarget.pointsAwarded)}), recalculando o Ranking Geral e o Ranking Diário sem afetar outras missões válidas.
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-tutu-light/85">
                Justificativa administrativa obrigatória (exibida ao participante) *
              </label>
              <textarea
                rows={3}
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Ex.: A foto não comprova a atividade no estande ou está ilegível."
                className="input-tutu text-xs"
              />
            </div>

            {rejectError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-400/40 text-xs text-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-300" />
                <span>{rejectError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSubmittingReject}
                onClick={() => setRejectTarget(null)}
                className="min-h-[40px] px-4 py-2 rounded-xl btn-tutu-outline text-xs disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmittingReject}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-red-500/85 hover:bg-red-500 text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingReject && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmar Rejeição e Estorno</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal de Desclassificação Administrativa (separada do estorno) */}
      {disqualifyTarget && (
        <div className="fixed inset-0 z-50 bg-tutu-dark/90 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={(e) => void handleConfirmDisqualify(e)}
            className="tutu-card max-w-lg w-full p-5 sm:p-6 space-y-4 border-2 border-red-500/70"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-red-300 block">
                  Medida Administrativa Grave • Desclassificação
                </span>
                <h3 className="font-display font-bold text-lg text-tutu-light">
                  Desclassificar {disqualifyTarget.participantName}
                </h3>
              </div>
              <button
                type="button"
                disabled={isSubmittingDisqualify}
                onClick={() => setDisqualifyTarget(null)}
                className="p-2 rounded-lg bg-tutu-secondary/30 text-tutu-light hover:text-tutu-lime disabled:opacity-40"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-red-500/15 border border-red-400/40 text-xs text-red-100 leading-relaxed">
              O participante será removido imediatamente do Ranking Geral e do Ranking Diário e ficará impedido de iniciar missões ou enviar evidências. Todo o histórico permanecerá preservado para auditoria.
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-tutu-light/85">
                Justificativa administrativa obrigatória (mínimo 5 caracteres) *
              </label>
              <textarea
                rows={3}
                required
                value={disqualifyReason}
                onChange={(e) => setDisqualifyReason(e.target.value)}
                placeholder="Ex.: Fraude recorrente identificada na conferência de evidências."
                className="input-tutu text-xs"
              />
            </div>

            <label className="flex items-start gap-2.5 text-xs text-tutu-light/90 cursor-pointer p-3 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40">
              <input
                type="checkbox"
                checked={disqualifyConfirmed}
                onChange={(e) => setDisqualifyConfirmed(e.target.checked)}
                className="mt-0.5 accent-red-500"
              />
              <span>
                Confirmo explicitamente a desclassificação administrativa deste participante e estou ciente de que a ação é registrada com meu usuário e data/hora.
              </span>
            </label>

            {disqualifyError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-400/40 text-xs text-red-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-300" />
                <span>{disqualifyError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isSubmittingDisqualify}
                onClick={() => setDisqualifyTarget(null)}
                className="min-h-[40px] px-4 py-2 rounded-xl btn-tutu-outline text-xs disabled:opacity-40"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmittingDisqualify || !disqualifyConfirmed}
                className="min-h-[40px] px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingDisqualify && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Confirmar Desclassificação</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
