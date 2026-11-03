import { GROUND_Y, HOUSE_BOUNDS } from "./geometry";

export type Layout = "split" | "stacked";

export type Framing = {
  width: number;
  height: number;
  viewBox: string;
  bulbScale: number;
};

type Box = { left: number; top: number; right: number; bottom: number };

/** The static (reduced-motion, no-JS, fallback) figure: the house with a little ground and sky. */
export const STATIC_VIEWBOX = "470 200 1190 740";
export const STATIC_ASPECT = 1190 / 740;

const HOUSE_W = HOUSE_BOUNDS.right - HOUSE_BOUNDS.left;
const HOUSE_H = HOUSE_BOUNDS.bottom - HOUSE_BOUNDS.top;

/** Bulb core radius in scene units; keep at least this many CSS pixels on screen. */
const CORE_RADIUS = 3.3;
const MIN_CORE_PX = 1.9;

const round = (v: number) => Math.round(v * 100) / 100;

/**
 * Fit the house into the stage area the copy leaves free, then express that
 * placement as a viewBox over the whole stage, so the Player and the poster
 * draw the same scene at the same pixels.
 */
export function computeFraming(width: number, height: number, copy: Box, layout: Layout): Framing {
  let region: Box;
  if (layout === "split") {
    const gap = Math.max(32, width * 0.03);
    region = {
      left: copy.right + gap,
      right: width - Math.max(24, width * 0.04),
      top: Math.max(24, height * 0.12),
      bottom: height * 0.85,
    };
  } else {
    const side = Math.max(14, width * 0.04);
    region = {
      left: side,
      right: width - side,
      top: copy.bottom + Math.max(16, height * 0.03),
      // Room for the two-line foot bar (scroll cue, skip link, visualization label) on the lawn.
      bottom: height - Math.max(76, height * 0.11),
    };
  }

  const byWidth = (region.right - region.left) / HOUSE_W;
  const byHeight = (region.bottom - region.top) / HOUSE_H;
  // On short stacked stages, let the roof peaks rise behind the copy rather than shrink the house to a sliver.
  const floor = layout === "stacked" ? Math.min(byWidth, 0.27) : 0;
  const scale = Math.min(1.45, Math.max(floor, Math.min(byWidth, byHeight)));

  // Tall stacked stages: lift the house off the foot bar, keeping a little more lawn than sky.
  const spare = region.bottom - region.top - HOUSE_H * scale;
  const ground = layout === "stacked" && spare > 0 ? region.bottom - spare * 0.45 : region.bottom;

  const houseLeft = region.left + (region.right - region.left - HOUSE_W * scale) / 2;
  const x = HOUSE_BOUNDS.left - houseLeft / scale;
  const y = GROUND_Y - ground / scale;

  return {
    width,
    height,
    viewBox: [x, y, width / scale, height / scale].map(round).join(" "),
    bulbScale: Math.min(2.4, Math.max(1, MIN_CORE_PX / (CORE_RADIUS * scale))),
  };
}
