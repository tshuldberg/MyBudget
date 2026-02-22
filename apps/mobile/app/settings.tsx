import React, { useState } from 'react';
import { ScrollView, View, StyleSheet } from 'react-native';
import { Text, Card, colors, spacing } from '@mybudget/ui';
import { SettingsRow } from '../components/SettingsRow';

function SectionHeader({ title }: { title: string }) {
  return (
    <Text variant="caption" style={styles.sectionHeader}>
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  const [appLockEnabled, setAppLockEnabled] = useState(false);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <SectionHeader title="SECURITY" />
      <Card style={styles.section}>
        <SettingsRow
          label="App Lock (Face ID / Touch ID)"
          toggle={appLockEnabled}
          onToggle={setAppLockEnabled}
        />
      </Card>

      <SectionHeader title="PREFERENCES" />
      <Card style={styles.section}>
        <SettingsRow label="Currency Format" value="USD" onPress={() => {}} />
        <View style={styles.divider} />
        <SettingsRow label="First Day of Week" value="Sunday" onPress={() => {}} />
      </Card>

      <SectionHeader title="DATA" />
      <Card style={styles.section}>
        <SettingsRow label="CSV Import Profiles" onPress={() => {}} />
        <View style={styles.divider} />
        <SettingsRow label="Export Data" value="CSV / JSON" onPress={() => {}} />
      </Card>

      <SectionHeader title="ABOUT" />
      <Card style={styles.section}>
        <SettingsRow label="Version" value="0.1.0" />
        <View style={styles.divider} />
        <SettingsRow label="Licenses" onPress={() => {}} />
        <View style={styles.divider} />
        <SettingsRow label="Privacy Statement" onPress={() => {}} />
      </Card>

      <SectionHeader title="DANGER ZONE" />
      <Card style={styles.section}>
        <SettingsRow label="Reset All Data" onPress={() => {}} destructive />
      </Card>
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
    paddingBottom: spacing.xxl,
  },
  sectionHeader: {
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    marginLeft: spacing.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  section: {
    padding: 0,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginLeft: spacing.md,
  },
});
