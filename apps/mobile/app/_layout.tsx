import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DatabaseProvider } from '../lib/DatabaseProvider';

export default function RootLayout() {
  return (
    <DatabaseProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1A1A2E' },
          headerTintColor: '#FFFFFF',
          contentStyle: { backgroundColor: '#1A1A2E' },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="add-transaction"
          options={{ presentation: 'modal', title: 'Add Transaction' }}
        />
        <Stack.Screen
          name="import-csv"
          options={{ title: 'Import CSV' }}
        />
        <Stack.Screen
          name="add-subscription"
          options={{ presentation: 'modal', title: 'Add Subscription' }}
        />
        <Stack.Screen
          name="renewal-calendar"
          options={{ title: 'Renewal Calendar' }}
        />
        <Stack.Screen
          name="subscription-detail"
          options={{ title: 'Subscription' }}
        />
        <Stack.Screen
          name="onboarding"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
      </Stack>
    </DatabaseProvider>
  );
}
