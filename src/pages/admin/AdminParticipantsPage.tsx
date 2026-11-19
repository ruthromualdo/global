import React, { useState } from 'react';
import { Calendar, CheckCircle2, Mail, Search, Users, Zap } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { ParticipantStatus } from '../../types';
import { formatPoints } from '../../utils/formatters';

export const AdminParticipantsPage: React.FC = () => {
  const { allParticipants, updateParticipantStatus } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | ParticipantStatus>('Todos');

  const filtered = allParticipants
    .filter((p) => (statusFilter === 'Todos' ? true : p.status === statusFilter))
    .filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.nickname.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
          Base de Participantes • Seção 6.6
        </span>
        <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
          Gestão de Participantes
        </h1>
        <p className="text-xs sm:text-sm text-tutu-light/80 leading-relaxed">
          Consulte participantes cadastrados, e-mails, pontuação, missões concluídas e gerencie o status de cada conta.
        </p>
      </div>

      {/* Search & Filter Controls */}
      <div className="tutu-card p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-tutu-light/50 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome, apelido ou e-mail..."
            aria-label="Pesquisar participantes"
            className="input-tutu pl-10 text-sm"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'Todos' | ParticipantStatus)}
            aria-label="Filtrar por status do participante"
            className="input-tutu text-sm"
          >
            <option value="Todos">Todos os Status ({allParticipants.length})</option>
            <option value="Ativo">Ativo</option>
            <option value="Pendente">Pendente</option>
            <option value="Inativo">Inativo</option>
          </select>
        </div>
      </div>

      {/* Responsive Container: Stacked Cards on Mobile (<768px) & Table on Tablet/Desktop (>=768px) */}
      <div className="tutu-card overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-tutu-secondary/40 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display font-bold text-lg text-tutu-light flex items-center gap-2">
            <Users className="w-5 h-5 text-tutu-lime shrink-0" />
            <span>Participantes Registrados ({filtered.length})</span>
          </h2>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-tutu-light/70">
            Nenhum participante encontrado para os filtros aplicados.
          </div>
        ) : (
          <>
            {/* Mobile View (<768px): Cards */}
            <div className="md:hidden divide-y divide-tutu-secondary/30">
              {filtered.map((p) => (
                <div key={p.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-tutu-light break-words">
                        {p.name}{' '}
                        <span className="text-xs text-tutu-light/60 font-normal">
                          ({p.nickname})
                        </span>
                      </p>
                      <p className="text-xs text-tutu-light/80 font-mono break-all flex items-center gap-1.5 mt-1">
                        <Mail className="w-3.5 h-3.5 text-tutu-lime shrink-0" />
                        <span>{p.email}</span>
                      </p>
                    </div>
                    <span className="font-display font-bold text-sm text-tutu-lime inline-flex items-center gap-1 shrink-0">
                      <Zap className="w-3.5 h-3.5 shrink-0" />
                      {formatPoints(p.points)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-tutu-light/75">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-tutu-lime" />
                      {p.completedMissionsCount} missões
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-tutu-lime" />
                      {p.registeredAt}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-tutu-secondary/25 flex items-center justify-between gap-3">
                    <span className="text-xs text-tutu-light/70 font-medium">Status da Conta:</span>
                    <select
                      value={p.status}
                      onChange={(e) =>
                        updateParticipantStatus(p.id, e.target.value as ParticipantStatus)
                      }
                      aria-label={`Alterar status de ${p.name}`}
                      className="min-h-[40px] bg-tutu-dark border border-tutu-secondary/60 rounded-xl px-3 py-1.5 text-xs font-bold text-tutu-lime"
                    >
                      <option value="Ativo">Ativo</option>
                      <option value="Pendente">Pendente</option>
                      <option value="Inativo">Inativo</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>

            {/* Tablet & Desktop View (>=768px): Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-tutu-secondary/40 text-[11px] uppercase tracking-wider text-tutu-light/70 bg-tutu-dark/60">
                    <th className="py-3.5 px-4">Nome</th>
                    <th className="py-3.5 px-4">E-mail</th>
                    <th className="py-3.5 px-4">Pontuação</th>
                    <th className="py-3.5 px-4">Missões Concluídas</th>
                    <th className="py-3.5 px-4">Data de Cadastro</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-tutu-secondary/30 text-xs sm:text-sm">
                  {filtered.map((p) => (
                    <tr key={p.id} className="hover:bg-tutu-secondary/15">
                      <td className="py-3.5 px-4 font-semibold text-tutu-light">
                        {p.name}{' '}
                        <span className="text-xs text-tutu-light/60 font-normal">
                          ({p.nickname})
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-tutu-light/80 font-mono text-xs">
                        {p.email}
                      </td>
                      <td className="py-3.5 px-4 font-display font-bold text-tutu-lime whitespace-nowrap">
                        <span className="inline-flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5" />
                          {formatPoints(p.points)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-tutu-light/85 whitespace-nowrap">
                        {p.completedMissionsCount} missões
                      </td>
                      <td className="py-3.5 px-4 text-tutu-light/75 text-xs whitespace-nowrap">
                        {p.registeredAt}
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={p.status}
                          onChange={(e) =>
                            updateParticipantStatus(p.id, e.target.value as ParticipantStatus)
                          }
                          aria-label={`Alterar status de ${p.name}`}
                          className="bg-tutu-dark border border-tutu-secondary/60 rounded-lg px-2.5 py-1.5 text-xs font-bold text-tutu-lime"
                        >
                          <option value="Ativo">Ativo</option>
                          <option value="Pendente">Pendente</option>
                          <option value="Inativo">Inativo</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
