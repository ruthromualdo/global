import React from 'react';
import {
  Award,
  Brain,
  CheckCircle2,
  Compass,
  Footprints,
  Globe,
  Info,
  Rocket,
  X,
  AlertCircle,
} from 'lucide-react';
import { Achievement, MissionCategory, MissionStatus } from '../types';
import { useAppStore } from '../hooks/useAppStore';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useAppStore();

  if (toasts.length === 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-3 sm:top-4 inset-x-3 sm:inset-x-auto sm:right-4 z-50 flex flex-col gap-2.5 sm:max-w-sm w-auto sm:w-full pointer-events-none"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-2xl p-3.5 sm:p-4 border shadow-xl transition-all flex items-start gap-3 ${
            toast.type === 'success'
              ? 'bg-[#10271D] border-[#C8FFD2] text-[#FFFFFF]'
              : toast.type === 'error'
              ? 'bg-[#10271D] border-[#397B55] text-[#FFFFFF]'
              : 'bg-[#10271D] border-[#397B55]/60 text-[#FFFFFF]'
          }`}
        >
          {toast.type === 'success' && (
            <CheckCircle2 className="w-5 h-5 text-[#C8FFD2] shrink-0 mt-0.5" />
          )}
          {toast.type === 'error' && (
            <AlertCircle className="w-5 h-5 text-[#C8FFD2] shrink-0 mt-0.5" />
          )}
          {toast.type === 'info' && (
            <Info className="w-5 h-5 text-[#C8FFD2] shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm text-[#FFFFFF] break-words">
              {toast.title}
            </p>
            <p className="text-xs text-[#D0DED4] mt-0.5 leading-relaxed break-words">
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => dismissToast(toast.id)}
            className="text-[#D0DED4] hover:text-[#FFFFFF] p-1.5 -mr-1 -mt-1 rounded-lg shrink-0 transition-colors"
            aria-label="Fechar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};

export const MissionStatusBadge: React.FC<{ status: MissionStatus }> = ({ status }) => {
  const styles: Record<MissionStatus, string> = {
    Concluída: 'bg-[#C8FFD2] text-[#071812] font-semibold shadow-sm',
    Disponível: 'bg-[#10271D] text-[#C8FFD2] border border-[#397B55] font-semibold',
    'Em andamento': 'bg-[#163527] text-[#DDF8E4] border border-[#C8FFD2]/50 font-semibold',
    'Aguardando validação': 'bg-[#10271D] text-[#D0DED4] border border-[#397B55]/50',
    Bloqueada: 'bg-[#071812] text-[#D0DED4]/60 border border-[#397B55]/20',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs tracking-wide whitespace-nowrap ${styles[status]}`}
    >
      {status}
    </span>
  );
};

export const CategoryPill: React.FC<{ category: MissionCategory }> = ({ category }) => {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-[#10271D] text-[#D0DED4] border border-[#397B55]/40 whitespace-nowrap">
      {category}
    </span>
  );
};

export const AchievementIcon: React.FC<{
  iconName: Achievement['iconName'];
  unlocked: boolean;
}> = ({ iconName, unlocked }) => {
  const iconClass = unlocked ? 'w-6 h-6 text-[#071812]' : 'w-6 h-6 text-[#D0DED4]/50';
  const wrapperClass = unlocked
    ? 'w-12 h-12 rounded-2xl bg-[#C8FFD2] flex items-center justify-center shrink-0 shadow-sm'
    : 'w-12 h-12 rounded-2xl bg-[#10271D] border border-[#397B55]/50 flex items-center justify-center shrink-0';

  return (
    <div className={wrapperClass}>
      {iconName === 'compass' && <Compass className={iconClass} />}
      {iconName === 'footprints' && <Footprints className={iconClass} />}
      {iconName === 'brain' && <Brain className={iconClass} />}
      {iconName === 'globe' && <Globe className={iconClass} />}
      {iconName === 'rocket' && <Rocket className={iconClass} />}
      {iconName === 'award' && <Award className={iconClass} />}
    </div>
  );
};

export const SimulatedQRMatrix: React.FC<{ code: string; size?: number }> = ({
  code,
  size = 136,
}) => {
  const seed = code.split('').reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 1), 0);
  const cells = Array.from({ length: 49 }, (_, idx) => {
    const row = Math.floor(idx / 7);
    const col = idx % 7;
    if ((row < 2 && col < 2) || (row < 2 && col > 4) || (row > 4 && col < 2)) {
      return true;
    }
    return (seed + idx * 17 + row * 13 + col * 7) % 3 !== 0;
  });

  return (
    <div
      style={{ width: size, height: size, maxWidth: '100%' }}
      className="bg-[#FFFFFF] p-3 rounded-2xl border border-[#397B55] inline-flex flex-col justify-between shrink-0 aspect-square shadow-sm"
      title={`Representação demonstrativa QR: ${code}`}
    >
      <div className="grid grid-cols-7 gap-1 w-full h-full">
        {cells.map((filled, idx) => (
          <div
            key={idx}
            className={`rounded-[2px] ${filled ? 'bg-[#071812]' : 'bg-transparent'}`}
          />
        ))}
      </div>
    </div>
  );
};
