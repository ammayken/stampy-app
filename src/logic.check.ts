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

import { pagesOf } from './pages.ts';

assert.deepEqual(pagesOf([]), [[]]);
assert.deepEqual(pagesOf([1, 2, 3], 2), [[1, 2], [3]]);
assert.equal(pagesOf(Array.from({ length: 12 })).length, 1);
assert.equal(pagesOf(Array.from({ length: 13 })).length, 2);
console.log('pagesOf ok');

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

import { COVER_COLORS, moveStamp, recolorLogbook } from './library.ts';

// Moving a stamp changes only its logbook; an unknown logbook is ignored.
lib = addLogbook(lib, 'c', 'Food');
assert.equal(moveStamp(lib, '1', 'nowhere'), lib);
lib = moveStamp(lib, '1', 'c');
assert.deepEqual([stampsIn(lib, 'first').length, stampsIn(lib, 'c').length], [0, 1]);
// Recolouring steps through the colours and wraps back to the first.
let recolored = lib;
for (const _ of COVER_COLORS) recolored = recolorLogbook(recolored, 'first');
assert.equal(recolorLogbook(lib, 'first').logbooks[0].color, COVER_COLORS[1]);
assert.equal(recolored.logbooks[0].color, COVER_COLORS[0]);
console.log('library ok');
