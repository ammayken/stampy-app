import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { canRemoveLogbook, stampsIn, type Library, type Logbook } from './library';
import { BACKGROUND, LABEL, PAPER, SECONDARY } from './theme';

const GAP = 20;

/** All logbooks, shown as cloth covers. Tap to open, hold for rename and remove. */
export function Shelf({
  library,
  onOpen,
  onCreate,
  onRename,
  onRemove,
}: {
  library: Library;
  onOpen: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onRemove: (id: string) => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const coverWidth = Math.floor((width - GAP * 3) / 2);

  // Alert.prompt is the native iOS text prompt (iOS only, which is all this app targets for now).
  const create = () =>
    Alert.prompt('New Logbook', 'Give it a name.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Create', onPress: (name?: string) => onCreate(name ?? '') },
    ]);

  const options = (book: Logbook) => {
    const rename = () =>
      Alert.prompt(
        'Rename Logbook',
        undefined,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Save', onPress: (name?: string) => onRename(book.id, name ?? '') },
        ],
        'plain-text',
        book.name,
      );
    Alert.alert(book.name, canRemoveLogbook(library, book.id) ? undefined : 'Only an empty logbook can be removed, and one must always remain.', [
      { text: 'Rename', onPress: rename },
      ...(canRemoveLogbook(library, book.id)
        ? [{ text: 'Remove', style: 'destructive' as const, onPress: () => onRemove(book.id) }]
        : []),
      { text: 'Cancel', style: 'cancel' as const },
    ]);
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Logbooks</Text>
        <Pressable
          style={({ pressed }) => [styles.add, pressed && styles.pressed]}
          onPress={create}
          accessibilityRole="button"
          accessibilityLabel="New logbook"
        >
          <Ionicons name="add" size={28} color={BACKGROUND} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 24 }]}>
        {library.logbooks.map((book) => {
          const count = stampsIn(library, book.id).length;
          return (
            <Pressable
              key={book.id}
              style={({ pressed }) => pressed && styles.pressed}
              onPress={() => onOpen(book.id)}
              onLongPress={() => options(book)}
              accessibilityRole="button"
              accessibilityLabel={`${book.name}, ${count} stamps`}
              accessibilityHint="Opens the logbook. Hold for rename and remove."
            >
              <View style={[styles.cover, { width: coverWidth, height: coverWidth * 1.35, backgroundColor: book.color }]}>
                <View style={styles.spine} />
                <View style={styles.stitch} />
                <View style={styles.plate}>
                  <Text style={styles.plateName} numberOfLines={2}>
                    {book.name}
                  </Text>
                  <Text style={styles.plateCount}>{count === 1 ? '1 stamp' : `${count} stamps`}</Text>
                </View>
                {book.id === library.currentId ? (
                  <Ionicons name="bookmark" size={22} color={PAPER} style={styles.bookmark} />
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>
      <Text style={[styles.footnote, { paddingBottom: insets.bottom + 8 }]}>
        New stamps go into the bookmarked logbook. Hold a logbook to rename it.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BACKGROUND },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { color: LABEL, fontSize: 34, fontWeight: '700' },
  add: { width: 44, height: 44, borderRadius: 22, backgroundColor: PAPER, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: GAP, paddingTop: 8 },
  cover: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, backgroundColor: 'rgba(0,0,0,0.28)' },
  stitch: {
    position: 'absolute',
    left: 24,
    right: 10,
    top: 10,
    bottom: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(243,236,220,0.45)',
    borderRadius: 4,
  },
  plate: {
    marginLeft: 14,
    maxWidth: '70%',
    backgroundColor: PAPER,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 3,
    alignItems: 'center',
    gap: 2,
  },
  plateName: { color: BACKGROUND, fontSize: 16, fontWeight: '600', fontFamily: 'Georgia', textAlign: 'center' },
  plateCount: { color: BACKGROUND, opacity: 0.6, fontSize: 12 },
  bookmark: { position: 'absolute', top: -3, right: 16 },
  footnote: { color: SECONDARY, fontSize: 13, textAlign: 'center', paddingHorizontal: 24, paddingTop: 8 },
});
