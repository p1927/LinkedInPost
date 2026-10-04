export type Word = { w: string; s: number; e: number };
export type Palette = { bg: string; ink: string; sunny: string; coral: string; sky: string; mint: string; grape: string; white: string };
export type Term = { label: string; sub?: string; color?: keyof Palette };
export type SceneVisual = { type: "clip" | "illustration"; src?: string; still?: string; rate?: number; term?: Term };
export type SceneData = { id: string; beat: string; from: number; frames: number; audio: string; words: Word[]; visual: SceneVisual };

// A Style Profile bundles the "look and sound" of an episode. Every field is optional; see profile.ts for defaults.
// Per-beat maps are keyed by scene.beat (story_hook, analogy, term, worry, story_payoff, cta, ...) with "default" as fallback.
export type BeatMap<T> = { default: T } & Record<string, T>;
export type Profile = {
  name?: string;
  font?: "fredoka" | "poppins";
  transitions?: BeatMap<string[]>;            // presentation names used when entering a scene of that beat
  zoom?: BeatMap<[number, number]>;           // Ken Burns start/end scale per beat
  punch?: Record<string, number>;             // extra scale spring on scene start, per beat (hook/payoff emphasis)
  sparkles?: BeatMap<number>;                 // how many sparkles (0-4) per beat
  captions?: { style: "sticker" | "clean"; size?: number; bottom?: number };
  termStyle?: "sticker" | "card";
  grade?: { saturate?: number; contrast?: number; vignette?: number };
  progress?: boolean;                         // thin top progress bar with a dot per scene
  sfx?: { boundary?: Record<string, string | null>; term?: string | null };  // boundary: entering-beat -> sfx name
  musicDuck?: number;                         // 0..1 fraction of music volume kept while narration speaks (1 = no ducking)
};

export type EpisodeProps = {
  title: string; style: Palette; disclosure?: string | null; music?: { src: string; volume: number } | null;
  scenes: SceneData[]; totalFrames: number; transition: number; fps: number; width: number; height: number;
  profile?: Profile;
};
