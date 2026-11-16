'use client';

import Link from 'next/link';

export default function ErrorPage({ reset }) {
  return (
    <main className="student-card">
      <h1>Something went wrong</h1>
      <button type="button" onClick={reset}>Try again</button>
      <Link href="/">Back to the start</Link>
    </main>
  );
}
