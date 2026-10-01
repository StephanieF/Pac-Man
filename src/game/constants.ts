// The 2600 draws a 160-pixel-wide playfield; KingPepe's rip doubles it horizontally,
// which is close to square pixels on a 4:3 TV. We use the rip's pixels 1:1.
export const GAME_WIDTH = 320;
export const GAME_HEIGHT = 200;

// The maze art occupies the top of the screen; the green score bar sits below it.
export const MAZE_HEIGHT = 168;
export const SCORE_BAR_Y = 172;
export const SCORE_BAR_HEIGHT = 11;
export const LIVES_Y = 184;

// Movement, in pixels per second. The 2600 values aren't documented; these are
// playable guesses. Each level multiplies them by LEVEL_SPEEDUP, up to MAX_SPEEDUP.
export const PAC_SPEED = 60;
export const GHOST_SPEED = 54;
export const SCARED_SPEED = 32;
export const LEVEL_SPEEDUP = 0.08;
export const MAX_SPEEDUP = 1.4;
// A turn pressed up to this many pixels after Pac-Man passes a junction is still taken
// (~100ms at base speed), which absorbs keyboard latency. Must stay under 8, the gap
// between neighbouring junctions across a lane.
export const TURN_GRACE = 6;

// Ghosts
export const GHOST_RELEASE = [1, 3, 5, 7] as const; // seconds after the round starts
export const GHOST_RESPAWN_DELAY = 3; // seconds an eaten ghost waits in the pen
export const GHOST_CHASE = 0.6; // chance a ghost heads toward Pac-Man at a junction
export const FRIGHT_SECONDS = 7; // minus one per level, down to MIN_FRIGHT_SECONDS
export const MIN_FRIGHT_SECONDS = 2;
export const FRIGHT_FLASH_SECONDS = 2; // scared ghosts flash for this long before recovering

// Vitamin: appears twice per maze below the ghost pen, after this many wafers eaten
export const VITAMIN_AT = [40, 90] as const;
export const VITAMIN_SECONDS = 10;

// Scoring (from the 2600 manual)
export const POINTS_WAFER = 1;
export const POINTS_PILL = 5;
export const POINTS_VITAMIN = 100;
export const POINTS_GHOST = 20; // doubles for each ghost eaten on one power pill: 20, 40, 80, 160

// The rip's score bar shows three reserve lives, so a game starts with four.
// Clearing a maze awards an extra life, as on the 2600.
export const START_LIVES = 4;

export const SCENES = {
  title: "title",
  level: "level",
} as const;

// Palette sampled from the sprite sheet (RGB).
export const COLORS = {
  blue: [45, 50, 184],
  wall: [162, 134, 56],
  pac: [210, 182, 86],
  pill: [204, 216, 110],
  green: [50, 132, 50],
  pink: [212, 108, 195],
  purple: [149, 111, 227],
  white: [255, 255, 255],
  black: [0, 0, 0],
} as const;

export const FONT = "arcade";
