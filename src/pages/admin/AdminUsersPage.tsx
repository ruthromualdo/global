import React, { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  Download,
  Edit3,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { adminService } from '../../services/adminService';
import { Participant, ParticipantStatus, UserRole } from '../../types';
import { downloadCsv } from '../../utils/csvExport';
import { formatBrazilianPhone, formatPoints } from '../../utils/formatters';

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  STARTUP: 'Startup',
  PARTICIPANT: 'Participante',
};

const ROLE_BADGE_STYLES: Record<UserRole, string> = {
  ADMIN: 'bg-tutu-lime/20 text-tutu-lime border-tutu-lime/50',
  STARTUP: 'bg-tutu-blue/40 text-sky-200 border-sky-400/40',
  PARTICIPANT: 'bg-tutu-secondary/25 text-tutu-light border-tutu-secondary/50',
};

export const AdminUsersPage: React.FC = () => {
  const { startups, missions, authState, notify } = useAppStore();

  const [users, setUsers] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [roleTab, setRoleTab] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'Todos' | ParticipantStatus>('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<Participant | null>(null);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('PARTICIPANT');
  const [startupId, setStartupId] = useState('');
  const [status, setStatus] = useState<ParticipantStatus>('Ativo');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const startupMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of startups) {
      map.set(s.id, s.shortName || s.name);
    }
    return map;
  }, [startups]);

  const loadUsers = async () => {
    setIsLoading(true);
    const res = await adminService.listUsers();
    setIsLoading(false);
    if (res.ok && res.data) {
      setUsers(res.data);
    } else {
      notify('Erro ao carregar usuários', res.error || 'Falha ao consultar API.', 'error');
    }
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const counts = useMemo(() => {
    return {
      ALL: users.length,
      ADMIN: users.filter((u) => (u.role || 'PARTICIPANT') === 'ADMIN').length,
      STARTUP: users.filter((u) => u.role === 'STARTUP').length,
      PARTICIPANT: users.filter((u) => (u.role || 'PARTICIPANT') === 'PARTICIPANT').length,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return users
      .filter((u) => (roleTab === 'ALL' ? true : (u.role || 'PARTICIPANT') === roleTab))
      .filter((u) => (statusFilter === 'Todos' ? true : u.status === statusFilter))
      .filter((u) => {
        if (!term) return true;
        const stName = u.startupId ? (startupMap.get(u.startupId) || '').toLowerCase() : '';
        return (
          u.name.toLowerCase().includes(term) ||
          u.email.toLowerCase().includes(term) ||
          u.nickname.toLowerCase().includes(term) ||
          stName.includes(term)
        );
      });
  }, [users, roleTab, statusFilter, searchTerm, startupMap]);

  const openCreateModal = (presetRole: UserRole = 'PARTICIPANT') => {
    setEditingUser(null);
    setName('');
    setNickname('');
    setEmail('');
    setPhone('');
    setRole(presetRole);
    setStartupId(startups[0]?.id || '');
    setStatus('Ativo');
    setPassword('');
    setFormError(null);
    setModalOpen(true);
  };

  const openEditModal = (u: Participant) => {
    setEditingUser(u);
    setName(u.name);
    setNickname(u.nickname);
    setEmail(u.email);
    setPhone(u.phone || '');
    setRole((u.role || 'PARTICIPANT') as UserRole);
    setStartupId(u.startupId || startups[0]?.id || '');
    setStatus(u.status);
    setPassword('');
    setFormError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;
    setFormError(null);

    if (!editingUser && password.length < 6) {
      setFormError('A senha inicial deve conter no mínimo 6 caracteres.');
      return;
    }
    if (editingUser && password.length > 0 && password.length < 6) {
      setFormError('A nova senha deve conter no mínimo 6 caracteres.');
      return;
    }
    if (role === 'STARTUP' && !startupId) {
      setFormError('Selecione uma startup para vincular a este perfil.');
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        nickname: nickname.trim() || undefined,
        email: email.trim().toLowerCase(),
        phone: phone.trim() || null,
        role,
        startupId: role === 'STARTUP' ? startupId : null,
        status,
        ...(password.length > 0 ? { password } : {}),
      };

      const res = editingUser
        ? await adminService.updateUser(editingUser.id, payload)
        : await adminService.createUser(payload);

      if (!res.ok || !res.data) {
        setFormError(res.error || 'Não foi possível salvar o usuário.');
        return;
      }

      notify(
        editingUser ? 'Usuário atualizado' : 'Usuário cadastrado',
        `${res.data.name} (${ROLE_LABELS[(res.data.role || 'PARTICIPANT') as UserRole]}) salvo com sucesso.`,
        'success'
      );
      setModalOpen(false);
      await loadUsers();
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleStatus = async (u: Participant) => {
    const nextStatus: ParticipantStatus = u.status === 'Ativo' ? 'Inativo' : 'Ativo';
    const res = await adminService.updateUser(u.id, { status: nextStatus });
    if (!res.ok) {
      notify('Operação bloqueada', res.error || 'Não foi possível alterar o status.', 'error');
      return;
    }
    notify('Status atualizado', `${u.name} agora está ${nextStatus}.`, 'info');
    await loadUsers();
  };

  const handleDelete = async (u: Participant) => {
    if (!window.confirm(`Deseja realmente excluir a conta de "${u.name}" (${u.email})?`)) {
      return;
    }
    const res = await adminService.deleteUser(u.id);
    if (!res.ok) {
      notify('Não foi possível excluir', res.error || 'Erro ao excluir usuário.', 'error');
      return;
    }
    notify('Usuário removido', `${u.name} foi excluído do sistema.`, 'info');
    await loadUsers();
  };

  const handleExportUsersCsv = () => {
    const suffix = roleTab === 'ALL' ? 'todos' : roleTab.toLowerCase();
    downloadCsv(
      `usuarios-${suffix}-${new Date().toISOString().slice(0, 10)}.csv`,
      [
        'ID',
        'Nome',
        'Apelido',
        'E-mail',
        'Telefone',
        'Perfil',
        'Startup Vinculada',
        'Status',
        'Pontos',
        'Missões Concluídas',
        'Data Cadastro',
      ],
      filteredUsers.map((u) => [
        u.id,
        u.name,
        u.nickname,
        u.email,
        u.phone || '',
        ROLE_LABELS[(u.role || 'PARTICIPANT') as UserRole],
        u.startupId ? startupMap.get(u.startupId) || u.startupId : '',
        u.status,
        u.points,
        u.completedMissionsCount,
        u.registeredAt,
      ])
    );
    notify('Lista exportada', `${filteredUsers.length} usuário(s) exportado(s) em CSV.`, 'success');
  };

  const handleExportStartupsCsv = () => {
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
    );
    notify('Startups exportadas', `${startups.length} startup(s) exportada(s) em CSV.`, 'success');
  };

  const handleExportMissionsCsv = () => {
    downloadCsv(
      `missoes-${new Date().toISOString().slice(0, 10)}.csv`,
      ['ID', 'Ordem', 'Título', 'Startup', 'Categoria', 'Pontos', 'Tipo', 'Ativa', 'Período'],
      missions.map((m) => [
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
    );
    notify('Missões exportadas', `${missions.length} missão(ões) exportada(s) em CSV.`, 'success');
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
            Controle de Acessos & Exportação
          </span>
          <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
            Usuários, Perfis & Listas
          </h1>
          <p className="text-xs sm:text-sm text-tutu-light/80 leading-relaxed">
            Cadastre e gerencie contas de Administradores, Startups e Participantes, e exporte listas completas em CSV.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => openCreateModal(roleTab === 'ALL' ? 'PARTICIPANT' : roleTab)}
            className="min-h-[44px] px-4 py-2.5 rounded-xl btn-tutu-lime text-xs flex items-center gap-2"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Novo Usuário</span>
          </button>
          <button
            onClick={handleExportUsersCsv}
            className="min-h-[44px] px-3.5 py-2.5 rounded-xl btn-tutu-outline text-xs flex items-center gap-2"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Exportar Usuários CSV</span>
          </button>
          <button
            onClick={handleExportStartupsCsv}
            className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-tutu-secondary/25 hover:bg-tutu-secondary/40 border border-tutu-secondary/50 text-xs text-tutu-light flex items-center gap-2"
          >
            <Building2 className="w-4 h-4 shrink-0 text-tutu-lime" />
            <span>Exportar Startups</span>
          </button>
          <button
            onClick={handleExportMissionsCsv}
            className="min-h-[44px] px-3.5 py-2.5 rounded-xl bg-tutu-secondary/25 hover:bg-tutu-secondary/40 border border-tutu-secondary/50 text-xs text-tutu-light flex items-center gap-2"
          >
            <Download className="w-4 h-4 shrink-0 text-tutu-lime" />
            <span>Exportar Missões</span>
          </button>
        </div>
      </div>

      {/* Role Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {(
          [
            { key: 'ALL', label: 'Todos os Perfis', icon: Users },
            { key: 'ADMIN', label: 'Admins', icon: ShieldCheck },
            { key: 'STARTUP', label: 'Startups', icon: Building2 },
            { key: 'PARTICIPANT', label: 'Participantes', icon: UserCheck },
          ] as const
        ).map((tab) => {
          const Icon = tab.icon;
          const active = roleTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setRoleTab(tab.key)}
              className={`p-3.5 rounded-xl border text-left transition-all flex items-center justify-between gap-2 ${
                active
                  ? 'bg-tutu-blue/40 border-tutu-lime text-tutu-light shadow-sm'
                  : 'bg-tutu-dark/70 border-tutu-secondary/40 text-tutu-light/75 hover:border-tutu-lime/40'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon className="w-4 h-4 text-tutu-lime shrink-0" />
                <span className="text-xs sm:text-sm font-semibold truncate">{tab.label}</span>
              </div>
              <span className="px-2 py-0.5 rounded-md bg-tutu-dark/80 text-tutu-lime font-bold text-xs">
                {counts[tab.key]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search & Status Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-tutu-light/50 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, e-mail, apelido ou startup..."
            className="input-tutu pl-10 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'Todos' | ParticipantStatus)}
          className="input-tutu sm:w-48 text-sm"
        >
          <option value="Todos">Todos os status</option>
          <option value="Ativo">Ativo</option>
          <option value="Pendente">Pendente</option>
          <option value="Inativo">Inativo</option>
          <option value="Desclassificado">Desclassificado</option>
        </select>
        <button
          onClick={() => void loadUsers()}
          disabled={isLoading}
          className="min-h-[44px] px-4 rounded-xl bg-tutu-secondary/25 hover:bg-tutu-secondary/40 border border-tutu-secondary/50 text-xs text-tutu-light flex items-center justify-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 text-tutu-lime ${isLoading ? 'animate-spin' : ''}`} />
          <span>Atualizar</span>
        </button>
      </div>

      {/* Users List */}
      <div className="tutu-card overflow-hidden">
        {isLoading ? (
          <div className="p-10 flex items-center justify-center gap-2 text-sm text-tutu-light/70">
            <Loader2 className="w-5 h-5 animate-spin text-tutu-lime" />
            <span>Carregando usuários...</span>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-10 text-center text-sm text-tutu-light/70">
            Nenhum usuário encontrado com os filtros atuais.
          </div>
        ) : (
          <div className="divide-y divide-tutu-secondary/30">
            {filteredUsers.map((u) => {
              const userRole = (u.role || 'PARTICIPANT') as UserRole;
              const isCurrentAdmin = authState.email?.toLowerCase() === u.email.toLowerCase();
              return (
                <div
                  key={u.id}
                  className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-tutu-secondary/10 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-tutu-secondary/40 border border-tutu-lime/40 flex items-center justify-center font-bold text-xs text-tutu-lime shrink-0">
                      {u.avatar}
                    </div>
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-sm text-tutu-light truncate">
                          {u.name}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full border text-[11px] font-semibold ${ROLE_BADGE_STYLES[userRole]}`}
                        >
                          {ROLE_LABELS[userRole]}
                        </span>
                        {u.startupId && (
                          <span className="px-2 py-0.5 rounded-full bg-tutu-dark border border-tutu-secondary/50 text-[11px] text-tutu-light/85">
                            {startupMap.get(u.startupId) || u.startupId}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            u.status === 'Ativo'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : u.status === 'Inativo' || u.status === 'Desclassificado'
                              ? 'bg-red-500/20 text-red-300'
                              : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {u.status}
                        </span>
                        {isCurrentAdmin && (
                          <span className="text-[11px] text-tutu-lime font-semibold">(Você)</span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-tutu-light/70">
                        <span>{u.email}</span>
                        {u.phone && <span>{formatBrazilianPhone(u.phone)}</span>}
                        {userRole === 'PARTICIPANT' && (
                          <span className="text-tutu-lime/90 font-medium">
                            {formatPoints(u.points)} • {u.completedMissionsCount} missões
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => openEditModal(u)}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-tutu-secondary/25 hover:bg-tutu-secondary/45 text-xs text-tutu-light flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-tutu-lime" />
                      <span>Editar / Perfil</span>
                    </button>
                    <button
                      onClick={() => void handleToggleStatus(u)}
                      disabled={isCurrentAdmin}
                      className="min-h-[38px] px-3 py-1.5 rounded-lg bg-tutu-dark border border-tutu-secondary/50 hover:border-tutu-lime/50 text-xs text-tutu-light/85 disabled:opacity-40"
                    >
                      {u.status === 'Ativo' ? 'Inativar' : 'Ativar'}
                    </button>
                    <button
                      onClick={() => void handleDelete(u)}
                      disabled={isCurrentAdmin}
                      title="Excluir usuário"
                      className="min-h-[38px] px-2.5 py-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-300 disabled:opacity-40"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <form
            onSubmit={handleSave}
            className="w-full max-w-lg tutu-card p-5 sm:p-6 space-y-4 border-2 border-tutu-lime max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display font-bold text-xl text-tutu-light">
                {editingUser ? 'Editar Usuário & Perfil' : 'Cadastrar Novo Usuário'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 rounded-lg bg-tutu-secondary/30 text-tutu-light/80 hover:text-tutu-light"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/15 border border-red-400/40 text-xs text-red-200">
                {formError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs text-tutu-light/80 mb-1">Nome Completo</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-tutu text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-tutu-light/80 mb-1">Apelido (opcional)</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="input-tutu text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-tutu-light/80 mb-1">Telefone / WhatsApp</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="input-tutu text-sm"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs text-tutu-light/80 mb-1">E-mail</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-tutu text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-tutu-light/80 mb-1">Perfil de Acesso</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="input-tutu text-sm"
                >
                  <option value="PARTICIPANT">Participante (Usuário)</option>
                  <option value="STARTUP">Startup</option>
                  <option value="ADMIN">Administrador</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-tutu-light/80 mb-1">Status</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ParticipantStatus)}
                  className="input-tutu text-sm"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Pendente">Pendente</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>

              {role === 'STARTUP' && (
                <div className="sm:col-span-2">
                  <label className="block text-xs text-tutu-light/80 mb-1">Startup Vinculada</label>
                  <select
                    required
                    value={startupId}
                    onChange={(e) => setStartupId(e.target.value)}
                    className="input-tutu text-sm"
                  >
                    <option value="">Selecione uma startup...</option>
                    {startups.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.boothNumber})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="sm:col-span-2">
                <label className="block text-xs text-tutu-light/80 mb-1">
                  {editingUser ? 'Nova Senha (deixe em branco para manter a atual)' : 'Senha Inicial (mín. 6 caracteres)'}
                </label>
                <input
                  type="password"
                  required={!editingUser}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="input-tutu text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="min-h-[42px] px-4 py-2 rounded-xl bg-tutu-secondary/25 text-xs text-tutu-light/80 hover:text-tutu-light"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="min-h-[42px] px-5 py-2 rounded-xl btn-tutu-lime text-xs flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>{editingUser ? 'Salvar Alterações' : 'Cadastrar Usuário'}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
