import React from 'react';
import { getCountryByName, formatNationalDigitsLive, extractNationalDigits } from '../lib/countryConfig';

interface CountryPhoneInputProps {
  countryNameOrCode: string;
  value: string; // Stored either as formatted "+63 905 242 2821" or national digits
  onChange: (fullPhoneNumber: string) => void;
  disabled?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
  id?: string;
}

export const CountryPhoneInput: React.FC<CountryPhoneInputProps> = ({
  countryNameOrCode,
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder,
  className = '',
  id,
}) => {
  const country = getCountryByName(countryNameOrCode);
  const dialCode = country.dialCode || '+63';
  const nationalLength = country.nationalPhoneLength || 10;

  // Extract national part from current value
  const nationalDigits = extractNationalDigits(value, dialCode);
  const displayNational = formatNationalDigitsLive(nationalDigits, country.code, dialCode, nationalLength);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const formatted = formatNationalDigitsLive(rawVal, country.code, dialCode, nationalLength);
    if (!formatted) {
      onChange('');
    } else {
      onChange(`${dialCode} ${formatted}`);
    }
  };

  return (
    <div className={`relative flex items-center rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 overflow-hidden focus-within:border-stone-900 dark:focus-within:border-amber-400 transition-colors ${disabled ? 'opacity-60 cursor-not-allowed bg-stone-100 dark:bg-stone-800' : ''} ${className}`}>
      {/* Locked, preserved dial code badge */}
      <div className="flex items-center space-x-1.5 px-3 py-2 bg-stone-100/80 dark:bg-stone-800/90 border-r border-stone-200 dark:border-stone-700 select-none text-stone-700 dark:text-stone-300 font-mono font-bold text-xs shrink-0">
        {country.emojiFlag && <span className="text-sm leading-none">{country.emojiFlag}</span>}
        <span>{dialCode}</span>
      </div>

      {/* National digits input */}
      <input
        id={id}
        type="tel"
        inputMode="numeric"
        required={required}
        disabled={disabled}
        value={displayNational}
        onChange={handleInputChange}
        placeholder={placeholder || (country.code === 'PH' ? '905 242 2821' : `e.g. ${nationalLength} digits`)}
        className="w-full px-3 py-2 bg-transparent text-stone-900 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-xs font-mono focus:outline-none"
      />

      {/* Digits counter helper */}
      <div className="pr-3 text-[10px] text-stone-400 font-mono select-none pointer-events-none shrink-0">
        {nationalDigits.length}/{nationalLength}
      </div>
    </div>
  );
};
