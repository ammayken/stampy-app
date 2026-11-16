import { CameraView, useCameraPermissions } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { centerCrop, STAMP_ASPECT, STAMP_PX } from './src/crop';
import { Logbook } from './src/Logbook';
import { BACKGROUND, PAPER, Stamp } from './src/Stamp';
import { keepStamp, loadStamps, type StampRecord } from './src/store';

function message(e: unknown) {
  return e instanceof Error ? e.message : String(e);
}

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A freshly taken stamp that has not been kept yet.
  const [draftUri, setDraftUri] = useState<string | null>(null);
  const [place, setPlace] = useState('');
  const [note, setNote] = useState('');
  const [stamps, setStamps] = useState<StampRecord[] | null>(null);
  const [showLogbook, setShowLogbook] = useState(false);
  const { width: screenWidth } = useWindowDimensions();
  const stampWidth = Math.min(screenWidth - 72, 340);

  async function shoot() {
    if (!camera.current || !ready || busy) return;
    setBusy(true);
    setError(null);
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
    setDraftUri(null);
    setPlace('');
    setNote('');
    setShowLogbook(false);
  }

  function keep() {
    if (!draftUri) return;
    try {
      setStamps(keepStamp(draftUri, place, note));
      backToCamera();
      setShowLogbook(true);
    } catch (e) {
      setError(message(e));
    }
  }

  function openLogbook() {
    try {
      setStamps(loadStamps());
      setShowLogbook(true);
    } catch (e) {
      setError(message(e));
    }
  }

  if (showLogbook && stamps) {
    return (
      <>
        <StatusBar style="light" />
        <Logbook stamps={stamps} onClose={backToCamera} />
      </>
    );
  }

  let body;
  if (!permission) {
    body = null; // still loading the permission state
  } else if (!permission.granted) {
    body = (
      <>
        <Text style={styles.hint}>Stampy needs the camera to make stamps.</Text>
        <Pressable style={styles.button} onPress={requestPermission} accessibilityRole="button">
          <Text style={styles.buttonText}>
            {permission.canAskAgain ? 'Allow camera' : 'Camera is blocked in Settings'}
          </Text>
        </Pressable>
      </>
    );
  } else if (draftUri) {
    body = (
      <>
        <Stamp width={Math.min(stampWidth, 200)}>
          <Image source={{ uri: draftUri }} style={StyleSheet.absoluteFill} />
        </Stamp>
        {error ? <Text style={styles.hint}>{error}</Text> : null}
        <TextInput
          style={styles.input}
          value={place}
          onChangeText={setPlace}
          placeholder="Place (optional)"
          placeholderTextColor="#8a8272"
          maxLength={60}
          returnKeyType="done"
          accessibilityLabel="Place"
        />
        <TextInput
          style={styles.input}
          value={note}
          onChangeText={setNote}
          placeholder="Note (optional)"
          placeholderTextColor="#8a8272"
          maxLength={140}
          returnKeyType="done"
          accessibilityLabel="Note"
        />
        <View style={styles.row}>
          <Pressable style={styles.button} onPress={backToCamera} accessibilityRole="button">
            <Text style={styles.buttonText}>Retake</Text>
          </Pressable>
          <Pressable style={[styles.button, styles.primary]} onPress={keep} accessibilityRole="button">
            <Text style={[styles.buttonText, styles.primaryText]}>Keep stamp</Text>
          </Pressable>
        </View>
      </>
    );
  } else {
    body = (
      <>
        <Stamp width={stampWidth}>
          <CameraView
            ref={camera}
            style={StyleSheet.absoluteFill}
            facing="back"
            onCameraReady={() => setReady(true)}
            onMountError={(e) => setError(e.message)}
          />
        </Stamp>
        <Text style={styles.hint}>{error ?? 'Frame your shot inside the stamp.'}</Text>
        <Pressable
          style={[styles.shutter, (!ready || busy) && styles.shutterOff]}
          onPress={shoot}
          disabled={!ready || busy}
          accessibilityRole="button"
          accessibilityLabel="Take stamp"
        >
          <View style={styles.shutterCore} />
        </Pressable>
        <Pressable onPress={openLogbook} hitSlop={12} accessibilityRole="button">
          <Text style={styles.link}>Logbook</Text>
        </Pressable>
      </>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.flex} behavior="padding">
      <Pressable style={styles.screen} onPress={Keyboard.dismiss} accessible={false}>
        <StatusBar style="light" />
        {body}
      </Pressable>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: BACKGROUND },
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 },
  hint: { color: '#d8cfbd', fontSize: 16, textAlign: 'center', paddingHorizontal: 24 },
  link: { color: '#d8cfbd', fontSize: 16, textDecorationLine: 'underline' },
  input: {
    width: 280,
    color: PAPER,
    fontSize: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#8a8272',
    paddingVertical: 8,
  },
  row: { flexDirection: 'row', gap: 14 },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: PAPER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOff: { opacity: 0.4 },
  shutterCore: { width: 58, height: 58, borderRadius: 29, backgroundColor: PAPER },
  button: { paddingHorizontal: 22, paddingVertical: 12, borderRadius: 24, borderWidth: 1, borderColor: PAPER },
  primary: { backgroundColor: PAPER },
  primaryText: { color: BACKGROUND },
  buttonText: { color: PAPER, fontSize: 16 },
});
