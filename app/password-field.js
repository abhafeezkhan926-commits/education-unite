'use client';

import { useId, useState } from 'react';

export default function PasswordField({ label, ...inputProps }) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="password-field">
      <label htmlFor={id}>{label}</label>
      <span className="password-field-control">
        <input {...inputProps} id={id} type={visible ? 'text' : 'password'} autoCapitalize="none" spellCheck={false} />
        <button
          type="button"
          aria-controls={id}
          aria-label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          onClick={() => setVisible(!visible)}
        >
          <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" />
            <circle cx="12" cy="12" r="2.5" />
            {visible && <path d="M3 3l18 18" />}
          </svg>
        </button>
      </span>
    </div>
  );
}
