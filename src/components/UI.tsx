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
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto rounded-2xl p-4 border shadow-xl transition-all flex items-start gap-3 ${
            toast.type === 'success'
              ? 'bg-tutu-dark border-tutu-lime text-tutu-light'
              : toast.type === 'error'
              ? 'bg-tutu-dark border-tutu-blue text-tutu-light'
              : 'bg-tutu-secondary border-tutu-light/30 text-tutu-light'
          }`}
        >
          {toast.type === 'success' && (
            <CheckCircle2 className="w-5 h-5 text-tutu-lime shrink-0 mt-0.5" />
          )}
          {toast.type === 'error' && (
            <AlertCircle className="w-5 h-5 text-tutu-lime shrink-0 mt-0.5" />
          )}
          {toast.type === 'info' && (
            <Info className="w-5 h-5 text-tutu-lime shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-sm text-tutu-light">{toast.title}</p>
            <p className="text-xs text-tutu-light/85 mt-0.5 leading-relaxed">{toast.message}</p>
          </div>
          <button
            onClick={() => dismissToast(toast.id)}
            className="text-tutu-light/60 hover:text-tutu-light p-1"
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
    Concluída: 'bg-tutu-lime text-tutu-dark font-bold',
    Disponível: 'bg-tutu-blue text-tutu-light font-semibold',
    'Em andamento': 'bg-tutu-secondary text-tutu-lime border border-tutu-lime/40 font-semibold',
    'Aguardando validação': 'bg-tutu-light/15 text-tutu-light border border-tutu-light/30',
    Bloqueada: 'bg-tutu-dark/80 text-tutu-light/50 border border-tutu-light/15',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs tracking-wide ${styles[status]}`}
    >
      {status}
    </span>
  );
};

export const CategoryPill: React.FC<{ category: MissionCategory }> = ({ category }) => {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-tutu-secondary/40 text-tutu-light border border-tutu-blue/40">
      {category}
    </span>
  );
};

export const AchievementIcon: React.FC<{
  iconName: Achievement['iconName'];
  unlocked: boolean;
}> = ({ iconName, unlocked }) => {
  const iconClass = unlocked ? 'w-6 h-6 text-tutu-dark' : 'w-6 h-6 text-tutu-light/50';
  const wrapperClass = unlocked
    ? 'w-12 h-12 rounded-2xl bg-tutu-lime flex items-center justify-center shrink-0'
    : 'w-12 h-12 rounded-2xl bg-tutu-secondary/30 border border-tutu-secondary/60 flex items-center justify-center shrink-0';

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
  // Gera uma matriz determinística 7x7 baseada no código para visualização demonstrativa
  const seed = code.split('').reduce((acc, ch, i) => acc + ch.charCodeAt(0) * (i + 1), 0);
  const cells = Array.from({ length: 49 }, (_, idx) => {
    const row = Math.floor(idx / 7);
    const col = idx % 7;
    // Cantos de posicionamento de QR Code
    if ((row < 2 && col < 2) || (row < 2 && col > 4) || (row > 4 && col < 2)) {
      return true;
    }
    return (seed + idx * 17 + row * 13 + col * 7) % 3 !== 0;
  });

  return (
    <div
      style={{ width: size, height: size }}
      className="bg-tutu-light p-3 rounded-2xl border-2 border-tutu-blue inline-flex flex-col justify-between shrink-0"
      title={`Representação demonstrativa QR: ${code}`}
    >
      <div className="grid grid-cols-7 gap-1 w-full h-full">
        {cells.map((filled, idx) => (
          <div
            key={idx}
            className={`rounded-[2px] ${filled ? 'bg-tutu-dark' : 'bg-transparent'}`}
          />
        ))}
      </div>
    </div>
  );
};
