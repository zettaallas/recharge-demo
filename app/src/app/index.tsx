import { StyleSheet, Text, View } from 'react-native';

// Placeholder entry screen. Step 4 replaces this with Pupil / Staff / Family note.
export default function Entry() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recharge</Text>
      <Text>Expo migration in progress. All data is fictional.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16 },
  title: { fontSize: 28, fontWeight: '700' },
});
