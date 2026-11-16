import { useEffect, useState } from 'react';
import { Alert, Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Fields } from './Fields';
import type { StampRecord } from './library';
import { Stamp } from './Stamp';
import { stampUri } from './store';
import { FIELD, LABEL, PAPER, SECONDARY, SHEET } from './theme';

/** Native iOS sheet showing one saved stamp, with its place and note editable. */
export function StampSheet({
  stamp,
  onDone,
  onDelete,
}: {
  stamp: StampRecord | null;
  /** Called when the sheet closes, with the (possibly edited) place and note. */
  onDone: (stamp: StampRecord, place: string, note: string) => void;
  onDelete: (stamp: StampRecord) => void;
}) {
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => {
    setPlace(stamp?.place ?? '');
    setNote(stamp?.note ?? '');
  }, [stamp]);

  const done = () => {
    if (stamp) onDone(stamp, place, note);
  };
  const confirmDelete = () => {
    if (!stamp) return;
    Alert.alert('Delete this stamp?', 'The photo is removed from this phone. This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDelete(stamp) },
    ]);
  };

  return (
    <Modal visible={!!stamp} animationType="slide" presentationStyle="pageSheet" onRequestClose={done}>
      {stamp ? (
        <View style={styles.sheet}>
          <View style={styles.bar}>
            <Text style={styles.title}>
              {new Date(stamp.takenAt).toLocaleDateString(undefined, { dateStyle: 'long' })}
            </Text>
            <Pressable style={styles.done} onPress={done} hitSlop={12} accessibilityRole="button">
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            automaticallyAdjustKeyboardInsets
          >
            <Stamp width={230} holeColor={SHEET}>
              <Image source={{ uri: stampUri(stamp) }} style={StyleSheet.absoluteFill} />
            </Stamp>
            <Fields place={place} note={note} onPlace={setPlace} onNote={setNote} />
            <Text style={styles.footnote}>Changes are saved when you tap Done.</Text>
            <Pressable
              style={({ pressed }) => [styles.delete, pressed && styles.pressed]}
              onPress={confirmDelete}
              accessibilityRole="button"
            >
              <Text style={styles.deleteText}>Delete Stamp</Text>
            </Pressable>
          </ScrollView>
        </View>
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: SHEET },
  bar: { height: 56, alignItems: 'center', justifyContent: 'center' },
  title: { color: LABEL, fontSize: 17, fontWeight: '600' },
  done: { position: 'absolute', right: 16 },
  doneText: { color: PAPER, fontSize: 17, fontWeight: '600' },
  content: { alignItems: 'center', gap: 24, padding: 20 },
  footnote: { color: SECONDARY, fontSize: 13, marginTop: -12 },
  delete: { alignSelf: 'stretch', height: 48, borderRadius: 12, backgroundColor: FIELD, alignItems: 'center', justifyContent: 'center' },
  deleteText: { color: '#ff453a', fontSize: 17 }, // iOS system red (dark mode)
  pressed: { opacity: 0.6 },
});
