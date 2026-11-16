import { CameraView, useCameraPermissions } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { BACKGROUND, Stamp } from './src/Stamp';
import { centerCrop, STAMP_ASPECT, STAMP_PX } from './src/crop';

export default function App() {
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stampUri, setStampUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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
      setStampUri(stamp.uri);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  let body;
  if (!permission) {
    body = null; // still loading the permission state
  } else if (!permission.granted) {
    body = (
      <>
        <Text style={styles.hint}>Stampy needs the camera to make stamps.</Text>
        <Pressable
          style={styles.button}
          onPress={requestPermission}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>
            {permission.canAskAgain ? 'Allow camera' : 'Camera is blocked in Settings'}
          </Text>
        </Pressable>
      </>
    );
  } else if (stampUri) {
    body = (
      <>
        <Stamp width={stampWidth}>
          <Image source={{ uri: stampUri }} style={StyleSheet.absoluteFill} />
        </Stamp>
        <Text style={styles.hint}>
          Stamp saved at {STAMP_PX.width} x {STAMP_PX.height} px.
        </Text>
        <Pressable
          style={styles.button}
          onPress={() => {
            setReady(false);
            setStampUri(null);
          }}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>Take another</Text>
        </Pressable>
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
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: BACKGROUND,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
  },
  hint: { color: '#d8cfbd', fontSize: 16, textAlign: 'center', paddingHorizontal: 24 },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: '#f3ecdc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterOff: { opacity: 0.4 },
  shutterCore: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#f3ecdc' },
  button: {
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#f3ecdc',
  },
  buttonText: { color: '#f3ecdc', fontSize: 16 },
});
