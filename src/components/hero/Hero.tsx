"use client";

import type { PlayerRef } from "@remotion/player";
import { motion, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import { useEffect, useRef, useState, useSyncExternalStore, type ComponentType } from "react";
import { RequestLink } from "@/components/inquiry/RequestLink";
import { actionLabel, copy } from "@/config/public";
import { STATIC_VIEWBOX, computeFraming, type Framing } from "./framing";
import type { HeroPlayerProps } from "./HeroPlayer";
import { HouseScene } from "./HouseScene";
import { ALL_LIT, ASSEMBLED, FPS, IDLE_START, LIT_AT, SCRUB_START, scrubFrame } from "./timeline";

/** Same conditions as the animated layout in globals.css. */
const MOTION_QUERY = "(prefers-reduced-motion: no-preference) and (min-height: 560px)";
const SPLIT_QUERY = "(min-width: 1100px), (min-width: 900px) and (min-aspect-ratio: 8/5)";

const INTRO_KEY = "idyllic:intro-seen";
/** If the animation code arrives later than this, start from the assembled house instead. */
const INTRO_DEADLINE_MS = 1500;

const introSeen = () => {
  try {
    return window.sessionStorage.getItem(INTRO_KEY) === "1";
  } catch {
    return false;
  }
};

const rememberIntro = () => {
  try {
    window.sessionStorage.setItem(INTRO_KEY, "1");
  } catch {
    // Storage unavailable: the intro may play again in this tab, which is harmless.
  }
};

function useMedia(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => null,
  );
}

type Loaded = { Player: ComponentType<HeroPlayerProps>; runIntro: boolean; initialFrame: number };

const { opening, introduction, closing } = copy.hero;

const noSubscription = () => () => {};
/** False once the layout script has fallen back to the static hero (see layout.tsx). */
const readEnhanced = () => document.documentElement.classList.contains("js");

