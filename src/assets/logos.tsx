import React from 'react';
import { Sparkles, Feather, Cpu, Orbit } from 'lucide-react';

export const TutuBrandMark: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  return (
    <div className="inline-flex items-center gap-2 select-none">
      <Sparkles className="w-4 h-4 text-tutu-lime shrink-0" />
      <span className="font-display font-bold text-sm sm:text-base tracking-wider text-[#FFFFFF]">
        DESAFIO GLOBAL 2026
      </span>
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
      <div className="w-12 h-12 rounded-2xl bg-tutu-secondary border border-[#C8FFD2]/60 flex flex-col items-center justify-center text-[#FFFFFF] shrink-0">
        <Sparkles className="w-4 h-4 text-[#C8FFD2] mb-0.5" />
        <span className="font-display font-bold text-[11px] tracking-wider text-[#FFFFFF]">TUTU</span>
      </div>
    );
  }

  if (normalized.includes('ESCREVE')) {
    return (
      <div className="w-12 h-12 rounded-2xl bg-tutu-secondary border border-tutu-blue/60 flex flex-col items-center justify-center text-[#FFFFFF] shrink-0">
        <Feather className="w-4 h-4 text-[#C8FFD2] mb-0.5" />
        <span className="font-display font-bold text-[10px] tracking-wider text-[#FFFFFF]">LAB</span>
      </div>
    );
  }

  if (normalized.includes('FUTURIZE')) {
    return (
      <div className="w-12 h-12 rounded-2xl bg-tutu-secondary border border-tutu-blue/60 flex flex-col items-center justify-center text-[#FFFFFF] shrink-0">
        <Orbit className="w-4 h-4 text-[#C8FFD2] mb-0.5" />
        <span className="font-display font-bold text-[10px] tracking-wider text-[#FFFFFF]">FUTUR</span>
      </div>
    );
  }

  return (
    <div
      className={`w-12 h-12 rounded-2xl ${
        isGuest ? 'bg-tutu-dark border-dashed border-2 border-[#C8FFD2]/60' : 'bg-tutu-secondary border border-tutu-blue/50'
      } flex flex-col items-center justify-center text-[#FFFFFF] shrink-0`}
    >
      <Cpu className="w-4 h-4 text-[#C8FFD2] mb-0.5" />
      <span className="font-display font-bold text-[10px] tracking-wider text-[#FFFFFF]">
        {logoText.slice(0, 5)}
      </span>
    </div>
  );
};
