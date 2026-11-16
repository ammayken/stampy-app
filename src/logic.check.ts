// Run with: npm run check
import assert from 'node:assert/strict';
import { centerCrop, STAMP_ASPECT } from './crop.ts';

// Portrait 3:4 photo is already stamp shaped.
assert.deepEqual(centerCrop(3024, 4032, STAMP_ASPECT), { originX: 0, originY: 0, width: 3024, height: 4032 });
// Landscape photo: keep full height, trim the sides evenly.
assert.deepEqual(centerCrop(4032, 3024, STAMP_ASPECT), { originX: 882, originY: 0, width: 2268, height: 3024 });
// Tall 9:16 photo: keep full width, trim top and bottom evenly.
assert.deepEqual(centerCrop(1080, 1920, STAMP_ASPECT), { originX: 0, originY: 240, width: 1080, height: 1440 });

console.log('centerCrop ok');

import { fitStamp } from './pages.ts';

// Wide, short area: the height decides. 4 rows of 100*1.3 plus 3 gaps of 10 = 550.
assert.equal(fitStamp(1000, 550, 3, 4, 10, 1.3), 100);
// Narrow, tall area: the width decides. 3 columns of 100 plus 2 gaps of 10 = 320.
assert.equal(fitStamp(320, 5000, 3, 4, 10, 1.3), 100);
// Whatever the area, the grid never overflows it.
for (const [w, h] of [[350, 600], [335, 480], [390, 640], [0, 0]]) {
  const s = fitStamp(w, h, 3, 4, 12, 1.306);
  assert.ok(s === 0 || (s * 3 + 24 <= w && s * 1.306 * 4 + 36 <= h), `${w}x${h}`);
}
console.log('fitStamp ok');

import { placeAt } from './pages.ts';

// A 3 x 4 grid of 100 x 130 stamps with 10 gaps, centred in 400 x 600: it starts at (40, 25).
const where = (x: number, y: number) => placeAt(x, y, { width: 400, height: 600 }, { width: 100, height: 130 }, 3, 4, 10);
assert.equal(where(90, 90), 0); // middle of the first stamp
assert.equal(where(200, 90), 1);
assert.equal(where(310, 90), 2);
assert.equal(where(90, 230), 3); // second row
assert.equal(where(310, 510), 11); // last place
assert.equal(where(144, 90), 0); // in the gap, nearer the first stamp
assert.equal(where(146, 90), 1); // in the gap, nearer the second
assert.equal(where(5, 5), 0); // the page margin still counts as the nearest place
assert.equal(where(-1, 90), -1); // off the page
assert.equal(where(200, 601), -1);
console.log('placeAt ok');

import { addLogbook, addStamp, canRemoveLogbook, removeLogbook, removeStamp, stampsIn, toLibrary } from './library.ts';

// Stamps saved by the first app version (a bare list) land in a default logbook.
let lib = toLibrary([{ id: '1', file: '1.jpg', takenAt: '2026-11-16T00:00:00.000Z', note: 'hi' }]);
assert.equal(lib.logbooks.length, 1);
assert.equal(lib.stamps[0].logbookId, lib.currentId);
assert.equal(lib.stamps[0].note, 'hi');
// A library saved in the current shape is passed through untouched.
assert.deepEqual(toLibrary(JSON.parse(JSON.stringify(lib))), lib);
// A fresh install starts with one empty logbook.
assert.equal(toLibrary([]).logbooks.length, 1);

// A new logbook becomes current and receives new stamps; blank names are ignored.
assert.equal(addLogbook(lib, 'b', '  '), lib);
lib = addLogbook(lib, 'b', ' Trips ');
assert.equal(lib.currentId, 'b');
lib = addStamp(lib, '2', '2.jpg', '2026-11-16T00:00:00.000Z', ' Lisbon ', '');
assert.deepEqual(stampsIn(lib, 'b').map((s) => [s.id, s.place, s.note]), [['2', 'Lisbon', undefined]]);

// Only an empty logbook can be removed, and never the last one.
assert.equal(canRemoveLogbook(lib, 'b'), false);
assert.equal(removeLogbook(lib, 'b'), lib);
lib = removeLogbook(removeStamp(lib, '2'), 'b');
assert.deepEqual(lib.logbooks.map((b) => b.id), ['first']);
assert.equal(lib.currentId, 'first');
assert.equal(canRemoveLogbook(lib, 'first'), false);

import { COVER_COLOR_NAMES, COVER_COLORS, moveStamp, setCoverColor, setCoverPhoto } from './library.ts';

