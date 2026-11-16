import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { STAMP_ASPECT } from './crop';

export const BACKGROUND = '#141210';
const PAPER = '#f3ecdc';
const MARGIN = 14; // paper border around the picture
const HOLE = 12; // perforation diameter
const PITCH = 20; // target distance between perforations

/**
 * The stamp: cream paper with a perforated edge and a 3:4 window for `children`
 * (the live camera or the finished photo). `width` is the outer paper width.
 *
 * ponytail: the perforations are background-coloured dots sitting on the paper edge,
 * so they only read as holes on the solid dark screen. Use an SVG/Skia mask when
 * stamps need to sit on textured pages or be exported with the edge baked in.
 */
export function Stamp({ width, children }: { width: number; children: ReactNode }) {
  const innerWidth = width - MARGIN * 2;
  const height = innerWidth / STAMP_ASPECT + MARGIN * 2;

  return (
    <View style={{ width, height, backgroundColor: PAPER }}>
      <View style={styles.window}>{children}</View>
      {edge(width).map((x) => (
        <View key={`t${x}`} style={[styles.hole, { left: x, top: -HOLE / 2 }]} />
      ))}
      {edge(width).map((x) => (
        <View key={`b${x}`} style={[styles.hole, { left: x, bottom: -HOLE / 2 }]} />
      ))}
      {edge(height).map((y) => (
        <View key={`l${y}`} style={[styles.hole, { top: y, left: -HOLE / 2 }]} />
      ))}
      {edge(height).map((y) => (
        <View key={`r${y}`} style={[styles.hole, { top: y, right: -HOLE / 2 }]} />
      ))}
    </View>
  );
}

/** Evenly spaced hole offsets along an edge of the given length. */
function edge(length: number): number[] {
  const count = Math.round(length / PITCH);
  const step = length / count;
  return Array.from({ length: count }, (_, i) => (i + 0.5) * step - HOLE / 2);
}

const styles = StyleSheet.create({
  window: {
    position: 'absolute',
    top: MARGIN,
    left: MARGIN,
    right: MARGIN,
    bottom: MARGIN,
    overflow: 'hidden',
    backgroundColor: '#000',
  },
  hole: {
    position: 'absolute',
    width: HOLE,
    height: HOLE,
    borderRadius: HOLE / 2,
    backgroundColor: BACKGROUND,
  },
});
