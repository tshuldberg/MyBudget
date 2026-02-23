import React, { useState, useMemo, useCallback } from 'react';
import { ScrollView, View, FlatList, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, Input, Button, Card, Badge, colors, spacing, typography } from '@mybudget/ui';
import type { CatalogEntry } from '@mybudget/shared';
import { searchCatalog, getPopularEntries, formatCents, calculateNextRenewal } from '@mybudget/shared';
import { useSubscriptions } from '../hooks';

type Step = 'search' | 'form';

const BILLING_CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'semi_annual', label: 'Semi-Annual' },
  { value: 'annual', label: 'Annual' },
  { value: 'weekly', label: 'Weekly' },
] as const;

export default function AddSubscriptionScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('search');
  const [searchQuery, setSearchQuery] = useState('');

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [billingCycle, setBillingCycle] = useState<string>('monthly');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [catalogId, setCatalogId] = useState<string | null>(null);

  const searchResults = useMemo(() => {
    if (searchQuery.length === 0) return getPopularEntries();
    return searchCatalog(searchQuery);
  }, [searchQuery]);

  const handleSelectCatalogEntry = useCallback((entry: CatalogEntry) => {
    setName(entry.name);
    setPrice((entry.defaultPrice / 100).toFixed(2));
    setBillingCycle(entry.billingCycle);
    setCatalogId(entry.id);
    setStep('form');
  }, []);

  const handleCustomEntry = useCallback(() => {
    setName('');
    setPrice('');
    setCatalogId(null);
    setStep('form');
  }, []);

  const { createSubscription } = useSubscriptions();
  const canSave = name.length > 0 && price.length > 0;

  const handleSave = useCallback(() => {
    const cents = Math.round(parseFloat(price) * 100);
    if (isNaN(cents) || cents <= 0) return;

    const cycle = billingCycle as 'weekly' | 'monthly' | 'quarterly' | 'semi_annual' | 'annual';
    const nextRenewal = calculateNextRenewal(startDate, cycle);

    createSubscription({
      name,
      price: cents,
      billing_cycle: cycle,
      status: 'active',
      start_date: startDate,
      next_renewal: nextRenewal,
      notes: notes || null,
      catalog_id: catalogId,
    });
    router.back();
  }, [router, name, price, billingCycle, startDate, notes, catalogId, createSubscription]);

  if (step === 'search') {
    return (
      <View style={styles.container}>
        <Input
          label="Search subscriptions"
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoFocus
          style={styles.searchInput}
        />

        <Pressable onPress={handleCustomEntry} style={styles.customRow}>
          <Text variant="body" style={styles.customText}>
            + Add custom subscription
          </Text>
        </Pressable>

        <Text variant="caption" style={styles.sectionLabel}>
          {searchQuery ? 'Results' : 'Popular'}
        </Text>

        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => handleSelectCatalogEntry(item)}
              style={({ pressed }) => [styles.catalogRow, pressed && styles.pressed]}
            >
              <View style={styles.catalogLeft}>
                <Text variant="body">{item.name}</Text>
                <Text variant="caption">{item.category}</Text>
              </View>
              <View style={styles.catalogRight}>
                <Text variant="currency" style={styles.catalogPrice}>
                  {formatCents(item.defaultPrice)}
                </Text>
                <Text variant="caption">/{item.billingCycle === 'annual' ? 'yr' : 'mo'}</Text>
              </View>
            </Pressable>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <Text variant="caption" style={styles.emptyText}>
              No matches found
            </Text>
          }
        />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.formContent}
      keyboardShouldPersistTaps="handled"
    >
      {catalogId && (
        <Card style={styles.catalogBadge}>
          <Text variant="caption" style={styles.catalogBadgeText}>
            From catalog
          </Text>
        </Card>
      )}

      <Input
        label="Name"
        value={name}
        onChangeText={setName}
        style={styles.field}
      />

      <Input
        label="Price"
        value={price}
        onChangeText={setPrice}
        keyboardType="decimal-pad"
        style={styles.field}
      />

      {/* Billing cycle picker */}
      <Text variant="caption" style={styles.fieldLabel}>Billing Cycle</Text>
      <View style={styles.chipRow}>
        {BILLING_CYCLES.map((cycle) => (
          <Pressable
            key={cycle.value}
            onPress={() => setBillingCycle(cycle.value)}
            style={[
              styles.chip,
              billingCycle === cycle.value && styles.chipActive,
            ]}
          >
            <Text
              variant="caption"
              style={[
                styles.chipText,
                billingCycle === cycle.value && styles.chipTextActive,
              ]}
            >
              {cycle.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <Input
        label="Start Date"
        value={startDate}
        onChangeText={setStartDate}
        style={styles.field}
      />

      <Input
        label="Notes (optional)"
        value={notes}
        onChangeText={setNotes}
        multiline
        style={styles.field}
      />

      <View style={styles.buttonRow}>
        <Button
          variant="ghost"
          label="Back"
          onPress={() => setStep('search')}
          style={styles.backBtn}
        />
        <Button
          label="Save Subscription"
          onPress={handleSave}
          disabled={!canSave}
          style={styles.saveBtn}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  searchInput: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
  },
  customRow: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  customText: {
    color: colors.teal,
    fontWeight: typography.fontWeight.medium,
  },
  sectionLabel: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  listContent: {
    paddingBottom: spacing.xxl,
  },
  catalogRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.lg,
  },
  pressed: {
    backgroundColor: 'rgba(78, 205, 196, 0.06)',
  },
  catalogLeft: {
    flex: 1,
  },
  catalogRight: {
    alignItems: 'flex-end',
  },
  catalogPrice: {
    fontSize: typography.fontSize.md,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: spacing.xl,
  },
  formContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
  },
  catalogBadge: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.md,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderColor: colors.teal,
  },
  catalogBadgeText: {
    color: colors.teal,
  },
  field: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 9999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    borderColor: colors.teal,
  },
  chipText: {
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.teal,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  backBtn: {
    flex: 0,
  },
  saveBtn: {
    flex: 1,
  },
});
