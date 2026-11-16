import React, { useState } from 'react';
import { Save, ShieldAlert, Settings, Building2 } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';

export const AdminSettingsPage: React.FC = () => {
  const { eventSettings, startups, updateEventSettings } = useAppStore();

  const [eventName, setEventName] = useState(eventSettings.eventName);
  const [dates, setDates] = useState(eventSettings.dates);
  const [location, setLocation] = useState(eventSettings.location);
  const [city, setCity] = useState(eventSettings.city);
  const [description, setDescription] = useState(eventSettings.description);
  const [activePeriod, setActivePeriod] = useState(eventSettings.activePeriod);
  const [scoringRulesText, setScoringRulesText] = useState(
    eventSettings.scoringRules.join('\n')
  );
  const [tieBreakerText, setTieBreakerText] = useState(
    eventSettings.tieBreakerCriteria.join('\n')
  );
  const [rewardsEnabled, setRewardsEnabled] = useState(eventSettings.rewardsEnabled);
  const [rewardsDescription, setRewardsDescription] = useState(
    eventSettings.rewardsDescription
  );

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateEventSettings({
      eventName,
      dates,
      location,
      city,
      description,
      activePeriod,
      scoringRules: scoringRulesText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      tieBreakerCriteria: tieBreakerText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      rewardsEnabled,
      rewardsDescription,
    });
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
          Parâmetros Institucionais • Seção 6.8
        </span>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-tutu-light">
          Configurações do Evento
        </h1>
        <p className="text-sm text-tutu-light/80">
          Gerencie nome, datas, local, período, regras de pontuação, critérios de desempate e governança do módulo de premiação.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* General Event Data */}
        <div className="tutu-card p-6 sm:p-8 space-y-5">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-tutu-lime">
            <Settings className="w-4 h-4" />
            <span>Dados Principais do Evento</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Nome do Evento</label>
              <input
                type="text"
                required
                value={eventName}
                onChange={(e) => setEventName(e.target.value)}
                className="input-tutu text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Datas Oficiais</label>
              <input
                type="text"
                required
                value={dates}
                onChange={(e) => setDates(e.target.value)}
                className="input-tutu text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Local / Arena</label>
              <input
                type="text"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="input-tutu text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Cidade / UF</label>
              <input
                type="text"
                required
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="input-tutu text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Período de Pontuação</label>
              <input
                type="text"
                required
                value={activePeriod}
                onChange={(e) => setActivePeriod(e.target.value)}
                className="input-tutu text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-tutu-light/80 mb-1">Descrição Institucional</label>
            <textarea
              rows={2}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input-tutu text-xs"
            />
          </div>
        </div>

        {/* Startups Vinculadas & Regras */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="tutu-card p-6 space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-tutu-lime">
              Regras de Pontuação (1 por linha)
            </label>
            <textarea
              rows={5}
              value={scoringRulesText}
              onChange={(e) => setScoringRulesText(e.target.value)}
              className="input-tutu text-xs leading-relaxed"
            />
          </div>

          <div className="tutu-card p-6 space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-tutu-lime">
              Critérios de Desempate (1 por linha)
            </label>
            <textarea
              rows={5}
              value={tieBreakerText}
              onChange={(e) => setTieBreakerText(e.target.value)}
              className="input-tutu text-xs leading-relaxed"
            />
          </div>
        </div>

        {/* Startups Overview */}
        <div className="tutu-card p-6 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-tutu-lime">
            <Building2 className="w-4 h-4" />
            <span>Startups Vinculadas ao Evento ({startups.length})</span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            {startups.map((st) => (
              <span
                key={st.id}
                className="px-3 py-1.5 rounded-xl bg-tutu-dark border border-tutu-secondary/50 text-xs font-semibold text-tutu-light"
              >
                {st.name} ({st.active ? 'Ativa' : 'Inativa'})
              </span>
            ))}
          </div>
        </div>

        {/* Premiação — Começa Desabilitada (Section 6.8) */}
        <div className="tutu-card p-6 sm:p-8 space-y-5 border-2 border-tutu-blue">
          <div className="flex items-start gap-3">
            <ShieldAlert className="w-6 h-6 text-tutu-lime shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h2 className="font-display font-bold text-xl text-tutu-light">
                Configuração de Premiação & Validação Jurídica
              </h2>
              <p className="text-xs text-tutu-light/80 leading-relaxed">
                {eventSettings.rewardsLegalNote}
              </p>
            </div>
          </div>

          <label className="flex items-center gap-3 p-4 rounded-xl bg-tutu-dark border border-tutu-secondary/60 cursor-pointer">
            <input
              type="checkbox"
              checked={rewardsEnabled}
              onChange={(e) => setRewardsEnabled(e.target.checked)}
              className="accent-tutu-lime w-5 h-5"
            />
            <div className="text-xs">
              <span className="font-bold text-tutu-light block">
                Habilitar exibição pública de premiação (Requer autorização formal e jurídica)
              </span>
              <span className="text-tutu-light/70">
                Status atual:{' '}
                <strong className="text-tutu-lime">
                  {rewardsEnabled ? 'Habilitada (Demonstração)' : 'Desabilitada (Padrão Seguro)'}
                </strong>{' '}
                — Nenhum sorteio automático é realizado.
              </span>
            </div>
          </label>

          <div>
            <label className="block text-xs text-tutu-light/80 mb-1">
              Descrição da Premiação (Exibida apenas quando autorizada)
            </label>
            <input
              type="text"
              value={rewardsDescription}
              onChange={(e) => setRewardsDescription(e.target.value)}
              disabled={!rewardsEnabled}
              className="input-tutu text-xs disabled:opacity-50"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-3.5 rounded-xl btn-tutu-lime text-sm flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            <span>Salvar Configurações do Evento</span>
          </button>
        </div>
      </form>
    </div>
  );
};
