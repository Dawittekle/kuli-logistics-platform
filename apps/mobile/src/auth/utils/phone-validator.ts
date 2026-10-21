export interface PhoneValidationResult {
  valid: boolean;
  normalized: string;
  formatted: string;
  message: string;
  countryCode: string;
  nationalNumber: string;
}

/**
 * Validates and normalizes phone numbers with special focus on Ethiopian telecom
 * standards (+251 9... for Ethio Telecom and +251 7... for Safaricom Ethiopia)
 * while supporting global E.164 standards for international diaspora/customers.
 */
export function validatePhone(
  rawInput: string,
  selectedDialCode: string = '+251'
): PhoneValidationResult {
  const input = String(rawInput ?? '').trim();

  if (!input) {
    return {
      valid: false,
      normalized: '',
      formatted: '',
      message: 'Phone number is required.',
      countryCode: selectedDialCode,
      nationalNumber: ''
    };
  }

  // Strip all whitespace, dashes, parentheses
  let sanitized = input.replace(/[\s\-()]/g, '');

  let dialCode = selectedDialCode;
  let nationalNumber = sanitized;

  // If input starts with '+', determine dial code from input
  if (sanitized.startsWith('+')) {
    if (sanitized.startsWith('+251')) {
      dialCode = '+251';
      nationalNumber = sanitized.slice(4);
    } else {
      // Find matching dial code
      const match = sanitized.match(/^\+(\d{1,4})/);
      if (match) {
        dialCode = `+${match[1]}`;
        nationalNumber = sanitized.slice(dialCode.length);
      }
    }
  } else if (sanitized.startsWith('251') && sanitized.length >= 11) {
    dialCode = '+251';
    nationalNumber = sanitized.slice(3);
  }

  // Remove leading zeros from national number
  while (nationalNumber.startsWith('0')) {
    nationalNumber = nationalNumber.slice(1);
  }

  // Only digits allowed in national number
  if (!/^\d+$/.test(nationalNumber)) {
    return {
      valid: false,
      normalized: '',
      formatted: input,
      message: 'Phone number may only contain digits.',
      countryCode: dialCode,
      nationalNumber
    };
  }

  // Ethiopian specific validation
  if (dialCode === '+251') {
    // Valid Ethiopian mobile must start with 9 (Ethio Telecom) or 7 (Safaricom)
    // and have exactly 9 digits
    if (nationalNumber.length !== 9) {
      return {
        valid: false,
        normalized: `+251${nationalNumber}`,
        formatted: `+251 ${nationalNumber}`,
        message: 'Ethiopian mobile number must be 9 digits (e.g. 091 123 4567 or 071 234 5678).',
        countryCode: '+251',
        nationalNumber
      };
    }

    const firstDigit = nationalNumber[0];
    if (firstDigit !== '9' && firstDigit !== '7') {
      return {
        valid: false,
        normalized: `+251${nationalNumber}`,
        formatted: `+251 ${nationalNumber}`,
        message: 'Ethiopian mobile numbers start with 9 (Ethio Telecom) or 7 (Safaricom).',
        countryCode: '+251',
        nationalNumber
      };
    }

    const normalized = `+251${nationalNumber}`;
    const formatted = `+251 ${nationalNumber.slice(0, 2)} ${nationalNumber.slice(2, 5)} ${nationalNumber.slice(5)}`;

    return {
      valid: true,
      normalized,
      formatted,
      message: 'Valid Ethiopian mobile number.',
      countryCode: '+251',
      nationalNumber
    };
  }

  // International phone validation (E.164 ITU-T rules)
  // Total digits in full number (dialCode without + plus national) must be between 7 and 15
  const totalDigits = dialCode.replace('+', '').length + nationalNumber.length;
  if (totalDigits < 7 || totalDigits > 15) {
    return {
      valid: false,
      normalized: `${dialCode}${nationalNumber}`,
      formatted: `${dialCode} ${nationalNumber}`,
      message: `Invalid phone length for ${dialCode} (standard 7-15 digits).`,
      countryCode: dialCode,
      nationalNumber
    };
  }

  const normalized = `${dialCode}${nationalNumber}`;
  const formatted = `${dialCode} ${nationalNumber}`;

  return {
    valid: true,
    normalized,
    formatted,
    message: 'Valid phone number.',
    countryCode: dialCode,
    nationalNumber
  };
}

/**
 * Formats a phone number for friendly UI display
 */
export function formatPhoneForDisplay(phone: string): string {
  const result = validatePhone(phone);
  return result.formatted || phone;
}
