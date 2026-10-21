import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { authLightColors, authRadii, authSpacing } from '../theme/auth-theme';

export interface PasswordRequirementsProps {
  password: string;
  confirmPassword?: string;
  checkMatch?: boolean;
  colors?: typeof authLightColors;
}

export function evaluatePassword(password: string) {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumberOrSymbol = /[\d!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password);

  const isStrong = hasMinLength && hasUppercase && hasLowercase && hasNumberOrSymbol;

  return {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumberOrSymbol,
    isStrong
  };
}

export const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({
  password,
  confirmPassword,
  checkMatch = false,
  colors = authLightColors
}) => {
  const evalResult = evaluatePassword(password);
  const matchResult = Boolean(password && confirmPassword && password === confirmPassword);

  const criteria = [
    { label: 'At least 8 characters', met: evalResult.hasMinLength },
    { label: 'One uppercase letter (A-Z)', met: evalResult.hasUppercase },
    { label: 'One lowercase letter (a-z)', met: evalResult.hasLowercase },
    { label: 'One number or symbol (0-9, #, @)', met: evalResult.hasNumberOrSymbol }
  ];

  if (checkMatch && confirmPassword !== undefined) {
    criteria.push({
      label: 'Passwords match',
      met: matchResult
    });
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceSubtle, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.textSecondary }]}>
        Security Requirements
      </Text>
      {criteria.map((item, index) => (
        <View key={index} style={styles.row}>
          <MaterialCommunityIcons
            name={item.met ? 'check-circle' : 'circle-outline'}
            size={16}
            color={item.met ? colors.success : colors.textMuted}
            style={styles.icon}
          />
          <Text
            style={[
              styles.label,
              { color: item.met ? colors.successText : colors.textSecondary },
              item.met && styles.labelMet
            ]}
          >
            {item.label}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    padding: authSpacing.md,
    borderRadius: authRadii.card,
    borderWidth: 1,
    marginBottom: authSpacing.md
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: authSpacing.xs
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4
  },
  icon: {
    marginRight: authSpacing.sm
  },
  label: {
    fontSize: 13
  },
  labelMet: {
    fontWeight: '600'
  }
});
