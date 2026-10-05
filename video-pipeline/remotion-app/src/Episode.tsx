import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import type { EpisodeProps, SceneData } from "./types";
import { ClipScene, IllustrationScene } from "./Scenes";
import { DiagramScene, StepsScene, NumberScene, CompareScene, PhotoScene, PlaceholderScene } from "./NewScenes";
import { OrbitScene } from "./OrbitScene";
import { Captions } from "./Captions";
import { BRIDGE, RENDERED_BRIDGES, pick, presentationByName, resolve, sfxByName } from "./profile";
import { FreezeRewind, QuestionCard } from "./Bridges";
import { IdentityProvider, identityPresentation } from "./identity";

type R = ReturnType<typeof resolve>;

/** Returns the CSS bottom offset for captions, accounting for scene type. */
function captionsBottom(v: SceneData["visual"], profBottom: number | undefined, minBottom = 0): number {
  return Math.max(minBottom, captionsBottomRaw(v, profBottom)); // never below the preset's caption band (safe.captionBottom)
}

function captionsBottomRaw(v: SceneData["visual"], profBottom: number | undefined): number {
  if (profBottom !== undefined) return profBottom;
  switch (v.type) {
    case "clip":      return 280;
    case "diagram":   return 480; // above diagram content, inside safe zone
    case "steps":     return 240;
    case "number":    return 200;
    case "compare":   return 220;
    case "photo":     return 300;
    case "orbit":     return 460; // above diagram + captions safe area
    default:          return 300;
  }
}

// lead > 0: this scene's narration was started `lead` frames early by Episode (j-cut / freeze-rewind), so its own <Audio> is skipped and
// captions are shifted to stay in sync. bare: picture only (no captions, no audio), used for the freeze-rewind copy of the last cold-open scene.
const SceneView: React.FC<{ sc: SceneData; props: EpisodeProps; index: number; prof: R; lead?: number; bare?: boolean }> = ({ sc, props, index, prof, lead = 0, bare = false }) => {
  const v = sc.visual;
  const punch = pick(prof.punch, sc.beat, 0);
  const grade = prof.grade;
  const showCaptions = (v as any).captions !== false && !bare;
  const bottom = captionsBottom(v, prof.captions.bottom, prof.safe.captionBottom);

  const visual = (() => {
    switch (v.type) {
      case "clip":
        return <ClipScene src={v.src} dur={sc.frames} rate={v.rate} pal={props.style} punch={punch} grade={grade} />;

      case "illustration":
        return (
          <IllustrationScene
            still={v.still!} term={v.term} pal={props.style} dur={sc.frames} index={index}
            zoom={pick(prof.zoom, sc.beat, [1.04, 1.16] as [number, number])} punch={punch}
            sparkles={pick(prof.sparkles, sc.beat, 4)} termStyle={prof.termStyle}
            font={prof.font} termSfx={sfxByName(prof.sfx.term)} grade={grade} safe={prof.safe}
          />
        );

      case "diagram":
        return <DiagramScene visual={v} pal={props.style} dur={sc.frames} font={prof.font} safe={prof.safe} />;

      case "steps":
        return <StepsScene visual={v} pal={props.style} dur={sc.frames} font={prof.font} safe={prof.safe} />;

      case "number":
        return <NumberScene visual={v} pal={props.style} dur={sc.frames} font={prof.font} safe={prof.safe} />;

      case "compare":
        return <CompareScene visual={v} pal={props.style} dur={sc.frames} font={prof.font} safe={prof.safe} />;

      case "photo":
        return (
          <PhotoScene
            visual={v} pal={props.style} dur={sc.frames} index={index}
            font={prof.font} grade={grade} safe={prof.safe}
          />
        );

      case "orbit":
        return <OrbitScene visual={v} pal={props.style} dur={sc.frames} font={prof.font} safe={prof.safe} />;

      case "placeholder":
        return <PlaceholderScene scene={sc} visual={v} pal={props.style} font={prof.font} safe={prof.safe} />;

      default:
        // Unknown type — render a plain colour fill so the video still renders
        return <AbsoluteFill style={{ background: props.style.bg }} />;
    }
  })();

  return (
    <AbsoluteFill>
      {visual}
      {showCaptions && (
        <Sequence from={-lead} layout="none">
          <Captions
            words={sc.words} pal={props.style} bottom={bottom}
            variant={prof.captions.style} size={prof.captions.size} font={prof.font} inset={prof.safe.captionInset}
          />
        </Sequence>
      )}
      {!bare && !lead && sc.audio && <Audio src={staticFile(sc.audio)} />}  {/* no audio file in the animatic (animatic.py) */}
    </AbsoluteFill>
  );
};

