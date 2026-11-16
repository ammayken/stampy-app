# Stampy

A phone-only camera app where the stamp is the viewfinder. So far it has:

- a live camera preview inside a perforated stamp frame on a dark screen, with a round shutter;
- a photo cropped to the one standard stamp size (3:4, 900 x 1200 px);
- a capture flash and haptic tap, then a keep-or-retake step with an optional place and note;
- stamps saved on the phone with their date, shown in a logbook with 12-stamp pages;
- a sheet for each saved stamp where its place and note can be edited.

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

## What it does and does not do

- Kept stamps live in the app's documents folder: a JPEG per stamp plus one `stamps.json`
  index. In Expo Go that folder belongs to Expo Go, so stamps survive restarts but are lost
  if Expo Go is deleted.
- Each saved file is a plain rectangular JPEG. The perforated edge is drawn around it on
  screen, not baked into the file.
- One logbook only, with no cloth cover yet. Swipe sideways between pages; tap a stamp to
  see its date and edit its place and note.
- Place is typed by hand; there is no GPS lookup.
- No deleting stamps yet. Back camera only, portrait only.

## Checks

```bash
npm run check
```

Runs the TypeScript type-check and small tests of the crop and page maths (`src/logic.check.ts`).

## Layout

- `App.tsx` - camera screen, shutter, keep-or-retake step.
- `src/Stamp.tsx` - the perforated stamp frame.
- `src/Logbook.tsx` - logbook pages.
- `src/StampSheet.tsx` - the sheet for one saved stamp.
- `src/Fields.tsx`, `src/theme.ts` - place and note inputs, shared colours.
- `src/store.ts` - saving and loading stamps on the phone.
- `src/crop.ts`, `src/pages.ts` - stamp size, centre-crop, page-splitting and grid-fitting maths.
