'use client';

import { useState } from 'react';

const icons = {
  gaming: '🎮', sport: '⚽', music: '♫', fashion: '👕',
  technology: '💻', shopping: '🛍', 'pop-culture': '★', beauty: '✦',
};

export default function InterestOptions({ interests }) {
  const [count, setCount] = useState(0);

  return (
    <fieldset className="interest-options" onChange={(event) => {
      setCount(event.currentTarget.querySelectorAll('input:checked').length);
    }}>
      <legend>Choose 1 to 3 interests</legend>
      <p className="interest-count" role="status">{count} of 3 chosen</p>
      {interests.map(({ id, label }) => (
        <label key={id}>
          <span aria-hidden="true">{icons[id] ?? '◆'}</span>
          <span>{label}</span>
          <input type="checkbox" name="interest" value={id} />
        </label>
      ))}
    </fieldset>
  );
}
