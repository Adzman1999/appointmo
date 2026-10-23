import { countries, ICountry as CountriesListData, getEmojiFlag } from 'countries-list';
import { getExampleNumber, parsePhoneNumberFromString, AsYouType, CountryCode } from 'libphonenumber-js';
import mobileExamples from 'libphonenumber-js/examples.mobile.json';

export interface CountryConfig {
  code: string;
  name: string;
  nativeName?: string;
  emojiFlag?: string;
  currency: string;
  currencySymbol: string;
  dialCode: string;
  phonePlaceholder: string;
  defaultTimezone: string;
  defaultState?: string;
  defaultCity?: string;
  cities: string[];
  maxPhoneLength: number;
  nationalPhoneLength: number;
}

// Currency Symbol resolver
export const getCurrencySymbol = (currency?: string): string => {
  if (!currency) return '₱';
  const c = currency.toUpperCase();
  if (c === 'PHP') return '₱';
  if (c === 'USD') return '$';
  if (c === 'SGD') return 'S$';
  if (c === 'AED') return 'AED ';
  if (c === 'GBP') return '£';
  if (c === 'AUD') return 'A$';
  if (c === 'CAD') return 'CA$';
  if (c === 'JPY') return '¥';
  if (c === 'MYR') return 'RM ';
  if (c === 'EUR') return '€';
  if (c === 'INR') return '₹';
  if (c === 'CNY') return '¥';
  if (c === 'KRW') return '₩';
  if (c === 'THB') return '฿';
  if (c === 'IDR') return 'Rp ';
  if (c === 'VND') return '₫';
  if (c === 'SAR') return 'SAR ';
  if (c === 'QAR') return 'QAR ';
  if (c === 'NZD') return 'NZ$';
  if (c === 'CHF') return 'CHF ';
  if (c === 'HKD') return 'HK$';
  if (c === 'TWD') return 'NT$';
  return `${c} `;
};

