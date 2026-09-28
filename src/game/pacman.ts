import { advance, type Dir, type Mover, neighbor, OPPOSITE, PAC_START, reverse } from "./maze";

export interface PacMan extends Mover {
  /** The 2600 Pac-Man only ever faces left or right, even going up and down. */
  facing: -1 | 1;
  /** Last direction pushed. It's remembered, so a turn can be pressed before the corner. */
  wanted: Dir | null;
  /** Total distance moved, drives the chomp animation. */
  travelled: number;
}

export function createPacMan(): PacMan {
  return { ...PAC_START, dir: "left", off: 0, ghost: false, facing: -1, wanted: null, travelled: 0 };
}

/** Moves Pac-Man `dist` pixels, steering by the held direction. Returns distance moved. */
export function stepPacMan(p: PacMan, held: Dir | null, dist: number): number {
  if (held) p.wanted = held;
  if (p.wanted === OPPOSITE[p.dir]) reverse(p);

  const moved = advance(p, dist, (m) => {
    if (p.wanted && neighbor(m, p.wanted)) return p.wanted;
    return neighbor(m, m.dir) ? m.dir : null;
  });

  if (p.dir === "left") p.facing = -1;
  if (p.dir === "right") p.facing = 1;
  p.travelled += moved;
  return moved;
}
