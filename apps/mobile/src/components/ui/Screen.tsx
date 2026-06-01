import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, spacing } from '../../theme';

type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

export function Screen({ children, scroll = true, padded = true, style, contentStyle }: ScreenProps) {
  const content = <View style={[styles.content, padded && styles.padded, contentStyle]}>{children}</View>;

  return (
    <SafeAreaView style={[styles.screen, style]}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {content}
        </ScrollView>
      ) : content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
    flex: 1
  },
  scrollContent: {
    flexGrow: 1
  },
  content: {
    flex: 1,
    gap: spacing.lg
  },
  padded: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl
  }
});
