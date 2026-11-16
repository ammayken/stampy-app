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
