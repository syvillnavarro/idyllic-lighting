import { HOUSE_BOUNDS, PHOTO_H, PHOTO_W } from "./geometry";

export type Layout = "split" | "stacked";

export type Framing = {
  width: number;
  height: number;
  viewBox: string;
  bulbScale: number;
};

type Box = { left: number; top: number; right: number; bottom: number };

/** The static (reduced-motion, no-JS, fallback) figure: the photograph, cropped to the house. */
export const STATIC_VIEWBOX = "160 70 1060 600";
export const STATIC_ASPECT = 1060 / 600;

/** Bulb core radius in scene units; keep at least this many CSS pixels on screen. */
const CORE_RADIUS = 3;
const MIN_CORE_PX = 1.9;

const round = (v: number) => Math.round(v * 100) / 100;

/**
 * Cover the stage with the night photograph, then shift the crop so the house
 * sits in the area the copy leaves free. Lights stay in photo coordinates.
 */
export function computeFraming(width: number, height: number, copy: Box, layout: Layout): Framing {
  const cover = Math.max(width / PHOTO_W, height / PHOTO_H);
  const vbW = width / cover;
  const vbH = height / cover;

  let region: Box;
  if (layout === "split") {
    const gap = Math.max(32, width * 0.03);
    region = {
      left: copy.right + gap,
      right: width - Math.max(24, width * 0.04),
      top: Math.max(24, height * 0.1),
      bottom: height * 0.88,
    };
  } else {
    const side = Math.max(10, width * 0.03);
    region = {
      left: side,
      right: width - side,
      top: copy.bottom + Math.max(8, height * 0.02),
      bottom: height - Math.max(64, height * 0.1),
    };
  }

  const regionCx = (region.left + region.right) / 2 / cover;
  const regionCy = (region.top + region.bottom) / 2 / cover;
  const houseCx = (HOUSE_BOUNDS.left + HOUSE_BOUNDS.right) / 2;
  const houseCy = (HOUSE_BOUNDS.top + HOUSE_BOUNDS.bottom) / 2;

  let x = houseCx - regionCx;
  let y = houseCy - regionCy;
  x = Math.min(Math.max(0, x), Math.max(0, PHOTO_W - vbW));
  y = Math.min(Math.max(0, y), Math.max(0, PHOTO_H - vbH));

  return {
    width,
    height,
    viewBox: [x, y, vbW, vbH].map(round).join(" "),
    bulbScale: Math.min(2.4, Math.max(1, MIN_CORE_PX / (CORE_RADIUS * cover))),
  };
}
