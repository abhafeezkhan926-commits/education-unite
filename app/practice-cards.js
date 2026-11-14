'use client';

import { useEffect, useRef, useState } from 'react';

const cards = [
  { title: 'Join with a code', description: 'Use the code from your teacher or parent.', label: 'Join code', values: ['Enter your code'], accent: '#8beef7' },
  { title: 'Pick your interests', description: 'Choose up to three interests to personalise your questions.', label: 'Example interests', values: ['Sport', 'Music', 'Gaming'], accent: '#82b8ff' },
  { title: 'Try a maths question', description: 'A game costs £40. It’s 25% off. What’s the sale price?', label: 'Your answer', values: ['£ …'], accent: '#b6a0ff' },
  { title: 'Hints & worked solution', description: 'Find 25% of £40, then subtract the discount.', label: 'Worked example', values: ['£40 ÷ 4 = £10', '£40 − £10 = £30'], accent: '#e8a0ff' },
  { title: 'Session summary', description: 'See how you did at the end of your practice.', label: 'Example results', values: ['Score 4/5', 'Hints used 2', 'Time 6 min'], accent: '#ff8cdb' },
];

const scrollOrder = [2, 1, 0, 3, 4];
const rotationDelay = 1000;

export default function PracticeCards() {
  const direction = useRef(1);
  const [step, setStep] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [held, setHeld] = useState(false);

  useEffect(() => {
    const staticLayout = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = window.matchMedia('(max-width: 700px), (hover: none)');
    let lastScroll = window.scrollY;
    let timer;

    function restartRotation() {
      window.clearInterval(timer);
      if (paused || hovered || held || staticLayout.matches || document.hidden) return;
      timer = window.setInterval(() => {
        const increment = mobile.matches ? 1 : direction.current;
        setStep((current) => (current + increment + scrollOrder.length) % scrollOrder.length);
      }, rotationDelay);
    }

    function updateDirection() {
      const scroll = window.scrollY;
      if (scroll !== lastScroll && !mobile.matches) {
        direction.current = scroll > lastScroll ? -1 : 1;
      }
      lastScroll = scroll;
    }

    restartRotation();
    window.addEventListener('scroll', updateDirection, { passive: true });
    staticLayout.addEventListener('change', restartRotation);
    document.addEventListener('visibilitychange', restartRotation);
    return () => {
      window.removeEventListener('scroll', updateDirection);
      staticLayout.removeEventListener('change', restartRotation);
      document.removeEventListener('visibilitychange', restartRotation);
      window.clearInterval(timer);
    };
  }, [paused, hovered, held]);

  const active = scrollOrder[step];
  const layout = [...scrollOrder];
  const activeSlot = layout.indexOf(active);
  [layout[0], layout[activeSlot]] = [layout[activeSlot], layout[0]];

  return (
    <section className="practice-showcase" id="how-it-works" aria-label="Practice previews">
      <div className="practice-stage">
        <ol
          className="practice-deck"
          onPointerUp={() => setHeld(false)}
          onPointerCancel={() => setHeld(false)}
          onLostPointerCapture={() => setHeld(false)}
        >
          {cards.map(({ title, description, label, values, accent }, index) => (
            <li
              key={title}
              className="practice-preview-card"
              data-slot={layout.indexOf(index)}
              style={{ '--card-accent': accent }}
              onPointerEnter={(event) => {
                if (event.pointerType === 'mouse') setHovered(true);
              }}
              onPointerLeave={(event) => {
                if (event.pointerType === 'mouse') setHovered(false);
              }}
              onPointerDown={(event) => {
                if (event.pointerType === 'mouse' || !event.isPrimary) return;
                event.currentTarget.setPointerCapture(event.pointerId);
                setHeld(true);
              }}
            >
              <div className="practice-preview-bar" aria-hidden="true"><i /><i /><i /></div>
              <div className="practice-preview-content">
                <h3>{title}</h3>
                <p>{description}</p>
                <div className="practice-preview-example">
                  <span>{label}</span>
                  <ul>{values.map((value) => <li key={value}>{value}</li>)}</ul>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <button className="practice-rotation-button" type="button" onClick={() => setPaused((current) => !current)}>
          {paused ? 'Play cards' : 'Pause cards'}
        </button>
      </div>
    </section>
  );
}
