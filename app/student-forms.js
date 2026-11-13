'use client';

import { useActionState } from 'react';

export default function StudentForm({ action, children, submit, renderResult }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form className="student-form" action={formAction}>
      {children}
      {state?.error && <p className="form-error" role="alert">{state.error}</p>}
      <button disabled={pending}>{pending ? 'Please wait…' : submit}</button>
      {!pending && renderResult?.(state)}
    </form>
  );
}
