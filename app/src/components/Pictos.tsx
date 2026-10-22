import { Pressable, StyleSheet, Text, View } from 'react-native';
import { pictoIcon } from '@/data/vocab';
import type { TextKey } from '@/i18n';
import { useApp } from '@/state/AppContext';
import type { Db, Post, SymbolKey, TalkTopic } from '@/types';
import { Icon } from './Icon';
import type { IconName } from './icons';

// Picture + word, everywhere a pupil picks something (Step 11a). The word stays: picture and word together
// help understanding, and screen readers read the word.

export type PictoItem = { key: string; icon: IconName; label: string };

/** A grid of picture tiles. Tap to pick, tap again to unpick; any number can be picked. */
export function PictoGrid({ items, picked, onToggle, size = 'md', single }: {
  items: PictoItem[];
  picked: string[];
  onToggle: (key: string) => void;
  /** md: symbol board; sm: inside a card (check-in, talk) */
  size?: 'sm' | 'md';
  /** one choice at a time (read out as radio buttons) */
  single?: boolean;
}) {
  const { colors } = useApp();
  const sm = size === 'sm';
  return (
    <View style={styles.grid}>
      {items.map((it) => {
        const on = picked.includes(it.key);
        return (
          <Pressable
            key={it.key}
            accessibilityRole={single ? 'radio' : 'checkbox'}
            accessibilityState={{ checked: on }}
            accessibilityLabel={it.label}
            onPress={() => onToggle(it.key)}
            style={({ pressed }) => [
              styles.tile,
              sm ? styles.tileSm : styles.tileMd,
              { borderColor: on || pressed ? colors.accent : colors.line, backgroundColor: on ? colors.accentSoft : colors.surface },
            ]}>
            {on && (
              <View style={[styles.tick, { backgroundColor: colors.accent }]}>
                <Icon name="check" size={14} color={colors.accentInk} />
              </View>
            )}
            <Icon name={it.icon} size={sm ? 30 : 40} />
            <Text numberOfLines={2} style={[styles.label, { color: colors.ink, fontSize: sm ? 14 : 15 }]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** A heading made of a small picture and one or two words. */
export function PictoHeading({ icon, label }: { icon: IconName; label: string }) {
  const { colors } = useApp();
  return (
    <View style={styles.heading}>
      <Icon name={icon} size={22} color={colors.ink2} />
      <Text accessibilityRole="header" style={{ color: colors.ink, fontSize: 17, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

/** The symbols or "what about?" topics behind a symbol or talk post, as picture chips. */
export function postPictos(db: Db, post: Post, t: (k: TextKey) => string): PictoItem[] {
  if (post.kind !== 'symbol' && post.kind !== 'talk') return [];
  const m = db.moments.find((x) => x.id === post.refId);
  const keys: (SymbolKey | TalkTopic)[] = m ? (m.kind === 'talk' ? m.topics ?? [] : m.symbols ?? (m.symbol ? [m.symbol] : [])) : [];
  return keys.map((k) => ({ key: k, icon: pictoIcon(k), label: t(k) }));
}

/** Read-only picture chips, e.g. the symbols on a request (staff) or a sent post (pupil). */
export function PictoChips({ items }: { items: PictoItem[] }) {
  const { colors } = useApp();
  if (!items.length) return null;
  return (
    <View style={styles.chips}>
      {items.map((it) => (
        <View key={it.key} style={[styles.chip, { backgroundColor: colors.surface2 }]}>
          <Icon name={it.icon} size={18} />
          <Text style={{ color: colors.ink, fontWeight: '700', fontSize: 14 }}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { borderRadius: 18, borderWidth: 2, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 8 },
  // three across on a phone, more on a wide screen; every tile is well over the 44pt minimum
  tileMd: { flexGrow: 1, flexBasis: 100, maxWidth: 160, minHeight: 104 },
  tileSm: { flexGrow: 1, flexBasis: 92, maxWidth: 140, minHeight: 88 },
  tick: { position: 'absolute', top: 6, right: 6, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  label: { fontWeight: '700', textAlign: 'center' },
  heading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999 },
});
