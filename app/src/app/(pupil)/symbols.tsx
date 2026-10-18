import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/icons';
import { Banner, Button, H1, Muted, Row, Screen } from '@/components/ui';
import { SYMBOLS } from '@/data/vocab';
import { keyAdultName, logSymbol, SYMBOLS_FOR_ADULT } from '@/domain/posts';
import { useApp } from '@/state/AppContext';
import type { SymbolKey } from '@/types';

// Symbol board: say something in one tap, even without words.
export default function SymbolBoard() {
  const { t, colors, db, me, update } = useApp();
  const router = useRouter();
  const [sent, setSent] = useState<SymbolKey | null>(null);
  if (!me) return null;
  const adult = keyAdultName(db, me.id);

  const tap = (key: SymbolKey) => {
    update((d) => logSymbol(d, me.id, key, t(key)));
    setSent(key);
  };

  return (
    <Screen belowBar>
      <Row>
        <Button label={t('home')} onPress={() => router.back()} />
      </Row>
      <H1>{t('symbols')}</H1>
      <Muted>{t('symbolsSub')}</Muted>
      {sent && (
        <Banner kind="ok">
          {t(sent) + ': ' + (SYMBOLS_FOR_ADULT.includes(sent) ? t('symSent', { adult }) : t('symLogged'))}
        </Banner>
      )}
      <View style={styles.grid}>
        {SYMBOLS.map((s) => {
          const on = sent === s.key;
          return (
            <Pressable
              key={s.key}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              onPress={() => tap(s.key)}
              style={({ pressed }) => [
                styles.sym,
                { borderColor: on || pressed ? colors.accent : colors.line, backgroundColor: on ? colors.accentSoft : colors.surface },
              ]}>
              <View style={[styles.ic, { backgroundColor: colors.surface2 }]}>
                <Icon name={s.icon as IconName} size={36} />
              </View>
              <Text style={[styles.label, { color: colors.ink }]}>{t(s.key)}</Text>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  sym: { flexGrow: 1, flexBasis: 150, minHeight: 150, borderRadius: 20, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 12 },
  ic: { width: 64, height: 64, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
});
