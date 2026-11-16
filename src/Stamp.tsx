import type { ReactNode } from 'react';
import { View } from 'react-native';
import { STAMP_ASPECT } from './crop';

export const BACKGROUND = '#141210';
export const PAPER = '#f3ecdc';

/** Outer paper height for a given outer paper width. */
export function stampHeight(width: number) {
  const margin = (14 * width) / 340;
  return (width - margin * 2) / STAMP_ASPECT + margin * 2;
}

/**
 * The stamp: cream paper with a perforated edge and a 3:4 window for `children`
 * (the live camera or a photo). `width` is the outer paper width; everything scales with it.
 *
 * ponytail: the perforations are dots in `holeColor` sitting on the paper edge, so they
 * only read as holes on a flat surface of that colour. Use an SVG/Skia mask when stamps
 * need to sit on textured pages or be exported with the edge baked in.
 */
export function Stamp({
  width,
  holeColor = BACKGROUND,
  children,
}: {
  width: number;
  holeColor?: string;
  children?: ReactNode;
}) {
  const scale = width / 340;
  const margin = 14 * scale; // paper border around the picture
  const hole = 12 * scale; // perforation diameter
  const pitch = 20 * scale; // target distance between perforations
  const height = stampHeight(width);

  const dot = { position: 'absolute', width: hole, height: hole, borderRadius: hole / 2, backgroundColor: holeColor } as const;
  // Evenly spaced hole offsets along an edge of the given length.
  const edge = (length: number) => {
    const count = Math.round(length / pitch);
    const step = length / count;
    return Array.from({ length: count }, (_, i) => (i + 0.5) * step - hole / 2);
  };

  return (
    <View style={{ width, height, backgroundColor: PAPER }}>
      <View
        style={{ position: 'absolute', top: margin, left: margin, right: margin, bottom: margin, overflow: 'hidden', backgroundColor: '#000' }}
      >
        {children}
      </View>
      {edge(width).map((x) => (
        <View key={`t${x}`} style={[dot, { left: x, top: -hole / 2 }]} />
      ))}
      {edge(width).map((x) => (
        <View key={`b${x}`} style={[dot, { left: x, bottom: -hole / 2 }]} />
      ))}
      {edge(height).map((y) => (
        <View key={`l${y}`} style={[dot, { top: y, left: -hole / 2 }]} />
      ))}
      {edge(height).map((y) => (
        <View key={`r${y}`} style={[dot, { top: y, right: -hole / 2 }]} />
      ))}
    </View>
  );
}
