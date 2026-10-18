import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Image, Platform, StyleSheet, View } from 'react-native';
import { useApp } from '@/state/AppContext';
import { Banner, Button, Row } from './ui';

// Take or choose a photo. Photos are shrunk to 720px wide and kept as a small JPEG in the app's own data,
// like the web prototype, so a handful of photos doesn't fill the phone's storage.
// Staff see the photo exactly as the pupil took it; nothing interprets it.

async function shrink(uri: string): Promise<string> {
  const img = await ImageManipulator.manipulate(uri).resize({ width: 720 }).renderAsync();
  const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.7, base64: true });
  return 'data:image/jpeg;base64,' + out.base64;
}

export function PhotoPicker({ value, onChange }: { value: string | null | undefined; onChange: (uri: string | null) => void }) {
  const { t } = useApp();
  const [err, setErr] = useState('');

  const pick = async (source: 'camera' | 'library') => {
    setErr('');
    const perm = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return setErr(t('photoDenied'));
    const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1 };
    const res = source === 'camera' ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
    if (res.canceled || !res.assets[0]) return;
    try {
      onChange(await shrink(res.assets[0].uri));
    } catch {
      setErr('That photo could not be opened. Try another one.');
    }
  };

  return (
    <View style={{ gap: 10 }}>
      {!!value && <Image source={{ uri: value }} accessibilityLabel="Your photo" style={styles.thumb} resizeMode="cover" />}
      <Row>
        {/* browsers can't open the camera directly; "Choose a photo" offers it on phones */}
        {Platform.OS !== 'web' && <Button label={t('useCamera')} kind="primary" onPress={() => pick('camera')} />}
        <Button label={value ? t('changePhoto') : t('useLibrary')} onPress={() => pick('library')} />
        {!!value && <Button label={t('remove')} kind="quiet" onPress={() => onChange(null)} />}
      </Row>
      {!!err && <Banner kind="warn">{err}</Banner>}
    </View>
  );
}

const styles = StyleSheet.create({
  thumb: { width: '100%', maxWidth: 360, aspectRatio: 4 / 3, borderRadius: 14 },
});
