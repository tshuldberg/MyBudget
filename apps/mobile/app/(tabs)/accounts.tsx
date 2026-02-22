import React from 'react';
import { ScrollView, View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, Card, colors, spacing, typography } from '@mybudget/ui';
import type { Account } from '@mybudget/shared';
import { formatCents } from '@mybudget/shared';

/**
 * Mock data for development. Will be replaced with SQLite queries.
 */
const MOCK_ACCOUNTS: Account[] = [
  {
    id: 'a1', name: 'Checking', type: 'checking', balance: 352480,
    sort_order: 0, is_active: true, created_at: '', updated_at: '',
  },
  {
    id: 'a2', name: 'Savings', type: 'savings', balance: 1250000,
    sort_order: 1, is_active: true, created_at: '', updated_at: '',
  },
  {
    id: 'a3', name: 'Credit Card', type: 'credit_card', balance: -48523,
    sort_order: 2, is_active: true, created_at: '', updated_at: '',
  },
  {
    id: 'a4', name: 'Cash', type: 'cash', balance: 8500,
    sort_order: 3, is_active: true, created_at: '', updated_at: '',
  },
];

const typeIcons: Record<string, string> = {
  checking: '🏦',
  savings: '💰',
  credit_card: '💳',
  cash: '💵',
};

function AccountRow({ account, onPress }: { account: Account; onPress: () => void }) {
  const isNegative = account.balance < 0;
  const isCreditCard = account.type === 'credit_card';

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowLeft}>
        <Text variant="body" style={styles.icon}>
          {typeIcons[account.type] ?? '🏦'}
        </Text>
        <View>
          <Text variant="body" style={styles.accountName}>{account.name}</Text>
          <Text variant="caption">{account.type.replace('_', ' ')}</Text>
        </View>
      </View>
      <Text
        variant="currency"
        style={[
          styles.balance,
          isNegative && !isCreditCard && styles.negativeBalance,
        ]}
      >
        {formatCents(account.balance)}
      </Text>
    </Pressable>
  );
}

export default function AccountsScreen() {
  const router = useRouter();

  const totalBalance = MOCK_ACCOUNTS.reduce((sum, a) => sum + a.balance, 0);
  const budgetAccounts = MOCK_ACCOUNTS.filter((a) => a.type !== 'credit_card');
  const creditCards = MOCK_ACCOUNTS.filter((a) => a.type === 'credit_card');

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {/* Net worth summary */}
      <Card style={styles.summaryCard}>
        <Text variant="caption" style={styles.summaryLabel}>Net Worth</Text>
        <Text
          variant="currency"
          style={[
            styles.summaryAmount,
            totalBalance < 0 && styles.negativeBalance,
          ]}
        >
          {formatCents(totalBalance)}
        </Text>
      </Card>

      {/* Budget accounts */}
      <Text variant="caption" style={styles.sectionHeader}>BUDGET ACCOUNTS</Text>
      <Card style={styles.section}>
        {budgetAccounts.map((account, index) => (
          <View key={account.id}>
            {index > 0 && <View style={styles.divider} />}
            <AccountRow account={account} onPress={() => {}} />
          </View>
        ))}
      </Card>

      {/* Credit cards */}
      {creditCards.length > 0 && (
        <>
          <Text variant="caption" style={styles.sectionHeader}>CREDIT CARDS</Text>
          <Card style={styles.section}>
            {creditCards.map((account, index) => (
              <View key={account.id}>
                {index > 0 && <View style={styles.divider} />}
                <AccountRow account={account} onPress={() => {}} />
              </View>
            ))}
          </Card>
        </>
      )}

      {/* Add account button */}
      <Pressable style={styles.addBtn} onPress={() => {}}>
        <Text variant="body" style={styles.addBtnText}>+ Add Account</Text>
      </Pressable>
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
  summaryCard: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  summaryLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  summaryAmount: {
    fontSize: typography.fontSize.xxl,
    lineHeight: typography.fontSize.xxl * typography.lineHeight.tight,
  },
  sectionHeader: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    letterSpacing: 1,
  },
  section: {
    padding: 0,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.md,
    minHeight: 56,
  },
  pressed: {
    backgroundColor: 'rgba(78, 205, 196, 0.06)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  icon: {
    fontSize: typography.fontSize.lg,
  },
  accountName: {
    fontWeight: typography.fontWeight.medium,
  },
  balance: {
    fontSize: typography.fontSize.md,
  },
  negativeBalance: {
    color: colors.coral,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },
  addBtn: {
    marginTop: spacing.lg,
    alignItems: 'center',
    paddingVertical: spacing.md,
  },
  addBtnText: {
    color: colors.teal,
    fontWeight: typography.fontWeight.semibold,
  },
});
