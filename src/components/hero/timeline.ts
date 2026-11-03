import { motion } from "@/config/public";
import { BULBS, RAMP } from "./geometry";

const { fps, introSeconds, idleSeconds, idlePulses, scrubFrames } = motion;

export const FPS = fps;
export const IDLE_START = Math.round(introSeconds * fps);
export const SCRUB_START = IDLE_START + Math.round(idleSeconds * fps);
export const SCRUB_FRAMES = scrubFrames;
export const DURATION = SCRUB_START + SCRUB_FRAMES;

/** Scroll progress at which the whole roofline is lit; the rest is a hold. */
export const LIT_AT = 0.85;

export type Assembly = { foundation: number; facade: number; roof: number; shrubs: number };

export const ASSEMBLED: Assembly = { foundation: 1, facade: 1, roof: 1, shrubs: 1 };

export const ALL_LIT: readonly number[] = BULBS.map(() => 1);

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOut = (v: number) => 1 - (1 - v) ** 4;
const smooth = (v: number) => v * v * (3 - 2 * v);

/** Progress of a phase that runs between two fractions of the intro. */
const phase = (frame: number, from: number, to: number) =>
  easeOut(clamp01((frame / IDLE_START - from) / (to - from)));

export const scrubFrame = (progress: number) =>
  SCRUB_START + Math.round(clamp01(progress) * (SCRUB_FRAMES - 1));

export const progressAtFrame = (frame: number) => clamp01((frame - SCRUB_START) / (SCRUB_FRAMES - 1));

function assemblyAt(frame: number): Assembly {
  if (frame >= IDLE_START) return ASSEMBLED;
  return {
    foundation: phase(frame, 0, 0.36),
    facade: phase(frame, 0.18, 0.72),
    roof: phase(frame, 0.48, 1),
    shrubs: phase(frame, 0.6, 1),
  };
}

/** The far-left bulb: comes on, swells gently `idlePulses` times, then holds. */
function firstBulbAt(frame: number) {
  const f = frame - IDLE_START;
  if (f < 0) return 0;
  const fadeIn = 8;
  const swell = 22;
  if (f < fadeIn) return easeOut(f / fadeIn);
  const into = f - fadeIn;
  if (into < swell * idlePulses) return 1 + 0.45 * Math.sin((Math.PI * (into % swell)) / swell) ** 2;
  return 1;
}

export type SceneState = { assembly: Assembly; intensities: number[] };

export function sceneAt(frame: number): SceneState {
  const assembly = assemblyAt(frame);
  if (frame < SCRUB_START) {
    const first = firstBulbAt(frame);
    return { assembly, intensities: BULBS.map((_, i) => (i === 0 ? first : 0)) };
  }
  const lit = clamp01(progressAtFrame(frame) / LIT_AT);
  return {
    assembly,
    intensities: BULBS.map((bulb, i) => (i === 0 ? 1 : smooth(clamp01((lit - bulb.t) / RAMP)))),
  };
}
