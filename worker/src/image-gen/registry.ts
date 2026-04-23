import type { ImageProvider, VideoProvider, ImageGenProvider, VideoGenProvider } from './types';
import { fluxKontextProvider } from './providers/flux-kontext';
import { ideogramProvider } from './providers/ideogram';
import { dalleProvider } from './providers/dall-e';
import { stabilityProvider } from './providers/stability';
import { klingProvider } from './providers/kling';
import { seedanceProvider } from './providers/seedance';
import { runwayProvider } from './providers/runway';
import { veoProvider } from './providers/veo';

const IMAGE_PROVIDERS: Record<ImageProvider, ImageGenProvider> = {
  'flux-kontext': fluxKontextProvider,
  'ideogram': ideogramProvider,
  'dall-e': dalleProvider,
  'stability': stabilityProvider,
};

const VIDEO_PROVIDERS: Record<VideoProvider, VideoGenProvider> = {
  'kling': klingProvider,
  'seedance': seedanceProvider,
  'runway': runwayProvider,
  'veo': veoProvider,
};

export function getImageGenProvider(provider: ImageProvider): ImageGenProvider {
  const p = IMAGE_PROVIDERS[provider];
  if (!p) throw new Error(`Unknown image generation provider: ${provider}`);
  return p;
}

export function getVideoGenProvider(provider: VideoProvider): VideoGenProvider {
  const p = VIDEO_PROVIDERS[provider];
  if (!p) throw new Error(`Unknown video generation provider: ${provider}`);
  return p;
}
