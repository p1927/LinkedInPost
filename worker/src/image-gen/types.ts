export type ImageAspectRatio = '1:1' | '4:3' | '16:9' | '9:16';

export interface ImageGenRequest {
  prompt: string;
  referenceImages?: string[];   // URLs used as style/content reference (e.g. SerpApi images)
  style?: string;
  aspectRatio?: ImageAspectRatio;
  provider: ImageProvider;
  model?: string;               // override default model for provider
}

export interface ImageGenResult {
  url: string;                  // publicly accessible URL (GCS-uploaded or direct from provider)
  generationPrompt: string;     // the prompt actually sent to the model
  provider: ImageProvider;
  model: string;
  referenceUsed?: string;       // which reference image URL was used (if any)
}

export type ImageProvider = 'flux-kontext' | 'ideogram' | 'dall-e' | 'stability';

export type VideoProvider = 'kling' | 'seedance' | 'runway' | 'veo';

export interface VideoGenRequest {
  prompt: string;
  referenceImage?: string;      // optional still frame to animate from
  duration?: number;            // seconds
  provider: VideoProvider;
  model?: string;
}

export interface VideoGenResult {
  url: string;
  generationPrompt: string;
  provider: VideoProvider;
  model: string;
}

export interface ImageGenProvider {
  generate(req: ImageGenRequest, env: Record<string, string | undefined>): Promise<ImageGenResult>;
}

export interface VideoGenProvider {
  generate(req: VideoGenRequest, env: Record<string, string | undefined>): Promise<VideoGenResult>;
}
