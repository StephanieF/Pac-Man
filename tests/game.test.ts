import { describe, expect, it } from "vitest";
import { chooseGhostDir, createGhost, frighten, type Ghost, sendHome, stepGhost } from "../src/game/ghost";
import {
  createDots,
  type Dir,
  DIRS,
  isPen,
  LANES,
  laneY,
  MAP,
  neighbor,
  type Node,
  nodeX,
  PAC_START,
  PEN,
  position,
} from "../src/game/maze";
import { createPacMan, type PacMan, stepPacMan } from "../src/game/pacman";
import { eatDots, frightSeconds, ghostPoints, mazeCleared, touching } from "../src/game/rules";

const DT = 1 / 60;
const key = (n: Node) => `${n.c},${n.r}`;

// small seeded generator so tests are deterministic
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

/** Every node reachable from `start`. */
function reachable(start: Node, ghost: boolean): Map<string, Node> {
  const seen = new Map([[key(start), start]]);
  const queue = [start];
  while (queue.length) {
    const n = queue.shift()!;
    for (const d of DIRS) {
      const next = neighbor(n, d, ghost);
      if (next && !seen.has(key(next))) {
        seen.set(key(next), next);
        queue.push(next);
      }
    }
  }
  return seen;
}

describe("maze", () => {
  it("is the 40-column, 8-lane map traced from the artwork", () => {
    expect(MAP).toHaveLength(2 * LANES + 1);
    for (const row of MAP) expect(row).toHaveLength(40);
  });

  it("has the 2600's 126 video wafers and 4 power pills", () => {
    const dots = createDots();
    expect(dots.filter((d) => d.kind === "wafer")).toHaveLength(126);
    // pills sit in the corners, on the vertical passages between lanes 0-1 and 6-7
    expect(dots.filter((d) => d.kind === "pill").map((d) => [d.x, d.y])).toEqual([
      [16, 24],
      [304, 24],
      [16, 144],
      [304, 144],
    ]);
  });

  it("lets Pac-Man reach every wafer and pill from the start", () => {
    const nodes = [...reachable(PAC_START, false).values()];
    for (const d of createDots()) {
      // on a lane between two neighbouring nodes, or on a passage between two lanes
      const near = nodes.some((n) => {
        const x = nodeX(n.c);
        const y = laneY(n.r);
        return d.kind === "wafer"
          ? y === d.y && d.x >= x && d.x <= x + 8 && neighbor(n, "right")
          : x === d.x && d.y > y && d.y < y + 20 && neighbor(n, "down");
      });
      expect(near, `dot at ${d.x},${d.y}`).toBeTruthy();
    }
  });

  it("keeps Pac-Man out of the ghost pen, but lets ghosts out through the door", () => {
    expect(reachable(PAC_START, false).has(key(PEN))).toBe(false);
    expect(neighbor(PEN, "up", true)).toEqual({ c: PEN.c, r: PEN.r - 1 });
    expect(neighbor(PEN, "up", false)).toBeNull();
    expect(DIRS.filter((d) => neighbor(PEN, d, true))).toEqual(["up"]);
  });

  it("wraps the escape tunnel top to bottom, only in the middle column", () => {
    expect(neighbor({ c: 19, r: 0 }, "up")).toEqual({ c: 19, r: LANES - 1 });
    expect(neighbor({ c: 19, r: LANES - 1 }, "down")).toEqual({ c: 19, r: 0 });
    expect(neighbor({ c: 18, r: 0 }, "up")).toBeNull();
    expect(neighbor({ c: 5, r: LANES - 1 }, "down")).toBeNull();
  });
});

