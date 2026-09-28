import type { KAPLAYCtx } from "kaplay";
import fontUrl from "@fontsource/press-start-2p/files/press-start-2p-latin-400-normal.woff2?url";
import { FONT } from "./constants";
import { ATLAS, ATLAS_URL } from "./sprites";

const audio = (name: string) => `/assets/audio/pm-a2600_${name}.wav`;

// Sound effects from the Atari 2600 game, served from public/assets/audio.
export const SOUNDS = {
  begin: audio("begin"),
  wafer: audio("pellet"),
  pill: audio("powerpellet"), // the 2600 plays the same sound for power pills and vitamins
  scared: audio("blueghost"),
  ghostEaten: audio("ghosteaten"),
  die: audio("die"),
} as const;

export type SoundName = keyof typeof SOUNDS;

export function loadAssets(k: KAPLAYCtx) {
  // Press Start 2P is designed on an 8px grid: load it at 8 and let KAPLAY scale it
  // with nearest-neighbour so text stays crisp at our tiny logical resolution.
  k.loadFont(FONT, fontUrl, { size: 8, filter: "nearest" });
  k.loadSpriteAtlas(ATLAS_URL, ATLAS);

  for (const [name, url] of Object.entries(SOUNDS)) {
    k.loadSound(name, url);
  }
}
