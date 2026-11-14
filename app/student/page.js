import StudentBackdrop from '../student-backdrop';
import Link from 'next/link';
import { signOut } from '../student-actions';
import { withStudent } from '../student-session';

export default async function Student() {
  const student = await withStudent((_db, student) => student);
  return (
    <>
      <StudentBackdrop />
      <main className="student-card">
        <h1>Welcome, {student.username}</h1>
        <Link className="student-button" href="/interests">Start maths practice</Link>
        <form action={signOut}><button>Sign out</button></form>
      </main>
    </>
  );
}
