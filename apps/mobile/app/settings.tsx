import React, { useState, useCallback } from 'react';
import { ScrollView, View, Alert, StyleSheet } from 'react-native';
import { Text, Card, colors, spacing } from '@mybudget/ui';
import { initializeDatabase } from '@mybudget/shared';
import { SettingsRow } from '../components/SettingsRow';
import { useDatabase } from '../lib/DatabaseProvider';
import { seedDatabase } from '../lib/seed';

function SectionHeader({ title }: { title: string }) {
  return (
    <Text variant="caption" style={styles.sectionHeader}>
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  const { db, invalidate } = useDatabase();
  const [appLockEnabled, setAppLockEnabled] = useState(false);

  const handleResetData = useCallback(() => {
    Alert.alert(
      'Reset All Data',
      'This will delete everything and restore the sample data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            // Drop all tables and recreate
            db.execute('PRAGMA writable_schema = ON');
            db.execute("DELETE FROM sqlite_master WHERE type IN ('table', 'index', 'trigger')");
            db.execute('PRAGMA writable_schema = OFF');
            db.execute('VACUUM');
            db.execute('PRAGMA integrity_check');
            // Re-initialize schema and seed
            initializeDatabase(db);
            seedDatabase(db);
            invalidate();
          },
        },
      ],
    );
  }, [db, invalidate]);

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
        <SettingsRow label="Reset All Data" onPress={handleResetData} destructive />
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
