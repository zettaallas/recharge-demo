import { useRouter, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from '@/components/Icon';
import type { IconName } from '@/components/icons';
import { Button, H1, Muted, Row, Screen } from '@/components/ui';
import { Zip } from '@/components/Zip';
import { lastCharge } from '@/domain/checkins';
import type { TextKey } from '@/i18n';
import { useApp } from '@/state/AppContext';

// Pupil home: Zip shows the latest charge, and big tiles lead to each activity.
type TileDef = { key: string; icon: IconName; title: TextKey; sub: TextKey; href?: Href; soon?: string };
const TILES: TileDef[] = [
  { key: 'checkin', icon: 'battery', title: 'checkIn', sub: 'checkInSub', href: '/check-in' },
  { key: 'symbols', icon: 'grid', title: 'symbols', sub: 'symbolsSub', href: '/symbols' },
  { key: 'walk', icon: 'camera', title: 'walk', sub: 'walkSub', href: '/walk' },
  { key: 'profile', icon: 'user', title: 'profile', sub: 'profileSub', href: '/profile' },
  { key: 'feed', icon: 'megaphone', title: 'feed', sub: 'feedSub', href: '/feed' },
  { key: 'zip', icon: 'star', title: 'buddy', sub: 'buddySub', href: '/zip' },
  { key: 'posts', icon: 'message', title: 'myPosts', sub: 'myPostsSub', href: '/posts' },
  { key: 'settings', icon: 'sliders', title: 'settings', sub: 'settingsSub', href: '/settings' },
];

export default function Home() {
  const { t, colors, db, me, logOut } = useApp();
  const router = useRouter();
  if (!me) return null;
  const ch = lastCharge(db, me.id);

  return (
    <Screen belowBar>
      <View style={styles.hero}>
        <Zip charge={ch} colour={me.buddy.colour} hat={me.buddy.hat} size={100} />
        <View style={{ flex: 1, minWidth: 180, gap: 6 }}>
          <H1>{t('hello', { name: me.settings.preferredName || me.name.split(' ')[0] })}</H1>
          <Text style={{ color: colors.ink, fontSize: 18 }}>{ch == null ? t('zipEmpty') : t('zipCharge', { p: Math.round(ch * 100) })}</Text>
          <Muted small>{t('pupilsOnly')}</Muted>
        </View>
      </View>

      <View style={styles.tiles}>
        {TILES.map((tile) => (
          <Pressable
            key={tile.key}
            accessibilityRole="button"
            accessibilityState={{ disabled: !tile.href }}
            disabled={!tile.href}
            onPress={() => tile.href && router.push(tile.href)}
            style={({ pressed }) => [
              styles.tile,
              { backgroundColor: colors.surface, borderColor: pressed ? colors.accent : colors.line, opacity: tile.href ? 1 : 0.55 },
            ]}>
            <View style={[styles.tileIc, { backgroundColor: colors.accentSoft }]}>
              <Icon name={tile.icon} size={28} color={colors.accent} />
            </View>
            <Text style={[styles.tileTitle, { color: colors.ink }]}>{t(tile.title)}</Text>
            <Text style={{ color: colors.ink2, fontSize: 15 }}>{tile.soon ? 'Coming in ' + tile.soon : t(tile.sub)}</Text>
          </Pressable>
        ))}
      </View>

      <Row>
        <Button label={t('logout')} onPress={() => logOut()} />
      </Row>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 16, flexWrap: 'wrap' },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { flexGrow: 1, flexBasis: 160, minHeight: 130, borderRadius: 20, borderWidth: 1, padding: 16, gap: 6 },
  tileIc: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { fontSize: 18, fontWeight: '700' },
});
