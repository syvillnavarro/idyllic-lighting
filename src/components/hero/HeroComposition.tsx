import { AbsoluteFill, useCurrentFrame } from "remotion";
import { HouseScene } from "./HouseScene";
import { sceneAt } from "./timeline";

export type HeroCompositionProps = {
  viewBox: string;
  bulbScale: number;
};

/** Every visual is derived from the frame: assembly, the first bulb's cue, then scroll-driven light. */
export function HeroComposition({ viewBox, bulbScale }: HeroCompositionProps) {
  const frame = useCurrentFrame();
  const { assembly, intensities } = sceneAt(frame);
  return (
    <AbsoluteFill style={{ backgroundColor: "#0B0E13" }}>
      <HouseScene
        idPrefix="player"
        viewBox={viewBox}
        preserveAspectRatio="xMidYMid meet"
        bulbScale={bulbScale}
        assembly={assembly}
        intensities={intensities}
      />
    </AbsoluteFill>
  );
}
