import React, { useState } from 'react';
import { Edit3, Plus, Power, Trash2, Zap } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { Mission, MissionCategory, MissionStatus } from '../../types';
import { CategoryPill, MissionStatusBadge } from '../../components/UI';
import { formatPoints } from '../../utils/formatters';

export const AdminMissionsPage: React.FC = () => {
  const {
    missions,
    startups,
    createMission,
    updateMission,
    toggleMissionActive,
    deleteMission,
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
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenStartup = startups.find((s) => s.id === startupId);
    const startupName = chosenStartup ? chosenStartup.name : 'Tutu (Ex Devedor)';

    if (editingId) {
      updateMission(editingId, {
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
      });
    } else {
      createMission({
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
      });
    }
    setShowForm(false);
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

        <button
          onClick={openCreate}
          className="min-h-[44px] w-full sm:w-auto px-5 py-3 rounded-xl btn-tutu-lime text-xs flex items-center justify-center gap-2 self-start shrink-0"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Criar Nova Missão</span>
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="tutu-card p-5 sm:p-8 space-y-5 border-2 border-tutu-lime"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-tutu-light">
              {editingId ? 'Editar Missão' : 'Nova Missão Oficial'}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="min-h-[38px] px-3 py-1 rounded-lg bg-tutu-secondary/30 text-xs text-tutu-light/80 hover:text-tutu-light"
            >
              Cancelar
            </button>
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
                <option value="Missão surpresa">Missão surpresa</option>
              </select>
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
              {editingId ? 'Salvar Missão' : 'Adicionar Missão'}
            </button>
          </div>
        </form>
      )}

      {/* Missions Cards */}
      <div className="space-y-4">
        {missions.map((m) => (
          <div
            key={m.id}
            className={`tutu-card p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 ${
              !m.active ? 'opacity-60' : ''
            }`}
          >
            <div className="space-y-2 max-w-3xl min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <CategoryPill category={m.category} />
                <MissionStatusBadge status={m.status} />
                <span className="text-xs text-tutu-light/75 font-semibold">• {m.startupName}</span>
                <span className="text-xs text-tutu-light/60">({m.period})</span>
              </div>
              <h3 className="font-display font-bold text-lg text-tutu-light break-words">
                {m.title}
              </h3>
              <p className="text-xs text-tutu-light/80 leading-relaxed">{m.description}</p>
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
        ))}
      </div>
    </div>
  );
};
