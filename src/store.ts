import { Directory, File, Paths } from 'expo-file-system';
import { toLibrary, type Library, type StampRecord } from './library';

// ponytail: one JSON index file, rewritten on every change. Move to SQLite when
// there are thousands of stamps.
const dir = new Directory(Paths.document, 'stamps');
const index = new File(dir, 'stamps.json');

/** Full location of a stored photo (a stamp or an album cover) from its file name. */
export function fileUri(fileName: string): string {
  return new File(dir, fileName).uri;
}

export function stampUri(stamp: StampRecord): string {
  return fileUri(stamp.file);
}

/** Throws if the index is unreadable; the caller must then not save, so a bad file is never overwritten. */
export function loadLibrary(): Library {
  return toLibrary(index.exists ? JSON.parse(index.textSync()) : []);
}

export function saveLibrary(lib: Library) {
  if (!dir.exists) dir.create({ intermediates: true });
  if (!index.exists) index.create();
  index.writeSync(JSON.stringify(lib));
}

/** Moves a freshly cropped photo into permanent storage under the given file name. */
export function storePhoto(tempUri: string, fileName: string) {
  if (!dir.exists) dir.create({ intermediates: true });
  new File(tempUri).moveSync(new File(dir, fileName));
}

export function deletePhoto(fileName: string) {
  const file = new File(dir, fileName);
  if (file.exists) file.delete();
}
