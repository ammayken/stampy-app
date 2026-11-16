/**
 * Widest whole-pixel stamp that fits `columns` x `rows` (with `gap` between) inside a
 * width x height area. `aspect` is stamp height / width. Returns 0 if nothing fits.
 */
export function fitStamp(width: number, height: number, columns: number, rows: number, gap: number, aspect: number) {
  const byWidth = (width - gap * (columns - 1)) / columns;
  const byHeight = (height - gap * (rows - 1)) / rows / aspect;
  return Math.max(0, Math.floor(Math.min(byWidth, byHeight)));
}
