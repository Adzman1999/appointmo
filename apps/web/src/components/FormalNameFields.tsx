import React from 'react';

interface FormalNameFieldsProps {
  firstName: string;
  middleName?: string;
  lastName: string;
  onFirstNameChange: (val: string) => void;
  onMiddleNameChange: (val: string) => void;
  onLastNameChange: (val: string) => void;
  required?: boolean;
  disabled?: boolean;
  layout?: 'grid' | 'stacked';
  className?: string;
  labels?: {
    first?: string;
    middle?: string;
    last?: string;
  };
}

export const FormalNameFields: React.FC<FormalNameFieldsProps> = ({
  firstName,
  middleName = '',
  lastName,
  onFirstNameChange,
  onMiddleNameChange,
  onLastNameChange,
  required = true,
  disabled = false,
  className = '',
  labels,
}) => {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 gap-3 ${className}`}>
      <div className="min-w-0">
        <label className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 truncate">
          <span>{labels?.first || 'First Name'}</span>
          {required ? (
            <span className="text-rose-500 font-bold ml-1 shrink-0">*</span>
          ) : (
            <span className="text-stone-400 font-normal ml-1 shrink-0 text-[10px]">Opt.</span>
          )}
        </label>
        <input
          type="text"
          required={required}
          disabled={disabled}
          placeholder="e.g. Maria"
          value={firstName}
          onChange={(e) => onFirstNameChange(e.target.value)}
          className="w-full px-3 py-2 sm:py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 disabled:opacity-60 transition"
        />
      </div>

      <div className="min-w-0">
        <label className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 truncate">
          <span className="truncate">{labels?.middle || 'Middle Name / Initial'}</span>
          <span className="text-stone-400 font-normal ml-1 shrink-0 text-[10px]">Opt.</span>
        </label>
        <input
          type="text"
          disabled={disabled}
          placeholder="e.g. Clara"
          value={middleName}
          onChange={(e) => onMiddleNameChange(e.target.value)}
          className="w-full px-3 py-2 sm:py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 disabled:opacity-60 transition"
        />
      </div>

      <div className="min-w-0">
        <label className="flex items-center justify-between text-[11px] sm:text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1 truncate">
          <span>{labels?.last || 'Last Name'}</span>
          {required ? (
            <span className="text-rose-500 font-bold ml-1 shrink-0">*</span>
          ) : (
            <span className="text-stone-400 font-normal ml-1 shrink-0 text-[10px]">Opt.</span>
          )}
        </label>
        <input
          type="text"
          required={required}
          disabled={disabled}
          placeholder="e.g. Santos"
          value={lastName}
          onChange={(e) => onLastNameChange(e.target.value)}
          className="w-full px-3 py-2 sm:py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-xs sm:text-sm focus:outline-none focus:border-stone-900 dark:focus:border-amber-400 disabled:opacity-60 transition"
        />
      </div>
    </div>
  );
};
