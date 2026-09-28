import type { KAPLAYCtx } from "kaplay";
import { COLORS, GAME_WIDTH, SCENES } from "../constants";
import { addHud, addLabel } from "../hud";
import { GHOST_LOOKS, PAC_CHOMP } from "../sprites";
import { resetState, state } from "../state";

const PARADE_Y = 92;
const PARADE_SPEED = 50;
const PARADE_GAP = 22;

export function registerTitleScene(k: KAPLAYCtx) {
  k.scene(SCENES.title, () => {
    resetState();
    addHud(k);

    addLabel(k, "PAC-MAN", GAME_WIDTH / 2, 24, COLORS.pac, { size: 24, anchor: "top" });
    addLabel(k, "ATARI 2600 STYLE", GAME_WIDTH / 2, 56, COLORS.pill, { anchor: "top" });

    // Pac-Man leads the four ghosts across the screen, wrapping round.
    const span = GAME_WIDTH + 5 * PARADE_GAP;
    const parade = [
      k.add([k.sprite("pac-0"), k.pos(0, PARADE_Y), k.anchor("center")]),
      ...GHOST_LOOKS.map((look) => k.add([k.sprite(`ghost-${look}-0`), k.pos(0, PARADE_Y), k.anchor("center")])),
    ];
    parade.forEach((obj, i) => {
      obj.onUpdate(() => {
        const t = k.time();
        obj.pos.x = ((t * PARADE_SPEED - i * PARADE_GAP) % span + span) % span - 2 * PARADE_GAP;
        obj.sprite =
          i === 0
            ? PAC_CHOMP[Math.floor(t * 12) % PAC_CHOMP.length]
            : `ghost-${GHOST_LOOKS[i - 1]}-${Math.floor(t * 8) % 2}`;
      });
    });

    const high = String(Math.max(state.highScore, state.score)).padStart(6, "0");
    addLabel(k, `HIGH SCORE ${high}`, GAME_WIDTH / 2, 112, COLORS.white, { anchor: "top" });

    const prompt = addLabel(k, "PUSH SPACE TO START", GAME_WIDTH / 2, 132, COLORS.white, { anchor: "top" });
    prompt.onUpdate(() => {
      prompt.hidden = Math.floor(k.time() * 2) % 2 === 1;
    });

    addLabel(k, "SPRITES: KINGPEPE  SOUNDS: ALEXPARR", GAME_WIDTH / 2, 154, COLORS.pill, { anchor: "top" });

    const start = () => k.go(SCENES.level);
    k.onKeyPress("space", start);
    k.onClick(start);
  });
}
