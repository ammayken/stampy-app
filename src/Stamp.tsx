import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { STAMP_ASPECT } from './crop';
import { stampPath } from './perforation';
import { PAPER } from './theme';

/** Outer paper height for a given outer paper width. */
export function stampHeight(width: number) {
  const margin = (14 * width) / 340;
  return (width - margin * 2) / STAMP_ASPECT + margin * 2;
}

const SHADOW = 3; // room around the paper for its shadow

/**
 * The stamp: cream paper with a perforated edge and a 3:4 window for `children`
 * (the live camera or a photo). `width` is the outer paper width; everything scales with it.
 * The perforations are real cut-outs, so the stamp can sit on any colour or texture.
 */
export function Stamp({ width, children }: { width: number; children?: ReactNode }) {
  const scale = width / 340;
  const margin = 14 * scale; // paper border around the picture
  const height = stampHeight(width);
  const outline = stampPath(width, height, 12 * scale, 20 * scale);

  return (
    <View style={{ width, height }}>
      <Svg
        width={width + SHADOW * 2}
        height={height + SHADOW * 2}
        style={{ position: 'absolute', left: -SHADOW, top: -SHADOW }}
      >
        {/* A soft offset copy underneath lifts the stamp off pale paper. */}
        <Path d={outline} x={SHADOW} y={SHADOW + 1.5} fill="#000" fillOpacity={0.22} />
        <Path d={outline} x={SHADOW} y={SHADOW} fill={PAPER} stroke="#000" strokeOpacity={0.12} strokeWidth={0.5} />
      </Svg>
      <View
        style={{ position: 'absolute', top: margin, left: margin, right: margin, bottom: margin, overflow: 'hidden', backgroundColor: '#000' }}
      >
        {children}
      </View>
    </View>
  );
}
