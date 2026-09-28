import { START_LIVES } from "./constants";

// Run state shared between scenes and the HUD.
export const state = {
  score: 0,
  highScore: 0,
  lives: START_LIVES,
  level: 1,
};

export function resetState() {
  state.highScore = Math.max(state.highScore, state.score);
  state.score = 0;
  state.lives = START_LIVES;
  state.level = 1;
}
