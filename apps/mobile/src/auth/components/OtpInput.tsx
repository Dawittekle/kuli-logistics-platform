import React, { useRef } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  NativeSyntheticEvent,
  TextInputKeyPressEventData
} from 'react-native';
import { authLightColors, authRadii, authSpacing } from '../theme/auth-theme';

export interface OtpInputProps {
  length?: number;
  value: string;
  onChangeText: (code: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  colors?: typeof authLightColors;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  length = 6,
  value,
  onChangeText,
  disabled = false,
  hasError = false,
  colors = authLightColors
}) => {
  const inputsRef = useRef<(TextInput | null)[]>([]);

  const digits = value.split('');
  while (digits.length < length) {
    digits.push('');
  }

  const handleChange = (text: string, index: number) => {
    // If text has multiple characters (e.g. pasted 6-digit code)
    const clean = text.replace(/\D/g, '');
    if (clean.length > 1) {
      const pasted = clean.slice(0, length);
      onChangeText(pasted);
      const targetIndex = Math.min(pasted.length, length - 1);
      inputsRef.current[targetIndex]?.focus();
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = clean;
    const combined = newDigits.join('').slice(0, length);
    onChangeText(combined);

    // Auto-advance
    if (clean && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (
    e: NativeSyntheticEvent<TextInputKeyPressEventData>,
    index: number
  ) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    }
  };

  return (
    <View style={styles.container} accessibilityRole="none" accessibilityLabel="6 digit verification code input">
      {digits.map((digit, index) => {
        const isCurrent = index === Math.min(value.length, length - 1);
        return (
          <TextInput
            key={index}
            ref={(ref) => {
              inputsRef.current[index] = ref;
            }}
            style={[
              styles.cell,
              {
                backgroundColor: colors.surface,
                borderColor: hasError
                  ? colors.error
                  : isCurrent
                  ? colors.borderFocus
                  : colors.border,
                color: colors.textPrimary
              },
              disabled && { opacity: 0.6 }
            ]}
            keyboardType="number-pad"
            maxLength={index === 0 ? length : 1}
            textContentType="oneTimeCode"
            autoComplete="sms-otp"
            selectTextOnFocus
            editable={!disabled}
            value={digit}
            onChangeText={(text) => handleChange(text, index)}
            onKeyPress={(e) => handleKeyPress(e, index)}
            accessibilityLabel={`Digit ${index + 1} of ${length}`}
          />
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: authSpacing.md
  },
  cell: {
    width: 48,
    height: 56,
    borderRadius: authRadii.sm * 1.5,
    borderWidth: 2,
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center'
  }
});
