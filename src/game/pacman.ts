import { TURN_GRACE } from "./constants";
import { advance, type Dir, type Mover, neighbor, OPPOSITE, PAC_START, reverse } from "./maze";

export interface PacMan extends Mover {
  /** The 2600 Pac-Man only ever faces left or right, even going up and down. */
  facing: -1 | 1;
  /** Last direction pressed. It's remembered, so a turn can be pressed before the corner. */
  wanted: Dir | null;
  /** Total distance moved, drives the chomp animation. */
  travelled: number;
}

export function createPacMan(): PacMan {
  return { ...PAC_START, dir: "left", off: 0, ghost: false, facing: -1, wanted: null, travelled: 0 };
}

/**
 * Moves Pac-Man `dist` pixels. `pressed` is a direction pressed since the last step, or
 * null; it replaces the remembered direction. Returns distance moved.
 */
export function stepPacMan(p: PacMan, pressed: Dir | null, dist: number): number {
  if (pressed) p.wanted = pressed;
  if (p.wanted === OPPOSITE[p.dir]) reverse(p);

  // Late turn: just past a junction that opens the wanted way, cut the corner. Pac-Man is
  // put back on the junction and the distance he'd covered carries on in the new direction.
  const perpendicular = p.wanted && p.wanted !== p.dir && p.wanted !== OPPOSITE[p.dir];
  if (perpendicular && p.off > 0 && p.off <= TURN_GRACE && neighbor(p, p.wanted!)) {
    dist += p.off;
    p.off = 0;
  }

  const moved = advance(p, dist, (m) => {
    if (p.wanted && neighbor(m, p.wanted)) return p.wanted;
    return neighbor(m, m.dir) ? m.dir : null;
  });

  if (p.dir === "left") p.facing = -1;
  if (p.dir === "right") p.facing = 1;
  p.travelled += moved;
  return moved;
}
