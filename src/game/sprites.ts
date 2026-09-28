import type { SpriteAtlasData } from "kaplay";

/**
 * Frame table for public/assets/sprites/atlas.png, generated from KingPepe's
 * "Pac-Man (Atari 2600) General" sheet by scripts/build-atlas.py.
 * Coordinates are pixels in that sheet (bounding boxes of each sprite).
 */
export const ATLAS_URL = "/assets/sprites/atlas.png";

const frame = (x: number, y: number, width: number, height: number) => ({ x, y, width, height });

// Ghost rows, top to bottom. Each row has four 16x16 frames: two leg poses looking
// right, then two looking left.
export const GHOST_COLORS = ["green", "yellow", "olive", "lime", "purple", "pink"] as const;
export type GhostColor = (typeof GHOST_COLORS)[number];
const GHOST_FRAME_X = [208, 227, 245, 263];

const ghostFrames = Object.fromEntries(
  GHOST_COLORS.flatMap((color, row) =>
    GHOST_FRAME_X.map((x, i) => [`ghost-${color}-${i}`, frame(x, 221 + row * 22, 16, 16)]),
  ),
);

const digitFrames = Object.fromEntries(
  Array.from({ length: 10 }, (_, d) => [`digit-${d}`, frame(18 + d * 16, 243, 12, 7)]),
);

export const ATLAS: SpriteAtlasData = {
  // The walls only: wafers and pills are keyed out and drawn by the game
  maze: frame(0, 0, 320, 168),

  // Pac-Man faces right: 0 closed, 1 half open, 2 wide open
  "pac-0": frame(17, 223, 14, 14),
  "pac-1": frame(33, 223, 14, 14),
  "pac-2": frame(49, 223, 14, 14),

  // Death: mouth opens upward, folds flat, then a small burst
  "die-0": frame(67, 223, 16, 14),
  "die-1": frame(86, 223, 16, 14),
  "die-2": frame(108, 229, 16, 8),
  "die-3": frame(127, 234, 16, 4),
  "burst-0": frame(150, 228, 6, 6),
  "burst-1": frame(164, 226, 10, 10),

  vitamin: frame(18, 262, 16, 11),

  ...ghostFrames,
  ...digitFrames,
};

export const PAC_CHOMP = ["pac-0", "pac-1", "pac-2", "pac-1"] as const;
export const PAC_DEATH = ["die-0", "die-1", "die-2", "die-3", "burst-0", "burst-1"] as const;

// Which sheet colour each of the four ghosts wears, and the colour of a scared ghost.
export const GHOST_LOOKS: readonly GhostColor[] = ["pink", "yellow", "green", "olive"];
export const SCARED_LOOK: GhostColor = "purple";
