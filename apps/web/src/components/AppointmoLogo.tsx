import React from 'react';

interface AppointmoLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  subtitle?: string;
}

export const AppointmoLogo: React.FC<AppointmoLogoProps> = ({
  className = '',
  size = 'md',
  showText = true,
  subtitle,
}) => {
  const iconSizeClasses = {
    sm: 'w-7 h-7 text-xs rounded-lg',
    md: 'w-9 h-9 text-base rounded-xl',
    lg: 'w-11 h-11 text-xl rounded-2xl',
  }[size];

  const textSizeClasses = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
  }[size];

  return (
    <div className={`inline-flex items-center space-x-2.5 ${className}`}>
      {/* Brand Icon SVG mark representing appointment clock + pinpoint calendar */}
      <div
        className={`${iconSizeClasses} bg-stone-900 text-amber-400 flex items-center justify-center font-bold shadow-sm shrink-0 relative overflow-hidden border border-stone-800`}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-5 h-5 text-amber-400"
        >
          <rect x="3" y="4" width="18" height="18" rx="4" />
          <line x1="16" y1="2" x2="16" y2="6" stroke="white" strokeWidth="2" />
          <line x1="8" y1="2" x2="8" y2="6" stroke="white" strokeWidth="2" />
          <line x1="3" y1="10" x2="21" y2="10" stroke="white" strokeWidth="1.5" />
          <path d="M12 14v3l2 1" stroke="currentColor" strokeWidth="2.5" />
        </svg>
      </div>

      {showText && (
        <div className="flex flex-col leading-tight">
          <div className="flex items-center space-x-1.5">
            <span className={`font-bold tracking-tight text-stone-900 dark:text-stone-100 ${textSizeClasses}`}>
              Appoint<span className="text-amber-600 dark:text-amber-400">mo</span>
            </span>
          </div>
          {subtitle && (
            <span className="text-[10px] uppercase font-semibold tracking-wider text-stone-400 dark:text-stone-400">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
