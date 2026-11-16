# Stampy

A phone-only camera app where the stamp is the viewfinder. This repo currently holds the
**camera spike**: a live camera preview inside a perforated stamp frame on a dark screen,
a round shutter, and a result cropped to the one standard stamp size (3:4, 900 x 1200 px).

Built with Expo SDK 58, React Native and TypeScript. It runs in **Expo Go**, so no Mac,
Xcode or development build is needed.

## Run it on an iPhone (from Windows)

1. On the iPhone, install **Expo Go** from the App Store.
2. Put the iPhone and the PC on the same Wi-Fi network.
3. On the PC, in this folder:

   ```bash
   npm install
   ```

   ```bash
   npx expo start
   ```

4. A QR code appears in the terminal. Scan it with the iPhone **Camera** app and tap the
   "Open in Expo Go" banner.
5. Allow camera access when asked, frame the shot inside the stamp, and press the shutter.

### If the phone cannot connect

- The first time, Windows may ask whether Node.js may use the network. Allow it for
  **private** networks.
- If it still hangs on "Opening project", the Wi-Fi is probably isolating devices. Use a
  tunnel instead (slower, but works across networks):

  ```bash
  npx expo start --tunnel
  ```

- If Expo Go says the project uses an unsupported SDK version, update Expo Go.

## What the spike does and does not do

- The saved file is a plain rectangular JPEG at 900 x 1200 px in the app cache. The
  perforated edge is drawn around it on screen, not baked into the file. Baking the edge
  into an exported image would need an image mask (Skia or SVG), which is not needed yet.
- Nothing is stored permanently yet: no logbooks, date, place or note.
- Back camera only, portrait only.

## Checks

```bash
npm run check
```

Runs the TypeScript type-check and a small test of the crop maths (`src/crop.check.ts`).

## Layout

- `App.tsx` - the camera screen, shutter and result.
- `src/Stamp.tsx` - the perforated stamp frame.
- `src/crop.ts` - the standard stamp size and the centre-crop calculation.
