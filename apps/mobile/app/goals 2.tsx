import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Pressable,
  Alert,
  TextInput,
  StyleSheet,
} from 'react-native';
import { Text, Card, ProgressBar, BottomSheet, colors, spacing, typography, radii } from '@mybudget/ui';
import { formatCents } from '@mybudget/shared';
import { useGoals } from '../hooks';

const STATUS_LABELS: Record<string, string> = {
  completed: 'Complete',
  on_track: 'On Track',
  behind: 'Behind',
  overdue: 'Overdue',
};

const STATUS_COLORS: Record<string, string> = {
  completed: colors.teal,
  on_track: colors.teal,
  behind: colors.amber,
  overdue: colors.coral,
};

export default function GoalsScreen() {
  const { goalsWithProgress, createGoal, deleteGoal, allocateToGoal } = useGoals();
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [allocGoalId, setAllocGoalId] = useState<string | null>(null);
  const [allocAmount, setAllocAmount] = useState('');

  // Add goal form state
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [newDate, setNewDate] = useState('');

  function handleCreateGoal() {
    if (!newName.trim() || !newTarget) return;
    const cents = Math.round(parseFloat(newTarget) * 100);
    if (cents <= 0) return;
    createGoal({
      name: newName.trim(),
      target_amount_cents: cents,
      target_date: newDate || null,
      category_id: null,
    });
    setNewName('');
    setNewTarget('');
    setNewDate('');
    setShowAddSheet(false);
  }

  function handleAllocate() {
    if (!allocGoalId || !allocAmount) return;
    const cents = Math.round(parseFloat(allocAmount) * 100);
    if (cents <= 0) return;
    allocateToGoal(allocGoalId, cents);
    setAllocGoalId(null);
    setAllocAmount('');
  }

  function handleDelete(id: string, name: string) {
    Alert.alert('Delete Goal', `Delete "${name}"? This cannot be undone.`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteGoal(id) },
    ]);
  }

  const completedCount = goalsWithProgress.filter((i) => i.status === 'completed').length;
  const totalSaved = goalsWithProgress.reduce((s, i) => s + i.goal.current_amount_cents, 0);
  const totalTarget = goalsWithProgress.reduce((s, i) => s + i.goal.target_amount_cents, 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Add button */}
      <Pressable style={styles.addButton} onPress={() => setShowAddSheet(true)}>
        <Text variant="body" style={styles.addButtonText}>+ New Goal</Text>
      </Pressable>

      {goalsWithProgress.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text variant="body" style={styles.emptyIcon}>🎯</Text>
          <Text variant="body" style={styles.emptyTitle}>No goals yet</Text>
          <Text variant="caption" style={styles.emptyText}>
            Create a savings goal to start tracking your progress.
          </Text>
        </Card>
      ) : (
        <>
          {/* Summary */}
          <View style={styles.summaryRow}>
            <Card style={styles.summaryCard}>
              <Text variant="caption" style={styles.summaryLabel}>Saved</Text>
              <Text variant="currency" style={styles.summaryValue}>{formatCents(totalSaved)}</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text variant="caption" style={styles.summaryLabel}>Target</Text>
              <Text variant="currency" style={styles.summaryValue}>{formatCents(totalTarget)}</Text>
            </Card>
            <Card style={styles.summaryCard}>
              <Text variant="caption" style={styles.summaryLabel}>Done</Text>
              <Text variant="body" style={styles.summaryValue}>
                {completedCount}/{goalsWithProgress.length}
              </Text>
            </Card>
          </View>

          {/* Goal cards */}
          {goalsWithProgress.map(({ goal, progress, status, suggestedMonthly }) => (
            <Card key={goal.id} style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <Text variant="body" style={styles.goalName}>{goal.name}</Text>
                <View style={[styles.badge, { backgroundColor: `${STATUS_COLORS[status] ?? colors.teal}1A` }]}>
                  <Text variant="caption" style={[styles.badgeText, { color: STATUS_COLORS[status] ?? colors.teal }]}>
                    {STATUS_LABELS[status] ?? status}
                  </Text>
                </View>
              </View>

              <View style={styles.goalAmounts}>
                <Text variant="currency" style={styles.goalCurrent}>{formatCents(progress.currentAmount)}</Text>
                <Text variant="caption" style={styles.goalTarget}> of {formatCents(progress.targetAmount)}</Text>
              </View>

              <ProgressBar progress={Math.min(progress.percentage, 100)} height={6} />

              <View style={styles.goalMeta}>
                <Text variant="caption">{progress.percentage}% funded</Text>
                {goal.target_date && (
                  <Text variant="caption">Due {goal.target_date}</Text>
                )}
                {suggestedMonthly !== null && status !== 'completed' && (
                  <Text variant="caption">{formatCents(suggestedMonthly)}/mo</Text>
                )}
              </View>

              <View style={styles.goalActions}>
                {status !== 'completed' && (
                  <Pressable
                    style={styles.actionBtn}
                    onPress={() => { setAllocGoalId(goal.id); setAllocAmount(''); }}
                  >
                    <Text variant="caption" style={styles.actionBtnText}>+ Add Funds</Text>
                  </Pressable>
                )}
                <Pressable
                  style={styles.deleteBtn}
                  onPress={() => handleDelete(goal.id, goal.name)}
                >
                  <Text variant="caption" style={styles.deleteBtnText}>Delete</Text>
                </Pressable>
              </View>
            </Card>
          ))}
        </>
      )}

      {/* Add Goal Bottom Sheet */}
      <BottomSheet visible={showAddSheet} onClose={() => setShowAddSheet(false)}>
        <Text variant="body" style={styles.sheetTitle}>New Goal</Text>
        <View style={styles.formGroup}>
          <Text variant="caption" style={styles.inputLabel}>Goal Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Emergency Fund"
            placeholderTextColor={colors.textMuted}
            value={newName}
            onChangeText={setNewName}
          />
        </View>
        <View style={styles.formGroup}>
          <Text variant="caption" style={styles.inputLabel}>Target Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="1000.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={newTarget}
            onChangeText={setNewTarget}
          />
        </View>
        <View style={styles.formGroup}>
          <Text variant="caption" style={styles.inputLabel}>Target Date (optional, YYYY-MM-DD)</Text>
          <TextInput
            style={styles.input}
            placeholder="2026-12-31"
            placeholderTextColor={colors.textMuted}
            value={newDate}
            onChangeText={setNewDate}
          />
        </View>
        <Pressable
          style={[styles.submitBtn, (!newName.trim() || !newTarget) && styles.submitBtnDisabled]}
          onPress={handleCreateGoal}
          disabled={!newName.trim() || !newTarget}
        >
          <Text variant="body" style={styles.submitBtnText}>Create Goal</Text>
        </Pressable>
      </BottomSheet>

      {/* Allocate Funds Bottom Sheet */}
      <BottomSheet visible={allocGoalId !== null} onClose={() => setAllocGoalId(null)}>
        <Text variant="body" style={styles.sheetTitle}>Add Funds</Text>
        <View style={styles.formGroup}>
          <Text variant="caption" style={styles.inputLabel}>Amount</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            value={allocAmount}
            onChangeText={setAllocAmount}
          />
        </View>
        <Pressable
          style={[styles.submitBtn, (!allocAmount || parseFloat(allocAmount) <= 0) && styles.submitBtnDisabled]}
          onPress={handleAllocate}
          disabled={!allocAmount || parseFloat(allocAmount) <= 0}
        >
          <Text variant="body" style={styles.submitBtnText}>Add Funds</Text>
        </Pressable>
      </BottomSheet>
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
  addButton: {
    alignSelf: 'flex-end',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.teal,
    borderRadius: radii.sm,
    marginBottom: spacing.md,
  },
  addButtonText: {
    color: colors.background,
    fontWeight: typography.fontWeight.semibold,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  emptyIcon: {
    fontSize: typography.fontSize.hero,
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.xs,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  summaryLabel: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  summaryValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semibold,
  },
  goalCard: {
    marginBottom: spacing.sm,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  goalName: {
    fontWeight: typography.fontWeight.semibold,
    flex: 1,
    marginRight: spacing.sm,
  },
  badge: {
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radii.full,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
  },
  goalAmounts: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: spacing.sm,
  },
  goalCurrent: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  goalTarget: {
    color: colors.textMuted,
  },
  goalMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.sm,
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  goalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  actionBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.sm,
    borderWidth: 1,
    borderColor: colors.teal,
  },
  actionBtnText: {
    color: colors.teal,
    fontWeight: typography.fontWeight.semibold,
  },
  deleteBtn: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  deleteBtnText: {
    color: colors.coral,
    fontWeight: typography.fontWeight.medium,
  },
  sheetTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    marginBottom: spacing.md,
  },
  formGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
    fontSize: typography.fontSize.md,
  },
  submitBtn: {
    backgroundColor: colors.teal,
    borderRadius: radii.sm,
    paddingVertical: spacing.sm + spacing.xs,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitBtnDisabled: {
    backgroundColor: colors.tealDisabled,
    opacity: 0.6,
  },
  submitBtnText: {
    color: colors.background,
    fontWeight: typography.fontWeight.semibold,
  },
});
