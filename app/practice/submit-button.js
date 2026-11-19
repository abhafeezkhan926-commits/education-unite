'use client';

import { useFormStatus } from 'react-dom';
import { useEffect, useRef, useState } from 'react';

export default function PracticeSubmitButton({ children, pendingLabel = 'Please wait…', disabled = false, ...props }) {
  const { pending } = useFormStatus();
  const button = useRef(null);
  const locked = useRef(false);
  const wasPending = useRef(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const form = button.current?.form;
    if (!form) return;
    function guard(event) {
      if (event.defaultPrevented) return;
      if (locked.current) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      locked.current = true;
      setSubmitted(true);
    }
    // Constraint validation runs before submit, so invalid forms remain usable.
    form.addEventListener('submit', guard);
    return () => form.removeEventListener('submit', guard);
  }, []);

  useEffect(() => {
    if (pending) wasPending.current = true;
    else if (wasPending.current) {
      wasPending.current = false;
      locked.current = false;
      setSubmitted(false);
    }
  }, [pending]);

  const busy = pending || submitted;
  return (
    <button {...props} ref={button} type="submit" disabled={disabled || busy} aria-busy={busy}>
      {busy && <span className="pending-spinner" aria-hidden="true" />}{busy ? pendingLabel : children}
    </button>
  );
}
