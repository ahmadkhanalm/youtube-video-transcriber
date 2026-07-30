import { describe, expect, it } from 'vitest';
import { formatTime, normalizeActorItem } from './transcript';

describe('normalizeActorItem', () => {
  it('uses fullText when present', () => {
    const result = normalizeActorItem({
      videoId: 'abc',
      videoUrl: 'https://youtube.com/watch?v=abc',
      fullText: 'Hello world',
      segments: [{ text: 'Ignored', start: 0, duration: 1 }]
    });

    expect(result.fullText).toBe('Hello world');
    expect(result.segmentCount).toBe(1);
  });

  it('builds fullText from segments when absent', () => {
    const result = normalizeActorItem({
      segments: [
        { text: 'Hello', start: 0, duration: 1 },
        { text: 'there', start: 1, duration: 1 }
      ]
    });

    expect(result.fullText).toBe('Hello there');
  });
});

describe('formatTime', () => {
  it('formats seconds as minute timestamp', () => {
    expect(formatTime(65)).toBe('1:05');
  });
});
