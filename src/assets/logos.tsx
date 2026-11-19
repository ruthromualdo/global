import React from 'react';
import { Sparkles, Feather, Cpu, Orbit } from 'lucide-react';

export const TutuBrandMark: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const pillDimensions =
    size === 'sm'
      ? 'h-8 px-2.5 text-xs'
      : size === 'lg'
      ? 'h-11 px-4 text-base'
      : 'h-9 px-3 text-sm';

  return (
    <div className="inline-flex items-center gap-2 sm:gap-2.5 select-none">
      <div
        className={`${pillDimensions} rounded-xl bg-tutu-blue border border-tutu-lime/50 flex items-center justify-center font-display font-bold tracking-wide text-tutu-light shadow-sm`}
      >
        <span className="mr-1.5 w-2 h-2 rounded-full bg-tutu-lime inline-block" />
        <span>EX-DEVEDOR + TUTU</span>
      </div>
    </div>
  );
};

export const StartupAvatarBadge: React.FC<{ logoText: string; isGuest?: boolean }> = ({
  logoText,
  isGuest,
}) => {
  const normalized = logoText.toUpperCase();

  if (normalized.includes('TUTU')) {
    return (
      <div className="w-12 h-12 rounded-2xl bg-tutu-blue border border-tutu-lime/50 flex flex-col items-center justify-center text-tutu-light shrink-0">
        <Sparkles className="w-4 h-4 text-tutu-lime mb-0.5" />
        <span className="font-display font-bold text-[11px] tracking-wider">TUTU</span>
      </div>
    );
  }

  if (normalized.includes('ESCREVE')) {
    return (
      <div className="w-12 h-12 rounded-2xl bg-tutu-secondary border border-tutu-light/25 flex flex-col items-center justify-center text-tutu-light shrink-0">
        <Feather className="w-4 h-4 text-tutu-lime mb-0.5" />
        <span className="font-display font-bold text-[10px] tracking-wider">LAB</span>
      </div>
    );
  }

  if (normalized.includes('FUTURIZE')) {
    return (
      <div className="w-12 h-12 rounded-2xl bg-tutu-dark border border-tutu-blue flex flex-col items-center justify-center text-tutu-light shrink-0">
        <Orbit className="w-4 h-4 text-tutu-lime mb-0.5" />
        <span className="font-display font-bold text-[10px] tracking-wider">FUTUR</span>
      </div>
    );
  }

  return (
    <div
      className={`w-12 h-12 rounded-2xl ${
        isGuest ? 'bg-tutu-dark border-dashed border-2 border-tutu-lime/60' : 'bg-tutu-secondary'
      } flex flex-col items-center justify-center text-tutu-light shrink-0`}
    >
      <Cpu className="w-4 h-4 text-tutu-lime mb-0.5" />
      <span className="font-display font-bold text-[10px] tracking-wider">
        {logoText.slice(0, 5)}
      </span>
    </div>
  );
};
