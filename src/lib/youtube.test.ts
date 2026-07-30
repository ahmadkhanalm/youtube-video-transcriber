import { describe, expect, it } from 'vitest';
import { parseYouTubeInput } from './youtube';

describe('parseYouTubeInput', () => {
  it('accepts a raw video id', () => {
    expect(parseYouTubeInput('dQw4w9WgXcQ')?.canonicalUrl).toBe(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );
  });

  it('accepts a standard YouTube watch URL', () => {
    expect(parseYouTubeInput('https://www.youtube.com/watch?v=dQw4w9WgXcQ')?.videoId).toBe(
      'dQw4w9WgXcQ'
    );
  });

  it('accepts share and shorts URLs', () => {
    expect(parseYouTubeInput('https://youtu.be/dQw4w9WgXcQ')?.videoId).toBe('dQw4w9WgXcQ');
    expect(parseYouTubeInput('https://youtube.com/shorts/dQw4w9WgXcQ')?.videoId).toBe(
      'dQw4w9WgXcQ'
    );
  });

  it('rejects invalid input', () => {
    expect(parseYouTubeInput('https://example.com/watch?v=dQw4w9WgXcQ')).toBeNull();
  });
});
