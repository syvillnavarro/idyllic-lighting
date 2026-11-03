"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { useMemo, type Ref } from "react";
import { HeroComposition } from "./HeroComposition";
import { DURATION, FPS } from "./timeline";

export type HeroPlayerProps = {
  playerRef: Ref<PlayerRef>;
  width: number;
  height: number;
  viewBox: string;
  bulbScale: number;
  initialFrame: number;
};

/** Loaded on demand. The hero controller owns time: no autoplay, controls or click/keyboard playback. */
export default function HeroPlayer({ playerRef, width, height, viewBox, bulbScale, initialFrame }: HeroPlayerProps) {
  const inputProps = useMemo(() => ({ viewBox, bulbScale }), [viewBox, bulbScale]);
  return (
    <Player
      ref={playerRef}
      component={HeroComposition}
      inputProps={inputProps}
      durationInFrames={DURATION}
      fps={FPS}
      compositionWidth={width}
      compositionHeight={height}
      initialFrame={initialFrame}
      controls={false}
      autoPlay={false}
      loop={false}
      clickToPlay={false}
      doubleClickToFullscreen={false}
      spaceKeyToPlayOrPause={false}
      allowFullscreen={false}
      moveToBeginningWhenEnded={false}
      numberOfSharedAudioTags={0}
      errorFallback={() => null}
      style={{ width: "100%", height: "100%" }}
    />
  );
}
