import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { FlatList, Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PAPER_COLORS, paperOf, STAMPS_PER_PAGE, type Logbook as LogbookRecord, type StampRecord } from './library';
import { fitStamp } from './pages';
import { inkOn } from './perforation';
import { Stamp, stampHeight } from './Stamp';
import { StampSheet } from './StampSheet';
import { stampUri } from './store';

const COLUMNS = 3;
const ROWS = STAMPS_PER_PAGE / COLUMNS;
const GAP = 12;
const ASPECT = stampHeight(1000) / 1000; // stamp paper height / width

/** One album: pages of 12 places on textured paper. Stamps can be picked up and put in any place. */
export function Logbook({
  logbook,
  pages,
  otherLogbooks,
  onCamera,
  onShelf,
  onPaper,
  onAddPage,
  onRemovePage,
  onPlace,
  onEdit,
  onMove,
  onDelete,
}: {
  logbook: LogbookRecord;
  /** Each page as 12 places holding a stamp or nothing. */
  pages: (StampRecord | undefined)[][];
  otherLogbooks: LogbookRecord[];
  onCamera: () => void;
  onShelf: () => void;
  onPaper: (color: string) => void;
  onAddPage: () => void;
  onRemovePage: (page: number) => void;
  /** Put a stamp in a slot (page * 12 + place); a stamp already there swaps with it. */
  onPlace: (stamp: StampRecord, slot: number) => void;
  onEdit: (stamp: StampRecord, place: string, note: string) => void;
  onMove: (stamp: StampRecord, logbookId: string) => void;
  onDelete: (stamp: StampRecord) => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const list = useRef<FlatList<(StampRecord | undefined)[]>>(null);
  const [selected, setSelected] = useState<StampRecord | null>(null);
  const [carrying, setCarrying] = useState<StampRecord | null>(null); // the stamp being moved
  const [choosingPaper, setChoosingPaper] = useState(false);
  const count = pages.flat().filter(Boolean).length;
  // Open on the last page that has a stamp.
  const [firstShown] = useState(() => Math.max(0, pages.map((p) => p.some(Boolean)).lastIndexOf(true)));
  const [scrolledTo, setScrolledTo] = useState(firstShown);
  const page = Math.min(scrolledTo, pages.length - 1); // removing a page can leave us past the end
  // Height actually left for the grid between header and footer, measured on screen.
  const [gridHeight, setGridHeight] = useState(0);
  const stampWidth = fitStamp(width - 40, gridHeight, COLUMNS, ROWS, GAP, ASPECT);
  const paper = paperOf(logbook);
  const ink = inkOn(paper);
  const pageIsEmpty = pages.length > 1 && pages[page].every((s) => !s);

  // When a page is added, turn to it.
  const pageTotal = useRef(pages.length);
  useEffect(() => {
    if (pages.length > pageTotal.current) {
      list.current?.scrollToIndex({ index: pages.length - 1, animated: true });
      setScrolledTo(pages.length - 1);
    }
    pageTotal.current = pages.length;
  }, [pages.length]);

  const pickUp = (stamp: StampRecord) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCarrying(stamp);
  };
  const putDown = (slot: number) => {
    if (!carrying) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPlace(carrying, slot);
    setCarrying(null);
  };

  return (
    <View style={[styles.screen, { backgroundColor: paper, paddingTop: insets.top, paddingBottom: insets.bottom + 8 }]}>
      <StatusBar style={ink === '#2a2622' ? 'dark' : 'light'} />
      {/* Paper grain: a see-through tile repeated over whatever colour the page is. */}
      <Image source={require('../assets/paper.png')} resizeMode="repeat" style={styles.texture} />

      <View style={styles.nav}>
        <Pressable
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          onPress={onShelf}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="All albums"
        >
          <Ionicons name="chevron-back" size={24} color={ink} />
          <Text style={[styles.backText, { color: ink }]}>Albums</Text>
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
        {carrying ? (
          <View style={styles.moving}>
            <Text style={[styles.movingText, { color: ink }]}>Tap where the stamp should go. Swipe for other pages.</Text>
            <Pressable onPress={() => setCarrying(null)} hitSlop={12} accessibilityRole="button">
              <Text style={[styles.cancel, { color: ink }]}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={[styles.subtitle, { color: ink }]}>
            {count === 0 ? 'No stamps yet' : `${count === 1 ? '1 stamp' : `${count} stamps`} · hold a stamp to move it`}
          </Text>
        )}
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
            ref={list}
            data={pages}
            extraData={carrying}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(_, i) => String(i)}
            initialScrollIndex={firstShown}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            onMomentumScrollEnd={(e) => setScrolledTo(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item, index: pageIndex }) => (
              <View style={{ width, height: gridHeight, alignItems: 'center', justifyContent: 'center', gap: GAP }}>
                {Array.from({ length: ROWS }, (_, row) => (
                  <View key={row} style={{ flexDirection: 'row', gap: GAP }}>
                    {Array.from({ length: COLUMNS }, (_, column) => {
                      const place = row * COLUMNS + column;
                      const slot = pageIndex * STAMPS_PER_PAGE + place;
                      const stamp = item[place];
                      const size = { width: stampWidth, height: stampWidth * ASPECT };
                      if (!stamp) {
                        return carrying ? (
                          <Pressable
                            key={place}
                            style={[styles.slot, styles.slotOpen, { borderColor: ink }, size]}
                            onPress={() => putDown(slot)}
                            accessibilityRole="button"
                            accessibilityLabel={`Empty place ${place + 1} on page ${pageIndex + 1}. Put the stamp here.`}
                          />
                        ) : (
                          <View key={place} style={[styles.slot, { borderColor: ink }, size]} />
                        );
                      }
                      const isCarried = carrying?.id === stamp.id;
                      return (
                        <Pressable
                          key={stamp.id}
                          style={({ pressed }) => [pressed && styles.pressed, isCarried && styles.carried]}
                          onPress={() => (carrying ? (isCarried ? setCarrying(null) : putDown(slot)) : setSelected(stamp))}
                          onLongPress={() => pickUp(stamp)}
                          accessibilityRole="button"
                          accessibilityLabel={`Stamp from ${new Date(stamp.takenAt).toLocaleDateString()}`}
                          accessibilityHint={carrying ? 'Swaps places with the stamp being moved.' : 'Opens the stamp. Hold to move it.'}
                        >
                          <Stamp width={stampWidth}>
                            <Image source={{ uri: stampUri(stamp) }} style={StyleSheet.absoluteFill} />
                          </Stamp>
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>
            )}
          />
        ) : null}
      </View>

      <View style={styles.footer}>
        <View style={styles.footerSide}>
          {pageIsEmpty && !carrying ? (
            <Pressable
              style={({ pressed }) => pressed && styles.pressed}
              onPress={() => onRemovePage(page)}
              hitSlop={10}
              accessibilityRole="button"
            >
              <Text style={[styles.footerText, { color: ink }]}>Remove Page</Text>
            </Pressable>
          ) : null}
        </View>
        <View style={styles.dots} accessibilityLabel={`Page ${page + 1} of ${pages.length}`}>
          {pages.length <= 8 ? (
            pages.map((_, i) => <View key={i} style={[styles.dot, { backgroundColor: ink }, i === page && styles.dotOn]} />)
          ) : (
            <Text style={[styles.subtitle, { color: ink }]}>
              {page + 1} of {pages.length}
            </Text>
          )}
        </View>
        <View style={[styles.footerSide, styles.footerRight]}>
          <Pressable
            style={({ pressed }) => [styles.addPage, pressed && styles.pressed]}
            onPress={onAddPage}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel="Add page"
          >
            <Ionicons name="add" size={18} color={ink} />
            <Text style={[styles.footerText, { color: ink }]}>Add Page</Text>
          </Pressable>
        </View>
      </View>

      <StampSheet
        stamp={selected}
        otherLogbooks={otherLogbooks}
        onRearrange={(stamp) => {
          setSelected(null);
          pickUp(stamp);
        }}
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
  moving: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  movingText: { flex: 1, fontSize: 15, fontWeight: '600' },
  cancel: { fontSize: 17, fontWeight: '600', textDecorationLine: 'underline' },
  swatches: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingBottom: 12 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, opacity: 0.9 },
  swatchOn: { borderWidth: 3, opacity: 1 },
  pressed: { opacity: 0.6 },
  carried: { opacity: 0.45, transform: [{ scale: 0.92 }] },
  grid: { flex: 1 },
  slot: { borderWidth: 1, borderStyle: 'dashed', borderRadius: 2, opacity: 0.25 },
  slotOpen: { borderWidth: 2, opacity: 0.7 },
  footer: { height: 36, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20 },
  footerSide: { flex: 1, flexDirection: 'row' },
  footerRight: { justifyContent: 'flex-end' },
  footerText: { fontSize: 15, fontWeight: '600' },
  addPage: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  dots: { flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, opacity: 0.3 },
  dotOn: { opacity: 1 },
});
