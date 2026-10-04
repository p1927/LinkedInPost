import React from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import type { EpisodeProps, SceneData } from "./types";
import { ClipScene, IllustrationScene } from "./Scenes";
import { DiagramScene, StepsScene, NumberScene, CompareScene, PhotoScene } from "./NewScenes";
import { OrbitScene } from "./OrbitScene";
import { Captions } from "./Captions";
import { pick, presentationByName, resolve, sfxByName } from "./profile";

type R = ReturnType<typeof resolve>;

/** Returns the CSS bottom offset for captions, accounting for scene type. */
function captionsBottom(v: SceneData["visual"], profBottom: number | undefined): number {
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

const SceneView: React.FC<{ sc: SceneData; props: EpisodeProps; index: number; prof: R }> = ({ sc, props, index, prof }) => {
  const v = sc.visual;
  const punch = pick(prof.punch, sc.beat, 0);
  const grade = prof.grade;
  const showCaptions = (v as any).captions !== false;
  const bottom = captionsBottom(v, prof.captions.bottom);

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
            font={prof.font} termSfx={sfxByName(prof.sfx.term)} grade={grade}
          />
        );

      case "diagram":
        return <DiagramScene visual={v} pal={props.style} dur={sc.frames} font={prof.font} />;

      case "steps":
        return <StepsScene visual={v} pal={props.style} dur={sc.frames} font={prof.font} />;

      case "number":
        return <NumberScene visual={v} pal={props.style} dur={sc.frames} font={prof.font} />;

      case "compare":
        return <CompareScene visual={v} pal={props.style} dur={sc.frames} font={prof.font} />;

      case "photo":
        return (
          <PhotoScene
            visual={v} pal={props.style} dur={sc.frames} index={index}
            font={prof.font} grade={grade}
          />
        );

      case "orbit":
        return <OrbitScene visual={v} pal={props.style} dur={sc.frames} font={prof.font} />;

      default:
        // Unknown type — render a plain colour fill so the video still renders
        return <AbsoluteFill style={{ background: props.style.bg }} />;
    }
  })();

  return (
    <AbsoluteFill>
      {visual}
      {showCaptions && (
        <Captions
          words={sc.words} pal={props.style} bottom={bottom}
          variant={prof.captions.style} size={prof.captions.size} font={prof.font}
        />
      )}
      <Audio src={staticFile(sc.audio)} />
    </AbsoluteFill>
  );
};

// Thin top bar: progress fill + one dot per scene
const Progress: React.FC<{ props: EpisodeProps }> = ({ props }) => {
  const f = useCurrentFrame();
  const total = props.totalFrames;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{ position: "absolute", top: 70, left: 60, right: 60, height: 8, borderRadius: 4, background: "rgba(255,255,255,0.35)" }}>
        <div style={{ width: `${Math.min(100, (f / total) * 100)}%`, height: "100%", borderRadius: 4, background: props.style.sunny }} />
        {props.scenes.map((sc) => (
          <div key={sc.id} style={{ position: "absolute", left: `${(sc.from / total) * 100}%`, top: -4, width: 16, height: 16, borderRadius: 8, background: f >= sc.from ? props.style.sunny : "rgba(255,255,255,0.8)", border: `3px solid ${props.style.ink}`, transform: "translateX(-8px)" }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

export const Episode: React.FC<EpisodeProps> = (props) => {
  const { durationInFrames, fps } = useVideoConfig();
  const prof = resolve(props.profile);
  const tr = props.transition;
  const out: React.ReactNode[] = [];
  const used: Record<string, number> = {};
  props.scenes.forEach((sc, i) => {
    out.push(
      <TransitionSeries.Sequence key={sc.id} durationInFrames={sc.frames}>
        <SceneView sc={sc} props={props} index={i} prof={prof} />
      </TransitionSeries.Sequence>,
    );
    if (i < props.scenes.length - 1) {
      const next = props.scenes[i + 1];
      const names = pick(prof.transitions, next.beat, ["fade"]);
      used[next.beat] = (used[next.beat] ?? -1) + 1;
      const name = names[(i + used[next.beat]) % names.length];
      out.push(
        <TransitionSeries.Transition key={"t" + i} presentation={presentationByName(name)} timing={linearTiming({ durationInFrames: tr })} />,
      );
    }
  });
  const m = props.music;
  const voice = props.scenes.map((sc) => {
    const last = sc.words.length ? sc.words[sc.words.length - 1].e : sc.frames / fps;
    return [sc.from + 3, sc.from + Math.round(last * fps) + 4] as [number, number];
  });
  const duck = (f: number) => {
    let d = 0;
    for (const [a, b] of voice) d = Math.max(d, interpolate(f, [a - 8, a, b, b + 14], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
    return 1 - d * (1 - prof.musicDuck);
  };
  return (
    <AbsoluteFill style={{ background: props.style.bg }}>
      <TransitionSeries>{out}</TransitionSeries>
      {prof.progress && <Progress props={props} />}
      {props.scenes.slice(1).map((sc) => {
        const sfx = sfxByName(pick(prof.sfx.boundary, sc.beat, "whoosh"));
        return sfx ? <Sequence key={"w" + sc.id} from={Math.max(0, sc.from - 2)} durationInFrames={40} layout="none"><Audio src={sfx} volume={0.22} /></Sequence> : null;
      })}
      {m && (
        <Audio src={staticFile(m.src)} loop
          volume={(f) => m.volume * duck(f) * interpolate(f, [0, 20, durationInFrames - 50, durationInFrames], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })} />
      )}
    </AbsoluteFill>
  );
};
