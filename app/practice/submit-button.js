'use client';

import { useFormStatus } from 'react-dom';

export default function PracticeSubmitButton({ children, pendingLabel, ...props }) {
  const { pending } = useFormStatus();
  return (
    <button {...props} type="submit" disabled={pending} aria-busy={pending}>
      {pending ? pendingLabel : children}
    </button>
  );
}
