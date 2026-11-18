'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const features = [
  { id: 'join', title: 'Join with a class code', description: 'Enter the code from your teacher or parent, then choose a username and create your password.', icon: 'M15.5 13a4.5 4.5 0 1 0-4-6.5L3 15v4h4v-3h3l2.5-2.5a4.5 4.5 0 0 0 3 .5Z M17 8h.01' },
  { id: 'hints', title: 'Get a nudge when you need it', description: 'Try up to three hints per question, then read the worked solution to see how each step fits together.', icon: 'M3 14v-2a9 9 0 0 1 18 0v2 M3 14a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M16 14a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2z' },
  { id: 'interests', title: 'Pick your interests', description: 'Choose one to three interests, like shopping, pop culture or music, to personalise your questions.', icon: 'M12 21s-8-4.9-8-10a4.5 4.5 0 0 1 8-2.8 4.5 4.5 0 0 1 8 2.8c0 5.1-8 10-8 10Z' },
  { id: 'practice', title: 'Practise GCSE maths', description: 'Work through six questions that connect GCSE maths to the things you enjoy.', icon: 'M5 5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2Z M8 7h8 M8 12h2m4 0h2m-8 5h2m4 0h2' },
  { id: 'summary', title: 'See how you did', description: 'Review your score, hints used and practice time at the end of the session.', icon: 'M4 4v15a1 1 0 0 0 1 1h15 M8 15v-3m5 3V9m5 6V6' },
];

export default function PracticeCards() {
  const [selection, setSelection] = useState({ index: 0, visited: 1, firstVisit: true });
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(null);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReducedMotion(preference.matches);
    sync();
    preference.addEventListener('change', sync);
    return () => preference.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (paused || reducedMotion !== false) return;
    const timer = window.setInterval(() => {
      if (!document.hidden) advance(1);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion, selection.index]);

  function advance(direction) {
    setSelection((current) => {
      const index = (current.index + direction + features.length) % features.length;
      const bit = 1 << index;
      return { index, visited: current.visited | bit, firstVisit: !(current.visited & bit) };
    });
  }

  function browse(direction) {
    setPaused(true);
    advance(direction);
  }

  return (
    <section className="feature-showcase" aria-label="How EducationUnite works">
      <div className="feature-stage" aria-live={paused || reducedMotion ? 'polite' : 'off'}>
        {features.map(({ id, title, description, icon }, index) => {
          const active = index === selection.index;
          return (
            <article className="feature-card" key={id} data-feature={id} data-active={active}
              data-reveal={active && selection.firstVisit} aria-hidden={!active}>
              <div className="feature-heading">
                <div className="feature-icon" aria-hidden="true">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={icon} />
                  </svg>
                </div>
                <h1>{title}</h1>
              </div>
              <p className="feature-description">{description}</p>
              <div className="feature-art">
                <Image src={`/feature-${id}.webp`} alt="" width={480} height={480} loading="eager" unoptimized />
              </div>
            </article>
          );
        })}
      </div>
      <div className="feature-toolbar">
        <Link className="student-button" href="/join">Join with a code</Link>
        <div className="feature-controls" aria-label="Feature cards">
          <button type="button" className="secondary-button feature-arrow" aria-label="Previous feature" onClick={() => browse(-1)}>‹</button>
          <span className="feature-position">{selection.index + 1} / {features.length}</span>
          <button type="button" className="secondary-button feature-arrow" aria-label="Next feature" onClick={() => browse(1)}>›</button>
          <button type="button" className="secondary-button feature-play" onClick={() => setPaused(!paused)}>{paused ? 'Play' : 'Pause'}</button>
        </div>
      </div>
    </section>
  );
}
