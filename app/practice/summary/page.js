import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentPractice } from '../../practice-state';

export default async function Summary() {
  const practice = await currentPractice();
  if (!practice) redirect('/interests');
  const { summary } = practice.state;
  if (!summary) redirect('/practice');
  const minutes = Math.floor(summary.duration / 60);
  const seconds = summary.duration % 60;

  return (
    <main className="student-card">
      <h1>Practice summary</h1>
      <dl className="practice-summary">
        <div><dt>Score</dt><dd>{summary.score} / {summary.total}</dd></div>
        <div><dt>Hints used</dt><dd>{summary.hints}</dd></div>
        <div><dt>Practice time</dt><dd>{minutes}m {seconds}s</dd></div>
      </dl>
      <div className="practice-links">
        <Link className="student-button" href="/interests">Practise again</Link>
        <Link href="/student">Student home</Link>
      </div>
    </main>
  );
}
