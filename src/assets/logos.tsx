import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, Feather, Cpu, Orbit, Building2 } from 'lucide-react';

export const TutuBrandMark: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = () => {
  return (
    <div className="inline-flex items-center gap-2 select-none">
      <Sparkles className="w-4 h-4 text-tutu-lime shrink-0" />
      <span className="font-display font-bold text-sm sm:text-base tracking-wider text-[#FFFFFF]">
        DESAFIO GLOBAL 2026
      </span>
    </div>
  );
};

function resolveStartupLogoCandidates(
  logoText: string,
  name?: string,
  logoPath?: string
): string[] {
  const candidates: string[] = [];
  const pushUnique = (url?: string) => {
    if (url && !candidates.includes(url)) {
      candidates.push(url);
    }
  };

  const combined = `${name || ''} ${logoText || ''} ${logoPath || ''}`.toLowerCase();

  let slug: 'ex-devedor' | 'sign' | 'editora-escreva' | null = null;
  if (combined.includes('ex devedor') || combined.includes('ex-devedor') || combined.includes('exdev') || combined.includes('tutu')) {
    slug = 'ex-devedor';
  } else if (combined.includes('editora escreva') || combined.includes('editora-escreva') || combined.includes('escreva') || combined.includes('escreve')) {
    slug = 'editora-escreva';
  } else if (combined.includes('sign')) {
    slug = 'sign';
  }

  if (slug) {
    // Prioriza .jpeg oficial e mantém fallback automático para .jpeg.jpeg (caso extensão duplicada no Windows)
    pushUnique(`/images/startups/${slug}.jpeg`);
    pushUnique(`/images/startups/${slug}.jpeg.jpeg`);
  }

  if (logoPath) {
    const asJpeg = logoPath.replace(/\.png$/i, '.jpeg');
    pushUnique(asJpeg);
    pushUnique(`${asJpeg}.jpeg`);
    pushUnique(logoPath);
  }

  return candidates;
}

export const StartupAvatarBadge: React.FC<{
  logoText: string;
  logoPath?: string;
  name?: string;
  isGuest?: boolean;
}> = ({ logoText, logoPath, name, isGuest }) => {
  const candidates = useMemo(
    () => resolveStartupLogoCandidates(logoText, name, logoPath),
    [logoText, name, logoPath]
  );
  const [candidateIndex, setCandidateIndex] = useState(0);

  useEffect(() => {
    setCandidateIndex(0);
  }, [candidates]);

  const currentSrc = candidateIndex < candidates.length ? candidates[candidateIndex] : null;

  if (currentSrc) {
    return (
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-tutu-dark/80 border border-tutu-blue/40 p-1.5 flex items-center justify-center shrink-0 overflow-hidden">
        <img
          src={currentSrc}
          alt={name ? `Logo ${name}` : `Logo ${logoText}`}
          onError={() => setCandidateIndex((prev) => prev + 1)}
          className="w-full h-full object-contain"
          loading="lazy"
        />
      </div>
    );
  }

  const normalized = logoText.toUpperCase();

  if (normalized.includes('EXDEV') || normalized.includes('TUTU')) {
    return (
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-tutu-secondary border border-[#C8FFD2]/50 flex flex-col items-center justify-center text-[#FFFFFF] shrink-0">
        <Sparkles className="w-4 h-4 text-[#C8FFD2] mb-0.5" />
        <span className="font-display font-bold text-[10px] tracking-wider text-[#FFFFFF]">
          EXDEV
        </span>
      </div>
    );
  }

  if (normalized.includes('SIGN')) {
    return (
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-tutu-secondary border border-[#C8FFD2]/50 flex flex-col items-center justify-center text-[#FFFFFF] shrink-0">
        <Building2 className="w-4 h-4 text-[#C8FFD2] mb-0.5" />
        <span className="font-display font-bold text-[10px] tracking-wider text-[#FFFFFF]">
          SIGN
        </span>
      </div>
    );
  }

  if (normalized.includes('ESCREVA') || normalized.includes('ESCREVE')) {
    return (
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-tutu-secondary border border-tutu-blue/60 flex flex-col items-center justify-center text-[#FFFFFF] shrink-0">
        <Feather className="w-4 h-4 text-[#C8FFD2] mb-0.5" />
        <span className="font-display font-bold text-[9px] tracking-wider text-[#FFFFFF]">
          ESCREVA
        </span>
      </div>
    );
  }

  if (normalized.includes('FUTURIZE')) {
    return (
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-tutu-secondary border border-tutu-blue/60 flex flex-col items-center justify-center text-[#FFFFFF] shrink-0">
        <Orbit className="w-4 h-4 text-[#C8FFD2] mb-0.5" />
        <span className="font-display font-bold text-[10px] tracking-wider text-[#FFFFFF]">
          FUTUR
        </span>
      </div>
    );
  }

  return (
    <div
      className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl ${
        isGuest
          ? 'bg-tutu-dark border-dashed border-2 border-[#C8FFD2]/60'
          : 'bg-tutu-secondary border border-tutu-blue/50'
      } flex flex-col items-center justify-center text-[#FFFFFF] shrink-0`}
    >
      <Cpu className="w-4 h-4 text-[#C8FFD2] mb-0.5" />
      <span className="font-display font-bold text-[10px] tracking-wider text-[#FFFFFF]">
        {logoText.slice(0, 5)}
      </span>
    </div>
  );
};
