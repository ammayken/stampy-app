import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { pagesOf, STAMPS_PER_PAGE } from './pages';
import { PAPER, Stamp, stampHeight } from './Stamp';
import { stampUri, type StampRecord } from './store';

const CLOTH = '#26352e';
const COLUMNS = 3;
const ROWS = STAMPS_PER_PAGE / COLUMNS;
const GAP = 14;
const SIDE = 24;
const CHROME = 210; // ponytail: fixed space for header and footer; use safe-area insets if it clips on some phone

export function Logbook({ stamps, onClose }: { stamps: StampRecord[]; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const [selected, setSelected] = useState<StampRecord | null>(null);
  const pages = pagesOf(stamps);
  const [page, setPage] = useState(pages.length - 1);

  // Biggest stamp that fits 3 across and 4 down.
  const byWidth = (width - SIDE * 2 - GAP * (COLUMNS - 1)) / COLUMNS;
  const byHeight = ((height - CHROME - GAP * (ROWS - 1)) / ROWS / stampHeight(100)) * 100;
  const stampWidth = Math.min(byWidth, byHeight);
  const gridWidth = stampWidth * COLUMNS + GAP * (COLUMNS - 1);

  if (selected) {
    return (
      <Pressable style={styles.screen} onPress={() => setSelected(null)} accessibilityLabel="Close stamp">
        <Stamp width={Math.min(width - 72, 320)} holeColor={CLOTH}>
          <Image source={{ uri: stampUri(selected) }} style={StyleSheet.absoluteFill} />
        </Stamp>
        <Text style={styles.title}>{new Date(selected.takenAt).toLocaleDateString()}</Text>
        {selected.place ? <Text style={styles.text}>{selected.place}</Text> : null}
        {selected.note ? <Text style={styles.text}>{selected.note}</Text> : null}
        <Text style={styles.faint}>Tap anywhere to go back</Text>
      </Pressable>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Logbook</Text>
      <View style={{ flexGrow: 0 }}>
        <FlatList
          data={pages}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, i) => String(i)}
          initialScrollIndex={pages.length - 1}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          onMomentumScrollEnd={(e) => setPage(Math.round(e.nativeEvent.contentOffset.x / width))}
          renderItem={({ item }) => (
            <View style={{ width, alignItems: 'center' }}>
              <View style={{ width: gridWidth, flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
                {Array.from({ length: STAMPS_PER_PAGE }, (_, i) => {
                  const stamp = item[i];
                  return stamp ? (
                    <Pressable
                      key={stamp.id}
                      onPress={() => setSelected(stamp)}
                      accessibilityRole="button"
                      accessibilityLabel={`Stamp from ${new Date(stamp.takenAt).toLocaleDateString()}`}
                    >
                      <Stamp width={stampWidth} holeColor={CLOTH}>
                        <Image source={{ uri: stampUri(stamp) }} style={StyleSheet.absoluteFill} />
                      </Stamp>
                    </Pressable>
                  ) : (
                    <View key={i} style={[styles.slot, { width: stampWidth, height: stampHeight(stampWidth) }]} />
                  );
                })}
              </View>
            </View>
          )}
        />
      </View>
      <Text style={styles.faint}>
        Page {page + 1} of {pages.length}
      </Text>
      <Pressable style={styles.button} onPress={onClose} accessibilityRole="button">
        <Text style={styles.buttonText}>Back to camera</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CLOTH, alignItems: 'center', justifyContent: 'center', gap: 16 },
  title: { color: PAPER, fontSize: 22, fontWeight: '600' },
  text: { color: PAPER, fontSize: 16, textAlign: 'center', paddingHorizontal: 32 },
  faint: { color: PAPER, opacity: 0.6, fontSize: 14 },
  slot: { borderWidth: 1, borderStyle: 'dashed', borderColor: PAPER, opacity: 0.25 },
  button: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24, borderWidth: 1, borderColor: PAPER },
  buttonText: { color: PAPER, fontSize: 16 },
});