// Curated prominent cities for world countries to provide rich, smart auto-complete options
export const WORLD_CITIES_REGISTRY: Record<string, { cities: string[]; defaultCity: string; defaultState?: string; timezone?: string }> = {
  PH: {
    defaultCity: 'Quezon City',
    defaultState: 'Metro Manila',
    timezone: 'Asia/Manila',
    cities: [
      'Quezon City',
      'Makati',
      'Taguig / BGC',
      'Pasig / Ortigas',
      'San Juan / Greenhills',
      'Mandaluyong',
      'Manila',
      'Alabang / Muntinlupa',
      'Pasay',
      'Parañaque',
      'Cebu City',
      'Mandaue City',
      'Davao City',
      'Iloilo City',
      'Bacolod City',
      'Cagayan de Oro',
      'Baguio City',
      'Angeles / Clark',
      'Antipolo / Rizal',
      'Cavite / Dasmariñas',
      'Laguna / Santa Rosa',
      'Batangas City',
      'General Santos',
      'Zamboanga City',
    ],
  },
  US: {
    defaultCity: 'Los Angeles',
    defaultState: 'California',
    timezone: 'America/New_York',
    cities: [
      'Los Angeles',
      'New York City',
      'San Francisco',
      'Chicago',
      'Houston',
      'Miami',
      'Seattle',
      'Austin',
      'Las Vegas',
      'Dallas',
      'Boston',
      'San Diego',
      'Denver',
      'Atlanta',
      'Phoenix',
      'San Jose',
      'Portland',
      'Washington, D.C.',
      'Honolulu',
      'Nashville',
    ],
  },
  SG: {
    defaultCity: 'Downtown Core',
    defaultState: 'Central Region',
    timezone: 'Asia/Singapore',
    cities: [
      'Downtown Core',
      'Orchard / Somerset',
      'Marina Bay',
      'Jurong East',
      'Tampines',
      'Woodlands',
      'Novena',
      'Toa Payoh',
      'Bugis / Rochor',
      'Tanjong Pagar',
      'Bedok',
      'Ang Mo Kio',
      'Changi',
      'Sentosa / Harbourfront',
    ],
  },
  AE: {
    defaultCity: 'Dubai',
    defaultState: 'Dubai',
    timezone: 'Asia/Dubai',
    cities: [
      'Dubai',
      'Abu Dhabi',
      'Sharjah',
      'Ajman',
      'Ras Al Khaimah',
      'Fujairah',
      'Al Ain',
      'Umm Al Quwain',
    ],
  },
  GB: {
    defaultCity: 'London',
    defaultState: 'Greater London',
    timezone: 'Europe/London',
    cities: [
      'London',
      'Manchester',
      'Birmingham',
      'Edinburgh',
      'Glasgow',
      'Liverpool',
      'Bristol',
      'Leeds',
      'Cardiff',
      'Newcastle',
      'Belfast',
      'Sheffield',
      'Oxford',
      'Cambridge',
    ],
  },
  AU: {
    defaultCity: 'Sydney',
    defaultState: 'New South Wales',
    timezone: 'Australia/Sydney',
    cities: [
      'Sydney',
      'Melbourne',
      'Brisbane',
      'Perth',
      'Adelaide',
      'Gold Coast',
      'Canberra',
      'Hobart',
      'Darwin',
      'Sunshine Coast',
      'Newcastle',
    ],
  },
  CA: {
    defaultCity: 'Toronto',
    defaultState: 'Ontario',
    timezone: 'America/Toronto',
    cities: [
      'Toronto',
      'Vancouver',
      'Montreal',
      'Calgary',
      'Ottawa',
      'Edmonton',
      'Quebec City',
      'Winnipeg',
      'Halifax',
      'Victoria',
      'Mississauga',
    ],
  },
  JP: {
    defaultCity: 'Tokyo',
    defaultState: 'Tokyo',
    timezone: 'Asia/Tokyo',
    cities: [
      'Tokyo',
      'Osaka',
      'Kyoto',
      'Yokohama',
      'Fukuoka',
      'Sapporo',
      'Nagoya',
      'Kobe',
      'Hiroshima',
      'Sendai',
      'Okinawa / Naha',
    ],
  },
  MY: {
    defaultCity: 'Kuala Lumpur',
    defaultState: 'Federal Territory',
    timezone: 'Asia/Kuala_Lumpur',
    cities: [
      'Kuala Lumpur',
      'Penang / George Town',
      'Johor Bahru',
      'Petaling Jaya',
      'Shah Alam',
      'Melaka',
      'Kota Kinabalu',
      'Kuching',
      'Ipoh',
      'Subang Jaya',
      'Cyberjaya',
    ],
  },
  SA: {
    defaultCity: 'Riyadh',
    defaultState: 'Riyadh Region',
    timezone: 'Asia/Riyadh',
    cities: [
      'Riyadh',
      'Jeddah',
      'Mecca',
      'Medina',
      'Dammam',
      'Khobar',
      'Dhahran',
      'Tabuk',
      'Abha',
    ],
  },
  QA: {
    defaultCity: 'Doha',
    defaultState: 'Ad Dawhah',
    timezone: 'Asia/Qatar',
    cities: [
      'Doha',
      'Al Rayyan',
      'Al Wakrah',
      'Lusail',
      'Al Khor',
    ],
  },
  NZ: {
    defaultCity: 'Auckland',
    defaultState: 'Auckland Region',
    timezone: 'Pacific/Auckland',
    cities: [
      'Auckland',
      'Wellington',
      'Christchurch',
      'Hamilton',
      'Tauranga',
      'Queenstown',
      'Dunedin',
    ],
  },
  DE: {
    defaultCity: 'Berlin',
    defaultState: 'Berlin',
    timezone: 'Europe/Berlin',
    cities: [
      'Berlin',
      'Munich',
      'Frankfurt',
      'Hamburg',
      'Cologne',
      'Stuttgart',
      'Düsseldorf',
      'Leipzig',
    ],
  },
  FR: {
    defaultCity: 'Paris',
    defaultState: 'Île-de-France',
    timezone: 'Europe/Paris',
    cities: [
      'Paris',
      'Lyon',
      'Marseille',
      'Toulouse',
      'Nice',
      'Nantes',
      'Strasbourg',
      'Bordeaux',
    ],
  },
  IT: {
    defaultCity: 'Rome',
    defaultState: 'Lazio',
    timezone: 'Europe/Rome',
    cities: [
      'Rome',
      'Milan',
      'Florence',
      'Naples',
      'Turin',
      'Venice',
      'Bologna',
      'Palermo',
    ],
  },
  ES: {
    defaultCity: 'Madrid',
    defaultState: 'Community of Madrid',
    timezone: 'Europe/Madrid',
    cities: [
      'Madrid',
      'Barcelona',
      'Valencia',
      'Seville',
      'Málaga',
      'Bilbao',
      'Zaragoza',
    ],
  },
  KR: {
    defaultCity: 'Seoul',
    defaultState: 'Seoul Capital Area',
    timezone: 'Asia/Seoul',
    cities: [
      'Seoul',
      'Busan',
      'Incheon',
      'Daegu',
      'Daejeon',
      'Gwangju',
      'Jeju City',
    ],
  },
  HK: {
    defaultCity: 'Central & Western',
    defaultState: 'Hong Kong Island',
    timezone: 'Asia/Hong_Kong',
    cities: [
      'Central & Western',
      'Wan Chai',
      'Causeway Bay',
      'Tsim Sha Tsui',
      'Mong Kok',
      'Kowloon City',
      'Sha Tin',
    ],
  },
  IN: {
    defaultCity: 'Mumbai',
    defaultState: 'Maharashtra',
    timezone: 'Asia/Kolkata',
    cities: [
      'Mumbai',
      'New Delhi',
      'Bengaluru',
      'Hyderabad',
      'Chennai',
      'Kolkata',
      'Pune',
      'Ahmedabad',
    ],
  },
  ID: {
    defaultCity: 'Jakarta',
    defaultState: 'DKI Jakarta',
    timezone: 'Asia/Jakarta',
    cities: [
      'Jakarta',
      'Surabaya',
      'Bandung',
      'Medan',
      'Bali / Denpasar',
      'Semarang',
      'Yogyakarta',
    ],
  },
  TH: {
    defaultCity: 'Bangkok',
    defaultState: 'Bangkok Metropolis',
    timezone: 'Asia/Bangkok',
    cities: [
      'Bangkok',
      'Chiang Mai',
      'Phuket',
      'Pattaya',
      'Nonthaburi',
      'Hua Hin',
      'Hat Yai',
    ],
  },
  VN: {
    defaultCity: 'Ho Chi Minh City',
    defaultState: 'South Vietnam',
    timezone: 'Asia/Ho_Chi_Minh',
    cities: [
      'Ho Chi Minh City',
      'Hanoi',
      'Da Nang',
      'Hai Phong',
      'Can Tho',
      'Nha Trang',
    ],
  },
};

