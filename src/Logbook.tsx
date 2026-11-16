import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  FlatList,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PAPER_COLORS, paperOf, STAMPS_PER_PAGE, type Logbook as LogbookRecord, type StampRecord } from './library';
import { fitStamp, placeAt } from './pages';
import { inkOn } from './perforation';
import { Stamp, stampHeight } from './Stamp';
import { StampSheet } from './StampSheet';
import { stampUri } from './store';

const COLUMNS = 3;
const ROWS = STAMPS_PER_PAGE / COLUMNS;
const GAP = 12;
const ASPECT = stampHeight(1000) / 1000; // stamp paper height / width
const EDGE = 34; // dragging a stamp this close to a screen edge turns the page
const EDGE_WAIT = 600; // ...after holding it there this long (ms)

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

  // --- Drag and drop -------------------------------------------------------------------
  // Holding a stamp picks it up (`carrying`). While the finger stays down (`held`) the stamp
  // follows it and drops where the finger lifts. If the finger lifts without moving, the
  // stamp stays picked up and a tap on any place puts it there instead.
  const [held, setHeld] = useState(false);
  const [hover, setHover] = useState(-1); // slot under the dragged stamp
  const finger = useRef(new Animated.ValueXY()).current; // finger position on screen
  const gridView = useRef<React.ComponentRef<typeof View>>(null);
  const gridOrigin = useRef({ x: 0, y: 0 }); // top left of the grid on screen
  const dragging = useRef(false); // the drag gesture has taken over from the press
  const edge = useRef<{ side: number; timer: ReturnType<typeof setTimeout> | null }>({ side: 0, timer: null });
  // The gesture handlers are created once, so they read current values through this ref.
  const now = useRef({ carrying, held, page, pageTotal: pages.length, width, gridHeight, stampWidth, onPlace });
  now.current = { carrying, held, page, pageTotal: pages.length, width, gridHeight, stampWidth, onPlace };

  const slotUnder = (x: number, y: number) => {
    const n = now.current;
    const place = placeAt(
      x - gridOrigin.current.x,
      y - gridOrigin.current.y,
      { width: n.width, height: n.gridHeight },
      { width: n.stampWidth, height: n.stampWidth * ASPECT },
      COLUMNS,
      ROWS,
      GAP,
    );
    return place < 0 ? -1 : n.page * STAMPS_PER_PAGE + place;
  };
  const leaveEdge = () => {
    if (edge.current.timer) clearTimeout(edge.current.timer);
    edge.current = { side: 0, timer: null };
  };
  const endDrag = () => {
    leaveEdge();
    dragging.current = false;
    setHeld(false);
    setHover(-1);
  };
  const turnPage = (by: number) => {
    const n = now.current;
    const target = Math.min(n.pageTotal - 1, Math.max(0, n.page + by));
    if (target === n.page) return;
    list.current?.scrollToIndex({ index: target, animated: true });
    setScrolledTo(target);
  };

  const pan = useRef(
    PanResponder.create({
      // Take over only while a stamp is held, so ordinary swipes still turn pages.
      onMoveShouldSetPanResponderCapture: () => now.current.held,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: () => {
        dragging.current = true;
      },
      onPanResponderMove: (_, gesture) => {
        finger.setValue({ x: gesture.moveX, y: gesture.moveY });
        setHover(slotUnder(gesture.moveX, gesture.moveY));
        const side = gesture.moveX < EDGE ? -1 : gesture.moveX > now.current.width - EDGE ? 1 : 0;
        if (side !== edge.current.side) {
          leaveEdge();
          if (side) edge.current = { side, timer: setTimeout(() => (leaveEdge(), turnPage(side)), EDGE_WAIT) };
        }
      },
      onPanResponderRelease: (_, gesture) => {
        const slot = slotUnder(gesture.moveX, gesture.moveY);
        const stamp = now.current.carrying;
        if (stamp && slot >= 0) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          now.current.onPlace(stamp, slot);
        }
        setCarrying(null); // dropped off the page: nothing moves
        endDrag();
      },
      onPanResponderTerminate: endDrag,
    }),
  ).current;

  /** Picks a stamp up. With the touch that did it, the stamp also starts following the finger. */
  const pickUp = (stamp: StampRecord, touch?: GestureResponderEvent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCarrying(stamp);
    if (!touch) return;
    finger.setValue({ x: touch.nativeEvent.pageX, y: touch.nativeEvent.pageY });
    gridView.current?.measureInWindow((x, y) => (gridOrigin.current = { x, y }));
    dragging.current = false;
    setHeld(true);
  };
  /** The finger lifted off a stamp. If no drag began, stop following the finger but keep the stamp picked up. */
  const letGo = () => {
    setTimeout(() => {
      if (!dragging.current) setHeld(false);
    }, 0);
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
            <Text style={[styles.movingText, { color: ink }]} numberOfLines={1} adjustsFontSizeToFit>
              {held ? 'Drop it in place. Hold at an edge to turn the page.' : 'Tap where it should go. Swipe for other pages.'}
            </Text>
            <Pressable onPress={() => setCarrying(null)} hitSlop={12} accessibilityRole="button">
              <Text style={[styles.cancel, { color: ink }]}>Cancel</Text>
            </Pressable>
          </View>
        ) : (
          <Text style={[styles.subtitle, { color: ink }]}>
            {count === 0 ? 'No stamps yet' : `${count === 1 ? '1 stamp' : `${count} stamps`} · hold a stamp to drag it`}
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

      <View
        ref={gridView}
        style={styles.grid}
        onLayout={(e) => setGridHeight(e.nativeEvent.layout.height)}
        {...pan.panHandlers}
      >
        {stampWidth > 0 ? (
          <FlatList
            ref={list}
            data={pages}
            extraData={`${carrying?.id} ${held} ${hover}`}
            scrollEnabled={!held}
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
                      const isTarget = held && hover === slot; // the dragged stamp would land here
                      if (!stamp) {
                        return carrying ? (
                          <Pressable
                            key={place}
                            style={[styles.slot, styles.slotOpen, isTarget && styles.slotTarget, { borderColor: ink }, size]}
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
                          style={({ pressed }) => [
                            pressed && !carrying && styles.pressed,
                            isCarried && (held ? styles.lifted : styles.carried),
                            isTarget && !isCarried && styles.swapTarget,
                          ]}
                          onPress={() => (carrying ? (isCarried ? setCarrying(null) : putDown(slot)) : setSelected(stamp))}
                          onLongPress={(touch) => pickUp(stamp, touch)}
                          onPressOut={letGo}
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

      {/* The stamp being dragged, drawn a little larger under the finger. */}
      {held && carrying ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.floating,
            {
              transform: [
                { translateX: Animated.subtract(finger.x, stampWidth * 0.6) },
                { translateY: Animated.subtract(finger.y, stampWidth * ASPECT * 0.75) },
              ],
            },
          ]}
        >
          <Stamp width={stampWidth * 1.2}>
            <Image source={{ uri: stampUri(carrying) }} style={StyleSheet.absoluteFill} />
          </Stamp>
        </Animated.View>
      ) : null}

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
  // Same line height as the subtitle, so the grid below never shifts when a stamp is picked up.
  movingText: { flex: 1, fontSize: 15, fontWeight: '600' },
  cancel: { fontSize: 15, fontWeight: '600', textDecorationLine: 'underline' },
  swatches: { flexDirection: 'row', justifyContent: 'center', gap: 12, paddingBottom: 12 },
  swatch: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, opacity: 0.9 },
  swatchOn: { borderWidth: 3, opacity: 1 },
  pressed: { opacity: 0.6 },
  carried: { opacity: 0.45, transform: [{ scale: 0.92 }] },
  lifted: { opacity: 0.15 }, // its place while the stamp itself is under the finger
  swapTarget: { opacity: 0.6, transform: [{ scale: 0.92 }] },
  slotTarget: { borderWidth: 3, opacity: 1 },
  floating: {
    position: 'absolute',
    left: 0,
    top: 0,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
  },
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
