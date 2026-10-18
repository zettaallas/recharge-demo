import { Modal, StyleSheet, Text, View } from 'react-native';
import { useApp } from '@/state/AppContext';
import { Icon } from './Icon';
import { Button } from './ui';

// A clear "Saved" pop-up. OK closes it (screens use OK to go back home).
export function SavedDialog({ visible, message, extra, onOk }: { visible: boolean; message: string; extra?: string; onOk: () => void }) {
  const { t, colors } = useApp();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onOk}>
      <View style={styles.overlay}>
        <View accessibilityViewIsModal accessibilityLiveRegion="polite" style={[styles.dialog, { backgroundColor: colors.surface }]}>
          <View style={[styles.tick, { backgroundColor: colors.okBg }]}>
            <Icon name="check" size={40} color={colors.okInk} />
          </View>
          <Text accessibilityRole="header" style={[styles.title, { color: colors.ink }]}>{t('savedTitle')}</Text>
          <Text style={[styles.body, { color: colors.ink }]}>{message}</Text>
          {!!extra && <Text style={[styles.body, { color: colors.ink }]}>{extra}</Text>}
          <Button label={t('ok')} kind="primary" large onPress={onOk} style={{ alignSelf: 'stretch' }} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  dialog: { width: '100%', maxWidth: 420, borderRadius: 20, padding: 24, gap: 14, alignItems: 'center' },
  tick: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 26, fontWeight: '700' },
  body: { fontSize: 18, textAlign: 'center' },
});
