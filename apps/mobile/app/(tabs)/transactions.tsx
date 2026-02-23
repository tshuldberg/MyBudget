import React, { useMemo } from 'react';
import { SectionList, View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, Card, colors, spacing } from '@mybudget/ui';
import type { Transaction } from '@mybudget/shared';
import { formatCents } from '@mybudget/shared';
import { TransactionRow } from '../../components/TransactionRow';
import { useTransactions, useCategories } from '../../hooks';

interface TransactionDisplay {
  transaction: Transaction;
  categoryName?: string;
}

interface Section {
  title: string;
  data: TransactionDisplay[];
}

function groupByDate(items: TransactionDisplay[]): Section[] {
  const groups = new Map<string, TransactionDisplay[]>();
  for (const item of items) {
    const date = item.transaction.date;
    const existing = groups.get(date);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(date, [item]);
    }
  }

  return Array.from(groups.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([date, data]) => ({
      title: formatSectionDate(date),
      data,
    }));
}

function formatSectionDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

export default function TransactionsScreen() {
  const router = useRouter();
  const { transactions: txData } = useTransactions();
  const { categoryMap } = useCategories();

  const displayItems: TransactionDisplay[] = useMemo(() => {
    return txData.map(({ transaction, splits }) => {
      const catId = splits.length > 0 ? splits[0].category_id : null;
      const cat = catId ? categoryMap.get(catId) : null;
      const categoryName = transaction.is_transfer
        ? undefined
        : transaction.amount > 0
          ? 'Income'
          : cat?.name;
      return { transaction, categoryName };
    });
  }, [txData, categoryMap]);

  const sections = groupByDate(displayItems);

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.transaction.id}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text variant="caption" style={styles.sectionTitle}>
              {section.title}
            </Text>
          </View>
        )}
        renderItem={({ item, index, section }) => (
          <Card style={styles.card}>
            {index > 0 && <View style={styles.divider} />}
            <TransactionRow
              transaction={item.transaction}
              categoryName={item.categoryName}
              onPress={() => {}}
            />
          </Card>
        )}
        contentContainerStyle={styles.content}
        stickySectionHeadersEnabled={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text variant="body" style={styles.emptyText}>
              No transactions yet
            </Text>
            <Text variant="caption">
              Tap + to add your first transaction
            </Text>
          </View>
        }
      />

      <Pressable
        style={styles.fab}
        onPress={() => router.push('/add-transaction')}
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
