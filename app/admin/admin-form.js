'use client';

import { useRef, useState } from 'react';
import StudentForm from '../student-forms';

const expiryFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
});

function Credential({ value, expiresAt, label, username }) {
  const [copied, setCopied] = useState(false);
  const [copying, setCopying] = useState(false);
  const copyingLock = useRef(false);

  async function copy() {
    if (copyingLock.current) return;
    copyingLock.current = true;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    } finally {
      copyingLock.current = false;
      setCopying(false);
    }
  }

  return (
    <div className="admin-credential">
      {username && <p>Username <strong>{username}</strong></p>}
      <p role="status">{label} <code>{value}</code></p>
      {username && <p>Share these privately. The student must set a new password before starting practice.</p>}
      <p>Expires <time dateTime={expiresAt}>{expiryFormat.format(new Date(expiresAt))}</time></p>
      <button className="secondary-button" type="button" onClick={copy} disabled={copying} aria-busy={copying}>{copying ? 'Copying…' : copied ? 'Copied' : 'Copy'}</button>
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
