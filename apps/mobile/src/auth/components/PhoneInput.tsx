import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { CountryCode, defaultCountry } from '../data/country-codes';
import { validatePhone, PhoneValidationResult } from '../utils/phone-validator';
import { CountryCodePicker } from './CountryCodePicker';
import { authLightColors, authRadii, authSpacing } from '../theme/auth-theme';

export interface PhoneInputProps {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  selectedCountry?: CountryCode;
  onSelectCountry?: (country: CountryCode) => void;
  onValidationChange?: (result: PhoneValidationResult) => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  colors?: typeof authLightColors;
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  label = 'Mobile Phone Number',
  value,
  onChangeText,
  selectedCountry = defaultCountry,
  onSelectCountry,
  onValidationChange,
  error,
  disabled = false,
  autoFocus = false,
  colors = authLightColors
}) => {
  const [pickerVisible, setPickerVisible] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [touched, setTouched] = useState(false);

  const country = selectedCountry;
  const validation = validatePhone(value, country.dialCode);

  const handleTextChange = (text: string) => {
    setTouched(true);
    onChangeText(text);
    if (onValidationChange) {
      onValidationChange(validatePhone(text, country.dialCode));
    }
  };

  const handleCountrySelect = (newCountry: CountryCode) => {
    if (onSelectCountry) {
      onSelectCountry(newCountry);
    }
    if (onValidationChange) {
      onValidationChange(validatePhone(value, newCountry.dialCode));
    }
  };

  const hasError = Boolean(error || (touched && value.length > 0 && !validation.valid));
  const isValid = touched && validation.valid;

  return (
    <View style={styles.container}>
      {/* Label */}
      <View style={styles.labelRow}>
        <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>
        <Text style={[styles.requiredBadge, { color: colors.orange }]}>*Mandatory</Text>
      </View>

      {/* Input Group */}
      <View
        style={[
          styles.inputGroup,
          {
            backgroundColor: colors.surface,
            borderColor: hasError
              ? colors.error
              : isFocused
              ? colors.borderFocus
              : colors.border
          },
          disabled && { opacity: 0.6 }
        ]}
      >
        {/* Country Picker Trigger (Lalamove style: Flag + DialCode + Chevron) */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Selected country ${country.name}, ${country.dialCode}. Tap to change country.`}
          disabled={disabled}
          onPress={() => setPickerVisible(true)}
          style={[styles.countryTrigger, { borderRightColor: colors.border }]}
        >
          <Text style={styles.flagText}>{country.flag}</Text>
          <Text style={[styles.dialCodeText, { color: colors.textPrimary }]}>
            {country.dialCode}
          </Text>
          <MaterialCommunityIcons name="chevron-down" size={18} color={colors.textSecondary} />
        </Pressable>

        {/* Phone Number Input */}
        <TextInput
          accessibilityLabel="Phone number digits"
          style={[styles.input, { color: colors.textPrimary }]}
          placeholder={country.dialCode === '+251' ? '091 123 4567 or 07...' : 'Phone number'}
          placeholderTextColor={colors.textMuted}
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
          autoComplete="tel"
          autoCorrect={false}
          autoFocus={autoFocus}
          editable={!disabled}
          value={value}
          onChangeText={handleTextChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            setTouched(true);
          }}
        />

        {/* Status indicator / Clear button */}
        {value.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear phone number"
            onPress={() => handleTextChange('')}
            style={styles.clearButton}
          >
            <MaterialCommunityIcons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}

        {isValid ? (
          <View style={styles.validBadge}>
            <MaterialCommunityIcons name="check-circle" size={18} color={colors.success} />
          </View>
        ) : null}
      </View>

      {/* Helper text / error message */}
      {hasError ? (
        <View style={styles.messageRow}>
          <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>
            {error || validation.message}
          </Text>
        </View>
      ) : (
        <Text style={[styles.hintText, { color: colors.textMuted }]}>
          {country.dialCode === '+251'
            ? 'Enter 9 digits starting with 9 (Ethio Telecom) or 7 (Safaricom).'
            : `Enter standard mobile number for ${country.name}.`}
        </Text>
      )}

      {/* Searchable Picker Modal */}
      <CountryCodePicker
        visible={pickerVisible}
        selectedCode={country}
        onSelect={handleCountrySelect}
        onClose={() => setPickerVisible(false)}
        colors={colors}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: authSpacing.md
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: authSpacing.xs
  },
  label: {
    fontSize: 14,
    fontWeight: '600'
  },
  requiredBadge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: authRadii.input,
    borderWidth: 1.5,
    overflow: 'hidden'
  },
  countryTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: authSpacing.md,
    height: '100%',
    borderRightWidth: 1,
    minWidth: 96
  },
  flagText: {
    fontSize: 20,
    marginRight: 6
  },
  dialCodeText: {
    fontSize: 15,
    fontWeight: '700',
    marginRight: 4
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    paddingHorizontal: authSpacing.md
  },
  clearButton: {
    paddingHorizontal: 8,
    height: '100%',
    justifyContent: 'center'
  },
  validBadge: {
    paddingRight: authSpacing.md,
    justifyContent: 'center'
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: authSpacing.xs
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4
  },
  hintText: {
    fontSize: 12,
    marginTop: 4,
    paddingHorizontal: authSpacing.xs
  }
});
