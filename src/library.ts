// The whole saved state: logbooks and the stamps inside them. Everything here is pure
// (no file access) so it can be tested with `npm run check`; src/store.ts does the saving.

export type Logbook = {
  id: string;
  name: string;
  color: string; // cloth cover
  paper?: string; // inside pages; missing in logbooks saved before pages had a colour
};

/** Page colours to choose from. The first is the default. */
export const PAPER_COLORS = ['#efe6d2', '#f7f4ec', '#d9d9d4', '#c9ac84', '#ecd9d0', '#d5dccb', '#2b2a28'];

export function paperOf(book: Logbook): string {
  return book.paper ?? PAPER_COLORS[0];
}

export function setPaper(lib: Library, id: string, paper: string): Library {
  return { ...lib, logbooks: lib.logbooks.map((b) => (b.id === id ? { ...b, paper } : b)) };
}

export type StampRecord = {
  id: string;
  file: string; // file name inside the stamps folder (not a full path: iOS can move the folder)
  takenAt: string; // ISO date
  place?: string;
  note?: string;
  logbookId: string;
};

export type Library = {
  logbooks: Logbook[];
  currentId: string; // the logbook new stamps go into
  stamps: StampRecord[]; // oldest first
};

/** Dark cloth colours, so cream stamps and labels stay readable on all of them. */
export const COVER_COLORS = ['#26352e', '#232f45', '#4a2530', '#40332a', '#3a2d4a', '#2d2d30'];

/** Turns whatever was read from disk into a Library. The first app version saved a bare list of stamps. */
export function toLibrary(saved: unknown): Library {
  if (Array.isArray(saved)) {
    const book: Logbook = { id: 'first', name: 'My Logbook', color: COVER_COLORS[0] };
    return {
      logbooks: [book],
      currentId: book.id,
      stamps: saved.map((stamp) => ({ ...stamp, logbookId: book.id })),
    };
  }
  return saved as Library;
}

export function currentLogbook(lib: Library): Logbook {
  return lib.logbooks.find((b) => b.id === lib.currentId) ?? lib.logbooks[0];
}

export function stampsIn(lib: Library, logbookId: string): StampRecord[] {
  return lib.stamps.filter((s) => s.logbookId === logbookId);
}

const clean = (text: string) => text.trim() || undefined;

/** Adds a stamp to the current logbook. */
export function addStamp(lib: Library, id: string, file: string, takenAt: string, place: string, note: string): Library {
  const stamp: StampRecord = { id, file, takenAt, place: clean(place), note: clean(note), logbookId: currentLogbook(lib).id };
  return { ...lib, stamps: [...lib.stamps, stamp] };
}

export function editStamp(lib: Library, id: string, place: string, note: string): Library {
  return { ...lib, stamps: lib.stamps.map((s) => (s.id === id ? { ...s, place: clean(place), note: clean(note) } : s)) };
}

export function moveStamp(lib: Library, id: string, logbookId: string): Library {
  if (!lib.logbooks.some((b) => b.id === logbookId)) return lib;
  return { ...lib, stamps: lib.stamps.map((s) => (s.id === id ? { ...s, logbookId } : s)) };
}

/** Gives a logbook the next cover colour in the list, wrapping around. */
export function recolorLogbook(lib: Library, id: string): Library {
  const next = (color: string) => COVER_COLORS[(COVER_COLORS.indexOf(color) + 1) % COVER_COLORS.length];
  return { ...lib, logbooks: lib.logbooks.map((b) => (b.id === id ? { ...b, color: next(b.color) } : b)) };
}

export function removeStamp(lib: Library, id: string): Library {
  return { ...lib, stamps: lib.stamps.filter((s) => s.id !== id) };
}

/** Adds a logbook and makes it the current one. A blank name is ignored. */
export function addLogbook(lib: Library, id: string, name: string): Library {
  if (!name.trim()) return lib;
  const color = COVER_COLORS[lib.logbooks.length % COVER_COLORS.length];
  return { ...lib, logbooks: [...lib.logbooks, { id, name: name.trim(), color }], currentId: id };
}

export function renameLogbook(lib: Library, id: string, name: string): Library {
  if (!name.trim()) return lib;
  return { ...lib, logbooks: lib.logbooks.map((b) => (b.id === id ? { ...b, name: name.trim() } : b)) };
}

export function selectLogbook(lib: Library, id: string): Library {
  return { ...lib, currentId: id };
}

/** Only an empty logbook can be removed, and never the last one. */
export function canRemoveLogbook(lib: Library, id: string): boolean {
  return lib.logbooks.length > 1 && stampsIn(lib, id).length === 0;
}

export function removeLogbook(lib: Library, id: string): Library {
  if (!canRemoveLogbook(lib, id)) return lib;
  const logbooks = lib.logbooks.filter((b) => b.id !== id);
  return { ...lib, logbooks, currentId: lib.currentId === id ? logbooks[0].id : lib.currentId };
}
