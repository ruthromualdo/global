import React, { useState } from 'react';
import { History, PlusCircle, Trophy, Zap } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { formatPoints } from '../../utils/formatters';

export const AdminRankingPage: React.FC = () => {
  const {
    publicRanking,
    pointsTransactions,
    allParticipants,
    adjustParticipantPointsAdmin,
  } = useAppStore();

  const [selectedParticipantId, setSelectedParticipantId] = useState(
    allParticipants[0]?.id || 'part-1794921152621'
  );
  const [pointsDelta, setPointsDelta] = useState(100);
  const [reason, setReason] = useState('Validação presencial de missão no estande');

  const handleManualAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    adjustParticipantPointsAdmin(selectedParticipantId, Number(pointsDelta), reason);
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="space-y-1.5">
        <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
          Auditoria de Pontos • Seção 6.7
        </span>
        <h1 className="font-display font-bold text-2xl sm:text-3xl lg:text-4xl text-tutu-light">
          Ranking Administrativo & Histórico de Alterações
        </h1>
        <p className="text-xs sm:text-sm text-tutu-light/80 leading-relaxed">
          Visualize a classificação consolidada, consulte a trilha de auditoria de pontos e registre lançamentos administrativos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* Ranking Consultation */}
        <div className="lg:col-span-7 tutu-card p-5 sm:p-6 space-y-4">
          <h2 className="font-display font-bold text-lg sm:text-xl text-tutu-light flex items-center gap-2">
            <Trophy className="w-5 h-5 text-tutu-lime shrink-0" />
            <span>Classificação Atual por Pontuação</span>
          </h2>

          <div className="space-y-2.5">
            {publicRanking.map((row) => (
              <div
                key={row.participantId}
                className="p-3.5 rounded-xl bg-tutu-dark/75 border border-tutu-secondary/40 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={`w-7 h-7 rounded-lg font-display font-bold text-xs flex items-center justify-center shrink-0 ${row.position <= 3
                      ? 'bg-tutu-lime text-tutu-dark'
                      : 'bg-tutu-secondary/40 text-tutu-light'
                      }`}
                  >
                    #{row.position}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-tutu-light truncate">{row.displayName}</p>
                    <p className="text-[11px] text-tutu-light/70">
                      {row.completedMissionsCount} missões • {row.medalsCount} medalhas
                    </p>
                  </div>
                </div>
                <span className="font-display font-bold text-sm sm:text-base text-tutu-lime flex items-center gap-1 shrink-0">
                  <Zap className="w-4 h-4 shrink-0" />
                  {formatPoints(row.points)}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Manual Adjustment Form & Audit Log */}
        <div className="lg:col-span-5 space-y-5 sm:space-y-6">
          <form onSubmit={handleManualAdjustment} className="tutu-card p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-tutu-lime">
              <PlusCircle className="w-4 h-4 shrink-0" />
              <span>Registrar Lançamento no Histórico</span>
            </div>

            <div>
              <label
                htmlFor="admin-adjust-participant"
                className="block text-xs text-tutu-light/80 mb-1"
              >
                Participante
              </label>
              <select
                id="admin-adjust-participant"
                value={selectedParticipantId}
                onChange={(e) => setSelectedParticipantId(e.target.value)}
                className="input-tutu text-xs"
              >
                {allParticipants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({formatPoints(p.points)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="admin-adjust-points"
                  className="block text-xs text-tutu-light/80 mb-1"
                >
                  Pontos (+)
                </label>
                <input
                  id="admin-adjust-points"
                  type="number"
                  step={50}
                  required
                  value={pointsDelta}
                  onChange={(e) => setPointsDelta(Number(e.target.value))}
                  className="input-tutu text-xs"
                />
              </div>
              <div>
                <label
                  htmlFor="admin-adjust-reason"
                  className="block text-xs text-tutu-light/80 mb-1"
                >
                  Justificativa
                </label>
                <input
                  id="admin-adjust-reason"
                  type="text"
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="input-tutu text-xs"
                />
              </div>
            </div>

            <button
              type="submit"
              className="min-h-[44px] w-full py-2.5 rounded-xl btn-tutu-lime text-xs"
            >
              Registrar Transação
            </button>
          </form>

          {/* Points Transactions History */}
          <div className="tutu-card p-5 sm:p-6 space-y-4">
            <h2 className="font-display font-bold text-lg text-tutu-light flex items-center gap-2">
              <History className="w-5 h-5 text-tutu-lime shrink-0" />
              <span>Histórico de Alterações</span>
            </h2>

            {pointsTransactions.length === 0 ? (
              <p className="text-xs text-tutu-light/65 italic">
                Nenhuma transação de pontuação registrada até o momento.
              </p>
            ) : (
              <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
                {pointsTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="p-3 rounded-xl bg-tutu-dark/75 border border-tutu-secondary/40 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-tutu-light truncate">
                        {tx.participantName}
                      </span>
                      <span className="font-bold text-tutu-lime shrink-0">
                        +{tx.pointsDelta} pts
                      </span>
                    </div>
                    <p className="text-tutu-light/80 break-words">
                      [{tx.sourceType}] {tx.sourceTitle}
                    </p>
                    <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-tutu-light/60">
                      <span>
                        Saldo: {tx.previousBalance} → {tx.newBalance} pts
                      </span>
                      <span>{tx.createdAt}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
