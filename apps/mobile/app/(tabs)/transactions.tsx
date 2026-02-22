import React, { useState } from 'react';
import { SectionList, View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, Card, colors, spacing } from '@mybudget/ui';
import type { Transaction } from '@mybudget/shared';
import { formatCents } from '@mybudget/shared';
import { TransactionRow } from '../../components/TransactionRow';

interface TransactionDisplay {
  transaction: Transaction;
  categoryName?: string;
}

/**
 * Mock data for development. Will be replaced with SQLite queries.
 */
const MOCK_TRANSACTIONS: TransactionDisplay[] = [
  {
    transaction: {
      id: 't1', account_id: 'a1', date: '2026-02-22', payee: 'Whole Foods',
      memo: null, amount: -8523, is_cleared: true, is_transfer: false,
      transfer_id: null, created_at: '', updated_at: '',
    },
    categoryName: 'Groceries',
  },
  {
    transaction: {
      id: 't2', account_id: 'a1', date: '2026-02-21', payee: 'Netflix',
      memo: null, amount: -1599, is_cleared: true, is_transfer: false,
      transfer_id: null, created_at: '', updated_at: '',
    },
    categoryName: 'Entertainment',
  },
  {
    transaction: {
      id: 't3', account_id: 'a1', date: '2026-02-21', payee: 'Acme Corp',
      memo: 'Paycheck', amount: 325000, is_cleared: true, is_transfer: false,
      transfer_id: null, created_at: '', updated_at: '',
    },
    categoryName: 'Income',
  },
  {
    transaction: {
      id: 't4', account_id: 'a1', date: '2026-02-20', payee: 'Shell Gas Station',
      memo: null, amount: -4800, is_cleared: false, is_transfer: false,
      transfer_id: null, created_at: '', updated_at: '',
    },
    categoryName: 'Transportation',
  },
  {
    transaction: {
      id: 't5', account_id: 'a1', date: '2026-02-20', payee: 'Transfer to Savings',
      memo: null, amount: -50000, is_cleared: true, is_transfer: true,
      transfer_id: 't5b', created_at: '', updated_at: '',
    },
  },
  {
    transaction: {
      id: 't6', account_id: 'a1', date: '2026-02-19', payee: 'Chipotle',
      memo: null, amount: -1245, is_cleared: true, is_transfer: false,
      transfer_id: null, created_at: '', updated_at: '',
    },
    categoryName: 'Dining Out',
  },
  {
    transaction: {
      id: 't7', account_id: 'a1', date: '2026-02-18', payee: 'Landlord',
      memo: 'Feb rent', amount: -200000, is_cleared: true, is_transfer: false,
      transfer_id: null, created_at: '', updated_at: '',
    },
    categoryName: 'Rent',
  },
];

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
  const sections = groupByDate(MOCK_TRANSACTIONS);

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
