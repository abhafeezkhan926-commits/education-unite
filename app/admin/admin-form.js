'use client';

import { useState } from 'react';
import StudentForm from '../student-forms';

const expiryFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

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
    <div className="admin-credential">
      <p role="status">{label} <code>{value}</code></p>
      <p>Expires <time dateTime={expiresAt}>{expiryFormat.format(new Date(expiresAt))}</time></p>
      <button className="secondary-button" type="button" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
      <span className="visually-hidden" role="status">{copied ? 'Copied to clipboard' : ''}</span>
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
