import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { fitStamp, pagesOf, STAMPS_PER_PAGE } from './pages';
import { Stamp, stampHeight } from './Stamp';
import { StampSheet } from './StampSheet';
import { stampUri, type StampRecord } from './store';
import { CLOTH, PAPER } from './theme';

const COLUMNS = 3;
const ROWS = STAMPS_PER_PAGE / COLUMNS;
const GAP = 12;
const ASPECT = stampHeight(1000) / 1000; // stamp paper height / width

export function Logbook({
  stamps,
  onCamera,
  onEdit,
}: {
  stamps: StampRecord[];
  onCamera: () => void;
  onEdit: (stamp: StampRecord, place: string, note: string) => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<StampRecord | null>(null);
  const pages = pagesOf(stamps);
  const [page, setPage] = useState(pages.length - 1);
  // Height actually left for the grid between header and footer, measured on screen.
  const [gridHeight, setGridHeight] = useState(0);
  const stampWidth = fitStamp(width - 40, gridHeight, COLUMNS, ROWS, GAP, ASPECT);

  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom + 8 }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Logbook</Text>
          <Text style={styles.subtitle}>
            {stamps.length === 0 ? 'No stamps yet' : stamps.length === 1 ? '1 stamp' : `${stamps.length} stamps`}
          </Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.camera, pressed && styles.pressed]}
          onPress={onCamera}
          accessibilityRole="button"
          accessibilityLabel="Take a new stamp"
        >
          <Ionicons name="camera" size={24} color={CLOTH} />
        </Pressable>
      </View>

      <View style={styles.grid} onLayout={(e) => setGridHeight(e.nativeEvent.layout.height)}>
        {stampWidth > 0 ? (
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
              <View style={{ width, height: gridHeight, alignItems: 'center', justifyContent: 'center', gap: GAP }}>
                {Array.from({ length: ROWS }, (_, row) => (
                  <View key={row} style={{ flexDirection: 'row', gap: GAP }}>
                    {Array.from({ length: COLUMNS }, (_, column) => {
                      const stamp = item[row * COLUMNS + column];
                      return stamp ? (
                        <Pressable
                          key={stamp.id}
                          style={({ pressed }) => pressed && styles.pressed}
                          onPress={() => setSelected(stamp)}
                          accessibilityRole="button"
                          accessibilityLabel={`Stamp from ${new Date(stamp.takenAt).toLocaleDateString()}`}
                        >
                          <Stamp width={stampWidth} holeColor={CLOTH}>
                            <Image source={{ uri: stampUri(stamp) }} style={StyleSheet.absoluteFill} />
                          </Stamp>
                        </Pressable>
                      ) : (
                        <View key={column} style={[styles.slot, { width: stampWidth, height: stampWidth * ASPECT }]} />
                      );
                    })}
                  </View>
                ))}
              </View>
            )}
          />
        ) : null}
      </View>

      <View style={styles.dots} accessibilityLabel={`Page ${page + 1} of ${pages.length}`}>
        {pages.length <= 10 ? (
          pages.map((_, i) => <View key={i} style={[styles.dot, i === page && styles.dotOn]} />)
        ) : (
          <Text style={styles.subtitle}>
            {page + 1} of {pages.length}
          </Text>
        )}
      </View>

      <StampSheet
        stamp={selected}
        onDone={(stamp, place, note) => {
          setSelected(null);
          if (place.trim() !== (stamp.place ?? '') || note.trim() !== (stamp.note ?? '')) onEdit(stamp, place, note);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: CLOTH },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: { color: PAPER, fontSize: 34, fontWeight: '700' },
  subtitle: { color: PAPER, opacity: 0.7, fontSize: 15 },
  camera: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: PAPER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  grid: { flex: 1 },
  slot: { borderWidth: 1, borderStyle: 'dashed', borderColor: PAPER, borderRadius: 2, opacity: 0.25 },
  dots: { height: 28, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PAPER, opacity: 0.3 },
  dotOn: { opacity: 1 },
});
