// The whole saved state: logbooks and the stamps inside them. Everything here is pure
// (no file access) so it can be tested with `npm run check`; src/store.ts does the saving.

export type Logbook = {
  id: string;
  name: string;
  color: string; // cloth cover
  cover?: string; // file name of a cover photo in the stamps folder; shown instead of the plain cloth
  paper?: string; // inside pages; missing in logbooks saved before pages had a colour
  pages?: number; // pages the user asked for; there are always enough to show every stamp
};

export const STAMPS_PER_PAGE = 12;

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
  slot: number; // position in its logbook: page * 12 + place on the page (0 = top left)
};

export type Library = {
  logbooks: Logbook[];
  currentId: string; // the logbook new stamps go into
  stamps: StampRecord[]; // oldest first
};

/** Dark cloth colours, so cream stamps and labels stay readable on all of them. */
export const COVER_COLORS = ['#26352e', '#232f45', '#4a2530', '#40332a', '#3a2d4a', '#2d2d30'];
export const COVER_COLOR_NAMES = ['Forest', 'Navy', 'Burgundy', 'Walnut', 'Plum', 'Charcoal'];

/**
 * Turns whatever was read from disk into a Library. The first app version saved a bare
 * list of stamps, and stamps saved before they had slots are given slots in order.
 */
export function toLibrary(saved: unknown): Library {
  let lib = saved as Library;
  if (Array.isArray(saved)) {
    const book: Logbook = { id: 'first', name: 'My Album', color: COVER_COLORS[0] };
    lib = { logbooks: [book], currentId: book.id, stamps: saved.map((stamp) => ({ ...stamp, logbookId: book.id })) };
  }
  const taken = new Map<string, Set<number>>();
  const takenIn = (logbookId: string) => taken.get(logbookId) ?? taken.set(logbookId, new Set()).get(logbookId)!;
  for (const s of lib.stamps) if (s.slot != null) takenIn(s.logbookId).add(s.slot);
  const stamps = lib.stamps.map((s) => {
    if (s.slot != null) return s;
    const slot = lowestFree(takenIn(s.logbookId));
    takenIn(s.logbookId).add(slot);
    return { ...s, slot };
  });
  return { ...lib, stamps };
}

function lowestFree(taken: Set<number>): number {
  let slot = 0;
  while (taken.has(slot)) slot++;
  return slot;
}

/** The first empty slot in a logbook, which is where a new stamp lands. */
export function firstFreeSlot(lib: Library, logbookId: string): number {
  return lowestFree(new Set(stampsIn(lib, logbookId).map((s) => s.slot)));
}

/** Pages in a logbook: what the user asked for, or more if stamps sit further on. Always at least 1. */
export function pageCount(lib: Library, logbookId: string): number {
  const asked = lib.logbooks.find((b) => b.id === logbookId)?.pages ?? 1;
  const lastSlot = Math.max(-1, ...stampsIn(lib, logbookId).map((s) => s.slot));
  return Math.max(1, asked, Math.ceil((lastSlot + 1) / STAMPS_PER_PAGE));
}

/** Each page as 12 places, holding a stamp or undefined for an empty place. */
export function pagesOf(lib: Library, logbookId: string): (StampRecord | undefined)[][] {
  const pages = Array.from({ length: pageCount(lib, logbookId) }, () =>
    Array.from({ length: STAMPS_PER_PAGE }, (): StampRecord | undefined => undefined),
  );
  for (const s of stampsIn(lib, logbookId)) pages[Math.floor(s.slot / STAMPS_PER_PAGE)][s.slot % STAMPS_PER_PAGE] = s;
  return pages;
}

const setPages = (lib: Library, id: string, pages: number): Library => ({
  ...lib,
  logbooks: lib.logbooks.map((b) => (b.id === id ? { ...b, pages } : b)),
});

/** Adds an empty page at the end of a logbook. */
export function addPage(lib: Library, logbookId: string): Library {
  return setPages(lib, logbookId, pageCount(lib, logbookId) + 1);
}

/** A page can be removed when it is empty and is not the only page. */
export function canRemovePage(lib: Library, logbookId: string, page: number): boolean {
  const pages = pagesOf(lib, logbookId);
  return pages.length > 1 && page < pages.length && pages[page].every((s) => !s);
}

/** Removes an empty page; stamps on later pages move one page forward. */
export function removePage(lib: Library, logbookId: string, page: number): Library {
  if (!canRemovePage(lib, logbookId, page)) return lib;
  const after = (page + 1) * STAMPS_PER_PAGE;
  const stamps = lib.stamps.map((s) =>
    s.logbookId === logbookId && s.slot >= after ? { ...s, slot: s.slot - STAMPS_PER_PAGE } : s,
  );
  return setPages({ ...lib, stamps }, logbookId, pageCount(lib, logbookId) - 1);
}

/** Puts a stamp in a slot of its own logbook. If another stamp is there, the two swap places. */
export function placeStamp(lib: Library, id: string, slot: number): Library {
  const moving = lib.stamps.find((s) => s.id === id);
  if (!moving || slot < 0 || slot === moving.slot) return lib;
  const stamps = lib.stamps.map((s) => {
    if (s.id === id) return { ...s, slot };
    if (s.logbookId === moving.logbookId && s.slot === slot) return { ...s, slot: moving.slot };
    return s;
  });
  return { ...lib, stamps };
}

export function currentLogbook(lib: Library): Logbook {
  return lib.logbooks.find((b) => b.id === lib.currentId) ?? lib.logbooks[0];
}

export function stampsIn(lib: Library, logbookId: string): StampRecord[] {
  return lib.stamps.filter((s) => s.logbookId === logbookId);
}

const clean = (text: string) => text.trim() || undefined;

/** Adds a stamp to the first empty slot of the current logbook. */
export function addStamp(lib: Library, id: string, file: string, takenAt: string, place: string, note: string): Library {
  const logbookId = currentLogbook(lib).id;
  const slot = firstFreeSlot(lib, logbookId);
  const stamp: StampRecord = { id, file, takenAt, place: clean(place), note: clean(note), logbookId, slot };
  return { ...lib, stamps: [...lib.stamps, stamp] };
}

export function editStamp(lib: Library, id: string, place: string, note: string): Library {
  return { ...lib, stamps: lib.stamps.map((s) => (s.id === id ? { ...s, place: clean(place), note: clean(note) } : s)) };
}

/** Moves a stamp to the first empty slot of another logbook. */
export function moveStamp(lib: Library, id: string, logbookId: string): Library {
  if (!lib.logbooks.some((b) => b.id === logbookId)) return lib;
  const slot = firstFreeSlot(lib, logbookId);
  return { ...lib, stamps: lib.stamps.map((s) => (s.id === id && s.logbookId !== logbookId ? { ...s, logbookId, slot } : s)) };
}

/** Gives a logbook a plain cloth cover of this colour, dropping any cover photo. */
export function setCoverColor(lib: Library, id: string, color: string): Library {
  return { ...lib, logbooks: lib.logbooks.map((b) => (b.id === id ? { ...b, color, cover: undefined } : b)) };
}

/** Gives a logbook a cover photo (a file name in the stamps folder). */
export function setCoverPhoto(lib: Library, id: string, cover: string): Library {
  return { ...lib, logbooks: lib.logbooks.map((b) => (b.id === id ? { ...b, cover } : b)) };
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
