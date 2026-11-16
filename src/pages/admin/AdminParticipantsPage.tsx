import React, { useState } from 'react';
import { Search, Users, Zap } from 'lucide-react';
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
    <div className="space-y-8">
      <div className="space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
          Base Demonstrativa • Seção 6.6
        </span>
        <h1 className="font-display font-bold text-3xl sm:text-4xl text-tutu-light">
          Gestão de Participantes
        </h1>
        <p className="text-sm text-tutu-light/80">
          Consulte participantes cadastrados, e-mails fictícios de controle administrativo, pontuação, missões concluídas e status.
        </p>
      </div>

      {/* Search & Filter Controls */}
      <div className="tutu-card p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-tutu-light/50 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Pesquisar por nome, apelido ou e-mail fictício..."
            className="input-tutu pl-10 text-sm"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'Todos' | ParticipantStatus)}
            className="input-tutu text-sm"
          >
            <option value="Todos">Todos os Status ({allParticipants.length})</option>
            <option value="Ativo">Ativo</option>
            <option value="Pendente">Pendente</option>
            <option value="Inativo">Inativo</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="tutu-card overflow-hidden">
        <div className="p-5 border-b border-tutu-secondary/40 flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-tutu-light flex items-center gap-2">
            <Users className="w-5 h-5 text-tutu-lime" />
            <span>Participantes Registrados ({filtered.length})</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-tutu-secondary/40 text-[11px] uppercase tracking-wider text-tutu-light/70 bg-tutu-dark/60">
                <th className="py-3.5 px-4">Nome</th>
                <th className="py-3.5 px-4">E-mail Fictício</th>
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
                    <span className="text-xs text-tutu-light/60 font-normal">({p.nickname})</span>
                  </td>
                  <td className="py-3.5 px-4 text-tutu-light/80 font-mono text-xs">{p.email}</td>
                  <td className="py-3.5 px-4 font-display font-bold text-tutu-lime">
                    <span className="inline-flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5" />
                      {formatPoints(p.points)}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-tutu-light/85">
                    {p.completedMissionsCount} missões
                  </td>
                  <td className="py-3.5 px-4 text-tutu-light/75 text-xs">{p.registeredAt}</td>
                  <td className="py-3.5 px-4">
                    <select
                      value={p.status}
                      onChange={(e) =>
                        updateParticipantStatus(p.id, e.target.value as ParticipantStatus)
                      }
                      className="bg-tutu-dark border border-tutu-secondary/60 rounded-lg px-2.5 py-1 text-xs font-bold text-tutu-lime"
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
      </div>
    </div>
  );
};
