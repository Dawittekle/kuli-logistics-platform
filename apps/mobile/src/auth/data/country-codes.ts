export interface CountryCode {
  name: string;
  dialCode: string;
  isoCode: string;
  flag: string;
  priority?: number;
}

export const defaultCountry: CountryCode = {
  name: 'Ethiopia',
  dialCode: '+251',
  isoCode: 'ET',
  flag: '🇪🇹',
  priority: 1
};

export const countryCodes: CountryCode[] = [
  // Primary markets (Horn of Africa & East Africa)
  defaultCountry,
  { name: 'Kenya', dialCode: '+254', isoCode: 'KE', flag: '🇰🇪', priority: 2 },
  { name: 'Djibouti', dialCode: '+253', isoCode: 'DJ', flag: '🇩🇯', priority: 3 },
  { name: 'Somalia', dialCode: '+252', isoCode: 'SO', flag: '🇸🇴', priority: 4 },
  { name: 'Sudan', dialCode: '+249', isoCode: 'SD', flag: '🇸🇩', priority: 5 },
  { name: 'South Sudan', dialCode: '+211', isoCode: 'SS', flag: '🇸🇸', priority: 6 },
  { name: 'Eritrea', dialCode: '+291', isoCode: 'ER', flag: '🇪🇷', priority: 7 },
  { name: 'Uganda', dialCode: '+256', isoCode: 'UG', flag: '🇺🇬', priority: 8 },
  { name: 'Tanzania', dialCode: '+255', isoCode: 'TZ', flag: '🇹🇿', priority: 9 },
  { name: 'Rwanda', dialCode: '+250', isoCode: 'RW', flag: '🇷🇼', priority: 10 },

  // Middle East & Key Trade Partners
  { name: 'United Arab Emirates', dialCode: '+971', isoCode: 'AE', flag: '🇦🇪' },
  { name: 'Saudi Arabia', dialCode: '+966', isoCode: 'SA', flag: '🇸🇦' },
  { name: 'Qatar', dialCode: '+974', isoCode: 'QA', flag: '🇶🇦' },
  { name: 'Kuwait', dialCode: '+965', isoCode: 'KW', flag: '🇰🇼' },
  { name: 'Turkey', dialCode: '+90', isoCode: 'TR', flag: '🇹🇷' },
  { name: 'Egypt', dialCode: '+20', isoCode: 'EG', flag: '🇪🇬' },

  // International & Diaspora Hubs
  { name: 'United States', dialCode: '+1', isoCode: 'US', flag: '🇺🇸' },
  { name: 'Canada', dialCode: '+1', isoCode: 'CA', flag: '🇨🇦' },
  { name: 'United Kingdom', dialCode: '+44', isoCode: 'GB', flag: '🇬🇧' },
  { name: 'Germany', dialCode: '+49', isoCode: 'DE', flag: '🇩🇪' },
  { name: 'France', dialCode: '+33', isoCode: 'FR', flag: '🇫🇷' },
  { name: 'Italy', dialCode: '+39', isoCode: 'IT', flag: '🇮🇹' },
  { name: 'Sweden', dialCode: '+46', isoCode: 'SE', flag: '🇸🇪' },
  { name: 'Netherlands', dialCode: '+31', isoCode: 'NL', flag: '🇳🇱' },
  { name: 'Switzerland', dialCode: '+41', isoCode: 'CH', flag: '🇨🇭' },
  { name: 'Norway', dialCode: '+47', isoCode: 'NO', flag: '🇳🇴' },
  { name: 'Australia', dialCode: '+61', isoCode: 'AU', flag: '🇦🇺' },
  { name: 'China', dialCode: '+86', isoCode: 'CN', flag: '🇨🇳' },
  { name: 'India', dialCode: '+91', isoCode: 'IN', flag: '🇮🇳' },
  { name: 'Philippines', dialCode: '+63', isoCode: 'PH', flag: '🇵🇭' },
  { name: 'South Africa', dialCode: '+27', isoCode: 'ZA', flag: '🇿🇦' },
  { name: 'Nigeria', dialCode: '+234', isoCode: 'NG', flag: '🇳🇬' },
  { name: 'Ghana', dialCode: '+233', isoCode: 'GH', flag: '🇬🇭' }
];

export function findCountryByDialCode(dialCode: string): CountryCode {
  const match = countryCodes.find((c) => c.dialCode === dialCode);
  return match ?? defaultCountry;
}

export function filterCountries(query: string): CountryCode[] {
  const clean = query.trim().toLowerCase();
  if (!clean) return countryCodes;

  return countryCodes.filter(
    (c) =>
      c.name.toLowerCase().includes(clean) ||
      c.dialCode.toLowerCase().includes(clean) ||
      c.isoCode.toLowerCase().includes(clean)
  );
}
