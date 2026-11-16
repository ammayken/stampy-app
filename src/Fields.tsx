import { StyleSheet, Text, TextInput, View } from 'react-native';
import { FIELD, LABEL, SECONDARY, SEPARATOR } from './theme';

/** iOS grouped-list style inputs for a stamp's optional place and note. */
export function Fields({
  place,
  note,
  onPlace,
  onNote,
}: {
  place: string;
  note: string;
  onPlace: (text: string) => void;
  onNote: (text: string) => void;
}) {
  return (
    <View style={styles.group}>
      <View style={styles.row}>
        <Text style={styles.label}>Place</Text>
        <TextInput
          style={styles.input}
          value={place}
          onChangeText={onPlace}
          placeholder="Optional"
          placeholderTextColor={SECONDARY}
          maxLength={60}
          returnKeyType="done"
          accessibilityLabel="Place"
        />
      </View>
      <View style={styles.separator} />
      <View style={styles.row}>
        <Text style={styles.label}>Note</Text>
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={onNote}
          placeholder="Optional"
          placeholderTextColor={SECONDARY}
          maxLength={140}
          returnKeyType="done"
          accessibilityLabel="Note"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { alignSelf: 'stretch', backgroundColor: FIELD, borderRadius: 12 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, paddingHorizontal: 16 },
  label: { width: 64, color: LABEL, fontSize: 17 },
  input: { flex: 1, color: LABEL, fontSize: 17, paddingVertical: 12 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: SEPARATOR, marginLeft: 16 },
});
