import type { GameObj, KAPLAYCtx } from "kaplay";
import type { SoundName } from "../assets";
import {
  COLORS,
  FRIGHT_FLASH_SECONDS,
  GAME_WIDTH,
  GHOST_RELEASE,
  GHOST_SPEED,
  PAC_SPEED,
  POINTS_PILL,
  POINTS_VITAMIN,
  POINTS_WAFER,
  SCARED_SPEED,
  SCENES,
  VITAMIN_AT,
  VITAMIN_SECONDS,
} from "../constants";
import { createGhost, frighten, type Ghost, sendHome, stepGhost } from "../ghost";
import { addHud, addLabel } from "../hud";
import { createDots, type Dir, laneY, nodeX, PAC_START, position } from "../maze";
import { createPacMan, stepPacMan } from "../pacman";
import { eatDots, frightSeconds, ghostPoints, levelSpeed, mazeCleared, touching } from "../rules";
import { GHOST_LOOKS, PAC_CHOMP, PAC_DEATH, SCARED_LOOK } from "../sprites";
import { state } from "../state";

const READY_SECONDS = 2; // the start jingle plays while nothing moves
const DEATH_SECONDS = 2.2;
const CLEAR_SECONDS = 2.5;
const GAME_OVER_SECONDS = 3;
const GHOST_EATEN_PAUSE = 0.5;
const CHOMP_PIXELS = 3; // distance per chomp frame
const WAFER_SOUND_GAP = 0.12;
const SCARED_SOUND_GAP = 0.52; // length of the scared-ghost loop

const DIR_KEYS: Partial<Record<string, Dir>> = {
  left: "left",
  a: "left",
  right: "right",
  d: "right",
  up: "up",
  w: "up",
  down: "down",
  s: "down",
};

type Phase = "ready" | "playing" | "paused" | "dying" | "cleared" | "gameover";

/**
 * One maze: Pac-Man eats the wafers while ghosts hunt him; power pills turn the tables.
 * Movement and rules live in maze.ts / pacman.ts / ghost.ts / rules.ts; this scene only
 * feeds them input, draws the result and runs the ready / death / clear flow.
 */
