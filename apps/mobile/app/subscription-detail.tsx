import React, { useState } from 'react';
import { ScrollView, View, Alert, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Text, Card, Badge, Button, colors, spacing, typography } from '@mybudget/ui';
import type { Subscription } from '@mybudget/shared';
import { formatCents, normalizeToMonthly, normalizeToAnnual } from '@mybudget/shared';

/**
 * Mock data. Will be replaced with getSubscriptionById() query.
 */
const MOCK_SUB: Subscription = {
  id: 's1', name: 'Netflix', price: 1599, currency: 'USD', billing_cycle: 'monthly',
  custom_days: null, category_id: 'c5', status: 'active', start_date: '2024-01-15',
  next_renewal: '2026-03-15', trial_end_date: null, cancelled_date: null,
  notes: 'Standard plan with ads', url: 'https://netflix.com', icon: '🎬',
  color: '#E50914', notify_days: 1, catalog_id: 'netflix', sort_order: 0,
  created_at: '2024-01-15T00:00:00Z', updated_at: '2026-01-15T00:00:00Z',
};

const MOCK_PRICE_HISTORY = [
  { price: 1599, date: '2025-06-01', label: 'Current' },
  { price: 1499, date: '2024-06-01', label: 'Previous' },
  { price: 999, date: '2024-01-15', label: 'Original' },
];

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text variant="caption">{label}</Text>
      <Text variant="body">{value}</Text>
    </View>
  );
}

function formatFullDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatBillingCycle(cycle: string): string {
  return cycle.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SubscriptionDetailScreen() {
  const router = useRouter();
  const sub = MOCK_SUB; // Will use useLocalSearchParams + query

  const monthly = normalizeToMonthly(sub.price, sub.billing_cycle, sub.custom_days);
  const annual = normalizeToAnnual(sub.price, sub.billing_cycle, sub.custom_days);

  const handlePause = () => {
    // Will wire to pauseSubscription()
    Alert.alert('Pause', `Pause ${sub.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Pause', onPress: () => {} },
    ]);
  };

  const handleCancel = () => {
    // Will wire to cancelSubscription()
    Alert.alert('Cancel', `Cancel ${sub.name}? This cannot be undone.`, [
      { text: 'Keep', style: 'cancel' },
      { text: 'Cancel Subscription', style: 'destructive', onPress: () => {} },
    ]);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Header */}
      <View style={styles.header}>
        {sub.icon ? (
          <Text variant="body" style={styles.headerIcon}>{sub.icon}</Text>
        ) : null}
        <Text variant="heading" style={styles.headerName}>{sub.name}</Text>
        <Badge status={sub.status} />
      </View>

      {/* Price card */}
      <Card style={styles.priceCard}>
        <Text variant="currency" style={styles.mainPrice}>
          {formatCents(sub.price)}
        </Text>
        <Text variant="caption">
          per {sub.billing_cycle.replace('_', '-')}
        </Text>
        <View style={styles.priceNorm}>
          <View style={styles.priceNormItem}>
            <Text variant="caption">Monthly</Text>
            <Text variant="currency" style={styles.normValue}>
              {formatCents(monthly)}
            </Text>
          </View>
          <View style={styles.priceNormDivider} />
          <View style={styles.priceNormItem}>
            <Text variant="caption">Annual</Text>
            <Text variant="currency" style={styles.normValue}>
              {formatCents(annual)}
            </Text>
          </View>
        </View>
      </Card>

      {/* Details */}
      <Card style={styles.detailsCard}>
        <DetailRow label="Billing Cycle" value={formatBillingCycle(sub.billing_cycle)} />
        <View style={styles.divider} />
        <DetailRow label="Next Renewal" value={formatFullDate(sub.next_renewal)} />
        <View style={styles.divider} />
        <DetailRow label="Start Date" value={formatFullDate(sub.start_date)} />
        {sub.notify_days > 0 && (
          <>
            <View style={styles.divider} />
            <DetailRow
              label="Reminder"
              value={`${sub.notify_days} day${sub.notify_days > 1 ? 's' : ''} before renewal`}
            />
          </>
        )}
        {sub.notes && (
          <>
            <View style={styles.divider} />
            <DetailRow label="Notes" value={sub.notes} />
          </>
        )}
      </Card>

      {/* Price history */}
      <Text variant="caption" style={styles.sectionHeader}>PRICE HISTORY</Text>
      <Card style={styles.historyCard}>
        {MOCK_PRICE_HISTORY.map((entry, index) => (
          <View key={entry.date}>
            {index > 0 && <View style={styles.divider} />}
            <View style={styles.historyRow}>
              <View>
                <Text variant="body">{formatCents(entry.price)}</Text>
                <Text variant="caption">{entry.label}</Text>
              </View>
              <Text variant="caption">{formatFullDate(entry.date)}</Text>
            </View>
          </View>
        ))}
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        {sub.status === 'active' && (
          <Button
            variant="secondary"
            label="Pause Subscription"
            onPress={handlePause}
          />
        )}
        {sub.status !== 'cancelled' && (
          <Button
            variant="ghost"
            label="Cancel Subscription"
            onPress={handleCancel}
            style={styles.cancelBtn}
          />
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  headerIcon: {
    fontSize: 48,
  },
  headerName: {
    fontSize: typography.fontSize.xl,
  },
  priceCard: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  mainPrice: {
    fontSize: typography.fontSize.xxl,
    lineHeight: typography.fontSize.xxl * typography.lineHeight.tight,
  },
  priceNorm: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  priceNormItem: {
    alignItems: 'center',
  },
  priceNormDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },
  normValue: {
    fontSize: typography.fontSize.md,
    marginTop: 2,
  },
  detailsCard: {
    padding: 0,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    letterSpacing: 1,
  },
  historyCard: {
    padding: 0,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
  },
  actions: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  cancelBtn: {
    opacity: 0.8,
  },
});
