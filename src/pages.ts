/**
 * Which place (0 = top left, counting across then down) of a centred `columns` x `rows`
 * grid the point (x, y) is nearest to. The point is relative to the area's top left.
 * Returns -1 when the point is outside the area, so a stamp dropped there goes nowhere.
 */
export function placeAt(
  x: number,
  y: number,
  area: { width: number; height: number },
  stamp: { width: number; height: number },
  columns: number,
  rows: number,
  gap: number,
): number {
  if (x < 0 || y < 0 || x > area.width || y > area.height) return -1;
  const left = (area.width - (stamp.width * columns + gap * (columns - 1))) / 2;
  const top = (area.height - (stamp.height * rows + gap * (rows - 1))) / 2;
  const nearest = (offset: number, size: number, count: number) =>
    Math.min(count - 1, Math.max(0, Math.round((offset - size / 2) / (size + gap))));
  return nearest(y - top, stamp.height, rows) * columns + nearest(x - left, stamp.width, columns);
}

/**
 * Widest whole-pixel stamp that fits `columns` x `rows` (with `gap` between) inside a
 * width x height area. `aspect` is stamp height / width. Returns 0 if nothing fits.
 */
export function fitStamp(width: number, height: number, columns: number, rows: number, gap: number, aspect: number) {
  const byWidth = (width - gap * (columns - 1)) / columns;
  const byHeight = (height - gap * (rows - 1)) / rows / aspect;
  return Math.max(0, Math.floor(Math.min(byWidth, byHeight)));
}
