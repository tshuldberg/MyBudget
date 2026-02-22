import { View, Text, StyleSheet } from 'react-native';

export default function BudgetScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Budget Screen</Text>
      <Text style={styles.subtitle}>Envelope budgeting — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '600',
  },
  subtitle: {
    color: '#A0A0C8',
    fontSize: 16,
    marginTop: 8,
  },
});
