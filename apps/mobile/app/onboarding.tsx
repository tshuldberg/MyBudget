import React, { useState, useCallback } from 'react';
import { View, Pressable, Animated, StyleSheet, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Text, Button, Input, Card, colors, spacing, typography } from '@mybudget/ui';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type Step = 'welcome' | 'add-account' | 'add-categories' | 'done';

const STEPS: Step[] = ['welcome', 'add-account', 'add-categories', 'done'];

const SUGGESTED_CATEGORIES = [
  { emoji: '🏠', name: 'Rent / Mortgage' },
  { emoji: '🛒', name: 'Groceries' },
  { emoji: '⚡', name: 'Utilities' },
  { emoji: '🚗', name: 'Transportation' },
  { emoji: '🍕', name: 'Dining Out' },
  { emoji: '🎮', name: 'Entertainment' },
  { emoji: '👕', name: 'Shopping' },
  { emoji: '🏥', name: 'Healthcare' },
  { emoji: '🛟', name: 'Emergency Fund' },
  { emoji: '✈️', name: 'Vacation' },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState<Step>('welcome');
  const [accountName, setAccountName] = useState('Checking');
  const [accountBalance, setAccountBalance] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(['Rent / Mortgage', 'Groceries', 'Utilities', 'Dining Out', 'Emergency Fund']),
  );

  const stepIndex = STEPS.indexOf(step);

  const toggleCategory = useCallback((name: string) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }, []);

  const handleFinish = useCallback(() => {
    // Will wire to createAccount() + createCategoryGroup() + createCategory()
    router.replace('/(tabs)/budget');
  }, [router]);

  return (
    <View style={styles.container}>
      {/* Progress indicator */}
      <View style={styles.progress}>
        {STEPS.map((s, i) => (
          <View
            key={s}
            style={[styles.dot, i <= stepIndex && styles.dotActive]}
          />
        ))}
      </View>

      {step === 'welcome' && (
        <View style={styles.page}>
          <Text variant="heading" style={styles.title}>
            Welcome to MyBudget
          </Text>
          <Text variant="body" style={styles.subtitle}>
            Privacy-first envelope budgeting with subscription tracking.
            All your data stays on your device.
          </Text>
          <View style={styles.features}>
            <FeatureItem icon="💰" text="Envelope budgeting that works" />
            <FeatureItem icon="🔄" text="Track every subscription" />
            <FeatureItem icon="📊" text="See where your money goes" />
            <FeatureItem icon="🔒" text="100% local, 100% private" />
          </View>
          <Button
            label="Get Started"
            onPress={() => setStep('add-account')}
            style={styles.nextBtn}
          />
        </View>
      )}

      {step === 'add-account' && (
        <View style={styles.page}>
          <Text variant="heading" style={styles.title}>
            Add Your First Account
          </Text>
          <Text variant="body" style={styles.subtitle}>
            Start with your primary checking account. You can add more later.
          </Text>
          <Input
            label="Account Name"
            value={accountName}
            onChangeText={setAccountName}
            style={styles.field}
          />
          <Input
            label="Current Balance"
            value={accountBalance}
            onChangeText={setAccountBalance}
            keyboardType="decimal-pad"
            style={styles.field}
          />
          <View style={styles.buttonRow}>
            <Button
              variant="ghost"
              label="Back"
              onPress={() => setStep('welcome')}
            />
            <Button
              label="Next"
              onPress={() => setStep('add-categories')}
              disabled={!accountName}
              style={styles.nextBtnFlex}
            />
          </View>
        </View>
      )}

      {step === 'add-categories' && (
        <View style={styles.page}>
          <Text variant="heading" style={styles.title}>
            Choose Categories
          </Text>
          <Text variant="body" style={styles.subtitle}>
            Select the budget categories you want to track. Tap to toggle.
          </Text>
          <View style={styles.categoryGrid}>
            {SUGGESTED_CATEGORIES.map((cat) => {
              const isSelected = selectedCategories.has(cat.name);
              return (
                <Pressable
                  key={cat.name}
                  onPress={() => toggleCategory(cat.name)}
                  style={[
                    styles.categoryChip,
                    isSelected && styles.categoryChipActive,
                  ]}
                >
                  <Text variant="body" style={styles.categoryEmoji}>
                    {cat.emoji}
                  </Text>
                  <Text
                    variant="caption"
                    style={[
                      styles.categoryText,
                      isSelected && styles.categoryTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.buttonRow}>
            <Button
              variant="ghost"
              label="Back"
              onPress={() => setStep('add-account')}
            />
            <Button
              label="Next"
              onPress={() => setStep('done')}
              disabled={selectedCategories.size === 0}
              style={styles.nextBtnFlex}
            />
          </View>
        </View>
      )}

      {step === 'done' && (
        <View style={styles.page}>
          <Text variant="heading" style={styles.doneTitle}>
            You're All Set!
          </Text>
          <Text variant="body" style={styles.subtitle}>
            Your budget is ready. Start by assigning money to your categories.
          </Text>
          <Card style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text variant="caption">Account</Text>
              <Text variant="body">{accountName}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text variant="caption">Categories</Text>
              <Text variant="body">{selectedCategories.size}</Text>
            </View>
          </Card>
          <Button
            label="Start Budgeting"
            onPress={handleFinish}
            style={styles.nextBtn}
          />
        </View>
      )}
    </View>
  );
}

function FeatureItem({ icon, text }: { icon: string; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Text variant="body" style={styles.featureIcon}>{icon}</Text>
      <Text variant="body">{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.border,
  },
  dotActive: {
    backgroundColor: colors.teal,
  },
  page: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  doneTitle: {
    textAlign: 'center',
    marginBottom: spacing.md,
    fontSize: typography.fontSize.xxl,
  },
  subtitle: {
    textAlign: 'center',
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: typography.fontSize.md * typography.lineHeight.relaxed,
  },
  features: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  featureIcon: {
    fontSize: typography.fontSize.xl,
  },
  field: {
    marginBottom: spacing.md,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: 'auto',
    paddingBottom: spacing.xxl,
  },
  nextBtn: {
    marginTop: 'auto',
    marginBottom: spacing.xxl,
  },
  nextBtnFlex: {
    flex: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
    borderRadius: 9999,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: {
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    borderColor: colors.teal,
  },
  categoryEmoji: {
    fontSize: typography.fontSize.md,
  },
  categoryText: {
    color: colors.textSecondary,
  },
  categoryTextActive: {
    color: colors.teal,
  },
  summaryCard: {
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
