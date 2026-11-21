import React, { useEffect, useState } from 'react';
import { Clock, Zap, AlertCircle, CheckCircle } from 'lucide-react';
import { MissionStatus } from '../types';

interface MissionTimerProps {
  status: MissionStatus;
  startedAtMs?: number | null;
  durationSeconds?: number;
  targetEndAtMs?: number | null;
  serverTimeMs?: number;
  completedAtMs?: number | null;
  elapsedSeconds?: number;
  speedBonusAwarded?: number;
}

export const MissionTimer: React.FC<MissionTimerProps> = ({
  status,
  startedAtMs,
  durationSeconds = 300,
  targetEndAtMs,
  serverTimeMs,
  speedBonusAwarded = 0,
}) => {
  // Calcula o offset inicial entre o relógio local do navegador e o servidor
  const [clientOffset] = useState(() => (serverTimeMs ? serverTimeMs - Date.now() : 0));

  const calculateRemainingSeconds = (): number => {
    if (!startedAtMs) return durationSeconds;
    const effectiveTarget = targetEndAtMs ?? startedAtMs + durationSeconds * 1000;
    const nowWithOffset = Date.now() + clientOffset;
    const remainingMs = effectiveTarget - nowWithOffset;
    return Math.max(0, Math.ceil(remainingMs / 1000));
  };

  const [remainingSeconds, setRemainingSeconds] = useState<number>(calculateRemainingSeconds);

  useEffect(() => {
    if (status !== 'Em andamento' || !startedAtMs) {
      setRemainingSeconds(calculateRemainingSeconds());
      return;
    }

    setRemainingSeconds(calculateRemainingSeconds());
    const interval = setInterval(() => {
      const rem = calculateRemainingSeconds();
      setRemainingSeconds(rem);
    }, 1000);

    return () => clearInterval(interval);
  }, [status, startedAtMs, targetEndAtMs, durationSeconds]);

  const formatMMSS = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 1. Missão Concluída
  if (status === 'Concluída') {
    return (
      <div className="p-3 rounded-xl bg-tutu-dark/80 border border-tutu-lime/30 space-y-1">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-1.5 text-tutu-lime font-bold">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            Missão Concluída
          </span>
          {speedBonusAwarded > 0 ? (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-tutu-lime px-2 py-0.5 rounded-md bg-tutu-lime/10 border border-tutu-lime/20">
              <Zap className="w-3 h-3 shrink-0" />
              +{speedBonusAwarded} pts bônus
            </span>
          ) : (
            <span className="text-[11px] text-tutu-light/60">Sem bônus de velocidade</span>
          )}
        </div>
      </div>
    );
  }

  // 2. Missão Bloqueada
  if (status === 'Bloqueada') {
    return (
      <div className="p-2.5 rounded-xl bg-tutu-dark/50 border border-tutu-secondary/20 text-xs text-tutu-light/50 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          Tempo previsto: {Math.round(durationSeconds / 60)} min
        </span>
        <span className="text-[11px]">Bônus de até +50 pts</span>
      </div>
    );
  }

  // 3. Missão Disponível (Ainda não iniciada)
  if (status === 'Disponível' && !startedAtMs) {
    return (
      <div className="p-3 rounded-xl bg-tutu-dark/70 border border-tutu-secondary/30 space-y-1">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-1.5 text-tutu-light/80">
            <Clock className="w-3.5 h-3.5 text-tutu-lime shrink-0" />
            Duração: <strong className="text-tutu-light">{Math.round(durationSeconds / 60)} min</strong>
          </span>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-tutu-lime">
            <Zap className="w-3 h-3 shrink-0" />
            Até +50 pts de bônus
          </span>
        </div>
        <p className="text-[11px] text-tutu-light/60">
          O cronômetro iniciará apenas quando você clicar em iniciar missão.
        </p>
      </div>
    );
  }

  // 4. Missão Em Andamento ou Aguardando Validação
  const isExpired = remainingSeconds <= 0;
  const potentialBonus = isExpired
    ? 0
    : Math.max(0, Math.min(50, Math.round(50 * (remainingSeconds / durationSeconds))));

  const progressPercent = Math.max(0, Math.min(100, (remainingSeconds / durationSeconds) * 100));

  return (
    <div
      className={`p-3 rounded-xl border transition-all ${
        isExpired
          ? 'bg-amber-950/20 border-amber-500/30 text-amber-200/90'
          : 'bg-tutu-dark/90 border-tutu-lime/40 text-tutu-light'
      } space-y-2`}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Clock
            className={`w-4 h-4 shrink-0 ${
              isExpired ? 'text-amber-400' : 'text-tutu-lime animate-pulse'
            }`}
          />
          <span className="font-mono font-bold text-sm tracking-wider">
            {formatMMSS(remainingSeconds)}
          </span>
        </div>

        {isExpired ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20">
            <AlertCircle className="w-3 h-3 shrink-0" />
            Tempo esgotado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-tutu-lime px-2 py-0.5 rounded-md bg-tutu-lime/10 border border-tutu-lime/20">
            <Zap className="w-3 h-3 shrink-0" />
            Bônus atual: +{potentialBonus} pts
          </span>
        )}
      </div>

      {/* Barra de progresso discreta e serena */}
      {!isExpired && (
        <div className="w-full h-1.5 bg-tutu-secondary/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-tutu-lime transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {isExpired ? (
        <p className="text-[11px] text-amber-200/70 leading-tight">
          Bônus de velocidade indisponível. Conclua a missão para receber os 180 pontos normais.
        </p>
      ) : (
        <p className="text-[11px] text-tutu-light/65 leading-tight">
          Complete a atividade no estande antes do término para garantir o bônus de velocidade.
        </p>
      )}
    </div>
  );
};
