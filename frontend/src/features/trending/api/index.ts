export * from './types';
export * from './config';

// Re-export adapters
export { BaseAdapter } from './adapters/BaseAdapter';
export { YouTubeAdapter } from './adapters/YouTubeAdapter';
export { InstagramAdapter } from './adapters/InstagramAdapter';
export { LinkedInAdapter } from './adapters/LinkedInAdapter';
export { ApifyAdapter } from './adapters/ApifyAdapter';
export { SociaVaultAdapter } from './adapters/SociaVaultAdapter';
export { PhantomBusterAdapter } from './adapters/PhantomBusterAdapter';

import { BaseAdapter } from './adapters/BaseAdapter';
import { YouTubeAdapter } from './adapters/YouTubeAdapter';
import { InstagramAdapter } from './adapters/InstagramAdapter';
import { LinkedInAdapter } from './adapters/LinkedInAdapter';
import { ApifyAdapter } from './adapters/ApifyAdapter';
import { SociaVaultAdapter } from './adapters/SociaVaultAdapter';
import { PhantomBusterAdapter } from './adapters/PhantomBusterAdapter';
import type {
  TrendingApiConfig,
  PlatformConfig,
  YouTubeAdapterType,
  InstagramAdapterType,
  LinkedInAdapterType,
} from './types';

// Factory function to get the right adapter based on config
export function createYouTubeAdapter(config: PlatformConfig<YouTubeAdapterType>): BaseAdapter {
  switch (config.adapter) {
    case 'youtube-official':
      return new YouTubeAdapter(config.config);
    case 'apify-youtube':
      return new ApifyAdapter({
        ...config.config,
        options: { ...config.config.options, platform: 'youtube' },
      });
    default:
      return new YouTubeAdapter(config.config);
  }
}

export function createInstagramAdapter(config: PlatformConfig<InstagramAdapterType>): BaseAdapter {
  switch (config.adapter) {
    case 'instagram-official':
      return new InstagramAdapter(config.config);
    case 'sociavault':
      return new SociaVaultAdapter({
        ...config.config,
        options: { ...config.config.options, platform: 'instagram' },
      });
    default:
      return new InstagramAdapter(config.config);
  }
}

export function createLinkedInAdapter(config: PlatformConfig<LinkedInAdapterType>): BaseAdapter {
  switch (config.adapter) {
    case 'linkedin-official':
      return new LinkedInAdapter(config.config);
    case 'apify-linkedin':
      return new ApifyAdapter({
        ...config.config,
        options: { ...config.config.options, platform: 'linkedin' },
      });
    case 'sociavault':
      return new SociaVaultAdapter({
        ...config.config,
        options: { ...config.config.options, platform: 'linkedin' },
      });
    case 'phantombuster':
      return new PhantomBusterAdapter(config.config);
    default:
      return new LinkedInAdapter(config.config);
  }
}

// Create adapter from generic config
export function createAdapter(
  platform: 'youtube' | 'instagram' | 'linkedin' | 'news',
  config: TrendingApiConfig
): BaseAdapter | null {
  switch (platform) {
    case 'youtube':
      return createYouTubeAdapter(config.youtube);
    case 'instagram':
      return createInstagramAdapter(config.instagram);
    case 'linkedin':
      return createLinkedInAdapter(config.linkedin);
    case 'news':
      // News adapter not implemented yet
      return null;
    default:
      return null;
  }
}
