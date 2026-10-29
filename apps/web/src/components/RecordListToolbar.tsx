import React from 'react';
import { Filter, Search } from 'lucide-react';

export interface RecordFilterOption {
  value: string;
  label: string;
}

interface RecordListToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder: string;
  filter?: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: RecordFilterOption[];
  };
  className?: string;
}

export const RecordListToolbar: React.FC<RecordListToolbarProps> = ({
  searchValue,
  onSearchChange,
  searchPlaceholder,
  filter,
  className = '',
}) => (
  <div className={`flex flex-col gap-2 sm:flex-row sm:items-center ${className}`}>
    <label className="relative block w-full sm:max-w-sm sm:flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
      <input
        type="search"
        value={searchValue}
        onChange={(event) => onSearchChange(event.target.value)}
        placeholder={searchPlaceholder}
        className="box-border h-10 w-full rounded-xl border border-stone-200 bg-white pl-9 pr-3 text-xs text-stone-900 placeholder-stone-400 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/15 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-100"
      />
    </label>

    {filter && (
      <label className="flex w-full items-center gap-2 sm:w-auto">
        <span className="sr-only">{filter.label}</span>
        <Filter aria-hidden="true" className="h-4 w-4 shrink-0 text-stone-400" />
        <select
          aria-label={filter.label}
          value={filter.value}
          onChange={(event) => filter.onChange(event.target.value)}
          className="box-border h-10 min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 pr-8 text-xs text-stone-700 outline-none transition focus:border-amber-500 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-200 sm:min-w-40 sm:flex-none"
        >
          {filter.options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    )}
  </div>
);
