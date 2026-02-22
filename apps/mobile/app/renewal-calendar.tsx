import React, { useMemo } from 'react';
import { SectionList, View, StyleSheet } from 'react-native';
import { Text, Card, colors, spacing, typography } from '@mybudget/ui';
import type { Subscription } from '@mybudget/shared';
import { formatCents, getUpcomingRenewals, normalizeToMonthly } from '@mybudget/shared';

/**
 * Mock data — same subscriptions as dashboard. Will share via context/store.
 */
const MOCK_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 's1', name: 'Netflix', price: 1599, currency: 'USD', billing_cycle: 'monthly',
    custom_days: null, category_id: 'c5', status: 'active', start_date: '2024-01-15',
    next_renewal: '2026-03-15', trial_end_date: null, cancelled_date: null,
    notes: null, url: null, icon: '🎬', color: null, notify_days: 1,
    catalog_id: null, sort_order: 0, created_at: '', updated_at: '',
  },
  {
    id: 's2', name: 'Spotify', price: 1099, currency: 'USD', billing_cycle: 'monthly',
    custom_days: null, category_id: 'c5', status: 'active', start_date: '2023-06-01',
    next_renewal: '2026-03-01', trial_end_date: null, cancelled_date: null,
    notes: null, url: null, icon: '🎵', color: null, notify_days: 1,
    catalog_id: null, sort_order: 1, created_at: '', updated_at: '',
  },
  {
    id: 's3', name: 'iCloud+', price: 299, currency: 'USD', billing_cycle: 'monthly',
    custom_days: null, category_id: null, status: 'active', start_date: '2022-11-01',
    next_renewal: '2026-03-01', trial_end_date: null, cancelled_date: null,
    notes: null, url: null, icon: '☁️', color: null, notify_days: 1,
    catalog_id: null, sort_order: 2, created_at: '', updated_at: '',
  },
  {
    id: 's4', name: 'ChatGPT Plus', price: 2000, currency: 'USD', billing_cycle: 'monthly',
    custom_days: null, category_id: null, status: 'active', start_date: '2025-01-01',
    next_renewal: '2026-03-01', trial_end_date: null, cancelled_date: null,
    notes: null, url: null, icon: '🤖', color: null, notify_days: 1,
    catalog_id: null, sort_order: 3, created_at: '', updated_at: '',
  },
];

interface CalendarSection {
  title: string;
  totalCost: number;
  data: Subscription[];
}

function groupByWeek(subs: Subscription[]): CalendarSection[] {
  const today = new Date();
  const sections: CalendarSection[] = [];

  const thisWeekEnd = new Date(today);
  thisWeekEnd.setDate(today.getDate() + (7 - today.getDay()));

  const nextWeekEnd = new Date(thisWeekEnd);
  nextWeekEnd.setDate(thisWeekEnd.getDate() + 7);

  const buckets: { title: string; subs: Subscription[] }[] = [
    { title: 'This Week', subs: [] },
    { title: 'Next Week', subs: [] },
    { title: 'Later This Month', subs: [] },
  ];

  for (const sub of subs) {
    const [y, m, d] = sub.next_renewal.split('-').map(Number);
    const renewal = new Date(y, m - 1, d);

    if (renewal <= thisWeekEnd) {
      buckets[0].subs.push(sub);
    } else if (renewal <= nextWeekEnd) {
      buckets[1].subs.push(sub);
    } else {
      buckets[2].subs.push(sub);
    }
  }

  for (const bucket of buckets) {
    if (bucket.subs.length > 0) {
      const totalCost = bucket.subs.reduce((sum, s) => sum + s.price, 0);
      sections.push({ title: bucket.title, totalCost, data: bucket.subs });
    }
  }

  return sections;
}

function formatRenewalDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export default function RenewalCalendarScreen() {
  const upcoming = useMemo(
    () => getUpcomingRenewals(MOCK_SUBSCRIPTIONS, 30),
    [],
  );
  const sections = useMemo(() => groupByWeek(upcoming), [upcoming]);

  const monthTotal = useMemo(
    () => upcoming.reduce((sum, s) => sum + s.price, 0),
    [upcoming],
  );

  return (
    <SectionList
      style={styles.container}
      sections={sections}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={
        <Card style={styles.totalCard}>
          <Text variant="caption" style={styles.totalLabel}>
            Due in next 30 days
          </Text>
          <Text variant="currency" style={styles.totalAmount}>
            {formatCents(monthTotal)}
          </Text>
          <Text variant="caption">{upcoming.length} renewals</Text>
        </Card>
      }
      renderSectionHeader={({ section }) => (
        <View style={styles.sectionHeader}>
          <Text variant="caption" style={styles.sectionTitle}>
            {section.title.toUpperCase()}
          </Text>
          <Text variant="caption" style={styles.sectionCost}>
            {formatCents(section.totalCost)}
          </Text>
        </View>
      )}
      renderItem={({ item }) => (
        <Card style={styles.card}>
          <View style={styles.row}>
            <View style={styles.left}>
              {item.icon ? (
                <Text variant="body" style={styles.icon}>{item.icon}</Text>
              ) : null}
              <View>
                <Text variant="body">{item.name}</Text>
                <Text variant="caption">{formatRenewalDate(item.next_renewal)}</Text>
              </View>
            </View>
            <Text variant="currency" style={styles.price}>
              {formatCents(item.price)}
            </Text>
          </View>
        </Card>
      )}
      contentContainerStyle={styles.content}
      stickySectionHeadersEnabled={false}
      ListEmptyComponent={
        <View style={styles.empty}>
          <Text variant="body" style={styles.emptyText}>
            No upcoming renewals
          </Text>
          <Text variant="caption">
            All clear for the next 30 days
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl,
  },
  totalCard: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  totalLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  totalAmount: {
    fontSize: typography.fontSize.xxl,
    lineHeight: typography.fontSize.xxl * typography.lineHeight.tight,
    marginBottom: spacing.xs,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionCost: {
    fontFamily: typography.fontFamily.mono,
  },
  card: {
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  icon: {
    fontSize: typography.fontSize.lg,
  },
  price: {
    fontSize: typography.fontSize.md,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
});