// Retrieve phone length and formatting metadata using libphonenumber-js
export const getPhoneRequirements = (countryCode: string) => {
  try {
    const ex = getExampleNumber(countryCode.toUpperCase() as CountryCode, mobileExamples);
    if (ex) {
      const dialCode = `+${ex.countryCallingCode}`;
      const intlExample = ex.format('INTERNATIONAL');
      const nationalExample = ex.format('NATIONAL');
      const nationalLength = ex.nationalNumber.length;
      return {
        dialCode,
        placeholder: `${nationalExample} or ${intlExample}`,
        nationalExample,
        intlExample,
        nationalLength,
        // formatted international string limit with extra cushion for spacing
        maxTotalLength: Math.max(intlExample.length, nationalExample.length) + 4,
      };
    }
  } catch (e) {
    // fallback
  }
  return {
    dialCode: '+1',
    placeholder: '(555) 000-0000 or +1 555 000 0000',
    nationalExample: '(555) 000-0000',
    intlExample: '+1 555 000 0000',
    nationalLength: 10,
    maxTotalLength: 20,
  };
};

// Build the standard supported countries list powered by countries-list and libphonenumber-js
const rawCountryCodes = Object.keys(countries) as Array<keyof typeof countries>;

export const SUPPORTED_COUNTRIES: CountryConfig[] = rawCountryCodes.map((isoCode) => {
  const info: CountriesListData = countries[isoCode];
  const phoneReq = getPhoneRequirements(isoCode);
  const primary = WORLD_CITIES_REGISTRY[isoCode];

  // Resolve primary currency
  const rawCur = Array.isArray(info.currency) && info.currency.length > 0 ? info.currency[0] : (info.currency as any) || 'USD';
  const currency = String(rawCur);

  // Resolve primary dial code
  const phonePrefix = Array.isArray(info.phone) && info.phone.length > 0
    ? `+${info.phone[0]}`
    : phoneReq.dialCode;

  // Resolve cities
  let cities = primary ? primary.cities : [];
  if (cities.length === 0 && info.capital) {
    cities = [info.capital];
  }
  if (cities.length === 0) {
    cities = [info.name];
  }

  const defaultCity = primary?.defaultCity || info.capital || cities[0] || info.name;
  const defaultState = primary?.defaultState || '';
  const defaultTimezone = primary?.timezone || 'UTC';

  let emojiFlag = '';
  try {
    emojiFlag = getEmojiFlag(isoCode);
  } catch {
    // ignore
  }

  return {
    code: isoCode,
    name: info.name,
    nativeName: info.native,
    emojiFlag,
    currency,
    currencySymbol: getCurrencySymbol(currency),
    dialCode: phonePrefix,
    phonePlaceholder: phoneReq.placeholder,
    defaultTimezone,
    defaultState,
    defaultCity,
    cities,
    maxPhoneLength: phoneReq.maxTotalLength,
    nationalPhoneLength: phoneReq.nationalLength,
  };
}).sort((a, b) => {
  // Prioritize Philippines, United States, Singapore, UAE, United Kingdom, Australia, Canada, Japan, Malaysia at the top
  const priorityOrder = ['PH', 'US', 'SG', 'AE', 'GB', 'AU', 'CA', 'JP', 'MY', 'SA', 'QA', 'NZ'];
  const aIdx = priorityOrder.indexOf(a.code);
  const bIdx = priorityOrder.indexOf(b.code);
  if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
  if (aIdx !== -1) return -1;
  if (bIdx !== -1) return 1;
  return a.name.localeCompare(b.name);
});