export function Hero() {
  const motionAllowed = useMedia(MOTION_QUERY);
  const split = useMedia(SPLIT_QUERY);
  const enhanced = useSyncExternalStore(noSubscription, readEnhanced, () => null);
  const [failed, setFailed] = useState(false);
  const mode =
    motionAllowed === null || enhanced === null
      ? "pending"
      : motionAllowed && enhanced && !failed
        ? "animated"
        : "static";
  const animated = mode === "animated";

  const heroRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const copyRef = useRef<HTMLDivElement>(null);
  const introDone = useRef(false);

  const [seenAtLoad] = useState(() => typeof window !== "undefined" && introSeen());
  const [late, setLate] = useState(false);
  const [framing, setFraming] = useState<Framing | null>(null);
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [player, setPlayer] = useState<PlayerRef | null>(null);
  const [active, setActive] = useState(0);
  const [pinTop, setPinTop] = useState(0);

  // Progress starts where the stage pins (below the sticky header), so no scroll is spent idle.
  const { scrollYProgress } = useScroll({ target: trackRef, offset: [`start ${pinTop}px`, "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (p) => setActive(p < 0.2 ? 0 : p < 0.7 ? 1 : 2));

  const openingOpacity = useTransform(scrollYProgress, [0.15, 0.21], [1, 0]);
  const openingY = useTransform(scrollYProgress, [0.15, 0.21], [0, -56]);
  const introOpacity = useTransform(scrollYProgress, [0.19, 0.25, 0.65, 0.71], [0, 1, 1, 0]);
  const introY = useTransform(scrollYProgress, [0.19, 0.25, 0.65, 0.71], [56, 0, 0, -56]);
  const closingOpacity = useTransform(scrollYProgress, [0.69, 0.75], [0, 1]);
  const closingY = useTransform(scrollYProgress, [0.69, 0.75], [56, 0]);

  // Fit the house into the space the copy leaves, for the poster and the Player alike.
  useEffect(() => {
    if (!animated || split === null) return;
    const stage = stageRef.current;
    const copyBox = copyRef.current;
    if (!stage || !copyBox) return;
    const measure = () => {
      const s = stage.getBoundingClientRect();
      const c = copyBox.getBoundingClientRect();
      if (s.width < 1 || s.height < 1) return;
      setPinTop(Math.round(parseFloat(getComputedStyle(stage).top)) || 0);
      const next = computeFraming(
        Math.round(s.width),
        Math.round(s.height),
        { left: c.left - s.left, top: c.top - s.top, right: c.right - s.left, bottom: c.bottom - s.top },
        split ? "split" : "stacked",
      );
      setFraming((prev) =>
        prev && prev.viewBox === next.viewBox && prev.width === next.width && prev.height === next.height ? prev : next,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    observer.observe(copyBox);
    return () => observer.disconnect();
  }, [animated, split]);

  // Load the Remotion Player only when the animated hero will be used.
  useEffect(() => {
    if (!animated || loaded) return;
    let cancelled = false;
    const startedAt = performance.now();
    const deadline = window.setTimeout(() => setLate(true), INTRO_DEADLINE_MS);
    import("./HeroPlayer").then(
      (module) => {
        if (cancelled) return;
        const runIntro =
          !introSeen() &&
          window.scrollY < 2 &&
          !window.location.hash &&
          performance.now() - startedAt < INTRO_DEADLINE_MS;
        setLoaded({
          Player: module.default,
          runIntro,
          initialFrame: runIntro ? 0 : scrubFrame(scrollYProgress.get()),
        });
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
      window.clearTimeout(deadline);
    };
  }, [animated, loaded, scrollYProgress]);

  // The single owner of the Player's time: intro and idle cue first, then native scroll.
  useEffect(() => {
    const hero = heroRef.current;
    if (!animated || !player || !loaded || !hero) return;

    let raf = 0;
    let shown = -1;
    const show = (frame: number) => {
      if (frame === shown) return;
      shown = frame;
      player.seekTo(frame);
    };
    const follow = () => {
      const p = scrollYProgress.get();
      show(scrubFrame(p));
      hero.dataset.phase = p >= LIT_AT ? "complete" : "scrub";
    };
    const finishIntro = () => {
      if (introDone.current) return;
      introDone.current = true;
      cancelAnimationFrame(raf);
      rememberIntro();
      follow();
    };

    const stopScroll = scrollYProgress.on("change", () => (introDone.current ? follow() : finishIntro()));
    const onError = () => setFailed(true);
    player.addEventListener("error", onError);

    const startY = window.scrollY;
    const onScroll = () => {
      if (Math.abs(window.scrollY - startY) > 1) finishIntro();
    };
    const onClick = (event: MouseEvent) => {
      if (event.target instanceof Element && event.target.closest("a, button")) finishIntro();
    };
    const onVisibility = () => {
      if (document.hidden) finishIntro();
    };

    if (loaded.runIntro && !introDone.current) {
      const startedAt = performance.now();
      const tick = (now: number) => {
        const frame = Math.min(SCRUB_START - 1, Math.floor(((now - startedAt) / 1000) * FPS));
        show(frame);
        hero.dataset.phase = frame < IDLE_START ? "intro" : "idle";
        if (frame >= SCRUB_START - 1) finishIntro();
        else raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      window.addEventListener("scroll", onScroll, { passive: true });
      document.addEventListener("click", onClick, true);
      document.addEventListener("visibilitychange", onVisibility);
    } else {
      finishIntro();
      follow();
    }
    hero.dataset.player = "ready";

    return () => {
      cancelAnimationFrame(raf);
      stopScroll();
      player.removeEventListener("error", onError);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onVisibility);
      delete hero.dataset.player;
    };
  }, [animated, player, loaded, scrollYProgress]);

  const poster =
    mode === "static" ? "lit" : mode === "pending" || !framing ? undefined : seenAtLoad || late ? "idle" : "night";

  return (
    <section
      ref={heroRef}
      className="hero"
      data-mode={mode}
      data-poster={poster}
      aria-labelledby="hero-title"
    >
      <div ref={trackRef} className="hero-track">
        <div ref={stageRef} className="hero-stage">
          <div className="hero-scene" aria-hidden="true" inert>
            <HouseScene
              className="hero-poster"
              idPrefix="poster"
              viewBox={animated && framing ? framing.viewBox : STATIC_VIEWBOX}
              preserveAspectRatio={animated && framing ? "xMidYMid meet" : "xMidYMid slice"}
              bulbScale={animated && framing ? framing.bulbScale : 1}
              assembly={ASSEMBLED}
              intensities={ALL_LIT}
            />
            {animated && framing && loaded && (
              <div className="hero-player">
                <loaded.Player
                  playerRef={setPlayer}
                  width={framing.width}
                  height={framing.height}
                  viewBox={framing.viewBox}
                  bulbScale={framing.bulbScale}
                  initialFrame={loaded.initialFrame}
                />
              </div>
            )}
          </div>
          <div className="hero-scrim" aria-hidden="true" />

          <div ref={copyRef} className="hero-copy" key={mode === "static" ? "copy-static" : "copy-motion"}>
            <motion.div
              className="copy-state copy-opening"
              style={animated ? { opacity: openingOpacity, y: openingY } : undefined}
            >
              <h1 id="hero-title">{opening.title}</h1>
              <p className="hero-lede">{opening.lede}</p>
              <div className="hero-actions" inert={animated && active !== 0}>
                <RequestLink type="quote" className="btn btn-gold">
                  {actionLabel.quote}
                </RequestLink>
                <RequestLink type="site_visit" className="btn btn-ghost">
                  {actionLabel.site_visit}
                </RequestLink>
              </div>
            </motion.div>

            <motion.div
              className="copy-state copy-introduction"
              style={animated ? { opacity: introOpacity, y: introY } : undefined}
            >
              <h2>{introduction.title}</h2>
              <p>{introduction.body}</p>
            </motion.div>

            <motion.div
              className="copy-state copy-closing"
              style={animated ? { opacity: closingOpacity, y: closingY } : undefined}
            >
              <h2>{closing.title}</h2>
              <div className="hero-actions" inert={!animated || active !== 2}>
                <RequestLink type="quote" className="btn btn-gold">
                  {actionLabel.quote}
                </RequestLink>
                <RequestLink type="site_visit" className="btn btn-ghost">
                  {actionLabel.site_visit}
                </RequestLink>
              </div>
            </motion.div>
          </div>

          <div className="hero-foot" key={mode === "static" ? "foot-static" : "foot-motion"}>
            <div className="hero-foot-start">
              <motion.p className="hero-cue" style={animated ? { opacity: openingOpacity } : undefined}>
                <span aria-hidden="true" className="hero-cue-line" />
                {opening.scrollCue}
              </motion.p>
              <a className="hero-skip" href="#after-hero">
                {copy.hero.skip}
              </a>
            </div>
            <p className="hero-viz">
              <strong>{copy.hero.visualization}</strong>
              <span>{copy.hero.visualizationDetail}</span>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
