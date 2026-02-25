import React from 'react';
import { ScrollView, View, Pressable, Alert, StyleSheet } from 'react-native';
import { Text, Card, colors, spacing, typography } from '@mybudget/ui';
import type { Account } from '@mybudget/shared';
import { formatCents } from '@mybudget/shared';
import { useAccounts } from '../../hooks';

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
  const { accounts, totalBalance } = useAccounts();

  const handleAccountPress = (account: Account) => {
    Alert.alert(
      account.name,
      `Account details and editing for ${account.name} will be available in an upcoming update.`,
    );
  };

  const handleAddAccount = () => {
    Alert.alert(
      'Add Account',
      'Guided account creation is coming soon. For now, accounts are managed through onboarding and sample data.',
    );
  };

  const budgetAccounts = accounts.filter((a) => a.type !== 'credit_card');
  const creditCards = accounts.filter((a) => a.type === 'credit_card');

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
            <AccountRow account={account} onPress={() => handleAccountPress(account)} />
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
                <AccountRow account={account} onPress={() => handleAccountPress(account)} />
              </View>
            ))}
          </Card>
        </>
      )}

      {/* Add account button */}
      <Pressable style={styles.addBtn} onPress={handleAddAccount}>
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
