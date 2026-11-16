import React, { useState } from 'react';
import { CheckCircle2, Clock, FileCheck, XCircle, Zap } from 'lucide-react';
import { useAppStore } from '../../hooks/useAppStore';
import { formatPoints } from '../../utils/formatters';

export const AdminValidationPage: React.FC = () => {
  const { validationQueue, reviewValidationItem } = useAppStore();
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Pendente' | 'Aprovada' | 'Rejeitada'>(
    'Todos'
  );

  const filtered = validationQueue.filter((item) =>
    statusFilter === 'Todos' ? true : item.status === statusFilter
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-widest text-tutu-lime">
            Auditoria de Engajamento • Seção 6.5
          </span>
          <h1 className="font-display font-bold text-3xl sm:text-4xl text-tutu-light">
            Fila de Validação de Missões
          </h1>
          <p className="text-sm text-tutu-light/80">
            Analise as evidências enviadas pelos participantes e aprove ou rejeite a liberação de pontos.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(['Todos', 'Pendente', 'Aprovada', 'Rejeitada'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                statusFilter === st
                  ? 'bg-tutu-lime text-tutu-dark'
                  : 'bg-tutu-secondary/25 text-tutu-light/80 hover:text-tutu-light'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="tutu-card p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
          >
            <div className="space-y-2.5 max-w-3xl">
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <span
                  className={`px-2.5 py-1 rounded-full font-bold ${
                    item.status === 'Aprovada'
                      ? 'bg-tutu-lime text-tutu-dark'
                      : item.status === 'Rejeitada'
                      ? 'bg-tutu-dark text-tutu-light/60 border border-tutu-secondary/50'
                      : 'bg-tutu-blue text-tutu-light'
                  }`}
                >
                  {item.status}
                </span>
                <span className="font-mono text-tutu-lime font-semibold">
                  Protocolo: {item.evidenceCode}
                </span>
                <span className="text-tutu-light/70 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {item.submittedAt}
                </span>
              </div>

              <h3 className="font-display font-bold text-xl text-tutu-light">
                {item.participantName} — <span className="text-tutu-lime">{item.missionTitle}</span>
              </h3>
              <p className="text-xs text-tutu-light/75">
                Startup relacionada: <strong>{item.startupName}</strong>
              </p>

              <div className="p-3.5 rounded-xl bg-tutu-dark/75 border border-tutu-secondary/40 text-xs text-tutu-light/90 flex items-start gap-2.5">
                <FileCheck className="w-4 h-4 text-tutu-lime shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-tutu-lime block">Evidência Fictícia Registrada:</span>
                  <span>{item.evidenceDescription}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <span className="px-3 py-2 rounded-xl bg-tutu-dark font-display font-bold text-sm text-tutu-lime flex items-center gap-1">
                <Zap className="w-4 h-4" />+{formatPoints(item.pointsAwarded)}
              </span>

              <button
                onClick={() => reviewValidationItem(item.id, 'Aprovada')}
                disabled={item.status === 'Aprovada'}
                className="px-4 py-2.5 rounded-xl btn-tutu-lime text-xs flex items-center gap-1.5 disabled:opacity-40"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aprovar</span>
              </button>

              <button
                onClick={() => reviewValidationItem(item.id, 'Rejeitada')}
                disabled={item.status === 'Rejeitada'}
                className="px-4 py-2.5 rounded-xl btn-tutu-outline text-xs flex items-center gap-1.5 disabled:opacity-40"
              >
                <XCircle className="w-4 h-4" />
                <span>Rejeitar</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
