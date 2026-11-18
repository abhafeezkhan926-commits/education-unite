import PracticeSubmitButton from '../practice/submit-button';
import StudentBackdrop from '../student-backdrop';
import Link from 'next/link';
import Brand from '../brand';
import { signOut } from '../student-actions';
import { withStudent } from '../student-session';

export default async function Student() {
  const student = await withStudent((_db, student) => student);
  return (
    <>
      <StudentBackdrop />
      <main className="student-card">
        <Brand />
        <h1>Welcome, {student.username}</h1>
        <Link className="student-button" href="/interests">Start maths practice</Link>
        <form action={signOut}><PracticeSubmitButton className="secondary-button" pendingLabel="Signing out…">Sign out</PracticeSubmitButton></form>
      </main>
    </>
  );
}
