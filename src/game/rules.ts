import { MAX_SPEEDUP, LEVEL_SPEEDUP, FRIGHT_SECONDS, MIN_FRIGHT_SECONDS, POINTS_GHOST } from "./constants";
import type { Dot } from "./maze";

type Point = { x: number; y: number };

/** Pac-Man's centre is over a wafer or pill. */
const DOT_REACH = 4;
/** Two 16px sprites overlapping by half. */
const TOUCH = 8;

export const touching = (a: Point, b: Point) => Math.abs(a.x - b.x) < TOUCH && Math.abs(a.y - b.y) < TOUCH;

/** Marks every uneaten dot under Pac-Man as eaten and returns them. */
export function eatDots(dots: Dot[], pac: Point): Dot[] {
  const eaten = dots.filter(
    (d) => !d.eaten && Math.abs(d.x - pac.x) <= DOT_REACH && Math.abs(d.y - pac.y) <= DOT_REACH,
  );
  for (const d of eaten) d.eaten = true;
  return eaten;
}

export const mazeCleared = (dots: Dot[]) => dots.every((d) => d.eaten);

/** Points for the nth ghost (0-based) eaten on one power pill: 20, 40, 80, 160. */
export const ghostPoints = (nth: number) => POINTS_GHOST * 2 ** Math.min(nth, 3);

/** Movement speed multiplier for a level (1-based). */
export const levelSpeed = (level: number) => Math.min(MAX_SPEEDUP, 1 + LEVEL_SPEEDUP * (level - 1));

/** How long ghosts stay scared on a level (1-based). */
export const frightSeconds = (level: number) => Math.max(MIN_FRIGHT_SECONDS, FRIGHT_SECONDS - (level - 1));
