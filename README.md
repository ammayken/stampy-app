# Stampy

A phone-only camera app where the stamp is the viewfinder. So far it has:

- a live camera preview inside a perforated stamp frame on a dark screen, with a round shutter;
- a photo cropped to the one standard stamp size (3:4, 900 x 1200 px);
- a capture flash and haptic tap, then a keep-or-retake step with an optional place and note;
- a place suggested automatically from the phone's location (if you allow it);
- stamps saved on the phone with their date, shown in albums with 12-stamp pages;
- a Stamp Albums page of albums with cloth or photo covers that you can create, rename and switch between;
- a sheet for each saved stamp where its place and note can be edited, or the stamp deleted.

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
- In an album, swipe sideways between pages and tap a stamp to see its date, edit its place
  and note, or delete it.
- New stamps go into the bookmarked album, which is the one you opened last. Tap ... on a cover
  on the Stamp Albums page to rename it. Only an empty album can be removed.
- The place suggestion is a city and country from the phone's location. It needs location
  access and a network connection; without them the field just stays empty.
- From a stamp's sheet you can share it (a picture of the stamp with its perforated edge on
  a dark card, through the iOS share sheet) or move it to another album. The shared
  picture is a screen snapshot, so it is smaller than the stored 900 x 1200 photo.
- On the Stamp Albums page, tap the ... button on a cover (or hold the cover) to rename the
  album, choose a cover photo from the phone's gallery, choose a cover colour, or remove it.
  A cover photo is copied into the app at 900 px wide and fills the cover.
- Album pages are textured paper. The palette button in an album picks the paper colour
  (seven choices, one of them dark), saved per album.
- The perforated edge is a real cut-out shape (SVG), so the page shows through the holes.
- Back camera only, portrait only.

## Checks

```bash
npm run check
```

Runs the TypeScript type-check and small tests of the crop and page maths (`src/logic.check.ts`).

## Layout

In the code an album is still called a "logbook" (`Logbook`, `Shelf`); only the wording on
screen changed.

- `App.tsx` - camera screen, shutter, keep-or-retake step.
- `src/Stamp.tsx` - the perforated stamp frame.
- `src/perforation.ts` - the stamp outline shape and ink colour maths.
- `assets/paper@2x.png` - see-through, tileable paper grain laid over the page colour.
- `src/Shelf.tsx` - the shelf of cloth-cover albums.
- `src/Logbook.tsx` - album pages.
- `src/library.ts` - albums and stamps as data, and every change to them.
- `src/place.ts` - place suggestion from the phone's location.
- `src/StampSheet.tsx` - the sheet for one saved stamp.
- `src/Fields.tsx`, `src/theme.ts` - place and note inputs, shared colours.
- `src/store.ts` - saving and loading stamps on the phone.
- `src/crop.ts`, `src/pages.ts` - stamp size, centre-crop, page-splitting and grid-fitting maths.
