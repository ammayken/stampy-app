import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { ActionSheetIOS, Alert, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { canRemoveLogbook, COVER_COLOR_NAMES, COVER_COLORS, stampsIn, type Library, type Logbook } from './library';
import { fileUri } from './store';
import { BACKGROUND, PAPER } from './theme';

const GAP = 20;
const PAGE = '#f4f2ec'; // off-white
const INK = '#1c1c1e';
const FAINT = '#6e6e73';

/**
 * The Stamp Albums page: every album as a cover (cloth colour or a photo).
 * Tap a cover to open it; the ... button or a long press gives rename, cover and remove.
 * (In code an album is still called a "logbook".)
 */
export function Shelf({
  library,
  onOpen,
  onCreate,
  onRename,
  onCoverColor,
  onCoverPhoto,
  onRemove,
}: {
  library: Library;
  onOpen: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onCoverColor: (id: string, color: string) => void;
  /** Lets the user pick a photo from their gallery for this album's cover. */
  onCoverPhoto: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const coverWidth = Math.floor((width - GAP * 3) / 2);

  // Alert.prompt and ActionSheetIOS are the native iOS dialogs (iOS only, which is all this app targets for now).
  const create = () =>
    Alert.prompt('New Album', 'Give it a name.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Create', onPress: (name?: string) => onCreate(name ?? '') },
    ]);

  const rename = (book: Logbook) =>
    Alert.prompt(
      'Rename Album',
      undefined,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Save', onPress: (name?: string) => onRename(book.id, name ?? '') },
      ],
      'plain-text',
      book.name,
    );

  const chooseColor = (book: Logbook) =>
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: 'Cover Colour',
        message: book.cover ? 'This replaces the cover photo.' : undefined,
        options: [...COVER_COLOR_NAMES, 'Cancel'],
        cancelButtonIndex: COVER_COLOR_NAMES.length,
      },
      (chosen) => {
        if (chosen < COVER_COLORS.length) onCoverColor(book.id, COVER_COLORS[chosen]);
      },
    );

  const options = (book: Logbook) => {
    const removable = canRemoveLogbook(library, book.id);
    const actions = [
      { label: 'Rename', run: () => rename(book) },
      { label: 'Choose Cover Photo', run: () => onCoverPhoto(book.id) },
      { label: 'Choose Cover Colour', run: () => chooseColor(book) },
      ...(removable ? [{ label: 'Remove Album', run: () => onRemove(book.id) }] : []),
    ];
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title: book.name,
        message: removable ? undefined : 'Only an empty album can be removed, and one must always remain.',
        options: [...actions.map((a) => a.label), 'Cancel'],
        cancelButtonIndex: actions.length,
        destructiveButtonIndex: removable ? actions.length - 1 : undefined,
      },
      (chosen) => actions[chosen]?.run(),
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Stamp Albums</Text>
        <Pressable
          style={({ pressed }) => [styles.add, pressed && styles.pressed]}
          onPress={create}
          accessibilityRole="button"
          accessibilityLabel="New album"
        >
          <Ionicons name="add" size={28} color={PAGE} />
        </Pressable>
      </View>
      <ScrollView contentContainerStyle={[styles.grid, { paddingBottom: insets.bottom + 24 }]}>
        {library.logbooks.map((book) => {
          const count = stampsIn(library, book.id).length;
          return (
            <View key={book.id} style={styles.shadow}>
              <Pressable
                style={({ pressed }) => pressed && styles.pressed}
                onPress={() => onOpen(book.id)}
                onLongPress={() => options(book)}
                accessibilityRole="button"
                accessibilityLabel={`${book.name}, ${count} stamps`}
                accessibilityHint="Opens the album."
              >
                <View style={[styles.cover, { width: coverWidth, height: coverWidth * 1.35, backgroundColor: book.color }]}>
                  {book.cover ? (
                    <Image source={{ uri: fileUri(book.cover) }} resizeMode="cover" style={StyleSheet.absoluteFill} />
                  ) : null}
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
              <Pressable
                style={({ pressed }) => [styles.more, pressed && styles.pressed]}
                onPress={() => options(book)}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={`Options for ${book.name}`}
              >
                <Ionicons name="ellipsis-horizontal" size={18} color={PAPER} />
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
      <Text style={[styles.footnote, { paddingBottom: insets.bottom + 8 }]}>
        New stamps go into the bookmarked album. Tap ··· on an album to rename it or change its cover.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: PAGE },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { color: INK, fontSize: 34, fontWeight: '700' },
  add: { width: 44, height: 44, borderRadius: 22, backgroundColor: INK, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP, paddingHorizontal: GAP, paddingTop: 8 },
  // The shadow lives on a wrapper because the cover clips its photo to rounded corners.
  shadow: { shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  cover: { borderRadius: 8, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  spine: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 14, backgroundColor: 'rgba(0,0,0,0.28)' },
  stitch: {
    position: 'absolute',
    left: 24,
    right: 10,
    top: 10,
    bottom: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(243,236,220,0.55)',
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
  more: {
    position: 'absolute',
    right: 14,
    bottom: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footnote: { color: FAINT, fontSize: 13, textAlign: 'center', paddingHorizontal: 24, paddingTop: 8 },
});