export function registerLevelScene(k: KAPLAYCtx) {
  k.scene(SCENES.level, () => {
    const refreshHud = addHud(k);
    const play = (name: SoundName) => k.play(name);
    const speed = levelSpeed(state.level);

    const maze = k.add([k.sprite("maze"), k.pos(0, 0), k.opacity(1)]);

    const dots = createDots();
    const dotObjs = dots.map((d) =>
      d.kind === "wafer"
        ? k.add([k.rect(8, 2), k.pos(d.x - 4, d.y - 1), k.color(...COLORS.wall)])
        : k.add([k.rect(8, 8), k.pos(d.x - 4, d.y - 4), k.color(...COLORS.pill)]),
    );
    const pillObjs = dotObjs.filter((_, i) => dots[i].kind === "pill");

    const vitamin = k.add([k.sprite("vitamin"), k.pos(nodeX(PAC_START.c), laneY(PAC_START.r)), k.anchor("center")]);
    vitamin.hidden = true;
    let vitaminUntil = 0;
    let wafersEaten = 0;

    const pac = createPacMan();
    const pacObj = k.add([k.sprite("pac-0"), k.pos(0, 0), k.anchor("bot"), k.z(3)]);

    const ghosts: Ghost[] = GHOST_RELEASE.map((delay, i) => createGhost(i, delay));
    const ghostObjs: GameObj[] = ghosts.map(() => k.add([k.sprite("ghost-pink-0"), k.pos(0, 0), k.anchor("center"), k.z(2)]));

    let phase: Phase = "ready";
    let phaseTimer = READY_SECONDS;
    let scaredUntil = 0;
    let ghostsEatenThisPill = 0;
    let nextWaferSound = 0;
    let nextScaredSound = 0;
    let message = addLabel(k, "READY!", GAME_WIDTH / 2, laneY(PAC_START.r) + 14, COLORS.white, { anchor: "top" });
    play("begin");

    // Steer from key-press events rather than polling held keys: a tap whose keydown and
    // keyup land in the same frame (common with Bluetooth keyboards) still counts, and the
    // newest press always wins even if an older key's keyup arrives late. Pac-Man remembers
    // the direction, so holding the key isn't needed. Presses during READY are kept too.
    let pressed: Dir | null = null;
    k.onKeyPress((key) => {
      pressed = DIR_KEYS[key] ?? pressed;
    });
    const takePress = () => {
      const dir = pressed;
      pressed = null;
      return dir;
    };

    const draw = () => {
      const p = position(pac);
      pacObj.pos = k.vec2(p.x, p.y + 7);
      pacObj.flipX = pac.facing < 0;
      if (phase !== "dying") pacObj.sprite = PAC_CHOMP[Math.floor(pac.travelled / CHOMP_PIXELS) % PAC_CHOMP.length];

      const now = k.time();
      const flashing = scaredUntil - now < FRIGHT_FLASH_SECONDS && Math.floor(now * 6) % 2 === 0;
      ghosts.forEach((g, i) => {
        const obj = ghostObjs[i];
        const gp = position(g);
        obj.pos = k.vec2(gp.x, gp.y);
        const look = g.scared && !flashing ? SCARED_LOOK : GHOST_LOOKS[g.id];
        // frames 0/1 look right, 2/3 look left; each pair alternates legs as it moves
        const facingRight = g.dir === "right" || (g.dir !== "left" && gp.x < position(pac).x);
        obj.sprite = `ghost-${look}-${(facingRight ? 0 : 2) + (Math.floor(now * 8) % 2)}`;
      });
    };

    const resetRound = () => {
      Object.assign(pac, createPacMan());
      ghosts.forEach((g, i) => Object.assign(g, createGhost(i, GHOST_RELEASE[i])));
      scaredUntil = 0;
      pacObj.hidden = false;
      ghostObjs.forEach((o) => (o.hidden = false));
      phase = "ready";
      phaseTimer = READY_SECONDS;
      message = addLabel(k, "READY!", GAME_WIDTH / 2, laneY(PAC_START.r) + 14, COLORS.white, { anchor: "top" });
    };

    const score = (points: number) => {
      state.score += points;
      refreshHud();
    };

    const stepPlaying = (dt: number) => {
      const now = k.time();
      const scared = now < scaredUntil;
      if (!scared) ghosts.forEach((g) => (g.scared = false));

      stepPacMan(pac, takePress(), PAC_SPEED * speed * dt);
      const p = position(pac);

      for (const d of eatDots(dots, p)) {
        dotObjs[dots.indexOf(d)].destroy();
        if (d.kind === "pill") {
          score(POINTS_PILL);
          play("pill");
          frighten(ghosts);
          scaredUntil = now + frightSeconds(state.level);
          ghostsEatenThisPill = 0;
        } else {
          score(POINTS_WAFER);
          wafersEaten++;
          if (now >= nextWaferSound) {
            play("wafer");
            nextWaferSound = now + WAFER_SOUND_GAP;
          }
          if ((VITAMIN_AT as readonly number[]).includes(wafersEaten)) vitaminUntil = now + VITAMIN_SECONDS;
        }
      }

      vitamin.hidden = now >= vitaminUntil;
      if (!vitamin.hidden && touching(p, vitamin.pos)) {
        vitaminUntil = 0;
        vitamin.hidden = true;
        score(POINTS_VITAMIN);
        play("pill");
      }

      if (scared && ghosts.some((g) => g.scared) && now >= nextScaredSound) {
        play("scared");
        nextScaredSound = now + SCARED_SOUND_GAP;
      }

      for (const g of ghosts) {
        stepGhost(g, p, (g.scared ? SCARED_SPEED : GHOST_SPEED) * speed, dt);
        if (g.mode !== "free" || !touching(p, position(g))) continue;
        if (g.scared) {
          score(ghostPoints(ghostsEatenThisPill++));
          play("ghostEaten");
          sendHome(g);
          phase = "paused";
          phaseTimer = GHOST_EATEN_PAUSE;
        } else {
          phase = "dying";
          phaseTimer = DEATH_SECONDS;
          ghostObjs.forEach((o) => (o.hidden = true));
          play("die");
          break;
        }
      }

      if (phase === "playing" && mazeCleared(dots)) {
        phase = "cleared";
        phaseTimer = CLEAR_SECONDS;
        ghostObjs.forEach((o) => (o.hidden = true));
      }
    };

    k.onUpdate(() => {
      // Cap dt so a stalled tab can't carry anything through a wall.
      const dt = Math.min(k.dt(), 1 / 30);
      // Pills blink, as on the 2600.
      pillObjs.forEach((o) => (o.hidden = Math.floor(k.time() * 4) % 2 === 1));

      if (phase === "playing") {
        stepPlaying(dt);
        draw();
        return;
      }

      phaseTimer -= dt;

      if (phase === "ready") {
        draw();
        if (phaseTimer <= 0) {
          message.destroy();
          phase = "playing";
        }
      } else if (phase === "paused") {
        // Brief freeze after eating a ghost; power-up time doesn't tick away meanwhile.
        scaredUntil += dt;
        if (phaseTimer <= 0) phase = "playing";
      } else if (phase === "dying") {
        const t = 1 - Math.max(0, phaseTimer) / DEATH_SECONDS;
        pacObj.sprite = PAC_DEATH[Math.min(PAC_DEATH.length - 1, Math.floor(t * PAC_DEATH.length))];
        pacObj.flipX = false;
        if (phaseTimer <= 0) {
          state.lives -= 1;
          refreshHud();
          if (state.lives > 0) {
            resetRound();
          } else {
            pacObj.hidden = true;
            phase = "gameover";
            phaseTimer = GAME_OVER_SECONDS;
            addLabel(k, "GAME OVER", GAME_WIDTH / 2, laneY(PAC_START.r) + 14, COLORS.white, { anchor: "top" });
          }
        }
      } else if (phase === "cleared") {
        // The maze flashes, then a fresh one with a bonus life.
        maze.opacity = Math.floor(k.time() * 6) % 2 ? 1 : 0.3;
        if (phaseTimer <= 0) {
          state.level += 1;
          state.lives += 1;
          k.go(SCENES.level);
        }
      } else if (phaseTimer <= 0) {
        k.go(SCENES.title);
      }
    });

    draw();
  });
}
