import React, { useState } from 'react';
import {
  Edit3,
  FileText,
  FolderKanban,
  Info,
  Target,
  UserCheck,
  BarChart2,
} from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { GovernancePlan } from '../../types';

export const AdminGovernancePage: React.FC = () => {
  const { governancePlans, updateGovernancePlan } = useAppStore();
  const [editingPlan, setEditingPlan] = useState<GovernancePlan | null>(null);

  const [name, setName] = useState('');
  const [objective, setObjective] = useState('');
  const [description, setDescription] = useState('');
  const [responsible, setResponsible] = useState('');
  const [indicators, setIndicators] = useState('');
  const [status, setStatus] = useState<GovernancePlan['status']>(
    'Aguardando preenchimento oficial'
  );
  const [documentsText, setDocumentsText] = useState('');

  const openEditModal = (plan: GovernancePlan) => {
    setEditingPlan(plan);
    setName(plan.name);
    setObjective(plan.objective);
    setDescription(plan.description);
    setResponsible(plan.responsible);
    setIndicators(plan.indicators);
    setStatus(plan.status);
    setDocumentsText(plan.relatedDocuments.join('\n'));
  };

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;
    updateGovernancePlan(editingPlan.id, {
      name,
      objective,
      description,
      responsible,
      indicators,
      status,
      relatedDocuments: documentsText
        .split('\n')
        .map((d) => d.trim())
        .filter(Boolean),
    });
    setEditingPlan(null);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
          Estrutura de Gestão • Seção 7
        </span>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-tutu-light">
          Governança do Projeto — 12 Planos
        </h1>
        <p className="text-sm text-tutu-light/80 max-w-3xl">
          Estrutura oficial com os 12 planos provisórios (Plano 01 a Plano 12). Os títulos e conteúdos definitivos serão preenchidos posteriormente com base no documento oficial de governança do Desafio Global Summit 2026.
        </p>
      </div>

      {/* Governance Notice Banner */}
      <div className="p-4 rounded-2xl bg-tutu-secondary/25 border border-tutu-lime/40 flex items-start gap-3 text-xs text-tutu-light/90">
        <Info className="w-5 h-5 text-tutu-lime shrink-0 mt-0.5" />
        <div>
          <p className="font-bold text-tutu-light">
            Identificação Provisória Preservada (Plano 01 a Plano 12)
          </p>
          <p className="mt-0.5 text-tutu-light/80">
            Conforme diretriz de governança, nenhum nome ou escopo não oficial foi inventado. Utilize o botão "Preencher / Editar" em qualquer card quando o documento oficial for disponibilizado.
          </p>
        </div>
      </div>

      {/* 12 Governance Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {governancePlans.map((plan) => (
          <div
            key={plan.id}
            className="tutu-card tutu-card-hover p-6 flex flex-col justify-between space-y-5"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 border-b border-tutu-secondary/40 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-tutu-blue text-tutu-light font-display font-bold text-xs flex items-center justify-center border border-tutu-lime/40">
                    {plan.code.replace('Plano ', '')}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-tutu-lime block">
                      {plan.code}
                    </span>
                    <h2 className="font-display font-bold text-lg text-tutu-light">{plan.name}</h2>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                    plan.status === 'Validado'
                      ? 'bg-tutu-lime text-tutu-dark'
                      : plan.status === 'Em estruturação'
                      ? 'bg-tutu-blue text-tutu-light'
                      : 'bg-tutu-dark text-tutu-light/75 border border-tutu-secondary/50'
                  }`}
                >
                  {plan.status}
                </span>
              </div>

              {/* Required Visual Fields (Section 7) */}
              <div className="space-y-2.5 text-xs">
                <div className="p-2.5 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/35">
                  <span className="font-bold text-tutu-lime flex items-center gap-1 mb-0.5">
                    <Target className="w-3.5 h-3.5" /> Objetivo:
                  </span>
                  <p className="text-tutu-light/80">{plan.objective}</p>
                </div>

                <div className="p-2.5 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/35">
                  <span className="font-bold text-tutu-lime flex items-center gap-1 mb-0.5">
                    <FolderKanban className="w-3.5 h-3.5" /> Descrição:
                  </span>
                  <p className="text-tutu-light/80">{plan.description}</p>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div className="p-2.5 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/35">
                    <span className="font-bold text-tutu-lime flex items-center gap-1">
                      <UserCheck className="w-3.5 h-3.5" /> Responsável:
                    </span>
                    <span className="text-tutu-light/85 block mt-0.5">{plan.responsible}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/35">
                    <span className="font-bold text-tutu-lime flex items-center gap-1">
                      <BarChart2 className="w-3.5 h-3.5" /> Indicadores:
                    </span>
                    <span className="text-tutu-light/85 block mt-0.5">{plan.indicators}</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/35">
                  <span className="font-bold text-tutu-lime flex items-center gap-1 mb-1">
                    <FileText className="w-3.5 h-3.5" /> Documentos Relacionados:
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-tutu-light/75 space-y-0.5">
                    {plan.relatedDocuments.map((doc, i) => (
                      <li key={i}>{doc}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <button
              onClick={() => openEditModal(plan)}
              className="w-full py-2.5 px-4 rounded-xl btn-tutu-primary text-xs flex items-center justify-center gap-1.5"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Preencher / Editar {plan.code}</span>
            </button>
          </div>
        ))}
      </div>

      {/* Edit Governance Plan Modal */}
      {editingPlan && (
        <div className="fixed inset-0 z-50 bg-tutu-dark/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <form
            onSubmit={handleSavePlan}
            className="tutu-card max-w-xl w-full p-6 sm:p-8 space-y-4 border-2 border-tutu-lime"
          >
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase text-tutu-lime">
                  Governança do Projeto • {editingPlan.code}
                </span>
                <h3 className="font-display font-bold text-2xl text-tutu-light">
                  Configurar {editingPlan.code}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="text-xs text-tutu-light/70 hover:text-tutu-light"
              >
                Fechar
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-tutu-light/80 mb-1">Nome do Plano</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-tutu text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-tutu-light/80 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as GovernancePlan['status'])}
                  className="input-tutu text-xs"
                >
                  <option value="Aguardando preenchimento oficial">
                    Aguardando preenchimento oficial
                  </option>
                  <option value="Em estruturação">Em estruturação</option>
                  <option value="Validado">Validado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">Objetivo</label>
              <input
                type="text"
                required
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                className="input-tutu text-xs"
              />
            </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-tutu-light/80 mb-1">Responsável</label>
                <input
                  type="text"
                  required
                  value={responsible}
                  onChange={(e) => setResponsible(e.target.value)}
                  className="input-tutu text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-tutu-light/80 mb-1">Indicadores</label>
                <input
                  type="text"
                  required
                  value={indicators}
                  onChange={(e) => setIndicators(e.target.value)}
                  className="input-tutu text-xs"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-tutu-light/80 mb-1">
                Documentos Relacionados (1 por linha)
              </label>
              <textarea
                rows={2}
                value={documentsText}
                onChange={(e) => setDocumentsText(e.target.value)}
                className="input-tutu text-xs"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setEditingPlan(null)}
                className="px-4 py-2 rounded-xl btn-tutu-outline text-xs"
              >
                Cancelar
              </button>
              <button type="submit" className="px-5 py-2 rounded-xl btn-tutu-lime text-xs">
                Salvar {editingPlan.code}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
