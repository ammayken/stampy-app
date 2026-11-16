import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActionSheetIOS, Alert, Image, Modal, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { Fields } from './Fields';
import type { Logbook, StampRecord } from './library';
import { Stamp } from './Stamp';
import { stampUri } from './store';
import { BACKGROUND, FIELD, LABEL, PAPER, SECONDARY, SEPARATOR, SHEET } from './theme';

/** Native iOS sheet for one saved stamp: edit place and note, share, move, delete. */
export function StampSheet({
  stamp,
  otherLogbooks,
  onDone,
  onMove,
  onDelete,
}: {
  stamp: StampRecord | null;
  /** Logbooks this stamp could be moved to. */
  otherLogbooks: Logbook[];
  /** Called when the sheet closes, with the (possibly edited) place and note. */
  onDone: (stamp: StampRecord, place: string, note: string) => void;
  onMove: (stamp: StampRecord, logbookId: string) => void;
  onDelete: (stamp: StampRecord) => void;
}) {
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  useEffect(() => {
    setPlace(stamp?.place ?? '');
    setNote(stamp?.note ?? '');
  }, [stamp]);
  const picture = useRef<React.ComponentRef<typeof View>>(null);

  const done = () => {
    if (stamp) onDone(stamp, place, note);
  };

  // ponytail: the shared picture is a snapshot of the stamp as shown here (about 870 px wide
  // on an iPhone 12) on a dark card. Render a full-size stamp off screen, or draw it with
  // Skia, when full 900 x 1200 photo resolution or a transparent edge is needed.
  const share = async () => {
    try {
      const uri = await captureRef(picture, { format: 'png' });
      await Share.share({ url: uri });
    } catch (e) {
      Alert.alert('Could not share the stamp', e instanceof Error ? e.message : String(e));
    }
  };

  const move = () => {
    if (!stamp) return;
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Move to Logbook',
        options: [...otherLogbooks.map((b) => b.name), 'Cancel'],
        cancelButtonIndex: otherLogbooks.length,
      },
      (chosen) => {
        if (chosen < otherLogbooks.length) onMove(stamp, otherLogbooks[chosen].id);
      },
    );
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
            {/* This padded card is what gets shared, so the perforated edge is in the picture. */}
            <View ref={picture} collapsable={false} style={styles.picture}>
              <Stamp width={230} holeColor={BACKGROUND}>
                <Image source={{ uri: stampUri(stamp) }} style={StyleSheet.absoluteFill} />
              </Stamp>
            </View>
            <Fields place={place} note={note} onPlace={setPlace} onNote={setNote} />
            <Text style={styles.footnote}>Changes are saved when you tap Done.</Text>

            <View style={styles.group}>
              <Row icon="share-outline" label="Share Stamp" onPress={share} />
              {otherLogbooks.length > 0 ? (
                <>
                  <View style={styles.separator} />
                  <Row icon="book-outline" label="Move to Logbook" onPress={move} />
                </>
              ) : null}
            </View>
            <View style={styles.group}>
              <Row icon="trash-outline" label="Delete Stamp" color={RED} onPress={confirmDelete} />
            </View>
          </ScrollView>
        </View>
      ) : null}
    </Modal>
  );
}

function Row({
  icon,
  label,
  color = LABEL,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onPress} accessibilityRole="button">
      <Text style={[styles.rowText, { color }]}>{label}</Text>
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );
}

const RED = '#ff453a'; // iOS system red (dark mode)

const styles = StyleSheet.create({
  sheet: { flex: 1, backgroundColor: SHEET },
  bar: { height: 56, alignItems: 'center', justifyContent: 'center' },
  title: { color: LABEL, fontSize: 17, fontWeight: '600' },
  done: { position: 'absolute', right: 16 },
  doneText: { color: PAPER, fontSize: 17, fontWeight: '600' },
  content: { alignItems: 'center', gap: 20, padding: 20, paddingBottom: 40 },
  picture: { padding: 30, borderRadius: 16, backgroundColor: BACKGROUND },
  footnote: { color: SECONDARY, fontSize: 13, marginTop: -10 },
  group: { alignSelf: 'stretch', backgroundColor: FIELD, borderRadius: 12 },
  row: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  rowText: { fontSize: 17 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: SEPARATOR, marginLeft: 16 },
  pressed: { opacity: 0.6 },
});
