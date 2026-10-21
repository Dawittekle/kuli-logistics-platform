import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet
} from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { authLightColors, authRadii, authSpacing } from '../theme/auth-theme';

export interface PasswordInputProps {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  autoComplete?: 'password' | 'password-new' | 'current-password';
  colors?: typeof authLightColors;
}

export const PasswordInput: React.FC<PasswordInputProps> = ({
  label = 'Password',
  value,
  onChangeText,
  placeholder = 'Enter your password',
  error,
  disabled = false,
  autoComplete = 'current-password',
  colors = authLightColors
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const hasError = Boolean(error);

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textPrimary }]}>{label}</Text>

      <View
        style={[
          styles.inputContainer,
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
        <TextInput
          accessibilityLabel={label}
          style={[styles.input, { color: colors.textPrimary }]}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          editable={!disabled}
          autoComplete={autoComplete}
          textContentType="password"
          value={value}
          onChangeText={onChangeText}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          onPress={() => setShowPassword((prev) => !prev)}
          style={styles.eyeButton}
        >
          <MaterialCommunityIcons
            name={showPassword ? 'eye-off-outline' : 'eye-outline'}
            size={22}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>

      {hasError ? (
        <View style={styles.errorRow}>
          <MaterialCommunityIcons name="alert-circle-outline" size={14} color={colors.error} />
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: authSpacing.md
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: authSpacing.xs
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: authRadii.input,
    borderWidth: 1.5,
    paddingHorizontal: authSpacing.md
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16
  },
  eyeButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center'
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    paddingHorizontal: authSpacing.xs
  },
  errorText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4
  }
});
