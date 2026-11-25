import React, { useEffect, useState } from 'react';
import { Clock, Download, Edit3, Paperclip, Plus, Power, RefreshCw, Save, Trash2, Zap } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { EvidenceRequirementType, Mission, MissionCategory, MissionStatus } from '../../types';
import { CategoryPill, MissionStatusBadge } from '../../components/UI';
import { downloadCsv } from '../../utils/csvExport';
import { formatPoints } from '../../utils/formatters';
import { apiRequestWithStatus } from '../../services/apiClient';

interface AdminTimersResponse {
  defaultTimerMinutes: number;
  minMinutes: number;
  maxMinutes: number;
  missions: {
    id: string;
    title: string;
    sequenceOrder: number;
    timerMinutes: number | null;
    effectiveTimerMinutes: number;
    source: 'individual' | 'global';
  }[];
}

export const AdminMissionsPage: React.FC = () => {
  const {
    missions,
    startups,
    createMission,
    updateMission,
    toggleMissionActive,
    deleteMission,
    notify,
  } = useAppStore();

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startupId, setStartupId] = useState(startups[0]?.id || 'st-tutu');
  const [category, setCategory] = useState<MissionCategory>('Visitação');
  const [points, setPoints] = useState(250);
  const [estimatedTime, setEstimatedTime] = useState('4 min');
  const [period, setPeriod] = useState('24 a 26/11/2026');
  const [completionCriteria, setCompletionCriteria] = useState('');
  const [status, setStatus] = useState<MissionStatus>('Disponível');
  const [timerMinutes, setTimerMinutes] = useState<string>('');
  const [missionType, setMissionType] = useState<'official' | 'extra'>('official');
  const [sequenceOrder, setSequenceOrder] = useState<number | ''>(5);
  const [trackId, setTrackId] = useState<string>('');
  const [relativeWeight, setRelativeWeight] = useState<number>(10);
  const [requiresEvidence, setRequiresEvidence] = useState<boolean>(false);
  const [evidenceType, setEvidenceType] = useState<EvidenceRequirementType>('photo');
  const [maxVideoSeconds, setMaxVideoSeconds] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');

  const TRACK_ORDER: Record<string, number> = {
    ex_devedor: 1,
    sign: 2,
    editora_escreva: 3,
    bonus: 4,
  };
  const TRACK_LABELS: Record<string, string> = {
    ex_devedor: 'Ex Devedor',
    sign: 'Sign',
    editora_escreva: 'Editora Escreva',
    bonus: 'Missões Bônus',
  };

  const sortMissionsByTrackAndSequence = (list: Mission[]): Mission[] =>
    [...list].sort((a, b) => {
      const aActive = a.active ? 0 : 1;
      const bActive = b.active ? 0 : 1;
      if (aActive !== bActive) return aActive - bActive;
      const aTrack = a.trackId ? (TRACK_ORDER[a.trackId] ?? 50) : 99;
      const bTrack = b.trackId ? (TRACK_ORDER[b.trackId] ?? 50) : 99;
      if (aTrack !== bTrack) return aTrack - bTrack;
      const startupCmp = (a.startupName || '').localeCompare(b.startupName || '');
      if (startupCmp !== 0) return startupCmp;
      const aSeq = a.sequenceOrder ?? 9999;
      const bSeq = b.sequenceOrder ?? 9999;
      if (aSeq !== bSeq) return aSeq - bSeq;
      return a.title.localeCompare(b.title);
    });

  const activeMissions = sortMissionsByTrackAndSequence(missions.filter((m) => m.active));
  const inactiveMissions = sortMissionsByTrackAndSequence(missions.filter((m) => !m.active));
  const filteredMissions =
    statusFilter === 'active'
      ? activeMissions
      : statusFilter === 'inactive'
      ? inactiveMissions
      : sortMissionsByTrackAndSequence(missions);

  const maxSequence = missions
    .filter((m) => m.sequenceOrder !== null && m.sequenceOrder !== undefined)
    .reduce((max, m) => Math.max(max, Number(m.sequenceOrder) || 0), 0);
  const nextSuggestedSequence = maxSequence + 1;

  // Estados da Configuração de Cronômetros (Etapa 3)
  const [defaultTimerMinutes, setDefaultTimerMinutes] = useState<number>(5);
  const [missionTimersMap, setMissionTimersMap] = useState<Record<string, string>>({});
  const [isSavingTimers, setIsSavingTimers] = useState<boolean>(false);
  const [isLoadingTimers, setIsLoadingTimers] = useState<boolean>(false);

  const loadTimersConfig = async () => {
    setIsLoadingTimers(true);
    const res = await apiRequestWithStatus<AdminTimersResponse>('/admin/timers');
    setIsLoadingTimers(false);
    if (res.ok && res.data) {
      setDefaultTimerMinutes(res.data.defaultTimerMinutes);
      const map: Record<string, string> = {};
      for (const m of res.data.missions) {
        map[m.id] = m.timerMinutes !== null ? String(m.timerMinutes) : '';
      }
      setMissionTimersMap(map);
    }
  };

  useEffect(() => {
    void loadTimersConfig();
  }, [missions]);

  const handleSaveTimers = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingTimers(true);

    const formattedMissionTimers: Record<string, number | null> = {};
    for (const [mId, strVal] of Object.entries(missionTimersMap)) {
      if (strVal.trim() === '') {
        formattedMissionTimers[mId] = null;
      } else {
        const val = Math.trunc(Number(strVal));
        formattedMissionTimers[mId] = isNaN(val) ? null : Math.max(1, Math.min(30, val));
      }
    }

    const res = await apiRequestWithStatus<{ success: boolean; message: string; error?: string }>(
      '/admin/timers',
      {
        method: 'PUT',
        body: JSON.stringify({
          defaultTimerMinutes: Math.max(1, Math.min(30, defaultTimerMinutes)),
          missionTimers: formattedMissionTimers,
        }),
      }
    );
    setIsSavingTimers(false);

    if (res.ok && res.data?.success) {
      notify('Cronômetros Atualizados', res.data.message, 'success');
      void loadTimersConfig();
    } else {
      notify('Erro ao Atualizar', res.error || 'Falha ao salvar cronômetros.', 'error');
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setTitle('');
    setDescription('');
    setStartupId(startups[0]?.id || 'st-tutu');
    setCategory('Visitação');
    setPoints(250);
    setEstimatedTime('4 min');
    setPeriod('24 a 26/11/2026');
    setCompletionCriteria('Leitura do QR Code no estande ou validação pela equipe.');
    setStatus('Disponível');
    setTimerMinutes('');
    setMissionType('official');
    setSequenceOrder(nextSuggestedSequence);
    setTrackId('bonus');
    setRelativeWeight(20);
    setRequiresEvidence(true);
    setEvidenceType('photo');
    setMaxVideoSeconds('');
    setShowForm(true);
  };

  const openEdit = (m: Mission) => {
    setEditingId(m.id);
    setTitle(m.title);
    setDescription(m.description);
    setStartupId(m.startupId);
    setCategory(m.category);
    setPoints(m.points);
    setEstimatedTime(m.estimatedTime);
    setPeriod(m.period);
    setCompletionCriteria(m.completionCriteria);
    setStatus(m.status);
    setTimerMinutes(m.timerMinutes !== null && m.timerMinutes !== undefined ? String(m.timerMinutes) : '');
    if (m.sequenceOrder !== null && m.sequenceOrder !== undefined) {
      setMissionType('official');
      setSequenceOrder(m.sequenceOrder);
    } else {
      setMissionType('extra');
      setSequenceOrder('');
    }
    setTrackId(m.trackId || '');
    setRelativeWeight(m.relativeWeight ?? 10);
    setRequiresEvidence(Boolean(m.requiresEvidence));
    setEvidenceType(m.evidenceType || 'photo');
    setMaxVideoSeconds(
      m.maxVideoSeconds !== null && m.maxVideoSeconds !== undefined
        ? String(m.maxVideoSeconds)
        : ''
    );
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenStartup = startups.find((s) => s.id === startupId);
    const startupName = chosenStartup ? chosenStartup.name : 'Tutu (Ex Devedor)';
    const parsedTimerMinutes =
      timerMinutes.trim() === '' ? null : Math.max(1, Math.min(30, Number(timerMinutes)));

    if (missionType === 'official') {
      if (sequenceOrder === '' || Number(sequenceOrder) < 1) {
        notify(
          'Ordem Sequencial Obrigatória',
          'Informe a posição da missão no circuito oficial (número inteiro positivo).',
          'error'
        );
        return;
      }
      const orderNum = Number(sequenceOrder);
      const duplicate = missions.find(
        (m) =>
          m.id !== editingId &&
          m.sequenceOrder === orderNum &&
          (m.trackId || '') === (trackId || '')
      );
      if (duplicate) {
        notify(
          'Posição Já Ocupada',
          `A posição ${orderNum} nesta trilha já está ocupada pela missão "${duplicate.title}". Escolha outro número ou selecione "Missão Extra".`,
          'error'
        );
        return;
      }
    }

    const parsedMaxVideo =
      maxVideoSeconds.trim() === '' ? null : Math.max(1, Math.min(300, Math.trunc(Number(maxVideoSeconds))));

    const payload = {
      title,
      description,
      startupId,
      startupName,
      category,
      points: Number(points),
      estimatedTime,
      period,
      completionCriteria,
      status,
      active: true,
      timerMinutes: parsedTimerMinutes,
      missionType,
      sequenceOrder: missionType === 'official' ? Number(sequenceOrder) : undefined,
      trackId: trackId || null,
      relativeWeight: Math.max(1, Math.trunc(Number(relativeWeight) || 10)),
      requiresEvidence,
      evidenceType: requiresEvidence ? evidenceType : undefined,
      maxVideoSeconds:
        requiresEvidence && (evidenceType === 'video' || evidenceType === 'photo_or_video')
          ? parsedMaxVideo
          : null,
    };

    setIsSubmitting(true);
    try {
      if (editingId) {
        const res = await updateMission(editingId, payload);
        if (res.ok) {
          setShowForm(false);
        }
      } else {
        const res = await createMission(payload);
        if (res.ok) {
          setShowForm(false);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
            Motor de Gamificação • Seção 6.3
          </span>
          <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
            Gestão de Missões
          </h1>
          <p className="text-xs sm:text-sm text-tutu-light/80 leading-relaxed">
            Crie, edite, exclua e configure pontuação, categoria, startup vinculada, período e critérios de conclusão.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 self-start shrink-0 w-full sm:w-auto">
          <button
            onClick={() =>
              downloadCsv(
                `missoes-${new Date().toISOString().slice(0, 10)}.csv`,
                ['ID', 'Ordem', 'Título', 'Startup', 'Categoria', 'Pontos', 'Tipo', 'Ativa', 'Período'],
                filteredMissions.map((m) => [
                  m.id,
                  m.sequenceOrder ?? '',
                  m.title,
                  m.startupName,
                  m.category,
                  m.points,
                  m.sequenceOrder !== null && m.sequenceOrder !== undefined ? 'Oficial' : 'Extra',
                  m.active ? 'Sim' : 'Não',
                  m.period,
                ])
              )
            }
            className="min-h-[44px] px-4 py-3 rounded-xl btn-tutu-outline text-xs flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Exportar CSV</span>
          </button>
          <button
            onClick={openCreate}
            className="min-h-[44px] px-5 py-3 rounded-xl btn-tutu-lime text-xs flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Criar Nova Missão</span>
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="tutu-card p-5 sm:p-8 space-y-5 border-2 border-tutu-lime"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-tutu-light">
              {editingId ? 'Editar Missão' : 'Nova Missão'}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="min-h-[38px] px-3 py-1 rounded-lg bg-tutu-secondary/30 text-xs text-tutu-light/80 hover:text-tutu-light"
            >
              Cancelar
            </button>
          </div>

          {/* Campo Obrigatório: Tipo de Missão (Circuito Oficial vs. Missão Extra) */}
          <div className="p-4 rounded-xl bg-tutu-secondary/20 border border-tutu-secondary/40 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-tutu-lime">
                Tipo de Missão *
              </label>
              <span className="text-[11px] text-tutu-muted">
                {missionType === 'official' ? 'Participa do Circuito Oficial' : 'Missão Extra / Fora do Circuito'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setMissionType('official');
                  if (sequenceOrder === '') setSequenceOrder(nextSuggestedSequence);
                }}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  missionType === 'official'
                    ? 'bg-tutu-lime/15 border-tutu-lime text-[#FFFFFF] shadow-sm'
                    : 'bg-tutu-dark/70 border-tutu-secondary/50 text-tutu-muted hover:border-tutu-lime/40'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    missionType === 'official' ? 'border-tutu-lime bg-tutu-lime' : 'border-tutu-secondary'
                  }`}
                >
                  {missionType === 'official' && <div className="w-2 h-2 rounded-full bg-[#071812]" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#FFFFFF]">Circuito Oficial</div>
                  <div className="text-[11px] text-tutu-muted mt-0.5">
                    Participa da jornada sequencial progressiva de 4+ missões das startups expositoras.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMissionType('extra');
                  setSequenceOrder('');
                }}
                className={`p-3 rounded-xl border text-left transition-all flex items-start gap-3 ${
                  missionType === 'extra'
                    ? 'bg-tutu-lime/15 border-tutu-lime text-[#FFFFFF] shadow-sm'
                    : 'bg-tutu-dark/70 border-tutu-secondary/50 text-tutu-muted hover:border-tutu-lime/40'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                    missionType === 'extra' ? 'border-tutu-lime bg-tutu-lime' : 'border-tutu-secondary'
                  }`}
                >
                  {missionType === 'extra' && <div className="w-2 h-2 rounded-full bg-[#071812]" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-[#FFFFFF]">Missão Extra</div>
                  <div className="text-[11px] text-tutu-muted mt-0.5">
                    Desafio independente. Não entra no circuito sequencial nem altera a reserva de pontos.
                  </div>
                </div>
              </button>
            </div>

            {/* Configuração Condicional da Posição Sequencial */}
            {missionType === 'official' ? (
              <div className="pt-2 border-t border-tutu-secondary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <label className="block text-xs font-semibold text-tutu-lime">
                    Ordem Sequencial no Circuito *
                  </label>
                  <span className="text-[11px] text-tutu-muted">
                    Próxima posição sugerida: <strong>{nextSuggestedSequence}</strong>. Não pode duplicar posições existentes.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    required
                    min={1}
                    value={sequenceOrder}
                    onChange={(e) =>
                      setSequenceOrder(e.target.value === '' ? '' : Math.max(1, Number(e.target.value)))
                    }
                    className="input-tutu text-xs w-24 text-center font-bold text-tutu-lime"
                  />
                  <span className="text-xs text-tutu-muted">º na sequência</span>
                </div>
              </div>
            ) : (
              <div className="p-2.5 rounded-lg bg-tutu-dark/50 border border-tutu-secondary/30 text-[11px] text-tutu-muted flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-tutu-lime/60 shrink-0" />
                <span>Esta missão não recebe ordem sequencial (sequence_order = NULL) e fica sob gestão administrativa.</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Título da Missão</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input-tutu text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Startup Relacionada</label>
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as MissionCategory)}
                className="input-tutu text-sm"
              >
                <option value="Visitação">Visitação</option>
                <option value="Experimentação">Experimentação</option>
                <option value="Quiz">Quiz</option>
                <option value="Compartilhamento">Compartilhamento</option>
                <option value="Bônus">Bônus</option>
                <option value="Missão surpresa">Missão surpresa</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Trilha</label>
              <select
                value={trackId}
                onChange={(e) => setTrackId(e.target.value)}
                className="input-tutu text-sm"
              >
                <option value="">Padrão (Circuito Geral)</option>
                <option value="ex_devedor">Ex Devedor</option>
                <option value="sign">Sign</option>
                <option value="editora_escreva">Editora Escreva</option>
                <option value="bonus">Missões Bônus</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Peso Relativo</label>
              <input
                type="number"
                required
                min={1}
                step={1}
                value={relativeWeight}
                onChange={(e) => setRelativeWeight(Math.max(1, Number(e.target.value)))}
                className="input-tutu text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Pontuação</label>
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
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Período</label>
              <input
                type="text"
                required
                value={period}
                onChange={(e) => setPeriod(e.target.value)}
                className="input-tutu text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Estado Inicial</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as MissionStatus)}
                className="input-tutu text-sm"
              >
                <option value="Disponível">Disponível</option>
                <option value="Em andamento">Em andamento</option>
                <option value="Aguardando validação">Aguardando validação</option>
                <option value="Concluída">Concluída</option>
                <option value="Bloqueada">Bloqueada</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">
                Cronômetro (1 a 30 min)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                placeholder={`Padrão (${defaultTimerMinutes} min)`}
                value={timerMinutes}
                onChange={(e) => setTimerMinutes(e.target.value)}
                className="input-tutu text-sm"
              />
              <span className="text-[10px] text-tutu-light/50">
                Deixe em branco para herdar padrão ({defaultTimerMinutes} min).
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Descrição</label>
              <textarea
                rows={2}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-tutu text-xs"
              />
            </div>
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Critérios de Conclusão</label>
              <textarea
                rows={2}
                required
                value={completionCriteria}
                onChange={(e) => setCompletionCriteria(e.target.value)}
                className="input-tutu text-xs"
              />
            </div>
          </div>

          {/* Configuração de Evidência Obrigatória (Etapa 5) */}
          <div className="p-4 rounded-xl bg-tutu-secondary/15 border border-tutu-secondary/40 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Paperclip className="w-4 h-4 text-tutu-lime shrink-0" />
                <label className="text-xs font-bold uppercase tracking-wider text-tutu-lime">
                  Comprovação por Evidência
                </label>
              </div>
              <label className="inline-flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={requiresEvidence}
                  onChange={(e) => setRequiresEvidence(e.target.checked)}
                  className="w-4 h-4 accent-tutu-lime rounded cursor-pointer"
                />
                <span className="text-xs font-semibold text-tutu-light">
                  Exige envio de evidência obrigatória
                </span>
              </label>
            </div>

            {requiresEvidence ? (
              <div className="pt-2 border-t border-tutu-secondary/30 grid grid-cols-1 sm:grid-cols-3 gap-3 items-start">
                <div>
                  <label className="block text-xs font-semibold text-tutu-light/90 mb-1">
                    Tipo de Evidência Aceita *
                  </label>
                  <select
                    value={evidenceType}
                    onChange={(e) => setEvidenceType(e.target.value as EvidenceRequirementType)}
                    className="input-tutu text-xs"
                  >
                    <option value="photo">Foto (JPG, JPEG, PNG, WEBP • 5 MB)</option>
                    <option value="print">Print de Tela (JPG, PNG, WEBP • 5 MB)</option>
                    <option value="video">Vídeo Obrigatório (MP4, MOV, WEBM • 25 MB)</option>
                    <option value="photo_or_video">Foto ou Vídeo (5 MB / 25 MB)</option>
                    <option value="text">Resposta em Texto</option>
                    <option value="file">Arquivo (PDF ou Imagem • 5 MB)</option>
                    <option value="both">Foto ou Arquivo (JPG, PNG, WEBP, PDF • 5 MB)</option>
                  </select>
                </div>
                {(evidenceType === 'video' || evidenceType === 'photo_or_video') && (
                  <div>
                    <label className="block text-xs font-semibold text-tutu-light/90 mb-1">
                      Duração Máx. do Vídeo (seg)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={300}
                      placeholder="Ex.: 60 ou 15"
                      value={maxVideoSeconds}
                      onChange={(e) => setMaxVideoSeconds(e.target.value)}
                      className="input-tutu text-xs"
                    />
                  </div>
                )}
                <div className="text-[11px] text-tutu-light/70 leading-relaxed">
                  Imagens/PDF: até <strong>5 MB</strong>. Vídeos: até <strong>25 MB</strong> com validação de duração no servidor. Os pontos só são creditados após aprovação administrativa.
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-tutu-light/60">
                Esta missão pode ser concluída sem envio de anexo (fluxo padrão).
              </p>
            )}
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
              disabled={isSubmitting}
              className="min-h-[44px] px-5 py-2.5 rounded-xl btn-tutu-lime text-xs font-semibold disabled:opacity-50"
            >
              {isSubmitting ? 'Salvando...' : editingId ? 'Salvar Missão' : 'Adicionar Missão'}
            </button>
          </div>
        </form>
      )}

      {/* Card de Configuração de Cronômetros & Bônus de Velocidade (Etapa 3) */}
      <div className="tutu-card p-5 sm:p-6 space-y-4 border border-tutu-lime/30 bg-tutu-dark/70">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-tutu-lime/10 border border-tutu-lime/30 flex items-center justify-center text-tutu-lime">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base sm:text-lg text-tutu-light">
                Configuração de Cronômetros &amp; Bônus de Velocidade
              </h2>
              <p className="text-xs text-tutu-light/70">
                Defina o tempo padrão do evento (1 a 30 min) e sobreposições individuais por missão. As alterações valem apenas para missões iniciadas após o ajuste, preservando cronômetros já iniciados e registros de dias anteriores.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadTimersConfig}
            disabled={isLoadingTimers}
            className="px-3 py-1.5 rounded-lg bg-tutu-secondary/30 text-xs text-tutu-light/80 hover:text-tutu-light flex items-center gap-1.5 self-start sm:self-auto"
            title="Recarregar do servidor"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingTimers ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </button>
        </div>

        <form onSubmit={handleSaveTimers} className="space-y-4 pt-2">
          <div className="p-3.5 rounded-xl bg-tutu-secondary/20 border border-tutu-secondary/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-tutu-lime">Tempo Padrão Global do Evento</div>
              <div className="text-[11px] text-tutu-light/60">
                Aplicado a todas as missões sem tempo individual definido. Padrão inicial: 5 min.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={30}
                required
                value={defaultTimerMinutes}
                onChange={(e) => setDefaultTimerMinutes(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
                className="input-tutu text-xs w-24 text-center font-bold text-tutu-lime"
              />
              <span className="text-xs text-tutu-light/70">minutos</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="text-xs font-semibold text-tutu-light/80">
              Tempos Individuais por Missão Ativa ({activeMissions.length} missões • Sobreposição ao padrão)
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {activeMissions.map((m) => {
                const isCustom = (missionTimersMap[m.id] ?? '').trim() !== '';
                const effective = isCustom ? Number(missionTimersMap[m.id]) : defaultTimerMinutes;
                return (
                  <div
                    key={m.id}
                    className="p-3 rounded-xl bg-tutu-secondary/10 border border-tutu-secondary/20 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-medium text-tutu-light truncate flex items-center gap-1.5">
                        <span className="truncate">{m.title}</span>
                        {m.sequenceOrder ? (
                          <span className="text-[10px] text-tutu-lime shrink-0">#{m.sequenceOrder}</span>
                        ) : (
                          <span className="text-[10px] text-tutu-muted shrink-0">(Extra)</span>
                        )}
                      </div>
                      <div className="text-[10px] text-tutu-light/50 flex items-center gap-1">
                        <span>Efetivo: <strong className="text-tutu-lime">{effective} min</strong></span>
                        <span>•</span>
                        <span>{isCustom ? 'Individual' : 'Padrão Global'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <input
                        type="number"
                        min={1}
                        max={30}
                        placeholder={String(defaultTimerMinutes)}
                        value={missionTimersMap[m.id] ?? ''}
                        onChange={(e) =>
                          setMissionTimersMap((prev) => ({
                            ...prev,
                            [m.id]: e.target.value,
                          }))
                        }
                        className="input-tutu text-xs w-16 text-center"
                      />
                      <span className="text-[11px] text-tutu-light/60">min</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isSavingTimers}
              className="min-h-[40px] px-5 py-2 rounded-xl btn-tutu-lime text-xs flex items-center gap-2 font-semibold disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>{isSavingTimers ? 'Salvando...' : 'Salvar Configurações de Cronômetro'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Filtro de Status do Catálogo (Padrão: Missões Ativas) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          {(
            [
              { id: 'active', label: 'Missões ativas', count: activeMissions.length },
              { id: 'inactive', label: 'Missões inativas', count: inactiveMissions.length },
              { id: 'all', label: 'Todas', count: missions.length },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`min-h-[40px] px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors ${
                statusFilter === tab.id
                  ? 'bg-tutu-lime text-tutu-dark'
                  : 'bg-tutu-secondary/25 text-tutu-light/80 hover:text-tutu-light border border-tutu-secondary/40'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono ${
                  statusFilter === tab.id
                    ? 'bg-tutu-dark/20 text-tutu-dark'
                    : 'bg-tutu-dark/60 text-tutu-lime'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <span className="text-xs text-tutu-light/70">
          Exibindo <strong className="text-tutu-lime">{filteredMissions.length}</strong>{' '}
          {filteredMissions.length === 1 ? 'missão' : 'missões'}
          {statusFilter === 'active'
            ? ' ativas do catálogo oficial'
            : statusFilter === 'inactive'
            ? ' inativas (histórico preservado)'
            : ` no total (${activeMissions.length} ativas, ${inactiveMissions.length} inativas)`}
        </span>
      </div>

      {/* Missions Cards */}
      <div className="space-y-4">
        {filteredMissions.length === 0 ? (
          <div className="tutu-card p-6 text-center text-xs text-tutu-light/70">
            Nenhuma missão encontrada para o filtro selecionado.
          </div>
        ) : (
          filteredMissions.map((m) => (
          <div
            key={m.id}
            className={`tutu-card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
              !m.active ? 'opacity-65 border-tutu-secondary/30' : ''
            }`}
          >
            <div className="space-y-2 max-w-3xl min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {!m.active && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/20 border border-red-400/50 text-red-200 text-[11px] font-bold uppercase tracking-wider">
                    INATIVA
                  </span>
                )}
                {m.sequenceOrder !== null && m.sequenceOrder !== undefined ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-tutu-lime/15 border border-tutu-lime/40 text-tutu-lime text-[11px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-tutu-lime" />
                    <span>
                      {m.trackId && TRACK_LABELS[m.trackId]
                        ? `${TRACK_LABELS[m.trackId]} • Etapa ${String(m.sequenceOrder).padStart(2, '0')}`
                        : `Circuito Oficial • Etapa ${String(m.sequenceOrder).padStart(2, '0')}`}
                    </span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-tutu-secondary/30 border border-tutu-secondary/50 text-[#D0DED4] text-[11px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-tutu-secondary" />
                    <span>{!m.active ? 'Catálogo Legado' : 'Missão Extra'}</span>
                  </span>
                )}
                <CategoryPill category={m.category} />
                <MissionStatusBadge status={m.status} />
                <span className="text-xs text-tutu-light/75 font-semibold">• {m.startupName}</span>
                <span className="text-xs text-tutu-light/60">({m.period})</span>
                <span className="text-xs text-tutu-light/60 flex items-center gap-1">
                  <Clock className="w-3 h-3 text-tutu-lime" />
                  {m.timerMinutes ? `${m.timerMinutes} min (individual)` : `${defaultTimerMinutes} min (padrão)`}
                </span>
                {m.requiresEvidence && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-tutu-blue/25 border border-tutu-blue/50 text-tutu-light text-[11px] font-semibold">
                    <Paperclip className="w-3 h-3 text-tutu-lime" />
                    <span>
                      Evidência:{' '}
                      {m.evidenceType === 'print'
                        ? 'Print'
                        : m.evidenceType === 'video'
                        ? `Vídeo${m.maxVideoSeconds ? ` (até ${m.maxVideoSeconds}s)` : ''}`
                        : m.evidenceType === 'photo_or_video'
                        ? `Foto ou Vídeo${m.maxVideoSeconds ? ` (até ${m.maxVideoSeconds}s)` : ''}`
                        : m.evidenceType === 'text'
                        ? 'Texto'
                        : m.evidenceType === 'file'
                        ? 'Arquivo'
                        : m.evidenceType === 'both'
                        ? 'Foto ou Arquivo'
                        : 'Foto'}
                    </span>
                  </span>
                )}
              </div>
              <h3 className="font-display font-bold text-lg text-tutu-light break-words">
                {m.title}
              </h3>
              <p className="text-xs text-tutu-light/80 leading-relaxed whitespace-pre-line">{m.description}</p>
              <p className="text-[11px] text-tutu-lime break-words">
                Critério: {m.completionCriteria}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2.5 shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-tutu-secondary/30">
              <span className="px-3 py-1.5 rounded-xl bg-tutu-dark font-display font-bold text-sm text-tutu-lime flex items-center gap-1">
                <Zap className="w-4 h-4 shrink-0" />
                {formatPoints(m.points)}
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => openEdit(m)}
                  className="min-h-[38px] px-3 py-2 rounded-xl btn-tutu-primary text-xs flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5 shrink-0" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => toggleMissionActive(m.id)}
                  className="min-h-[38px] px-3 py-2 rounded-xl btn-tutu-outline text-xs flex items-center gap-1"
                >
                  <Power className="w-3.5 h-3.5 shrink-0" />
                  <span>{m.active ? 'Desativar' : 'Ativar'}</span>
                </button>
                <button
                  onClick={() => deleteMission(m.id)}
                  className="min-w-[38px] min-h-[38px] p-2 rounded-xl bg-tutu-dark hover:bg-tutu-secondary/40 text-tutu-light/70 hover:text-tutu-lime border border-tutu-secondary/40 flex items-center justify-center"
                  title="Excluir missão"
                  aria-label={`Excluir ${m.title}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
};
