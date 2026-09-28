/**
 * The Atari 2600 maze, in screen pixels (the maze art is drawn at 0,0).
 *
 * Traced from the artwork: the playfield is 40 columns of 8px. Rows alternate between
 * 4px wall rows and 16px lanes on a 20px pitch, so MAP's 17 rows cover y = 2..165.
 * Even MAP rows are walls (row 2k is the wall above lane k); odd rows are the 8 lanes.
 *
 *   '#' wall   '.' open   '*' open, with a video wafer   'o' open, with a power pill
 *   '-' ghost pen door (ghosts only)
 *
 * Actors are 16px wide, so an actor sits across two columns. Its "node" (c, r) means it
 * covers columns c and c+1 of lane r; nodes are 8px apart across and 20px apart down.
 * The escape tunnel is the gap in the top and bottom walls (columns 19-20): on the 2600
 * it wraps vertically, not sideways like the arcade.
 */
export const MAP: readonly string[] = [
  "###################..###################",
  "#.*.*.*.*.*.*..#.*.**.*.#..*.*.*.*.*.*.#", // lane 0
  "#o.###..#..##..#..####..#..##..#..###o.#",
  "#.*.*.*.#.*.*.*.*.*..*.*.*.*.*.#.*.*.*.#", // lane 1
  "####..###..#####..####..#####..###..####",
  "#.*.*.*.*.*.*..#.*.**.*.#..*.*.*.*.*.*.#", // lane 2
  "#..###..#..##..#..#--#..#..##..#..###..#",
  "#.*.*.*.#.*.*.*.*.#..#.*.*.*.*.#.*.*.*.#", // lane 3 (ghost pen in the middle)
  "####..###..#####..####..#####..###..####",
  "#.*.*.*.*.*.*..#.*.**.*.#..*.*.*.*.*.*.#", // lane 4 (Pac-Man starts in the middle)
  "#..###..#..##..#..####..#..##..#..###..#",
  "#.*.*.*.#.*.*.*.*.*..*.*.*.*.*.#.*.*.*.#", // lane 5
  "####..###..#####..####..#####..###..####",
  "#.*.*.*.*.*.*..#.*.**.*.#..*.*.*.*.*.*.#", // lane 6
  "#o.###..#..##..#..####..#..##..#..###o.#",
  "#.*.*.*.#.*.*.*.*.*..*.*.*.*.*.#.*.*.*.#", // lane 7
  "###################..###################",
];

export const COLS = 40;
export const LANES = 8;
const H_EDGE = 8; // px between neighbouring nodes across
const V_EDGE = 20; // px between neighbouring nodes down

export type Dir = "left" | "right" | "up" | "down";
export const DIRS: readonly Dir[] = ["up", "left", "down", "right"];
export const OPPOSITE: Record<Dir, Dir> = { left: "right", right: "left", up: "down", down: "up" };
const VEC: Record<Dir, { dc: number; dr: number }> = {
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
};

export interface Node {
  c: number;
  r: number;
}

export const PEN: Node = { c: 19, r: 3 };
export const PAC_START: Node = { c: 19, r: 4 };

/** Screen position of a node's centre. */
export const nodeX = (c: number) => 8 * c + 8;
export const laneY = (r: number) => 14 + 20 * r;

const lane = (r: number) => MAP[2 * r + 1];
const wallAbove = (r: number) => MAP[2 * r];
const isOpen = (ch: string) => ch !== "#" && ch !== "-";

export const isPen = (n: Node) => n.c === PEN.c && n.r === PEN.r;

/** An actor can stand at this node. */
export function fits(c: number, r: number): boolean {
  if (r < 0 || r >= LANES || c < 1 || c > COLS - 3) return false;
  return isOpen(lane(r)[c]) && isOpen(lane(r)[c + 1]);
}

/** The wall row above lane r has a two-column gap at c. Ghosts may use the pen door. */
function gapAbove(r: number, c: number, ghost: boolean): boolean {
  const row = wallAbove(r);
  const pass = (ch: string) => isOpen(ch) || (ghost && ch === "-");
  return pass(row[c]) && pass(row[c + 1]);
}

const TUNNEL_TOP = 0;
const TUNNEL_BOTTOM = LANES; // index of the bottom wall row, as a "lane above" index

