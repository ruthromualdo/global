import React, { useEffect, useMemo, useState } from 'react';
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
  completionPoints?: number;
  maxSpeedBonus?: number;
  potentialSpeedBonus?: number;
  compact?: boolean;
}

export const MissionTimer: React.FC<MissionTimerProps> = ({
  status,
  startedAtMs,
  durationSeconds = 300,
  targetEndAtMs,
  serverTimeMs,
  speedBonusAwarded = 0,
  maxSpeedBonus,
  potentialSpeedBonus: backendPotentialSpeedBonus,
  compact = false,
}) => {
  // Recalcula o deslocamento de relógio sempre que o servidor devolver um novo serverTimeMs
  const clientOffset = useMemo(
    () => (serverTimeMs ? serverTimeMs - Date.now() : 0),
    [serverTimeMs]
  );

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
  }, [status, startedAtMs, targetEndAtMs, durationSeconds, clientOffset]);

  const formatMMSS = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // 1. Missão Concluída
  if (status === 'Concluída') {
    return (
      <div className="p-3 rounded-xl bg-tutu-dark border border-[#C8FFD2]/40 space-y-1">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-1.5 text-[#C8FFD2] font-bold">
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            Missão Concluída
          </span>
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
            {speedBonusAwarded > 0 ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-[#C8FFD2] px-2 py-0.5 rounded-md bg-[#C8FFD2]/15 border border-[#C8FFD2]/30">
                <Zap className="w-3 h-3 shrink-0" />
                +{speedBonusAwarded} pts bônus
              </span>
            ) : (
              <span className="text-[11px] text-[#D0DED4]">Sem bônus de velocidade</span>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 2. Missão Bloqueada
  if (status === 'Bloqueada') {
    return (
      <div className="p-2.5 rounded-xl bg-tutu-dark border border-tutu-blue/20 text-xs text-[#D0DED4] flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          Cronômetro bloqueado
        </span>
        <span className="text-[11px] opacity-75">Aguardando desbloqueio</span>
      </div>
    );
  }

  // 3. Missão Disponível (Ainda não iniciada)
  if (status === 'Disponível' && !startedAtMs) {
    const hasBonus = maxSpeedBonus !== undefined ? maxSpeedBonus > 0 : true;
    return (
      <div className="p-3 rounded-xl bg-tutu-dark border border-tutu-blue/30 space-y-1">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-1.5 text-[#FFFFFF]">
            <Clock className="w-3.5 h-3.5 text-[#C8FFD2] shrink-0" />
            Duração: <strong className="text-[#FFFFFF]">{Math.round(durationSeconds / 60)} min</strong>
          </span>
          {hasBonus ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#DDF8E4]">
              <Zap className="w-3 h-3 shrink-0" />
              {maxSpeedBonus !== undefined
                ? `Até +${maxSpeedBonus} pts de bônus`
                : 'Bônus de velocidade disponível'}
            </span>
          ) : (
            <span className="text-[11px] text-[#D0DED4]">Sem bônus de velocidade</span>
          )}
        </div>
        <p className="text-[11px] text-[#D0DED4]">
          O cronômetro iniciará quando você clicar em iniciar missão.
        </p>
      </div>
    );
  }

  // 3.5. Missão Aguardando Validação (Tempo congelado no servidor)
  if (status === 'Aguardando validação') {
    return (
      <div className="p-3 rounded-xl bg-tutu-dark border border-tutu-blue/50 space-y-1">
        <div className="flex items-center justify-between gap-2 text-xs">
          <span className="flex items-center gap-1.5 text-tutu-lime font-bold">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            Cronômetro pausado • Aguardando análise
          </span>
          {backendPotentialSpeedBonus !== undefined && backendPotentialSpeedBonus > 0 && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#C8FFD2] px-2 py-0.5 rounded-md bg-[#C8FFD2]/10 border border-[#C8FFD2]/30">
              <Zap className="w-3 h-3 shrink-0" />
              Bônus preservado: +{backendPotentialSpeedBonus} pts
            </span>
          )}
        </div>
        <p className="text-[11px] text-[#D0DED4] leading-tight">
          Seu tempo foi congelado no envio da evidência. Enquanto aguarda aprovação, você pode avançar em outra trilha.
        </p>
      </div>
    );
  }

  // 4. Missão Em Andamento — bônus potencial recalculado a cada segundo a partir do tempo restante real
  const isExpired = remainingSeconds <= 0;
  const effectiveMaxBonus = maxSpeedBonus ?? 0;

  const potentialBonus = isExpired
    ? 0
    : effectiveMaxBonus > 0 && durationSeconds > 0
    ? Math.max(
        0,
        Math.min(effectiveMaxBonus, Math.round(effectiveMaxBonus * (remainingSeconds / durationSeconds)))
      )
    : 0;

  const progressPercent = Math.max(0, Math.min(100, (remainingSeconds / durationSeconds) * 100));

  if (compact) {
    return (
      <div
        className={`px-3 py-2 rounded-xl border ${
          isExpired
            ? 'bg-tutu-dark border-tutu-blue/40 text-[#D0DED4]'
            : 'bg-tutu-dark border-[#C8FFD2]/50 text-[#FFFFFF]'
        } space-y-1.5`}
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5">
            <Clock
              className={`w-3.5 h-3.5 shrink-0 ${
                isExpired ? 'text-[#D0DED4]' : 'text-[#C8FFD2] animate-pulse'
              }`}
            />
            <span className="text-[11px] text-[#D0DED4]">Tempo restante:</span>
            <span className="font-mono font-bold text-sm tracking-wider text-[#FFFFFF]">
              {formatMMSS(remainingSeconds)}
            </span>
          </div>
          {isExpired ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#D0DED4] px-2 py-0.5 rounded-md bg-tutu-secondary border border-tutu-blue/40">
              <AlertCircle className="w-3 h-3 shrink-0" />
              Tempo esgotado
            </span>
          ) : effectiveMaxBonus > 0 ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#071812] px-2 py-0.5 rounded-md bg-[#C8FFD2]">
              <Zap className="w-3 h-3 shrink-0" />
              Bônus: +{potentialBonus} pts
            </span>
          ) : null}
        </div>
        {!isExpired && (
          <div className="w-full h-1 bg-tutu-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-[#C8FFD2] transition-all duration-1000 ease-linear rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      className={`p-3 rounded-xl border transition-all ${
        isExpired
          ? 'bg-tutu-dark border-tutu-blue/40 text-[#D0DED4]'
          : 'bg-tutu-dark border-[#C8FFD2]/50 text-[#FFFFFF]'
      } space-y-2`}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2">
          <Clock
            className={`w-4 h-4 shrink-0 ${
              isExpired ? 'text-[#D0DED4]' : 'text-[#C8FFD2] animate-pulse'
            }`}
          />
          <span className="font-mono font-bold text-sm tracking-wider text-[#FFFFFF]">
            {formatMMSS(remainingSeconds)}
          </span>
        </div>

        {isExpired ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D0DED4] px-2 py-0.5 rounded-md bg-tutu-secondary border border-tutu-blue/40">
            <AlertCircle className="w-3 h-3 shrink-0" />
            Tempo esgotado
          </span>
        ) : effectiveMaxBonus > 0 ? (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#071812] px-2 py-0.5 rounded-md bg-[#C8FFD2] border border-[#C8FFD2]">
            <Zap className="w-3 h-3 shrink-0" />
            Bônus atual: +{potentialBonus} pts
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#D0DED4] px-2 py-0.5 rounded-md bg-tutu-secondary border border-tutu-blue/40">
            Sem bônus de velocidade
          </span>
        )}
      </div>

      {/* Barra de progresso discreta e serena */}
      {!isExpired && (
        <div className="w-full h-1.5 bg-tutu-secondary rounded-full overflow-hidden border border-tutu-blue/30">
          <div
            className="h-full bg-[#C8FFD2] transition-all duration-1000 ease-linear rounded-full"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {isExpired ? (
        <p className="text-[11px] text-[#D0DED4] leading-tight">
          Bônus de velocidade indisponível. Você ainda pode concluir a missão normalmente.
        </p>
      ) : (
        <p className="text-[11px] text-[#D0DED4] leading-tight">
          {effectiveMaxBonus > 0
            ? `Complete a missão dentro do prazo para ganhar até +${effectiveMaxBonus} pontos de bônus por agilidade!`
            : 'Complete a missão e envie sua evidência para avançar.'}
        </p>
      )}
    </div>
  );
};
