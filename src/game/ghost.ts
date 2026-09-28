import { GHOST_CHASE, GHOST_RESPAWN_DELAY } from "./constants";
import {
  advance,
  type Dir,
  DIRS,
  isPen,
  type Mover,
  neighbor,
  nodeX,
  laneY,
  OPPOSITE,
  PEN,
  reverse,
} from "./maze";

export interface Ghost extends Mover {
  id: number;
  /** "pen": waiting to be released. "free": roaming the maze. */
  mode: "pen" | "free";
  /** Seconds until a penned ghost leaves. */
  releaseIn: number;
  scared: boolean;
}

export function createGhost(id: number, releaseIn: number): Ghost {
  return { ...PEN, dir: "up", off: 0, ghost: true, id, mode: "pen", releaseIn, scared: false };
}

type Point = { x: number; y: number };

const dist2 = (a: Point, b: Point) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

/**
 * Picks a ghost's direction at a node. Ghosts never turn back unless they're in a dead
 * end and never re-enter the pen. A calm ghost heads toward Pac-Man with probability
 * GHOST_CHASE and wanders otherwise; a scared one runs away. `random` returns [0, 1).
 */
export function chooseGhostDir(g: Ghost, target: Point, random: () => number): Dir | null {
  const options = DIRS.filter((d) => {
    const n = neighbor(g, d, true);
    return n && !isPen(n);
  });
  const ahead = options.filter((d) => d !== OPPOSITE[g.dir]);
  const pool = ahead.length ? ahead : options;
  if (!pool.length) return null;

  const score = (d: Dir) => {
    const n = neighbor(g, d, true)!;
    return dist2({ x: nodeX(n.c), y: laneY(n.r) }, target);
  };
  const best = (sign: 1 | -1) => pool.reduce((a, b) => (sign * score(b) < sign * score(a) ? b : a));

  if (g.scared) return random() < 0.8 ? best(-1) : pool[Math.floor(random() * pool.length)];
  if (random() < GHOST_CHASE) return best(1);
  return pool[Math.floor(random() * pool.length)];
}

/** Advances a ghost by dt seconds at `speed` px/s, hunting (or fleeing) `target`. */
export function stepGhost(g: Ghost, target: Point, speed: number, dt: number, random: () => number = Math.random) {
  if (g.mode === "pen") {
    g.releaseIn -= dt;
    if (g.releaseIn > 0) return;
    g.mode = "free";
  }
  // Out of the pen the only way is up, through the door.
  advance(g, speed * dt, (m) => (isPen(m) ? "up" : chooseGhostDir(g, target, random)));
}

/** A power pill: free ghosts turn scared and turn around. Penned ones are unaffected. */
export function frighten(ghosts: Ghost[]) {
  for (const g of ghosts) {
    if (g.mode !== "free") continue;
    g.scared = true;
    reverse(g);
  }
}

/** Pac-Man ate this ghost: back to the pen, to come out again shortly. */
export function sendHome(g: Ghost) {
  Object.assign(g, { ...PEN, dir: "up", off: 0, mode: "pen", releaseIn: GHOST_RESPAWN_DELAY, scared: false });
}