/** The node one step from n in `dir`, or null if a wall is in the way. */
export function neighbor(n: Node, dir: Dir, ghost = false): Node | null {
  if (!fits(n.c, n.r)) return null;
  const { dc, dr } = VEC[dir];
  if (dr === 0) return fits(n.c + dc, n.r) ? { c: n.c + dc, r: n.r } : null;

  const isTunnel = gapAbove(TUNNEL_TOP, n.c, false) && gapAbove(TUNNEL_BOTTOM, n.c, false);
  if (dir === "up") {
    if (n.r === 0) return isTunnel ? { c: n.c, r: LANES - 1 } : null;
    return gapAbove(n.r, n.c, ghost) && fits(n.c, n.r - 1) ? { c: n.c, r: n.r - 1 } : null;
  }
  if (n.r === LANES - 1) return isTunnel ? { c: n.c, r: 0 } : null;
  return gapAbove(n.r + 1, n.c, ghost) && fits(n.c, n.r + 1) ? { c: n.c, r: n.r + 1 } : null;
}

export const edgeLength = (dir: Dir) => (VEC[dir].dr === 0 ? H_EDGE : V_EDGE);

/**
 * Something that moves along the maze's lanes: it is `off` pixels from node (c, r),
 * heading `dir` toward the next node. off === 0 means it stands exactly on the node,
 * which is the only place it can turn (reversing is allowed anywhere).
 */
export interface Mover extends Node {
  dir: Dir;
  off: number;
  /** Ghosts can pass through the pen door. */
  ghost: boolean;
}

export function position(m: Mover): { x: number; y: number } {
  const { dc, dr } = VEC[m.dir];
  const x = nodeX(m.c) + dc * m.off;
  // Through the tunnel: leave off one edge of the maze, come back on the other.
  if (m.off > 0 && m.dir === "up" && m.r === 0) {
    return { x, y: m.off < V_EDGE / 2 ? laneY(0) - m.off : laneY(LANES - 1) + V_EDGE - m.off };
  }
  if (m.off > 0 && m.dir === "down" && m.r === LANES - 1) {
    return { x, y: m.off < V_EDGE / 2 ? laneY(LANES - 1) + m.off : laneY(0) - (V_EDGE - m.off) };
  }
  return { x, y: laneY(m.r) + dr * m.off };
}

/** Turn around on the spot, mid-edge or not. */
export function reverse(m: Mover) {
  if (m.off > 0) {
    const next = neighbor(m, m.dir, m.ghost);
    if (!next) return;
    m.c = next.c;
    m.r = next.r;
    m.off = edgeLength(m.dir) - m.off;
  }
  m.dir = OPPOSITE[m.dir];
}

/**
 * Moves up to `dist` pixels. At each node `choose` picks the next direction (it must be
 * open), or returns null to stop there. Returns the distance actually moved.
 */
export function advance(m: Mover, dist: number, choose: (m: Mover) => Dir | null): number {
  let moved = 0;
  for (let guard = 0; dist - moved > 1e-9 && guard < 64; guard++) {
    if (m.off === 0) {
      const dir = choose(m);
      if (!dir || !neighbor(m, dir, m.ghost)) return moved;
      m.dir = dir;
    }
    const len = edgeLength(m.dir);
    const step = Math.min(dist - moved, len - m.off);
    m.off += step;
    moved += step;
    if (m.off >= len - 1e-9) {
      const next = neighbor(m, m.dir, m.ghost)!;
      m.c = next.c;
      m.r = next.r;
      m.off = 0;
    }
  }
  return moved;
}

export interface Dot {
  x: number;
  y: number;
  kind: "wafer" | "pill";
  eaten: boolean;
}

/** Fresh wafers and power pills for a new maze, read from MAP. */
export function createDots(): Dot[] {
  const dots: Dot[] = [];
  MAP.forEach((row, i) => {
    [...row].forEach((ch, c) => {
      // A wafer fills column c; a pill sits in the gap between two lanes, centred on node c.
      if (ch === "*") dots.push({ x: 8 * c + 4, y: laneY((i - 1) / 2), kind: "wafer", eaten: false });
      if (ch === "o") dots.push({ x: nodeX(c), y: laneY(i / 2) - V_EDGE / 2, kind: "pill", eaten: false });
    });
  });
  return dots;
}
