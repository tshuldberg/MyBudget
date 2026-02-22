import React, { useState, useCallback } from 'react';
import { ScrollView, View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, Input, Button, Card, colors, spacing, typography } from '@mybudget/ui';

type AmountMode = 'outflow' | 'inflow';

/**
 * Mock data for development. Will be replaced with SQLite queries.
 */
const MOCK_ACCOUNTS = [
  { id: 'a1', name: 'Checking' },
  { id: 'a2', name: 'Savings' },
  { id: 'a3', name: 'Credit Card' },
];

const MOCK_CATEGORIES = [
  { id: 'c1', name: 'Rent', emoji: '🏠' },
  { id: 'c2', name: 'Groceries', emoji: '🛒' },
  { id: 'c3', name: 'Utilities', emoji: '⚡' },
  { id: 'c4', name: 'Dining Out', emoji: '🍕' },
  { id: 'c5', name: 'Entertainment', emoji: '🎮' },
  { id: 'c6', name: 'Shopping', emoji: '🛍️' },
];

export default function AddTransactionScreen() {
  const router = useRouter();
  const [amountMode, setAmountMode] = useState<AmountMode>('outflow');
  const [amount, setAmount] = useState('');
  const [payee, setPayee] = useState('');
  const [memo, setMemo] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(MOCK_ACCOUNTS[0].id);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const selectedCategory = MOCK_CATEGORIES.find((c) => c.id === selectedCategoryId);
  const selectedAccount = MOCK_ACCOUNTS.find((a) => a.id === selectedAccountId);

  const canSave = amount.length > 0 && payee.length > 0;

  const handleSave = useCallback(() => {
    // Will wire to createTransaction() once data layer is connected
    router.back();
  }, [router]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      {/* Amount mode toggle */}
      <View style={styles.modeToggle}>
        <Pressable
          onPress={() => setAmountMode('outflow')}
          style={[styles.modeBtn, amountMode === 'outflow' && styles.modeBtnActive]}
        >
          <Text
            variant="body"
            style={[styles.modeBtnText, amountMode === 'outflow' && styles.modeBtnTextActive]}
          >
            Outflow
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setAmountMode('inflow')}
          style={[styles.modeBtn, amountMode === 'inflow' && styles.modeBtnActiveInflow]}
        >
          <Text
            variant="body"
            style={[styles.modeBtnText, amountMode === 'inflow' && styles.modeBtnTextActive]}
          >
            Inflow
          </Text>
        </Pressable>
      </View>

      {/* Amount input */}
      <View style={styles.amountContainer}>
        <Text
          variant="currency"
          style={[
            styles.dollarSign,
            amountMode === 'inflow' ? styles.inflowColor : styles.outflowColor,
          ]}
        >
          {amountMode === 'inflow' ? '+$' : '-$'}
        </Text>
        <Input
          label="Amount"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          style={styles.amountInput}
        />
      </View>

      {/* Payee */}
      <Input
        label="Payee"
        value={payee}
        onChangeText={setPayee}
        autoCapitalize="words"
        style={styles.field}
      />

      {/* Account picker */}
      <Text variant="caption" style={styles.fieldLabel}>Account</Text>
      <View style={styles.chipRow}>
        {MOCK_ACCOUNTS.map((acc) => (
          <Pressable
            key={acc.id}
            onPress={() => setSelectedAccountId(acc.id)}
            style={[
              styles.chip,
              selectedAccountId === acc.id && styles.chipActive,
            ]}
          >
            <Text
              variant="caption"
              style={[
                styles.chipText,
                selectedAccountId === acc.id && styles.chipTextActive,
              ]}
            >
              {acc.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Category picker */}
      <Text variant="caption" style={styles.fieldLabel}>Category</Text>
      <View style={styles.chipRow}>
        {MOCK_CATEGORIES.map((cat) => (
          <Pressable
            key={cat.id}
            onPress={() => setSelectedCategoryId(cat.id)}
            style={[
              styles.chip,
              selectedCategoryId === cat.id && styles.chipActive,
            ]}
          >
            <Text
              variant="caption"
              style={[
                styles.chipText,
                selectedCategoryId === cat.id && styles.chipTextActive,
              ]}
            >
              {cat.emoji} {cat.name}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Date */}
      <Input
        label="Date"
        value={date}
        onChangeText={setDate}
        style={styles.field}
      />

      {/* Memo */}
      <Input
        label="Memo (optional)"
        value={memo}
        onChangeText={setMemo}
        style={styles.field}
      />

      {/* Save */}
      <Button
        label="Save Transaction"
        onPress={handleSave}
        disabled={!canSave}
        style={styles.saveBtn}
      />
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
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 8,
    padding: 2,
    marginBottom: spacing.lg,
  },
  modeBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: 6,
  },
  modeBtnActive: {
    backgroundColor: colors.coral,
  },
  modeBtnActiveInflow: {
    backgroundColor: colors.income,
  },
  modeBtnText: {
    color: colors.textMuted,
  },
  modeBtnTextActive: {
    color: colors.background,
    fontWeight: typography.fontWeight.semibold,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  dollarSign: {
    fontSize: typography.fontSize.xxl,
  },
  inflowColor: {
    color: colors.income,
  },
  outflowColor: {
    color: colors.coral,
  },
  amountInput: {
    flex: 1,
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
  saveBtn: {
    marginTop: spacing.md,
  },
});
