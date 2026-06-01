import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../../theme';

type TimelineItem = {
  key: string;
  title: string;
  detail?: string;
  status?: 'done' | 'current' | 'pending' | 'error';
};

type TimelineProps = {
  items: TimelineItem[];
};

export function Timeline({ items }: TimelineProps) {
  return (
    <View style={styles.list}>
      {items.map((item, index) => {
        const status = item.status ?? 'pending';

        return (
          <View key={item.key} style={styles.row}>
            <View style={styles.markerColumn}>
              <View style={[styles.dot, styles[status]]} />
              {index < items.length - 1 ? <View style={styles.connector} /> : null}
            </View>
            <View style={styles.card}>
              <Text style={styles.title}>{item.title}</Text>
              {item.detail ? <Text style={styles.detail}>{item.detail}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 0
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md
  },
  markerColumn: {
    alignItems: 'center',
    width: 22
  },
  dot: {
    backgroundColor: colors.border,
    borderColor: colors.card,
    borderRadius: 10,
    borderWidth: 3,
    height: 20,
    width: 20
  },
  done: {
    backgroundColor: colors.success
  },
  current: {
    backgroundColor: colors.warning
  },
  pending: {
    backgroundColor: colors.border
  },
  error: {
    backgroundColor: colors.error
  },
  connector: {
    backgroundColor: colors.border,
    flex: 1,
    minHeight: 44,
    width: 2
  },
  card: {
    backgroundColor: colors.subtle,
    borderRadius: radii.md,
    flex: 1,
    gap: spacing.xs,
    marginBottom: spacing.md,
    padding: spacing.md
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.body.fontSize,
    fontWeight: '900'
  },
  detail: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    lineHeight: typography.caption.lineHeight
  }
});
