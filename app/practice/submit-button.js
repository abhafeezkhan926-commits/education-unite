'use client';

import { useFormStatus } from 'react-dom';

export default function PracticeSubmitButton({ children, pendingLabel = 'Please wait…', ...props }) {
  const { pending } = useFormStatus();
  return (
    <button {...props} type="submit" disabled={pending} aria-busy={pending}>
      {pending && <span className="pending-spinner" aria-hidden="true" />}{pending ? pendingLabel : children}
    </button>
  );
}