// Fast lookup helper by country name or code
export const getCountryByName = (nameOrCode?: string): CountryConfig => {
  if (!nameOrCode) {
    return SUPPORTED_COUNTRIES.find((c) => c.code === 'PH') || SUPPORTED_COUNTRIES[0];
  }
  const query = nameOrCode.trim().toLowerCase();
  const match = SUPPORTED_COUNTRIES.find(
    (c) => c.name.toLowerCase() === query || c.code.toLowerCase() === query
  );
  return match || SUPPORTED_COUNTRIES.find((c) => c.code === 'PH') || SUPPORTED_COUNTRIES[0];
};

// Country-specific valid starting digit rules for mobile subscriber numbers
export interface CountryStartingDigitRule {
  regex: RegExp;
  label: string;
  allowedStarts: string[];
}

export const COUNTRY_STARTING_RULES: Record<string, CountryStartingDigitRule> = {
  PH: { regex: /^9/, label: 'Must start with 9 (e.g. 9XX XXX XXXX)', allowedStarts: ['9'] },
  SG: { regex: /^[89]/, label: 'Must start with 8 or 9', allowedStarts: ['8', '9'] },
  MY: { regex: /^1/, label: 'Must start with 1 (e.g. 1X XXX XXXX)', allowedStarts: ['1'] },
  GB: { regex: /^7/, label: 'Must start with 7 (e.g. 7XXX XXXXXX)', allowedStarts: ['7'] },
  AE: { regex: /^5/, label: 'Must start with 5 (e.g. 5X XXX XXXX)', allowedStarts: ['5'] },
  SA: { regex: /^5/, label: 'Must start with 5 (e.g. 5X XXX XXXX)', allowedStarts: ['5'] },
  QA: { regex: /^[3567]/, label: 'Must start with 3, 5, 6, or 7', allowedStarts: ['3', '5', '6', '7'] },
  AU: { regex: /^4/, label: 'Must start with 4 (e.g. 4XX XXX XXX)', allowedStarts: ['4'] },
  NZ: { regex: /^2/, label: 'Must start with 2 (e.g. 2XX XXX XXX)', allowedStarts: ['2'] },
  US: { regex: /^[2-9]/, label: 'Must start with 2-9', allowedStarts: ['2', '3', '4', '5', '6', '7', '8', '9'] },
  CA: { regex: /^[2-9]/, label: 'Must start with 2-9', allowedStarts: ['2', '3', '4', '5', '6', '7', '8', '9'] },
  JP: { regex: /^[789]/, label: 'Must start with 7, 8, or 9 (e.g. 90-XXXX-XXXX)', allowedStarts: ['7', '8', '9'] },
  ID: { regex: /^8/, label: 'Must start with 8 (e.g. 8XX-XXXX-XXXX)', allowedStarts: ['8'] },
  TH: { regex: /^[689]/, label: 'Must start with 6, 8, or 9', allowedStarts: ['6', '8', '9'] },
  VN: { regex: /^[35789]/, label: 'Must start with 3, 5, 7, 8, or 9', allowedStarts: ['3', '5', '7', '8', '9'] },
  IN: { regex: /^[6-9]/, label: 'Must start with 6, 7, 8, or 9', allowedStarts: ['6', '7', '8', '9'] },
};

