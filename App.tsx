import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, Image, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { centerCrop, STAMP_ASPECT, STAMP_PX } from './src/crop';
import { Fields } from './src/Fields';
import {
  addLogbook,
  addStamp,
  currentLogbook,
  editStamp,
  moveStamp,
  recolorLogbook,
  removeLogbook,
  removeStamp,
  renameLogbook,
  selectLogbook,
  setPaper,
  stampsIn,
  type Library,
} from './src/library';
import { Logbook } from './src/Logbook';
import { suggestPlace } from './src/place';
import { Shelf } from './src/Shelf';
import { Stamp, stampHeight } from './src/Stamp';
import { deletePhoto, loadLibrary, saveLibrary, stampUri, storePhoto } from './src/store';
import { BACKGROUND, FIELD, LABEL, PAPER, SECONDARY } from './src/theme';

function message(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export default function App() {
  // Read saved stamps once. If the file is unreadable, stop here rather than risk overwriting it.
  const [loaded] = useState(() => {
    try {
      return { library: loadLibrary() };
    } catch (e) {
      return { failure: message(e) };
    }
  });
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {loaded.library ? (
        <Main saved={loaded.library} />
      ) : (
        <View style={[styles.screen, styles.centered]}>
          <Ionicons name="warning-outline" size={48} color={PAPER} />
          <Text style={styles.hint}>Stampy could not read your saved stamps, so it has stopped to keep them safe.</Text>
          <Text style={styles.hint}>{loaded.failure}</Text>
        </View>
      )}
    </SafeAreaProvider>
  );
}

