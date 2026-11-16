/**
 * SVG path for a stamp's paper: a width x height rectangle with a half-circle bitten out
 * at each perforation, so whatever is behind the stamp shows through the holes.
 * `hole` is the perforation diameter, `pitch` the target distance between perforations.
 */
export function stampPath(width: number, height: number, hole: number, pitch: number): string {
  const r = hole / 2;
  // Evenly spaced hole centres along an edge of the given length.
  const centres = (length: number) => {
    const count = Math.max(1, Math.round(length / pitch));
    return Array.from({ length: count }, (_, i) => ((i + 0.5) * length) / count);
  };
  const xs = centres(width);
  const ys = centres(height);
  const n = (value: number) => +value.toFixed(2);
  // Walking the outline clockwise, sweep flag 0 makes every arc dip into the paper.
  const bite = (x: number, y: number) => `A${n(r)} ${n(r)} 0 0 0 ${n(x)} ${n(y)}`;

  const top = xs.map((c) => `L${n(c - r)} 0${bite(c + r, 0)}`);
  const right = ys.map((c) => `L${n(width)} ${n(c - r)}${bite(width, c + r)}`);
  const bottom = [...xs].reverse().map((c) => `L${n(c + r)} ${n(height)}${bite(c - r, height)}`);
  const left = [...ys].reverse().map((c) => `L0 ${n(c + r)}${bite(0, c - r)}`);

  return ['M0 0', ...top, `L${n(width)} 0`, ...right, `L${n(width)} ${n(height)}`, ...bottom, `L0 ${n(height)}`, ...left, 'Z'].join('');
}

/** Dark ink on light paper, light ink on dark paper. `hex` is like "#efe6d2". */
export function inkOn(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const brightness = (r * 299 + g * 587 + b * 114) / 1000; // perceived, 0-255
  return brightness > 140 ? '#2a2622' : '#f3ecdc';
}
