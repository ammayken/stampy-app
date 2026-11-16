import { Directory, File, Paths } from 'expo-file-system';

export type StampRecord = {
  id: string;
  file: string; // file name inside the stamps folder (not a full path: iOS can move the folder)
  takenAt: string; // ISO date
  place?: string;
  note?: string;
};

// ponytail: one JSON index file, rewritten on every save. Move to SQLite when
// there are multiple logbooks or thousands of stamps.
const dir = new Directory(Paths.document, 'stamps');
const index = new File(dir, 'stamps.json');

export function stampUri(stamp: StampRecord): string {
  return new File(dir, stamp.file).uri;
}

/** Oldest first. Throws if the index is unreadable, so a bad file is never silently overwritten. */
export function loadStamps(): StampRecord[] {
  if (!index.exists) return [];
  return JSON.parse(index.textSync());
}

/** Moves the freshly cropped photo into permanent storage and records it. Returns all stamps. */
export function keepStamp(tempUri: string, place: string, note: string): StampRecord[] {
  const stamps = loadStamps();
  if (!dir.exists) dir.create({ intermediates: true });
  const now = new Date();
  const id = String(now.getTime());
  const record: StampRecord = {
    id,
    file: `${id}.jpg`,
    takenAt: now.toISOString(),
    place: place.trim() || undefined,
    note: note.trim() || undefined,
  };
  new File(tempUri).moveSync(new File(dir, record.file));
  const all = [...stamps, record];
  if (!index.exists) index.create();
  index.writeSync(JSON.stringify(all));
  return all;
}

/** Changes the place and note of a saved stamp. Returns all stamps. */
export function updateStamp(id: string, place: string, note: string): StampRecord[] {
  const all = loadStamps().map((s) =>
    s.id === id ? { ...s, place: place.trim() || undefined, note: note.trim() || undefined } : s,
  );
  index.writeSync(JSON.stringify(all));
  return all;
}
