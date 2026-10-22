import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, H2, Pill } from '@/components/staff/StaffUi';
import { useStaffClass } from '@/components/staff/StaffClass';
import { Avatar, Banner, Button, H1, Muted, Row, Screen } from '@/components/ui';
import { AV_COLOURS, ROLE_LABEL } from '@/data/vocab';
import { Access } from '@/domain/access';
import { makeSecret } from '@/domain/auth';
import { addPupil, applyPins, createClass, issuePins, randomPin, type PinCard } from '@/domain/staff';
import { setPupilPins } from '@/lib/supabase';
import { useApp } from '@/state/AppContext';
import type { AvatarColour } from '@/types';

// Class & PINs: the class code, resetting or unlocking PINs, adding a pupil and creating a class.
// PINs are stored only as hashes, so new PINs are shown once on cards and never again.
// Supabase mode: PINs are made and stored on the server (set-pupil-pin); the app only shows the cards.
export default function ClassAndPins() {
  const { db, staffMe, update, save, refresh, colors, resetDemo, mode } = useApp();
  const { classId, setClassId } = useStaffClass();
  const [cards, setCards] = useState<PinCard[] | null>(null);
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState<AvatarColour>('teal');
  const [keyAdult, setKeyAdult] = useState(staffMe?.id ?? '');
  const [newClass, setNewClass] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);
  const [pinError, setPinError] = useState('');
  if (!staffMe) return null;
  if (!Access.canManage(staffMe))
    return (
      <Screen wide belowBar>
        <H1>Class & PINs</H1>
        <Muted>Class teachers and the SENCO manage classes and PINs.</Muted>
      </Screen>
    );
  const cls = db.classes.find((c) => c.id === classId);
  const pupils = cls ? db.pupils.filter((p) => p.classId === cls.id).sort((a, b) => a.name.localeCompare(b.name)) : [];
  const input = [styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.surface }];

  const serverPins = async (ids: string[]) => {
    const r = await setPupilPins(ids);
    if (r.error || !r.cards.length) {
      setPinError("Couldn't make new PINs just now. Check the internet and try again.");
      return;
    }
    setPinError('');
    setCards(r.cards);
  };
  const issue = async (ids: string[]) => {
    if (mode === 'supabase') return serverPins(ids);
    const { cards: c, secrets } = await issuePins(db.pupils.filter((p) => ids.includes(p.id)));
    update((d) => applyPins(d, secrets));
    setCards(c);
  };
  const add = async () => {
    if (!cls || !name.trim()) return;
    if (mode === 'supabase') {
      const res = await save((d) => addPupil(d, cls.id, name, avatar, keyAdult, { salt: '', hash: '' }));
      if (!res.ok) return; // the name stays in the box with the message
      setName('');
      return serverPins([res.value]);
    }
    const pin = randomPin();
    const secret = await makeSecret(pin);
    update((d) => addPupil(d, cls.id, name, avatar, keyAdult, secret));
    setCards([{ name: name.trim(), pin }]);
    setName('');
  };
  const create = async () => {
    const res = await save((d) => createClass(d, newClass, staffMe));
    if (!res.ok) return;
    setNewClass('');
    setClassId(res.value);
    if (mode === 'supabase') refresh(); // picks up the new class's summary
  };

  return (
    <Screen wide belowBar>
      <H1>Class & PINs</H1>
      {cls && (
        <>
          <View style={styles.cols}>
            <Card style={styles.col}>
              <Text style={{ color: colors.ink2, fontWeight: '700', letterSpacing: 1 }}>{'CLASS ' + cls.name}</Text>
              <Text accessibilityLabel={'Class code ' + cls.code.split('').join(' ')} style={[styles.code, { color: colors.ink }]}>{cls.code}</Text>
              <Muted small>Pupils type this code, tap their name, then enter their PIN. On a shared device, tick "This is a shared device" once.</Muted>
              <Row>
                <Button label="New PINs for everyone" disabled={!pupils.length} onPress={() => issue(pupils.map((p) => p.id))} />
              </Row>
              {!!pinError && <Banner kind="warn">{pinError}</Banner>}
            </Card>
            <Card style={styles.col}>
              <H2>Add a pupil</H2>
              <Text style={[styles.lbl, { color: colors.ink }]}>Name (first name and initial)</Text>
              <TextInput value={name} onChangeText={setName} placeholder="e.g. Maya R." placeholderTextColor={colors.ink2} accessibilityLabel="Pupil name" style={input} />
              <Text style={[styles.lbl, { color: colors.ink }]}>Avatar colour</Text>
              <Row style={{ gap: 8 }}>
                {AV_COLOURS.map((c) => (
                  <Pressable
                    key={c}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: avatar === c }}
                    accessibilityLabel={'Avatar colour ' + c}
                    onPress={() => setAvatar(c)}
                    style={[styles.swatch, { backgroundColor: colors.av[c], borderColor: avatar === c ? colors.accent : colors.line, borderWidth: avatar === c ? 4 : 2 }]}
                  />
                ))}
              </Row>
              <Text style={[styles.lbl, { color: colors.ink }]}>Key adult</Text>
              <Row style={{ gap: 8 }}>
                {db.staff
                  .filter((s) => s.role !== 'dsl')
                  .map((s) => (
                    <Pressable
                      key={s.id}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: keyAdult === s.id }}
                      onPress={() => setKeyAdult(s.id)}
                      style={[styles.chip, { backgroundColor: keyAdult === s.id ? colors.accent : colors.surface2 }]}>
                      <Text style={{ fontWeight: '700', color: keyAdult === s.id ? colors.accentInk : colors.ink }}>{s.name + ' · ' + ROLE_LABEL[s.role]}</Text>
                    </Pressable>
                  ))}
              </Row>
              <Row>
                <Button label="Add pupil and make PIN" kind="primary" disabled={!name.trim()} onPress={add} />
              </Row>
            </Card>
          </View>

          <Card style={{ gap: 0 }}>
            <H2>Pupils and PINs</H2>
            {pupils.map((p, i) => (
              <View key={p.id} style={[styles.row, { borderTopWidth: i ? 1 : 0, borderColor: colors.line }]}>
                <Row style={{ flex: 1, minWidth: 200 }}>
                  <Avatar pupil={p} size={36} />
                  <Text style={{ color: colors.ink, fontWeight: '700' }}>{p.name}</Text>
                </Row>
                <Text style={{ color: colors.ink2, minWidth: 120 }}>{db.staff.find((s) => s.id === p.keyAdultId)?.name}</Text>
                {/* Supabase mode: tries and locks stay on the server; "Reset PIN" also unlocks */}
                {mode === 'local' && (p.locked ? <Pill text="Locked after 5 tries" kind="lo" /> : p.failed ? <Pill text={p.failed + ' wrong tries'} kind="mid" /> : <Pill text="OK" kind="hi" />)}
                <Button label={mode === 'supabase' ? 'Reset or unlock PIN' : p.locked ? 'Unlock and reset PIN' : 'Reset PIN'} accessibilityLabel={(mode === 'supabase' ? 'Reset or unlock PIN for ' : p.locked ? 'Unlock and reset PIN for ' : 'Reset PIN for ') + p.name} onPress={() => issue([p.id])} />
              </View>
            ))}
          </Card>
        </>
      )}

      <View style={styles.cols}>
        <Card style={styles.col}>
          <H2>Create a class</H2>
          <TextInput value={newClass} onChangeText={setNewClass} placeholder="e.g. 8C" placeholderTextColor={colors.ink2} accessibilityLabel="Class name" style={input} />
          <Row>
            <Button
              label="Create class and code"
              kind="primary"
              disabled={!newClass.trim()}
              onPress={create}
            />
          </Row>
        </Card>
        {mode === 'local' && (
        <Card style={styles.col}>
          <H2>Reset demo</H2>
          <Muted small>Puts back the fictional class 8B and its pupils. Removes everything added since, on this device.</Muted>
          {confirmReset ? (
            <Row>
              <Button label="Yes, reset everything" kind="danger" onPress={() => { setConfirmReset(false); resetDemo(); }} />
              <Button label="Cancel" onPress={() => setConfirmReset(false)} />
            </Row>
          ) : (
            <Row>
              <Button label="Reset demo" onPress={() => setConfirmReset(true)} />
            </Row>
          )}
        </Card>
        )}
      </View>

      <Modal visible={!!cards} transparent animationType="fade" onRequestClose={() => setCards(null)}>
        <View style={styles.overlay}>
          <View style={[styles.dialog, { backgroundColor: colors.surface }]}>
            <H2>PIN cards</H2>
            <Banner kind="info">PINs are stored scrambled (hashed), so this is the only time they are shown. Write them down or copy them now.</Banner>
            <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={styles.cards}>
              {cards?.map((c) => (
                <View key={c.name} style={[styles.pinCard, { borderColor: colors.line }]}>
                  <Text style={{ color: colors.ink, fontWeight: '700' }}>{c.name}</Text>
                  <Muted small>{'Class code ' + (cls?.code ?? '')}</Muted>
                  <Text accessibilityLabel={'PIN ' + c.pin.split('').join(' ')} style={[styles.pin, { color: colors.ink }]}>{c.pin}</Text>
                </View>
              ))}
            </ScrollView>
            <Muted small>Saving PIN cards as a PDF comes later.</Muted>
            <Row>
              <Button label="Done" kind="primary" onPress={() => setCards(null)} />
            </Row>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  cols: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' },
  col: { flexGrow: 1, flexBasis: 340 },
  code: { fontSize: 42, fontWeight: '700', letterSpacing: 4 },
  lbl: { fontSize: 15, fontWeight: '700' },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontSize: 16 },
  swatch: { width: 40, height: 40, borderRadius: 20 },
  chip: { minHeight: 44, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center' },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, paddingVertical: 10 },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  dialog: { width: '100%', maxWidth: 720, borderRadius: 20, padding: 20, gap: 14 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pinCard: { flexGrow: 1, flexBasis: 200, borderWidth: 2, borderStyle: 'dashed', borderRadius: 16, padding: 14, gap: 4 },
  pin: { fontSize: 30, fontWeight: '700', letterSpacing: 6 },
});