// Moving a stamp changes only its logbook; an unknown logbook is ignored.
lib = addLogbook(lib, 'c', 'Food');
assert.equal(moveStamp(lib, '1', 'nowhere'), lib);
lib = moveStamp(lib, '1', 'c');
assert.deepEqual([stampsIn(lib, 'first').length, stampsIn(lib, 'c').length], [0, 1]);
// A cover photo sits on top of the colour; choosing a colour drops the photo.
assert.equal(COVER_COLOR_NAMES.length, COVER_COLORS.length);
const withPhoto = setCoverPhoto(lib, 'first', 'cover-1.jpg');
assert.equal(withPhoto.logbooks[0].cover, 'cover-1.jpg');
const recolored = setCoverColor(withPhoto, 'first', COVER_COLORS[2]);
assert.deepEqual([recolored.logbooks[0].color, recolored.logbooks[0].cover], [COVER_COLORS[2], undefined]);
assert.equal(recolored.logbooks[1].color, withPhoto.logbooks[1].color);

import { PAPER_COLORS, paperOf, setPaper } from './library.ts';

// Logbooks saved before pages had a colour get the default paper; a chosen paper sticks.
assert.equal(paperOf(lib.logbooks[0]), PAPER_COLORS[0]);
assert.equal(paperOf(setPaper(lib, 'first', '#2b2a28').logbooks[0]), '#2b2a28');
console.log('library ok');

import { inkOn, stampPath } from './perforation.ts';

// The outline is one closed shape with one bite per perforation: 5 across and 7 down, twice each.
const outline = stampPath(100, 140, 6, 20);
assert.ok(outline.startsWith('M0 0') && outline.endsWith('Z'));
assert.equal(outline.match(/A/g)?.length, (5 + 7) * 2);
assert.ok(!outline.includes('NaN'));
// First bite on the top edge: from x=7 to x=13, centred on 10.
assert.ok(outline.startsWith('M0 0L7 0A3 3 0 0 0 13 0'));
// Every paper colour gets ink that contrasts with it.
assert.deepEqual(PAPER_COLORS.map(inkOn).map((ink) => ink === '#2a2622'), [true, true, true, true, true, true, false]);
console.log('perforation ok');

import { addPage, canRemovePage, firstFreeSlot, pageCount, pagesOf, placeStamp, removePage } from './library.ts';

// Stamps saved before slots existed get slots in order; saved slots are kept and never doubled up.
const at = (id: string, more = {}) => ({ id, file: `${id}.jpg`, takenAt: '2026-11-16T00:00:00.000Z', ...more });
let book = toLibrary([at('a'), at('b'), at('c')]);
assert.deepEqual(book.stamps.map((s) => s.slot), [0, 1, 2]);
const mixed = toLibrary({ ...book, stamps: [{ ...at('a'), logbookId: 'first', slot: 1 }, { ...at('b'), logbookId: 'first' }] });
assert.deepEqual(mixed.stamps.map((s) => s.slot), [1, 0]);
const slotsOf = (l: typeof book) => Object.fromEntries(l.stamps.map((s) => [s.id, s.slot]));

// One page to start; Add Page works straight away, without filling the first page.
assert.equal(pageCount(book, 'first'), 1);
book = addPage(book, 'first');
assert.equal(pagesOf(book, 'first').length, 2);
assert.equal(pagesOf(book, 'first')[0][1]?.id, 'b');

// Placing on an empty slot moves the stamp; placing on a taken slot swaps the two.
book = placeStamp(book, 'a', 14); // page 2, third place
assert.deepEqual(slotsOf(book), { a: 14, b: 1, c: 2 });
assert.equal(pagesOf(book, 'first')[1][2]?.id, 'a');
book = placeStamp(book, 'c', 1);
assert.deepEqual(slotsOf(book), { a: 14, b: 2, c: 1 });
assert.equal(placeStamp(book, 'c', 1), book);
// A new stamp lands in the first gap, not after the last stamp.
assert.equal(firstFreeSlot(book, 'first'), 0);

// Only an empty page that is not the only page can be removed; later stamps move forward a page.
assert.equal(canRemovePage(book, 'first', 1), false);
book = placeStamp(placeStamp(book, 'b', 30), 'c', 31); // b and c to page 3; page 1 is now empty
assert.equal(pageCount(book, 'first'), 3);
assert.equal(canRemovePage(book, 'first', 0), true);
book = removePage(book, 'first', 0);
assert.deepEqual(slotsOf(book), { a: 2, b: 18, c: 19 });
assert.equal(pageCount(book, 'first'), 2);
const single = toLibrary([]);
assert.equal(canRemovePage(single, 'first', 0), false);
assert.equal(removePage(single, 'first', 0), single);
console.log('pages and slots ok');