// Thin top bar: progress fill + one dot per scene
const Progress: React.FC<{ props: EpisodeProps }> = ({ props }) => {
  const f = useCurrentFrame();
  const safe = resolve(props.profile).safe;
  const total = props.totalFrames;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: safe.progressTop, left: safe.left + 20, right: safe.right + 20, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.35)" }}>
        <div style={{ width: `${Math.min(100, (f / total) * 100)}%`, height: "100%", borderRadius: 4, background: props.style.sunny }} />
        {props.scenes.map((sc) => (
          <div key={sc.id} style={{ position: "absolute", left: `${(sc.from / total) * 100}%`, top: -4, width: 16, height: 16, borderRadius: 8, background: f >= sc.from ? props.style.sunny : "rgba(255,255,255,0.8)", border: `3px solid ${props.style.ink}`, transform: "translateX(-8px)" }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Episode: React.FC<EpisodeProps> = (raw) => {
  const props = raw.identity ? { ...raw, style: raw.identity.palette } : raw; // identity palette replaces the profile/episode palette
  const { durationInFrames, fps } = useVideoConfig();
  const prof = resolve(props.profile);
  const tr = props.transition;
  const out: React.ReactNode[] = [];
  const used: Record<string, number> = {};
  // Cold-open bridge at the seam after the last cold-open scene (run.py bridge_plan already put its frames into scene.from / totalFrames).
  const co = props.coldOpen && (RENDERED_BRIDGES as readonly string[]).includes(props.coldOpen.bridge)
    && props.coldOpen.seam >= 0 && props.coldOpen.seam < props.scenes.length - 1 ? props.coldOpen : null;
  const seg = co && co.bridge !== "j-cut" && co.frames > 0 ? co : null;   // freeze-rewind / question-card: own segment, hard cuts both sides
  const leadOf = (i: number) => (co && i === co.seam + 1 ? Math.max(0, co.lead) : 0);
  const segFrom = seg ? props.scenes[seg.seam].from + props.scenes[seg.seam].frames : 0;
  props.scenes.forEach((sc, i) => {
    out.push(
      <TransitionSeries.Sequence key={sc.id} name={sc.id} durationInFrames={sc.frames}>
        <SceneView sc={sc} props={props} index={i} prof={prof} lead={leadOf(i)} />
      </TransitionSeries.Sequence>,
    );
    if (seg && i === seg.seam) {
      out.push(
        <TransitionSeries.Sequence key="bridge" durationInFrames={seg.frames}>
          {seg.bridge === "freeze-rewind"
            ? <FreezeRewind frames={seg.frames} hold={seg.hold ?? Math.round(seg.frames * 0.4)} sourceFrames={sc.frames}><SceneView sc={sc} props={props} index={i} prof={prof} bare /></FreezeRewind>
            : <QuestionCard text={seg.question ?? ""} pal={props.style} font={prof.font} safe={prof.safe} />}
        </TransitionSeries.Sequence>,
      );
      return; // the bridge segment is the transition: no presentation on either side
    }
    if (i < props.scenes.length - 1) {
      const next = props.scenes[i + 1];
      const names = pick(prof.transitions, next.beat, ["fade"]);
      used[next.beat] = (used[next.beat] ?? -1) + 1;
      const name = names[(i + used[next.beat]) % names.length];
      out.push(
        <TransitionSeries.Transition key={"t" + i} presentation={props.identity ? identityPresentation(props.identity.motion.transition) : presentationByName(name)} timing={springTiming({ config: { damping: 200 }, durationInFrames: tr })}  /* eased, no bounce; research 09/10: never linear */ />,
      );
    }
  });
  const m = props.music;
  const voice = props.scenes.map((sc, i) => {
    const last = sc.words.length ? sc.words[sc.words.length - 1].e : sc.frames / fps;
    const a0 = sc.from - leadOf(i); // narration start (earlier than the picture for a j-cut / freeze-rewind lead)
    return [a0 + 3, a0 + Math.round(last * fps) + 4] as [number, number];
  });
  const duck = (f: number) => {
    let d = 0;
    for (const [a, b] of voice) d = Math.max(d, interpolate(f, [a - 8, a, b, b + 14], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    return 1 - d * (1 - prof.musicDuck);
  };
  // question-card: music drops to silence under the card (0.5-1 s quiet), then returns for the explainer
  const drop = (f: number) => seg && seg.bridge === "question-card"
    ? interpolate(f, [segFrom, segFrom + BRIDGE.musicDropIn, segFrom + seg.frames - BRIDGE.musicDropOut, segFrom + seg.frames], [1, 0, 0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })
    : 1;
  const leadScene = co && leadOf(co.seam + 1) > 0 ? props.scenes[co.seam + 1] : null;
  return (
    <IdentityProvider identity={props.identity}>
    <AbsoluteFill style={{ background: props.style.bg }}>
      <TransitionSeries>{out}</TransitionSeries>
      {prof.progress && <Progress props={props} />}
      {props.scenes.slice(1).map((sc, j) => {
        if (seg && j === seg.seam) return null; // a bridge segment replaces the boundary SFX at the seam (silence / rewind sound)
        const sfx = sfxByName(pick(prof.sfx.boundary, sc.beat, "whoosh"));
        return sfx ? <Sequence key={"w" + sc.id} from={Math.max(0, sc.from - 2)} durationInFrames={40} layout="none"><Audio src={sfx} volume={0.22} /></Sequence> : null;
      })}
      {leadScene && (
        <Sequence key="lead-audio" from={Math.max(0, leadScene.from - leadOf(co!.seam + 1))} layout="none"><Audio src={staticFile(leadScene.audio)} /></Sequence>
      )}
      {seg && seg.bridge === "freeze-rewind" && seg.sfx && (
        <Sequence key="rewind-sfx" from={segFrom + (seg.hold ?? Math.round(seg.frames * 0.4))} durationInFrames={seg.frames} layout="none"><Audio src={staticFile(seg.sfx)} volume={BRIDGE.rewindSfxVolume} /></Sequence>
      )}
      {m && (
        <Audio src={staticFile(m.src)} loop
          volume={(f) => m.volume * duck(f) * drop(f) * interpolate(f, [0, 20, durationInFrames - 50, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      )}
    </AbsoluteFill>
    </IdentityProvider>
  );
};
