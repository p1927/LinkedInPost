import React from "react";
import { Composition } from "remotion";
import { Episode } from "./Episode";
import { CarouselSlide } from "./Carousel";
import { SafeProbeEpisode } from "./SafeProbe";
import { ThumbYT, ThumbCover, THUMB_DEFAULT } from "./Thumbnail";
import type { EpisodeProps, ThumbnailProps } from "./types";

const defaults: EpisodeProps = {
  title: "preview", disclosure: null, music: null, scenes: [], totalFrames: 150, transition: 9, fps: 30, width: 1080, height: 1920,
  style: { bg: "#FFF3D6", ink: "#3B2F2F", sunny: "#FFC83D", coral: "#FF6F59", sky: "#4CC3F7", mint: "#2FD3A0", grape: "#8E6CEF", white: "#FFFFFF" },
};

export const Root: React.FC = () => (
  <>
    <Composition
      id="Episode" component={Episode as React.FC<any>} defaultProps={defaults}
      width={1080} height={1920} fps={30} durationInFrames={150}
      calculateMetadata={({ props: raw }) => { const props = raw as unknown as EpisodeProps; return {
        durationInFrames: Math.max(30, props.totalFrames), fps: props.fps, width: props.width, height: props.height,
      }; }}
    />
    {/* Same as Episode plus a DOM text-box probe (tools/check_safe_zones.py); never used for the real render */}
    <Composition
      id="SafeProbe" component={SafeProbeEpisode as React.FC<any>} defaultProps={defaults}
      width={1080} height={1920} fps={30} durationInFrames={150}
      calculateMetadata={({ props: raw }) => { const props = raw as unknown as EpisodeProps; return {
        durationInFrames: Math.max(30, props.totalFrames), fps: props.fps, width: props.width, height: props.height,
      }; }}
    />
    <Composition id="Slide" component={CarouselSlide as React.FC<any>} width={1080} height={1350} fps={30} durationInFrames={1}
      defaultProps={{ slide: { h: "Title", image: "x.png" }, index: 0, total: 1, style: defaults.style }} />

    {/* ── Thumbnail compositions ── */}
    <Composition
      id="ThumbYT"
      component={ThumbYT as React.FC<any>}
      defaultProps={THUMB_DEFAULT as unknown as ThumbnailProps}
      width={1280} height={720} fps={1} durationInFrames={1}
    />
    <Composition
      id="ThumbCover"
      component={ThumbCover as React.FC<any>}
      defaultProps={THUMB_DEFAULT as unknown as ThumbnailProps}
      width={1080} height={1920} fps={1} durationInFrames={1}
    />
  </>
);