function Main({ saved }: { saved: Library }) {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A freshly taken stamp that has not been kept yet.
  const [draftUri, setDraftUri] = useState<string | null>(null);
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [library, setLibrary] = useState(saved);
  const [screen, setScreen] = useState<'camera' | 'logbook' | 'shelf'>('camera');
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // White flash over the viewfinder on capture, and the new stamp "landing" on the review step.
  const flash = useRef(new Animated.Value(0)).current;
  const land = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!draftUri) return;
    land.setValue(0);
    Animated.spring(land, { toValue: 1, friction: 6, tension: 120, useNativeDriver: true }).start();
  }, [draftUri, land]);

  // Biggest viewfinder stamp that leaves room for the hint and the bottom bar.
  const roomForStamp = height - insets.top - insets.bottom - BAR_HEIGHT - 80;
  const stampWidth = Math.min(width - 56, 360, (roomForStamp / stampHeight(1000)) * 1000);

  /** Saves a changed library to the phone, then shows it. Returns false if saving failed. */
  function commit(next: Library) {
    try {
      saveLibrary(next);
      setLibrary(next);
      return true;
    } catch (e) {
      setError(message(e));
      return false;
    }
  }

  async function shoot() {
    if (!camera.current || !ready || busy) return;
    setBusy(true);
    setError(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    flash.setValue(1);
    Animated.timing(flash, { toValue: 0, duration: 350, useNativeDriver: true }).start();
    // Look up the place in the background; never overwrite something already typed.
    suggestPlace().then((found) => found && setPlace((typed) => typed || found));
    try {
      const photo = await camera.current.takePictureAsync({ quality: 1 });
      const image = await ImageManipulator.manipulate(photo.uri)
        .crop(centerCrop(photo.width, photo.height, STAMP_ASPECT))
        .resize(STAMP_PX)
        .renderAsync();
      const stamp = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.9 });
      setDraftUri(stamp.uri);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }

  function backToCamera() {
    setReady(false); // the camera view remounts and reports ready again
    setError(null);
    setDraftUri(null);
    setPlace('');
    setNote('');
    setScreen('camera');
  }

  function keep() {
    if (!draftUri) return;
    try {
      const now = new Date();
      const id = String(now.getTime());
      storePhoto(draftUri, `${id}.jpg`);
      if (!commit(addStamp(library, id, `${id}.jpg`, now.toISOString(), place, note))) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      backToCamera();
    } catch (e) {
      setError(message(e));
    }
  }

  const book = currentLogbook(library);
  const bookStamps = stampsIn(library, book.id);

  if (screen === 'shelf') {
    return (
      <Shelf
        library={library}
        onOpen={(id) => {
          if (commit(selectLogbook(library, id))) setScreen('logbook');
        }}
        onCreate={(name) => commit(addLogbook(library, String(Date.now()), name))}
        onRename={(id, name) => commit(renameLogbook(library, id, name))}
        onRecolor={(id) => commit(recolorLogbook(library, id))}
        onRemove={(id) => commit(removeLogbook(library, id))}
      />
    );
  }

  if (screen === 'logbook') {
    return (
      <Logbook
        key={book.id}
        logbook={book}
        stamps={bookStamps}
        onCamera={backToCamera}
        onShelf={() => setScreen('shelf')}
        onPaper={(color) => commit(setPaper(library, book.id, color))}
        otherLogbooks={library.logbooks.filter((b) => b.id !== book.id)}
        onEdit={(stamp, newPlace, newNote) => commit(editStamp(library, stamp.id, newPlace, newNote))}
        onMove={(stamp, logbookId) => commit(moveStamp(library, stamp.id, logbookId))}
        onDelete={(stamp) => {
          // Forget the stamp first; only then remove its photo, so a failure never leaves a stamp without a photo.
          if (commit(removeStamp(library, stamp.id))) deletePhoto(stamp);
        }}
      />
    );
  }

  if (!permission) return <View style={styles.screen} />; // still loading the permission state

  if (!permission.granted) {
    return (
      <View style={[styles.screen, styles.centered]}>
        <Ionicons name="camera-outline" size={48} color={PAPER} />
        <Text style={styles.hint}>Stampy needs the camera to make stamps.</Text>
        <Pressable
          style={({ pressed }) => [styles.button, styles.primary, styles.lone, pressed && styles.pressed]}
          onPress={requestPermission}
          accessibilityRole="button"
        >
          <Text style={styles.primaryText}>
            {permission.canAskAgain ? 'Allow camera' : 'Camera is blocked in Settings'}
          </Text>
        </Pressable>
      </View>
    );
  }

  if (draftUri) {
    return (
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.review, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
        automaticallyAdjustKeyboardInsets
      >
        <Animated.View
          style={{
            opacity: land,
            transform: [{ scale: land.interpolate({ inputRange: [0, 1], outputRange: [1.35, 1] }) }],
          }}
        >
          <Stamp width={Math.min(width - 150, 250)}>
            <Image source={{ uri: draftUri }} style={StyleSheet.absoluteFill} />
          </Stamp>
        </Animated.View>
        {error ? <Text style={styles.hint}>{error}</Text> : null}
        <Fields place={place} note={note} onPlace={setPlace} onNote={setNote} />
        <Text style={styles.hint}>Goes into {book.name}.</Text>
        <View style={styles.row}>
          <Pressable
            style={({ pressed }) => [styles.button, styles.secondary, pressed && styles.pressed]}
            onPress={backToCamera}
            accessibilityRole="button"
          >
            <Text style={styles.secondaryText}>Retake</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.button, styles.primary, pressed && styles.pressed]}
            onPress={keep}
            accessibilityRole="button"
          >
            <Text style={styles.primaryText}>Keep stamp</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  const latest = bookStamps[bookStamps.length - 1];
  return (
    <View style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.viewfinder}>
        <Stamp width={stampWidth}>
          <CameraView
            ref={camera}
            style={StyleSheet.absoluteFill}
            facing="back"
            onCameraReady={() => setReady(true)}
            onMountError={(e) => setError(e.message)}
          />
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash, { opacity: flash }]} />
        </Stamp>
        <Text style={styles.hint}>{error ?? 'Frame your shot inside the stamp.'}</Text>
      </View>

      <View style={styles.bar}>
        <Pressable
          style={({ pressed }) => [styles.side, pressed && styles.pressed]}
          onPress={() => setScreen('logbook')}
          accessibilityRole="button"
          accessibilityLabel={`Open ${book.name}`}
        >
          {latest ? (
            <Image source={{ uri: stampUri(latest) }} style={styles.thumb} />
          ) : (
            <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: book.color }]}>
              <Ionicons name="book-outline" size={22} color={PAPER} />
            </View>
          )}
          <Text style={styles.sideLabel} numberOfLines={1}>
            {book.name}
          </Text>
        </Pressable>

        <Pressable
          style={[styles.shutter, (!ready || busy) && styles.shutterOff]}
          onPress={shoot}
          disabled={!ready || busy}
          accessibilityRole="button"
          accessibilityLabel="Take stamp"
        >
          {({ pressed }) => <View style={[styles.shutterCore, pressed && styles.shutterPressed]} />}
        </Pressable>

        <View style={styles.side} />
      </View>
    </View>
  );
}

const BAR_HEIGHT = 120;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: BACKGROUND },
  centered: { alignItems: 'center', justifyContent: 'center', gap: 20 },
  viewfinder: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  flash: { backgroundColor: '#fff' },
  hint: { color: SECONDARY, fontSize: 15, textAlign: 'center', paddingHorizontal: 24 },
  bar: {
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  side: { width: 88, alignItems: 'center', gap: 6 },
  sideLabel: { color: LABEL, fontSize: 12 },
  thumb: {
    width: 42,
    height: 56,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: PAPER,
    backgroundColor: FIELD,
  },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  shutter: {
    width: 78,
    height: 78,
    borderRadius: 39,
    borderWidth: 4,
    borderColor: PAPER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOff: { opacity: 0.4 },
  shutterCore: { width: 62, height: 62, borderRadius: 31, backgroundColor: PAPER },
  shutterPressed: { transform: [{ scale: 0.88 }] },
  review: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: 24, paddingHorizontal: 20 },
  row: { flexDirection: 'row', gap: 12, alignSelf: 'stretch' },
  button: { flex: 1, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  lone: { flex: 0 },
  primary: { backgroundColor: PAPER },
  primaryText: { color: BACKGROUND, fontSize: 17, fontWeight: '600' },
  secondary: { backgroundColor: FIELD },
  secondaryText: { color: LABEL, fontSize: 17, fontWeight: '600' },
  pressed: { opacity: 0.6 },
});
