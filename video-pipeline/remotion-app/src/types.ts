export type Word = { w: string; s: number; e: number };
export type Palette = { bg: string; ink: string; sunny: string; coral: string; sky: string; mint: string; grape: string; white: string };
export type Term = { label: string; sub?: string; color?: keyof Palette };

// ── Diagram visual types ───────────────────────────────────────────────────
export type DiagramNode = { id: string; label: string; icon?: string; x?: number; y?: number };
export type DiagramEdge = { from: string; to: string; label?: string; flow?: boolean };
export type DiagramRevealStep = { at: number; show?: string[]; highlight?: string[]; caption?: string };

// ── Orbit visual types ─────────────────────────────────────────────────────
// Angles are degrees, counter-clockwise, 0 = right, 90 = top (bodies travel CCW = increasing angle).
// Ring r: <= 2 means a fraction of 480 px (0.625 = 300 px); > 2 means pixels.
export type OrbitRing = { id: string; r: number; dashed?: boolean; main?: boolean };
export type OrbitKeyframe = { at: number; angle: number }; // at: 0..1 of scene; angle: unwrapped degrees
export type OrbitBody = {
  id: string; ring: string; label: string;
  color: string;        // palette key ("coral", "mint", "sky", ...) or any CSS colour
  startAngle?: number;  // physical mode start angle
  period?: number;      // physical mode: period in units of lapSec (overrides Kepler)
  speedMult?: number;   // physical mode: angular speed multiplier (overrides period)
  keyframes?: OrbitKeyframe[]; // explicit pacing (smooth monotone interpolation); overrides physical mode
  trail?: boolean;
  labelSide?: "auto" | "out" | "in";
};
export type OrbitGapWedge = { body1: string; body2: string };
export type OrbitRevealStep = {
  at: number;
  show?: string[]; highlight?: string[];
  burn?: { body: string; dir?: "prograde" | "retrograde" };
  move?: { body: string; toRing: string; over: number };
  hideGap?: boolean;
  caption?: string;
  readout?: { label?: string; value: string };
};
export type OrbitShot = { speed: number; label: string; at?: number; color?: string };
export type VisualOrbit = {
  type: "orbit";
  mode?: "orbit" | "cannon" | "groundtrack";
  rings?: OrbitRing[];
  bodies?: OrbitBody[];
  gap?: OrbitGapWedge;
  reveal?: OrbitRevealStep[];
  lapSec?: number;            // physical mode: lap period (s) on the first ring
  arrows?: number[] | false;  // angles of direction-of-travel chevrons on the main ring
  note?: string | false;      // small "not to scale" tag
  shots?: OrbitShot[];        // cannon mode
  site?: { lon: number; lat: number; label?: string }; // groundtrack mode
  inclination?: number;       // groundtrack mode (deg), default 51.6
  laps?: number;              // groundtrack mode, default 3
  lapShift?: number;          // groundtrack mode: westward shift per lap (deg), default 23.2
  captions?: boolean;
};

// ── Scene visual discriminated union ──────────────────────────────────────
export type SceneVisual =
  // Existing types — unchanged so old episodes keep rendering
  | { type: "clip";         src?: string; still?: string; rate?: number; term?: Term; captions?: boolean }
  | { type: "illustration"; src?: string; still?: string; rate?: number; term?: Term; captions?: boolean }
  // New mechanism types
  | { type: "diagram";  nodes: DiagramNode[]; edges?: DiagramEdge[]; reveal?: DiagramRevealStep[]; layout?: "row" | "column" | "cycle"; captions?: boolean }
  | { type: "steps";    title: string; steps: string[]; captions?: boolean }
  | { type: "number";   value: number | string; unit?: string; label: string; source?: string; animation?: "countup" | "bar"; captions?: boolean }
  | { type: "compare";  colA: string; colB: string; rows: Array<{ a: string; b: string }>; winner?: "A" | "B"; captions?: boolean }
  | { type: "photo";    still: string; label?: string; lowerThird?: string; zoom?: [number, number]; term?: Term; captions?: boolean }
  | VisualOrbit;

export type SceneData = { id: string; beat: string; from: number; frames: number; audio: string; words: Word[]; visual: SceneVisual };

// ── Thumbnail compositions ─────────────────────────────────────────────────
export type ThumbnailProps = {
  title: string;
  kicker?: string;
  image: string;
  palette: Palette;
  accent: string;
  badge?: string;
  focusY?: number; // 0..1 vertical focus of the hero image crop
  zoom?: number;
};

// ── Style profile ──────────────────────────────────────────────────────────
export type BeatMap<T> = { default: T } & Record<string, T>;
export type Profile = {
  name?: string;
  font?: "fredoka" | "poppins" | "inter" | "jetbrains";
  transitions?: BeatMap<string[]>;
  zoom?: BeatMap<[number, number]>;
  punch?: Record<string, number>;
  sparkles?: BeatMap<number>;
  captions?: { style: "sticker" | "clean"; size?: number; bottom?: number };
  termStyle?: "sticker" | "card";
  grade?: { saturate?: number; contrast?: number; vignette?: number };
  progress?: boolean;
  sfx?: { boundary?: Record<string, string | null>; term?: string | null };
  musicDuck?: number;
};

export type EpisodeProps = {
  title: string; style: Palette; disclosure?: string | null; music?: { src: string; volume: number } | null;
  scenes: SceneData[]; totalFrames: number; transition: number; fps: number; width: number; height: number;
  profile?: Profile;
};
