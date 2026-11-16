import { useEffect, useState } from 'react';
import { Image, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Fields } from './Fields';
import { Stamp } from './Stamp';
import { stampUri, type StampRecord } from './store';
import { LABEL, PAPER, SECONDARY, SHEET } from './theme';

/** Native iOS sheet showing one saved stamp, with its place and note editable. */
export function StampSheet({
  stamp,
  onDone,
}: {
  stamp: StampRecord | null;
  /** Called when the sheet closes, with the (possibly edited) place and note. */
  onDone: (stamp: StampRecord, place: string, note: string) => void;
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
  footnote: { color: SECONDARY, fontSize: 13 },
});
