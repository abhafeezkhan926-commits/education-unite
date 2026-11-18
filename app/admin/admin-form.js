'use client';

import { useState } from 'react';
import StudentForm from '../student-forms';

function Credential({ value, expiresAt, label }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div>
      <p role="status">{label} <code>{value}</code></p>
      <p>Expires <time dateTime={expiresAt}>{new Date(expiresAt).toLocaleString()}</time></p>
      <button className="secondary-button" type="button" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
    </div>
  );
}

export default function AdminForm({ action, children, submit, label }) {
  return (
    <StudentForm action={action} submit={submit} renderResult={(state) =>
      state?.value && <Credential key={state.value} label={label} {...state} />
    }>
      {children}
    </StudentForm>
  );
}
