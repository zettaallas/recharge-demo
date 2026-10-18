import { StyleSheet, Text, View } from 'react-native';
import { visibleStatus } from '@/domain/posts';
import { useApp } from '@/state/AppContext';
import type { Post, PostStatus } from '@/types';

// Sent / Read / Follow-up, as the pupil sees it. Respects the pupil's "show when read" setting.
export function StatusBadge({ post }: { post: Post }) {
  const { t, colors, me } = useApp();
  const status = visibleStatus(post, me?.settings.showReadReceipts ?? true);
  const look: Record<PostStatus, { bg: string; fg: string; label: string }> = {
    sent: { bg: colors.surface2, fg: colors.ink2, label: '✓ ' + t('statusSent') },
    read: { bg: colors.accentSoft, fg: colors.ink, label: '✓✓ ' + t('statusRead') },
    followUp: { bg: colors.okBg, fg: colors.okInk, label: '↩ ' + t('statusFollowUp') },
  };
  const l = look[status];
  return (
    <View accessibilityLabel={l.label.replace(/^[^A-Za-z]+/, '')} style={[styles.pill, { backgroundColor: l.bg }]}>
      <Text style={{ color: l.fg, fontWeight: '700', fontSize: 13 }}>{l.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: 'flex-start' },
});
