'use client';

import type { ComponentProps } from 'react';
import { FrontSide } from 'three';
import { Text } from '@react-three/drei';

type TextProps = Omit<ComponentProps<typeof Text>, 'rotation'> & {
  rotation?: [number, number, number];
};

/**
 * drei's <Text> defaults to a DoubleSide material, so a single instance is
 * technically visible from both sides — but backwards/mirrored from the far
 * side, since the glyph geometry itself only faces one way. This is a
 * free-roam driving game, so a station's label can be approached from any
 * direction; rendering a second copy rotated 180° on Y, with both copies
 * forced to FrontSide (so each is only visible from the side its own glyphs
 * actually face), guarantees every label reads correctly left-to-right no
 * matter which way the player drives up to it — with no double-render
 * overlap, since at most one copy's front ever faces the camera at once.
 */
export function FacingText({ rotation = [0, 0, 0], ...rest }: TextProps) {
  const [x, y, z] = rotation;

  return (
    <>
      <Text {...rest} rotation={[x, y, z]} material-side={FrontSide} />
      <Text {...rest} rotation={[x, y + Math.PI, z]} material-side={FrontSide} />
    </>
  );
}
