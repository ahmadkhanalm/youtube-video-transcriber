const VIDEO_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export type YouTubeInputResult = {
  original: string;
  videoId: string;
  canonicalUrl: string;
};

export function parseYouTubeInput(value: string): YouTubeInputResult | null {
  const input = value.trim();

  if (!input) {
    return null;
  }

  if (VIDEO_ID_PATTERN.test(input)) {
    return {
      original: input,
      videoId: input,
      canonicalUrl: `https://www.youtube.com/watch?v=${input}`
    };
  }

  try {
    const url = new URL(input);
    const host = url.hostname.replace(/^www\./, '');
    let videoId = '';

    if (host === 'youtu.be') {
      videoId = url.pathname.split('/').filter(Boolean)[0] ?? '';
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      if (url.pathname === '/watch') {
        videoId = url.searchParams.get('v') ?? '';
      } else if (url.pathname.startsWith('/shorts/') || url.pathname.startsWith('/embed/')) {
        videoId = url.pathname.split('/').filter(Boolean)[1] ?? '';
      }
    }

    if (!VIDEO_ID_PATTERN.test(videoId)) {
      return null;
    }

    return {
      original: input,
      videoId,
      canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`
    };
  } catch {
    return null;
  }
}

export function isProbablyYouTubeInput(value: string): boolean {
  return parseYouTubeInput(value) !== null;
}
