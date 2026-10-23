export interface CountryConfig {
  code: string;
  name: string;
  currency: string;
  currencySymbol: string;
  dialCode: string;
  phonePlaceholder: string;
  defaultTimezone: string;
  defaultState?: string;
  defaultCity?: string;
  cities: string[];
}

export const SUPPORTED_COUNTRIES: CountryConfig[] = [
  {
    code: 'PH',
    name: 'Philippines',
    currency: 'PHP',
    currencySymbol: '₱',
    dialCode: '+63',
    phonePlaceholder: '+63 917 123 4567',
    defaultTimezone: 'Asia/Manila',
    defaultState: 'Metro Manila',
    defaultCity: 'Quezon City',
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
    ],
  },
  {
    code: 'US',
    name: 'United States',
    currency: 'USD',
    currencySymbol: '$',
    dialCode: '+1',
    phonePlaceholder: '+1 (555) 000-0000',
    defaultTimezone: 'America/New_York',
    defaultState: 'California',
    defaultCity: 'Los Angeles',
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
    ],
  },
  {
    code: 'SG',
    name: 'Singapore',
    currency: 'SGD',
    currencySymbol: 'S$',
    dialCode: '+65',
    phonePlaceholder: '+65 9123 4567',
    defaultTimezone: 'Asia/Singapore',
    defaultState: 'Central Region',
    defaultCity: 'Downtown Core',
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
    ],
  },
  {
    code: 'AE',
    name: 'United Arab Emirates',
    currency: 'AED',
    currencySymbol: 'AED',
    dialCode: '+971',
    phonePlaceholder: '+971 50 123 4567',
    defaultTimezone: 'Asia/Dubai',
    defaultState: 'Dubai',
    defaultCity: 'Dubai',
    cities: [
      'Dubai',
      'Abu Dhabi',
      'Sharjah',
      'Ajman',
      'Ras Al Khaimah',
      'Fujairah',
      'Al Ain',
    ],
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    currency: 'GBP',
    currencySymbol: '£',
    dialCode: '+44',
    phonePlaceholder: '+44 7911 123456',
    defaultTimezone: 'Europe/London',
    defaultState: 'Greater London',
    defaultCity: 'London',
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
    ],
  },
  {
    code: 'AU',
    name: 'Australia',
    currency: 'AUD',
    currencySymbol: 'A$',
    dialCode: '+61',
    phonePlaceholder: '+61 400 000 000',
    defaultTimezone: 'Australia/Sydney',
    defaultState: 'New South Wales',
    defaultCity: 'Sydney',
    cities: [
      'Sydney',
      'Melbourne',
      'Brisbane',
      'Perth',
      'Adelaide',
      'Gold Coast',
      'Canberra',
      'Hobart',
    ],
  },
  {
    code: 'CA',
    name: 'Canada',
    currency: 'CAD',
    currencySymbol: 'CA$',
    dialCode: '+1',
    phonePlaceholder: '+1 (416) 555-0199',
    defaultTimezone: 'America/Toronto',
    defaultState: 'Ontario',
    defaultCity: 'Toronto',
    cities: [
      'Toronto',
      'Vancouver',
      'Montreal',
      'Calgary',
      'Ottawa',
      'Edmonton',
      'Quebec City',
      'Winnipeg',
    ],
  },
  {
    code: 'JP',
    name: 'Japan',
    currency: 'JPY',
    currencySymbol: '¥',
    dialCode: '+81',
    phonePlaceholder: '+81 90 1234 5678',
    defaultTimezone: 'Asia/Tokyo',
    defaultState: 'Tokyo',
    defaultCity: 'Tokyo',
    cities: [
      'Tokyo',
      'Osaka',
      'Kyoto',
      'Yokohama',
      'Fukuoka',
      'Sapporo',
      'Nagoya',
      'Kobe',
    ],
  },
  {
    code: 'MY',
    name: 'Malaysia',
    currency: 'MYR',
    currencySymbol: 'RM',
    dialCode: '+60',
    phonePlaceholder: '+60 12-345 6789',
    defaultTimezone: 'Asia/Kuala_Lumpur',
    defaultState: 'Federal Territory',
    defaultCity: 'Kuala Lumpur',
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
    ],
  },
];

export const getCountryByName = (name?: string): CountryConfig => {
  if (!name) return SUPPORTED_COUNTRIES[0];
  const found = SUPPORTED_COUNTRIES.find(
    (c) => c.name.toLowerCase() === name.toLowerCase() || c.code.toLowerCase() === name.toLowerCase()
  );
  return found || SUPPORTED_COUNTRIES[0];
};

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
  return `${c} `;
};
