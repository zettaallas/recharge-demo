import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { translate } from '@/i18n';
import { loadOrSeed, resetDemo } from '@/storage';
import { useColors } from '@/theme';
import type { Db } from '@/types';

// Placeholder entry screen. Shows the demo data loaded so Step 3 can be checked on a phone.
// Step 4 replaces this with Pupil / Staff / Family note.
export default function Entry() {
  const c = useColors();
  const [db, setDb] = useState<Db | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadOrSeed().then(setDb, (e: unknown) => setError(String(e)));
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: c.bg }]}>
      <Text style={[styles.title, { color: c.ink }]}>Recharge</Text>
      <Text style={{ color: c.ink2, textAlign: 'center' }}>{translate('en', 'tagline')}</Text>
      {error ? (
        <Text style={{ color: c.warnInk }}>Could not load data: {error}</Text>
      ) : db ? (
        <Text style={{ color: c.ink }}>
          Demo data: {db.pupils.length} pupils, {db.checkins.length} check-ins, {db.posts.length} posts, {db.flags.length} flags.
        </Text>
      ) : (
        <Text style={{ color: c.ink2 }}>Loading…</Text>
      )}
      <Pressable
        accessibilityRole="button"
        onPress={() => resetDemo().then(setDb)}
        style={[styles.btn, { backgroundColor: c.accent }]}>
        <Text style={{ color: c.accentInk, fontWeight: '700' }}>Reset demo data</Text>
      </Pressable>
      <Text style={{ color: c.ink2, fontSize: 13 }}>All data is fictional and stays on this device.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 },
  title: { fontSize: 28, fontWeight: '700' },
  btn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12, minHeight: 48, justifyContent: 'center' },
});
