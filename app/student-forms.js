'use client';

import { useActionState } from 'react';
import PracticeSubmitButton from './practice/submit-button';

export default function StudentForm({ action, children, submit, renderResult }) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form className="student-form" action={formAction}>
      {children}
      {state?.error && <p className="form-error" role="alert">{state.error}</p>}
      <PracticeSubmitButton>{submit}</PracticeSubmitButton>
      {!pending && renderResult?.(state)}
    </form>
  );
}
