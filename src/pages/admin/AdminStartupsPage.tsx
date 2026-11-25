import React, { useState } from 'react';
import {
  Download,
  Edit3,
  Plus,
  Power,
  Trash2,
  Zap,
} from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { Startup } from '../../types';
import { StartupAvatarBadge } from '../../assets/logos';
import { downloadCsv } from '../../utils/csvExport';
import { formatPoints } from '../../utils/formatters';

export const AdminStartupsPage: React.FC = () => {
  const {
    startups,
    createStartup,
    updateStartup,
    toggleStartupActive,
    deleteStartup,
  } = useAppStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [tagline, setTagline] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [solutionPresentation, setSolutionPresentation] = useState('');
  const [boothNumber, setBoothNumber] = useState('Pavilhão Inovação — Estande D02');
  const [logoText, setLogoText] = useState('NOVA');
  const [availablePoints, setAvailablePoints] = useState(800);

  const openCreate = () => {
    setEditingId(null);
    setName('');
    setShortName('');
    setTagline('');
    setCategory('Inovação & Ecossistema');
    setDescription('');
    setSolutionPresentation('');
    setBoothNumber('Pavilhão Inovação — Estande D02');
    setLogoText('START');
    setAvailablePoints(800);
    setShowForm(true);
  };

  const openEdit = (st: Startup) => {
    setEditingId(st.id);
    setName(st.name);
    setShortName(st.shortName);
    setTagline(st.tagline);
    setCategory(st.category);
    setDescription(st.description);
    setSolutionPresentation(st.solutionPresentation);
    setBoothNumber(st.boothNumber);
    setLogoText(st.logoText);
    setAvailablePoints(st.availablePoints);
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updateStartup(editingId, {
        name,
        shortName: shortName || name,
        tagline,
        category,
        description,
        solutionPresentation,
        boothNumber,
        logoText,
        availablePoints: Number(availablePoints),
      });
    } else {
      createStartup({
        name,
        shortName: shortName || name,
        tagline: tagline || 'Inovação conectada no evento.',
        category,
        description,
        solutionPresentation,
        boothNumber,
        logoText: logoText || 'START',
        availablePoints: Number(availablePoints),
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
            Curadoria de Expositores • Seção 6.2
          </span>
          <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
            Gestão de Startups
          </h1>
          <p className="text-xs sm:text-sm text-tutu-light/80 leading-relaxed">
            Cadastre novas startups, personalize a Startup Convidada, configure logotipos, descrições, categorias e status de ativação.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5 self-start shrink-0 w-full sm:w-auto">
          <button
            onClick={() =>
              downloadCsv(
                `startups-${new Date().toISOString().slice(0, 10)}.csv`,
                ['ID', 'Nome', 'Nome Curto', 'Categoria', 'Estande', 'Pontos Disponíveis', 'Ativa', 'Website', 'Instagram'],
                startups.map((s) => [
                  s.id,
                  s.name,
                  s.shortName,
                  s.category,
                  s.boothNumber,
                  s.availablePoints,
                  s.active ? 'Sim' : 'Não',
                  s.website || '',
                  s.instagramUrl || '',
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
            <span>Cadastrar Nova Startup</span>
          </button>
        </div>
      </div>

      {/* Form Panel */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="tutu-card p-5 sm:p-8 space-y-5 border-2 border-tutu-lime"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display font-bold text-xl sm:text-2xl text-tutu-light">
              {editingId ? 'Editar Startup Expositora' : 'Nova Startup no Circuito'}
            </h2>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="min-h-[38px] px-3 py-1 rounded-lg bg-tutu-secondary/30 text-xs text-tutu-light/80 hover:text-tutu-light"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs text-tutu-light/80 mb-1">Nome da Startup</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: AgroTech Brasil"
                className="input-tutu text-sm"
              />
            </div>

            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">
                Sigla / Logotipo Visual (até 8 letras)
              </label>
              <input
                type="text"
                required
                maxLength={8}
                value={logoText}
                onChange={(e) => setLogoText(e.target.value.toUpperCase())}
                className="input-tutu text-sm font-mono uppercase"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Categoria / Área</label>
              <input
                type="text"
                required
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="input-tutu text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Localização / Estande</label>
              <input
                type="text"
                required
                value={boothNumber}
                onChange={(e) => setBoothNumber(e.target.value)}
                className="input-tutu text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Pontuação Disponível</label>
              <input
                type="number"
                required
                min={50}
                step={50}
                value={availablePoints}
                onChange={(e) => setAvailablePoints(Number(e.target.value))}
                className="input-tutu text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-tutu-light/80 mb-1">Frase de Destaque (Tagline)</label>
            <input
              type="text"
              required
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="input-tutu text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Descrição Institucional</label>
              <textarea
                rows={3}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input-tutu text-xs"
              />
            </div>
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Apresentação da Solução</label>
              <textarea
                rows={3}
                required
                value={solutionPresentation}
                onChange={(e) => setSolutionPresentation(e.target.value)}
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
              {editingId ? 'Salvar Alterações' : 'Confirmar Cadastro'}
            </button>
          </div>
        </form>
      )}

      {/* Startups List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
        {startups.map((st) => (
          <div
            key={st.id}
            className={`tutu-card p-5 sm:p-6 flex flex-col justify-between space-y-5 ${
              !st.active ? 'opacity-65' : ''
            }`}
          >
            <div className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <StartupAvatarBadge
                    logoText={st.logoText}
                    logoPath={st.logoPath}
                    name={st.name}
                    isGuest={st.isConfigurableGuest}
                  />
                  <div className="min-w-0">
                    <span className="text-xs font-bold text-tutu-lime block">{st.category}</span>
                    <h3 className="font-display font-bold text-lg sm:text-xl text-tutu-light break-words">
                      {st.name}
                    </h3>
                    <p className="text-xs text-tutu-light/70 break-words">{st.boothNumber}</p>
                  </div>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                    st.active
                      ? 'bg-tutu-lime text-tutu-dark'
                      : 'bg-tutu-dark text-tutu-light/60 border border-tutu-secondary/40'
                  }`}
                >
                  {st.active ? 'Ativa' : 'Desativada'}
                </span>
              </div>

              <p className="text-xs text-tutu-light/85 leading-relaxed">{st.description}</p>
              <div className="p-3 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/40 text-xs text-tutu-light/80 leading-relaxed">
                <strong className="text-tutu-lime">Solução:</strong> {st.solutionPresentation}
              </div>
            </div>

            <div className="pt-3 border-t border-tutu-secondary/40 flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-xs font-bold text-tutu-lime flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 shrink-0" />
                {formatPoints(st.availablePoints)}
              </span>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => openEdit(st)}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg btn-tutu-primary text-xs flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5 shrink-0" />
                  <span>Editar</span>
                </button>
                <button
                  onClick={() => toggleStartupActive(st.id)}
                  className="min-h-[38px] px-3 py-1.5 rounded-lg btn-tutu-outline text-xs flex items-center gap-1"
                >
                  <Power className="w-3.5 h-3.5 shrink-0" />
                  <span>{st.active ? 'Desativar' : 'Ativar'}</span>
                </button>
                <button
                  onClick={() => deleteStartup(st.id)}
                  className="min-w-[38px] min-h-[38px] p-1.5 rounded-lg bg-tutu-dark/80 hover:bg-tutu-secondary/40 text-tutu-light/70 hover:text-tutu-lime border border-tutu-secondary/40 flex items-center justify-center"
                  title="Excluir startup"
                  aria-label={`Excluir ${st.name}`}
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
