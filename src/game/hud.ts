import type { KAPLAYCtx } from "kaplay";
import {
  COLORS,
  FONT,
  GAME_HEIGHT,
  GAME_WIDTH,
  LIVES_Y,
  MAZE_HEIGHT,
  SCORE_BAR_HEIGHT,
  SCORE_BAR_Y,
} from "./constants";
import { state } from "./state";

const DIGIT_SPACING = 16;
const SCORE_DIGITS = 6;
const SCORE_RIGHT = 204; // the rip's score ends here
const MAX_LIFE_MARKS = 8;

type Rgb = readonly [number, number, number];

export function addLabel(
  k: KAPLAYCtx,
  text: string,
  x: number,
  y: number,
  color: Rgb,
  opts: { size?: number; anchor?: "topleft" | "top" | "center" } = {},
) {
  return k.add([
    k.text(text, { font: FONT, size: opts.size ?? 8 }),
    k.pos(x, y),
    k.anchor(opts.anchor ?? "topleft"),
    k.color(...color),
    k.z(10),
  ]);
}

/**
 * The 2600 score bar: a green strip under the maze with the score in black digits,
 * no leading zeros, and a green block for each reserve life below it.
 * Returns a refresh function.
 */
export function addHud(k: KAPLAYCtx) {
  k.add([k.rect(GAME_WIDTH, GAME_HEIGHT - MAZE_HEIGHT), k.pos(0, MAZE_HEIGHT), k.color(...COLORS.black), k.z(9)]);
  k.add([k.rect(GAME_WIDTH, SCORE_BAR_HEIGHT), k.pos(0, SCORE_BAR_Y), k.color(...COLORS.green), k.z(9)]);

  const digits = Array.from({ length: SCORE_DIGITS }, (_, i) =>
    k.add([
      k.sprite("digit-0"),
      k.pos(SCORE_RIGHT - (SCORE_DIGITS - i) * DIGIT_SPACING + 4, SCORE_BAR_Y + 2),
      k.z(10),
    ]),
  );
  const lives = Array.from({ length: MAX_LIFE_MARKS }, (_, i) =>
    k.add([k.rect(8, 6), k.pos(16 + i * 16, LIVES_Y), k.color(...COLORS.green), k.z(10)]),
  );

  const refresh = () => {
    const text = String(Math.max(0, Math.floor(state.score))).slice(-SCORE_DIGITS).padStart(SCORE_DIGITS, " ");
    digits.forEach((d, i) => {
      d.hidden = text[i] === " ";
      if (!d.hidden) d.sprite = `digit-${text[i]}`;
    });
    // The life in play isn't shown, only the reserve.
    lives.forEach((l, i) => {
      l.hidden = i >= state.lives - 1;
    });
  };
  refresh();
  return refresh;
}
