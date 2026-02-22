import React, { useMemo } from 'react';
import { SectionList, View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, Card, colors, spacing, typography } from '@mybudget/ui';
import type { Subscription, SubscriptionSummary } from '@mybudget/shared';
import { formatCents, calculateSubscriptionSummary } from '@mybudget/shared';
import { SubscriptionRow } from '../../components/SubscriptionRow';

/**
 * Mock data for development. Will be replaced with SQLite queries.
 */
const MOCK_SUBSCRIPTIONS: Subscription[] = [
  {
    id: 's1', name: 'Netflix', price: 1599, currency: 'USD', billing_cycle: 'monthly',
    custom_days: null, category_id: 'c5', status: 'active', start_date: '2024-01-15',
    next_renewal: '2026-03-15', trial_end_date: null, cancelled_date: null,
    notes: null, url: null, icon: '🎬', color: '#E50914', notify_days: 1,
    catalog_id: 'netflix', sort_order: 0, created_at: '', updated_at: '',
  },
  {
    id: 's2', name: 'Spotify', price: 1099, currency: 'USD', billing_cycle: 'monthly',
    custom_days: null, category_id: 'c5', status: 'active', start_date: '2023-06-01',
    next_renewal: '2026-03-01', trial_end_date: null, cancelled_date: null,
    notes: null, url: null, icon: '🎵', color: '#1DB954', notify_days: 1,
    catalog_id: 'spotify', sort_order: 1, created_at: '', updated_at: '',
  },
  {
    id: 's3', name: 'iCloud+', price: 299, currency: 'USD', billing_cycle: 'monthly',
    custom_days: null, category_id: null, status: 'active', start_date: '2022-11-01',
    next_renewal: '2026-03-01', trial_end_date: null, cancelled_date: null,
    notes: null, url: null, icon: '☁️', color: null, notify_days: 1,
    catalog_id: 'icloud', sort_order: 2, created_at: '', updated_at: '',
  },
  {
    id: 's4', name: 'ChatGPT Plus', price: 2000, currency: 'USD', billing_cycle: 'monthly',
    custom_days: null, category_id: null, status: 'active', start_date: '2025-01-01',
    next_renewal: '2026-03-01', trial_end_date: null, cancelled_date: null,
    notes: null, url: null, icon: '🤖', color: null, notify_days: 1,
    catalog_id: 'chatgpt-plus', sort_order: 3, created_at: '', updated_at: '',
  },
  {
    id: 's5', name: 'Adobe Creative Cloud', price: 5999, currency: 'USD', billing_cycle: 'monthly',
    custom_days: null, category_id: null, status: 'paused', start_date: '2024-03-01',
    next_renewal: '2026-04-01', trial_end_date: null, cancelled_date: null,
    notes: 'Paused while on break', url: null, icon: '🎨', color: '#FF0000',
    notify_days: 1, catalog_id: 'adobe-cc', sort_order: 4, created_at: '', updated_at: '',
  },
  {
    id: 's6', name: 'Hulu', price: 1799, currency: 'USD', billing_cycle: 'monthly',
    custom_days: null, category_id: 'c5', status: 'cancelled', start_date: '2024-06-01',
    next_renewal: '2026-03-01', trial_end_date: null, cancelled_date: '2026-02-01',
    notes: null, url: null, icon: '📺', color: null, notify_days: 1,
    catalog_id: 'hulu', sort_order: 5, created_at: '', updated_at: '',
  },
];

interface Section {
  title: string;
  data: Subscription[];
}

function groupByStatus(subs: Subscription[]): Section[] {
  const active = subs.filter((s) => s.status === 'active');
  const trial = subs.filter((s) => s.status === 'trial');
  const paused = subs.filter((s) => s.status === 'paused');
  const cancelled = subs.filter((s) => s.status === 'cancelled');

  const sections: Section[] = [];
  if (active.length > 0) sections.push({ title: 'Active', data: active });
  if (trial.length > 0) sections.push({ title: 'Trial', data: trial });
  if (paused.length > 0) sections.push({ title: 'Paused', data: paused });
  if (cancelled.length > 0) sections.push({ title: 'Cancelled', data: cancelled });
  return sections;
}

function CostSummary({ summary }: { summary: SubscriptionSummary }) {
  return (
    <Card style={styles.summaryCard}>
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <Text variant="currency" style={styles.summaryAmount}>
            {formatCents(summary.monthlyTotal)}
          </Text>
          <Text variant="caption">per month</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text variant="currency" style={styles.summaryAmount}>
            {formatCents(summary.annualTotal)}
          </Text>
          <Text variant="caption">per year</Text>
        </View>
      </View>
      <Text variant="caption" style={styles.activeCount}>
        {summary.activeCount} active of {summary.totalCount} total
      </Text>
    </Card>
  );
}

export default function SubscriptionsScreen() {
  const router = useRouter();
  const summary = useMemo(
    () => calculateSubscriptionSummary(MOCK_SUBSCRIPTIONS),
    [],
  );
  const sections = useMemo(
    () => groupByStatus(MOCK_SUBSCRIPTIONS),
    [],
  );

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<CostSummary summary={summary} />}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text variant="caption" style={styles.sectionTitle}>
              {section.title.toUpperCase()}
            </Text>
          </View>
        )}
        renderItem={({ item, index }) => (
          <Card style={styles.card}>
            {index > 0 && <View style={styles.divider} />}
            <SubscriptionRow
              subscription={item}
              onPress={() => {}}
            />
          </Card>
        )}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="body" style={styles.emptyText}>
              No subscriptions yet
            </Text>
            <Text variant="caption">
              Tap + to track your first subscription
            </Text>
          </View>
        }
      />

      <Pressable
        style={styles.fab}
        onPress={() => router.push('/add-subscription')}
      >
        <Text variant="body" style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xxl + spacing.xxl,
  },
  summaryCard: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.sm,
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryAmount: {
    fontSize: typography.fontSize.xl,
    lineHeight: typography.fontSize.xl * typography.lineHeight.tight,
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  activeCount: {
    textAlign: 'center',
  },
  sectionHeader: {
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  sectionTitle: {
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  card: {
    padding: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyText: {
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  fab: {
    position: 'absolute',
    right: spacing.md,
    bottom: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
    color: colors.background,
    lineHeight: 30,
    fontWeight: '300',
  },
});
