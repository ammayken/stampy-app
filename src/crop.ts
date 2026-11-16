// The one standard stamp: a 3:4 portrait photo, saved at 900x1200 px.
export const STAMP_ASPECT = 3 / 4;
export const STAMP_PX = { width: 900, height: 1200 };

/** Largest centred rectangle of the given aspect (width / height) inside a w x h photo. */
export function centerCrop(w: number, h: number, aspect: number) {
  const width = Math.min(w, Math.round(h * aspect));
  const height = Math.min(h, Math.round(width / aspect));
  return {
    originX: Math.floor((w - width) / 2),
    originY: Math.floor((h - height) / 2),
    width,
    height,
  };
}