// Check if a given national phone number string starts with a valid digit for that country
export const validateStartingDigit = (
  nationalDigits: string,
  countryCode: string
): { isValid: boolean; warning?: string } => {
  if (!nationalDigits) return { isValid: true };
  const code = (countryCode || 'PH').toUpperCase();
  const rule = COUNTRY_STARTING_RULES[code];
  if (!rule) return { isValid: true };

  const clean = nationalDigits.replace(/\D/g, '');
  if (!clean) return { isValid: true };

  const isValid = rule.regex.test(clean);
  return {
    isValid,
    warning: isValid ? undefined : rule.label,
  };
};

// Format phone number live as user types using libphonenumber-js with auto-country code and AsYouType
export const formatPhoneNumberLive = (input: string, countryCode: string): string => {
  if (!input) return '';
  const code = (countryCode || 'PH').toUpperCase() as CountryCode;

  try {
    const raw = input.trim();
    if (!raw) return '';

    // If starts with +, clean non-digits except the leading +
    if (raw.startsWith('+')) {
      const clean = '+' + raw.slice(1).replace(/\D/g, '');
      const formatter = new AsYouType(code);
      return formatter.input(clean);
    }

    // National format: keep only digits
    const digitsOnly = raw.replace(/\D/g, '');
    const formatter = new AsYouType(code);
    return formatter.input(digitsOnly);
  } catch (e) {
    return input;
  }
};

// Extract national digits without dial code and without leading zeroes
export const extractNationalDigits = (fullPhone: string, dialCode: string): string => {
  if (!fullPhone) return '';
  let trimmed = fullPhone.trim();
  if (trimmed.startsWith(dialCode)) {
    trimmed = trimmed.slice(dialCode.length);
  } else if (trimmed.startsWith('+')) {
    trimmed = trimmed.replace(/^\+\d+\s*/, '');
  }
  let digits = trimmed.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
};

// Live format national digits as user types, preserving dial code out of the input,
// stripping leading 0, and capping input strictly at max national digits
export const formatNationalDigitsLive = (
  input: string,
  countryCode: string,
  dialCode: string,
  maxNationalDigits = 10
): string => {
  if (!input) return '';
  let digits = input.replace(/\D/g, '');

  // Strip dial code if user pasted full international number with dialCode
  const dialDigits = dialCode.replace(/\D/g, '');
  if (digits.startsWith(dialDigits) && digits.length > dialDigits.length) {
    digits = digits.slice(dialDigits.length);
  }

  // Strip leading 0 (e.g. 0905 -> 905)
  if (digits.startsWith('0')) {
    digits = digits.slice(1);
  }

  // Cap at max national digits
  digits = digits.slice(0, maxNationalDigits);
  if (!digits) return '';

  const full = dialCode + digits;
  try {
    const code = (countryCode || 'PH').toUpperCase() as CountryCode;
    const ayt = new AsYouType(code);
    const formatted = ayt.input(full);
    if (formatted.startsWith(dialCode)) {
      return formatted.slice(dialCode.length).trim();
    }
    return digits;
  } catch {
    return digits;
  }
};

// Normalize phone number on submit/save to international E.164-compatible format if valid
export const normalizePhoneNumber = (input: string, countryCode: string): string => {
  if (!input) return '';
  const code = (countryCode || 'PH').toUpperCase() as CountryCode;
  try {
    const parsed = parsePhoneNumberFromString(input.trim(), code);
    if (parsed && parsed.isValid()) {
      return parsed.formatInternational();
    }
    return input.trim();
  } catch {
    return input.trim();
  }
};