describe("pac-man", () => {
  const run = (p: PacMan, held: Dir | null, seconds: number) => {
    for (let t = 0; t < seconds; t += DT) stepPacMan(p, held, 60 * DT);
  };

  it("runs left from the start until he hits a wall", () => {
    const p = createPacMan();
    run(p, null, 5);
    expect(p.off).toBe(0);
    expect(neighbor(p, "left")).toBeNull();
    expect(p.r).toBe(PAC_START.r);
    expect(p.facing).toBe(-1);
  });

  it("reverses instantly, mid-lane", () => {
    const p = createPacMan();
    stepPacMan(p, null, 3);
    const x = position(p).x;
    stepPacMan(p, "right", 1);
    expect(p.dir).toBe("right");
    expect(position(p).x).toBeCloseTo(x + 1);
  });

  it("remembers a turn pressed before the corner", () => {
    const p = createPacMan();
    p.c = 17; // lane 4 has a passage up at column 16
    stepPacMan(p, "up", 1); // pressed while no passage is open: keeps going left
    expect(p.dir).toBe("left");
    run(p, null, 1);
    expect(p.c).toBe(16);
    expect(p.r).toBeLessThan(PAC_START.r);
  });

  it("goes out the top tunnel and comes back in at the bottom", () => {
    const p = createPacMan();
    Object.assign(p, { c: 19, r: 0, dir: "up", off: 0 });
    stepPacMan(p, "up", 8);
    expect(position(p).y).toBeLessThan(laneY(0));
    stepPacMan(p, "up", 8);
    expect(position(p).y).toBeGreaterThan(laneY(LANES - 1));
    stepPacMan(p, "up", 4);
    expect([p.r, p.off]).toEqual([LANES - 1, 0]);
  });

  it("eats wafers as he passes over them", () => {
    const dots = createDots();
    const p = createPacMan();
    let eaten = eatDots(dots, position(p)).length; // he starts between the two centre wafers
    for (let t = 0; t < 5; t += DT) {
      stepPacMan(p, null, 60 * DT);
      eaten += eatDots(dots, position(p)).length;
    }
    // lane 4 from the middle to the left wall: 2 centre wafers, then 1 more before the
    // wall at column 15. Nothing left of the wall is reachable without turning.
    expect(eaten).toBe(3);
    expect(mazeCleared(dots)).toBe(false);
  });
});

describe("ghosts", () => {
  it("wait in the pen, then leave through the door and never go back in", () => {
    const random = seeded(7);
    const g = createGhost(0, 1);
    const pac = position(createPacMan());
    stepGhost(g, pac, 50, 0.5, random);
    expect(isPen(g) && g.off === 0).toBe(true);

    let left = false;
    for (let t = 0; t < 60; t += DT) {
      stepGhost(g, pac, 50, DT, random);
      if (!isPen(g)) left = true;
      else if (left) expect.fail("ghost re-entered the pen");
    }
    expect(left).toBe(true);
  });

  it("never reverse at a junction unless it's a dead end", () => {
    const random = seeded(3);
    const g: Ghost = { ...createGhost(0, 0), mode: "free", c: 16, r: 4, dir: "left" };
    for (let i = 0; i < 200; i++) {
      expect(chooseGhostDir(g, { x: 999, y: 999 }, random)).not.toBe("right");
    }
  });

  it("catch Pac-Man standing still", () => {
    const random = seeded(11);
    const ghosts = [0, 1, 2, 3].map((i) => createGhost(i, i));
    const pac = { x: nodeX(4), y: laneY(6) };
    let caught = false;
    for (let t = 0; t < 120 && !caught; t += DT) {
      for (const g of ghosts) {
        stepGhost(g, pac, 50, DT, random);
        caught ||= g.mode === "free" && touching(pac, position(g));
      }
    }
    expect(caught).toBe(true);
  });

  it("turn scared and back around on a power pill, and go home when eaten", () => {
    const g: Ghost = { ...createGhost(0, 0), mode: "free", c: 10, r: 4, dir: "left", off: 3 };
    const penned = createGhost(1, 5);
    frighten([g, penned]);
    expect(g.scared).toBe(true);
    expect([g.c, g.dir, g.off]).toEqual([9, "right", 5]);
    expect(penned.scared).toBe(false);

    sendHome(g);
    expect(isPen(g)).toBe(true);
    expect([g.mode, g.scared]).toEqual(["pen", false]);
  });
});

describe("scoring", () => {
  it("doubles for each ghost on one pill: 20, 40, 80, 160", () => {
    expect([0, 1, 2, 3, 4].map(ghostPoints)).toEqual([20, 40, 80, 160, 160]);
  });

  it("shortens fright time each level, with a floor", () => {
    expect([1, 2, 6, 20].map(frightSeconds)).toEqual([7, 6, 2, 2]);
  });
});
