import React from 'react';
import { Building2, Sparkles, Stethoscope, HeartHandshake, Briefcase, Scissors, Car, Dumbbell } from 'lucide-react';

interface BusinessLogoProps {
  name: string;
  category?: string;
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const BusinessLogo: React.FC<BusinessLogoProps> = ({
  name,
  category = '',
  logoUrl,
  size = 'md',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-8 h-8 rounded-lg text-xs',
    md: 'w-10 h-10 rounded-xl text-sm',
    lg: 'w-12 h-12 rounded-2xl text-base',
    xl: 'w-16 h-16 rounded-3xl text-xl',
  }[size];

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  }[size];

  if (logoUrl && logoUrl.trim()) {
    return (
      <img
        src={logoUrl}
        alt={name}
        onError={(e) => {
          // If image fails to load, gracefully hide image and let fallback render
          (e.currentTarget as HTMLElement).style.display = 'none';
        }}
        className={`${sizeClasses} object-cover border border-stone-200 shadow-sm shrink-0 ${className}`}
      />
    );
  }

  // Elegant stylized default logo based on category theme
  const catLower = category.toLowerCase();

  let themeStyles = 'bg-stone-900 text-amber-400 border-stone-800';
  let IconComponent = Building2;

  if (catLower.includes('beauty') || catLower.includes('wellness') || catLower.includes('salon') || catLower.includes('spa')) {
    themeStyles = 'bg-rose-950 text-rose-300 border-rose-900';
    IconComponent = Sparkles;
  } else if (catLower.includes('dental') || catLower.includes('tooth') || catLower.includes('ortho')) {
    themeStyles = 'bg-sky-950 text-sky-300 border-sky-900';
    IconComponent = Stethoscope;
  } else if (catLower.includes('vet') || catLower.includes('animal') || catLower.includes('pet')) {
    themeStyles = 'bg-emerald-950 text-emerald-300 border-emerald-900';
    IconComponent = HeartHandshake;
  } else if (catLower.includes('legal') || catLower.includes('consult') || catLower.includes('advisory') || catLower.includes('professional')) {
    themeStyles = 'bg-slate-900 text-amber-300 border-slate-800';
    IconComponent = Briefcase;
  } else if (catLower.includes('auto') || catLower.includes('car')) {
    themeStyles = 'bg-zinc-900 text-orange-400 border-zinc-800';
    IconComponent = Car;
  } else if (catLower.includes('fitness') || catLower.includes('gym')) {
    themeStyles = 'bg-neutral-900 text-emerald-400 border-neutral-800';
    IconComponent = Dumbbell;
  }

  const initial = name ? name.trim().charAt(0).toUpperCase() : 'B';

  return (
    <div
      className={`${sizeClasses} ${themeStyles} border shadow-sm flex items-center justify-center font-bold relative shrink-0 overflow-hidden ${className}`}
      title={name}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
      <div className="flex items-center justify-center space-x-0.5">
        <IconComponent className={`${iconSizes} opacity-80`} />
      </div>
      <span className="absolute bottom-0.5 right-1 text-[9px] font-black uppercase text-white/50 tracking-tighter">
        {initial}
      </span>
    </div>
  );
};
