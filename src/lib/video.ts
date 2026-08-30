import type { VideoProvider } from './supabase/types';

/**
 * Builds a privacy-friendly embed URL for a lesson's configured provider.
 *
 * Kept provider-agnostic on purpose: video hosting is not settled yet, so a
 * course can move from unlisted YouTube to Cloudflare Stream or Bunny by
 * changing two columns rather than touching the player.
 */
export function embedUrl(provider: VideoProvider | null, id: string | null): string | null {
  if (!provider || !id) return null;
  switch (provider) {
    case 'youtube':
      // nocookie host avoids setting tracking cookies before playback.
      return `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1`;
    case 'vimeo':
      return `https://player.vimeo.com/video/${id}`;
    case 'bunny':
      return `https://iframe.mediadelivery.net/embed/${id}`;
    case 'cloudflare_stream':
      return `https://customer-${id}.cloudflarestream.com/iframe`;
    default:
      return null;
  }
}

/** Poster image for a lesson, used on episode cards. */
export function thumbnailUrl(provider: VideoProvider | null, id: string | null): string | null {
  if (provider === 'youtube' && id) return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  return null;
}
