'use client';

import { useEffect, useState } from 'react';

const celebrationsPlayed = new Set();
const colors = ['#168478', '#509a80', '#b47a32', '#d2a351'];
const bursts = [
  { x: '15%', y: '30%', delay: 0 },
  { x: '85%', y: '32%', delay: 180 },
  { x: '24%', y: '78%', delay: 340 },
  { x: '76%', y: '76%', delay: 480 },
];

function Fireworks({ practiceId }) {
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const key = 'educationunite:celebrated:' + practiceId;

    const start = setTimeout(() => {
      if (celebrationsPlayed.has(practiceId)) return;
      try {
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');
      } catch {
        // The in-memory marker still prevents a repeat within this page.
      }
      celebrationsPlayed.add(practiceId);
      setPlaying(true);
    }, 0);
    const stop = setTimeout(() => setPlaying(false), 1500);
    return () => {
      clearTimeout(start);
      clearTimeout(stop);
    };
  }, [practiceId]);

  if (!playing) return null;
  return (
    <div className="student-fireworks">
      <button type="button" className="secondary-button celebration-skip" onClick={() => setPlaying(false)}>
        Skip celebration
      </button>
      {bursts.map(({ x, y, delay }) => (
        <span aria-hidden="true" className="student-firework" key={x} style={{ left: x, top: y, '--burst-delay': delay + 'ms' }}>
          {Array.from({ length: 12 }, (_, index) => (
            <i key={index} style={{
              '--angle': index * 30 + 'deg',
              '--distance': 36 + index % 3 * 16 + 'px',
              '--spark': colors[index % colors.length],
            }} />
          ))}
        </span>
      ))}
    </div>
  );
}

export default function StudentBackdrop({ celebrationId }) {
  const [numbers, setNumbers] = useState([]);

  useEffect(() => {
    setNumbers(Array.from({ length: 24 }, (_, index) => ({
      value: Math.floor(Math.random() * 100),
      x: ((index + Math.random()) / 24 * 100).toFixed(2) + '%',
      duration: 16 + Math.random() * 14,
      phase: Math.random() * 30,
    })));
  }, []);

  return (
    <div className="student-backdrop">
      <div className="student-numbers" aria-hidden="true">
        {numbers.map(({ value, x, duration, phase }, index) => (
          <span key={index} style={{ left: x, animationDuration: duration + 's', animationDelay: -phase + 's' }}>{value}</span>
        ))}
      </div>
      {celebrationId && <Fireworks key={celebrationId} practiceId={celebrationId} />}
    </div>
  );
}
