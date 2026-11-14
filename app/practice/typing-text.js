'use client';

import { useEffect, useState } from 'react';

import { typingDuration } from './typing-duration';

export default function TypingText({ text, delay = 0, animate }) {
  const [length, setLength] = useState(0);
  const characters = Array.from(text);
  const size = characters.length;
  const duration = typingDuration(text);

  useEffect(() => {
    if (!animate) return;
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame;
    let start;

    function reveal(now) {
      start ??= now;
      const progress = Math.max(0, Math.min(1, (now - start - delay) / duration));
      setLength(Math.floor(progress * size));
      if (progress < 1) frame = requestAnimationFrame(reveal);
    }

    function syncMotion() {
      cancelAnimationFrame(frame);
      if (motion.matches) {
        setLength(null);
      } else if (start === undefined) {
        frame = requestAnimationFrame(reveal);
      }
    }

    syncMotion();
    motion.addEventListener('change', syncMotion);
    return () => {
      cancelAnimationFrame(frame);
      motion.removeEventListener('change', syncMotion);
    };
  }, [animate, delay, duration, size]);

  if (!animate) return text;

  return (
    <span className="practice-typing">
      <span className="practice-typing-full">{text}</span>
      <span className="practice-typing-preview" aria-hidden="true">
        {characters.slice(0, length ?? size).join('')}
        <span className="practice-typing-unrevealed">{characters.slice(length ?? size).join('')}</span>
      </span>
    </span>
  );
}
