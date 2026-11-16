import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PAPER_COLORS, paperOf, type Logbook as LogbookRecord, type StampRecord } from './library';
import { fitStamp, pagesOf, STAMPS_PER_PAGE } from './pages';
import { inkOn } from './perforation';
import { Stamp, stampHeight } from './Stamp';
import { StampSheet } from './StampSheet';
import { stampUri } from './store';

const COLUMNS = 3;
const ROWS = STAMPS_PER_PAGE / COLUMNS;
const GAP = 12;
const ASPECT = stampHeight(1000) / 1000; // stamp paper height / width

/** One logbook: pages of 12 stamps on textured paper of the logbook's chosen colour. */
export function Logbook({
  logbook,
  stamps,
  onCamera,
  onShelf,
  onPaper,
  otherLogbooks,
  onEdit,
  onMove,
  onDelete,
}: {
  logbook: LogbookRecord;
  stamps: StampRecord[];
  otherLogbooks: LogbookRecord[];
  onCamera: () => void;
  onShelf: () => void;
  onPaper: (color: string) => void;
  onEdit: (stamp: StampRecord, place: string, note: string) => void;
  onMove: (stamp: StampRecord, logbookId: string) => void;
  onDelete: (stamp: StampRecord) => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<StampRecord | null>(null);
  const [choosingPaper, setChoosingPaper] = useState(false);
  const pages = pagesOf(stamps);
  const [scrolledTo, setScrolledTo] = useState(pages.length - 1);
  const page = Math.min(scrolledTo, pages.length - 1); // a delete can remove the last page
  // Height actually left for the grid between header and footer, measured on screen.
  const [gridHeight, setGridHeight] = useState(0);
  const stampWidth = fitStamp(width - 40, gridHeight, COLUMNS, ROWS, GAP, ASPECT);
  const paper = paperOf(logbook);
  const ink = inkOn(paper);

  return (
    <View style={[styles.screen, { backgroundColor: paper, paddingTop: insets.top, paddingBottom: insets.bottom + 8 }]}>
      {/* Paper grain: a see-through tile repeated over whatever colour the page is. */}
      <Image source={require('../assets/paper.png')} resizeMode="repeat" style={styles.texture} />

      <View style={styles.nav}>
        <Pressable
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          onPress={onShelf}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="All logbooks"
        >
          <Ionicons name="chevron-back" size={24} color={ink} />
          <Text style={[styles.backText, { color: ink }]}>Logbooks</Text>
        </Pressable>
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.round, { borderColor: ink }, pressed && styles.pressed]}
            onPress={() => setChoosingPaper((open) => !open)}
            accessibilityRole="button"
            accessibilityLabel="Paper colour"
            accessibilityState={{ expanded: choosingPaper }}
          >
            <Ionicons name="color-palette-outline" size={22} color={ink} />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.round, { backgroundColor: ink, borderColor: ink }, pressed && styles.pressed]}
            onPress={onCamera}
            accessibilityRole="button"
            accessibilityLabel="Take a new stamp"
          >
            <Ionicons name="camera" size={22} color={paper} />
          </Pressable>
        </View>
      </View>

      <View style={styles.header}>
        <Text style={[styles.title, { color: ink }]} numberOfLines={1}>
          {logbook.name}
        </Text>
        <Text style={[styles.subtitle, { color: ink }]}>
          {stamps.length === 0 ? 'No stamps yet' : stamps.length === 1 ? '1 stamp' : `${stamps.length} stamps`}
        </Text>
      </View>

      {choosingPaper ? (
        <View style={styles.swatches} accessibilityRole="radiogroup" accessibilityLabel="Paper colour">
          {PAPER_COLORS.map((color) => (
            <Pressable
              key={color}
              onPress={() => onPaper(color)}
              hitSlop={4}
              accessibilityRole="radio"
              accessibilityState={{ selected: color === paper }}
              accessibilityLabel={`Paper colour ${PAPER_COLORS.indexOf(color) + 1} of ${PAPER_COLORS.length}`}
              style={[styles.swatch, { backgroundColor: color, borderColor: ink }, color === paper && styles.swatchOn]}
            />
          ))}
        </View>
      ) : null}

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
            onMomentumScrollEnd={(e) => setScrolledTo(Math.round(e.nativeEvent.contentOffset.x / width))}
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
                          <Stamp width={stampWidth}>
                            <Image source={{ uri: stampUri(stamp) }} style={StyleSheet.absoluteFill} />
                          </Stamp>
                        </Pressable>
                      ) : (
                        <View
                          key={column}
                          style={[styles.slot, { borderColor: ink, width: stampWidth, height: stampWidth * ASPECT }]}
                        />
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
          pages.map((_, i) => <View key={i} style={[styles.dot, { backgroundColor: ink }, i === page && styles.dotOn]} />)
        ) : (
          <Text style={[styles.subtitle, { color: ink }]}>
            {page + 1} of {pages.length}
          </Text>
        )}
      </View>

      <StampSheet
        stamp={selected}
        otherLogbooks={otherLogbooks}
        onMove={(stamp, logbookId) => {
          setSelected(null);
          onMove(stamp, logbookId);
        }}
        onDone={(stamp, place, note) => {
          setSelected(null);
          if (place.trim() !== (stamp.place ?? '') || note.trim() !== (stamp.note ?? '')) onEdit(stamp, place, note);
        }}
        onDelete={(stamp) => {
          setSelected(null);
          onDelete(stamp);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  texture: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  nav: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 8, paddingRight: 20 },
  back: { flexDirection: 'row', alignItems: 'center' },
  backText: { fontSize: 17 },
  actions: { flexDirection: 'row', gap: 12 },
  round: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  header: { paddingHorizontal: 20, paddingBottom: 12 },
  title: { fontSize: 34, fontWeight: '700' },
  subtitle: { opacity: 0.7, fontSize: 15 },
  swatches: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingBottom: 12 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, opacity: 0.9 },
  swatchOn: { borderWidth: 3, opacity: 1 },
  pressed: { opacity: 0.6 },
  grid: { flex: 1 },
  slot: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 2, opacity: 0.25 },
  dots: { height: 28, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, opacity: 0.3 },
  dotOn: { opacity: 1 },
});
