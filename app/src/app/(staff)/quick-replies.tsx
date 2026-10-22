import { useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { Card, H2 } from '@/components/staff/StaffUi';
import { Button, H1, Muted, Row, Screen } from '@/components/ui';
import { addQuickReply, deleteQuickReply, editQuickReply, moveQuickReply } from '@/domain/staff';
import { useApp } from '@/state/AppContext';

// My quick replies: each teacher's own one-tap replies. Add, edit, delete and reorder them.
export default function QuickReplies() {
  const { staffMe, update, save, colors } = useApp();
  const [adding, setAdding] = useState('');
  const [editing, setEditing] = useState<{ i: number; text: string } | null>(null);
  if (!staffMe) return null;
  const list = staffMe.quickReplies;
  const input = [styles.input, { color: colors.ink, borderColor: colors.line, backgroundColor: colors.surface }];

  return (
    <Screen wide belowBar>
      <H1>My quick replies</H1>
      <Muted>These show as one-tap replies in Requests. Keep them short, warm and clear. Pupils see exactly what you write.</Muted>

      <Card>
        {list.length === 0 && <Muted>No quick replies yet. Add one below.</Muted>}
        {list.map((q, i) => (
          <View key={i} style={[styles.item, { borderColor: colors.line }]}>
            {editing?.i === i ? (
              <>
                <TextInput value={editing.text} onChangeText={(text) => setEditing({ i, text })} accessibilityLabel="Edit quick reply" autoFocus style={input} />
                <Row>
                  <Button
                    label="Save"
                    kind="primary"
                    disabled={!editing.text.trim()}
                    onPress={async () => {
                      if ((await save((d) => editQuickReply(d, staffMe.id, i, editing.text))).ok) setEditing(null);
                    }}
                  />
                  <Button label="Cancel" kind="quiet" onPress={() => setEditing(null)} />
                </Row>
              </>
            ) : (
              <>
                <Text style={{ color: colors.ink, fontSize: 16, flex: 1, minWidth: 200 }}>{q}</Text>
                <Row style={{ gap: 6 }}>
                  <Button label="↑" accessibilityLabel={'Move up: ' + q} disabled={i === 0} onPress={() => update((d) => moveQuickReply(d, staffMe.id, i, -1))} />
                  <Button label="↓" accessibilityLabel={'Move down: ' + q} disabled={i === list.length - 1} onPress={() => update((d) => moveQuickReply(d, staffMe.id, i, 1))} />
                  <Button label="Edit" accessibilityLabel={'Edit: ' + q} onPress={() => setEditing({ i, text: q })} />
                  <Button label="Delete" kind="danger" accessibilityLabel={'Delete: ' + q} onPress={() => update((d) => deleteQuickReply(d, staffMe.id, i))} />
                </Row>
              </>
            )}
          </View>
        ))}
      </Card>

      <Card>
        <H2>Add a quick reply</H2>
        <TextInput value={adding} onChangeText={setAdding} placeholder="For example: Thanks for telling me. I'll check in with you after lunch." placeholderTextColor={colors.ink2} accessibilityLabel="New quick reply" style={input} />
        <Row>
          <Button
            label="Add"
            kind="primary"
            disabled={!adding.trim()}
            onPress={async () => {
              if ((await save((d) => addQuickReply(d, staffMe.id, adding))).ok) setAdding('');
            }}
          />
        </Row>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, borderTopWidth: 1, paddingTop: 10 },
  input: { flexGrow: 1, flexBasis: 260, minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 12, fontSize: 16 },
});
