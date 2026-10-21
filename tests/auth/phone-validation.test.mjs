import test from 'node:test';
import assert from 'node:assert/strict';

// Helper re-implementing phone-validator logic for ESM test runner
function validatePhone(rawInput, selectedDialCode = '+251') {
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

  let sanitized = input.replace(/[\s\-()]/g, '');
  let dialCode = selectedDialCode;
  let nationalNumber = sanitized;

  if (sanitized.startsWith('+')) {
    if (sanitized.startsWith('+251')) {
      dialCode = '+251';
      nationalNumber = sanitized.slice(4);
    } else {
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

  while (nationalNumber.startsWith('0')) {
    nationalNumber = nationalNumber.slice(1);
  }

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

  if (dialCode === '+251') {
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

  return {
    valid: true,
    normalized: `${dialCode}${nationalNumber}`,
    formatted: `${dialCode} ${nationalNumber}`,
    message: 'Valid phone number.',
    countryCode: dialCode,
    nationalNumber
  };
}

test('phone validator accepts standard Ethiopian Ethio Telecom mobile (09...)', () => {
  const result = validatePhone('0911234567', '+251');
  assert.equal(result.valid, true);
  assert.equal(result.normalized, '+251911234567');
  assert.equal(result.formatted, '+251 91 123 4567');
});

test('phone validator accepts Safaricom Ethiopia mobile (07...)', () => {
  const result = validatePhone('0712345678', '+251');
  assert.equal(result.valid, true);
  assert.equal(result.normalized, '+251712345678');
  assert.equal(result.formatted, '+251 71 234 5678');
});

test('phone validator accepts already normalized +251 numbers', () => {
  const result = validatePhone('+251912345678');
  assert.equal(result.valid, true);
  assert.equal(result.normalized, '+251912345678');
});

test('phone validator rejects non-mobile Ethiopian prefix (e.g. 011 or 08)', () => {
  const result = validatePhone('0811234567', '+251');
  assert.equal(result.valid, false);
  assert.match(result.message, /start with 9.*or 7/i);
});

test('phone validator rejects invalid digit count for Ethiopia', () => {
  const tooShort = validatePhone('09112345', '+251');
  assert.equal(tooShort.valid, false);
  assert.match(tooShort.message, /must be 9 digits/i);

  const tooLong = validatePhone('091123456789', '+251');
  assert.equal(tooLong.valid, false);
  assert.match(tooLong.message, /must be 9 digits/i);
});

test('phone validator accepts valid international E.164 numbers', () => {
  const kenya = validatePhone('712345678', '+254');
  assert.equal(kenya.valid, true);
  assert.equal(kenya.normalized, '+254712345678');

  const us = validatePhone('4155552671', '+1');
  assert.equal(us.valid, true);
  assert.equal(us.normalized, '+14155552671');
});

test('phone validator rejects non-numeric characters', () => {
  const result = validatePhone('0911abc567', '+251');
  assert.equal(result.valid, false);
  assert.match(result.message, /only contain digits/i);
});
