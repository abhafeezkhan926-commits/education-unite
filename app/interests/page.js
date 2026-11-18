import StudentBackdrop from '../student-backdrop';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { startPractice } from '../practice-actions';
import { interests } from '../practice-bank';
import { currentPractice } from '../practice-state';
import StudentForm from '../student-forms';
import InterestOptions from './interest-options';

export default async function Interests() {
  const practice = await currentPractice();
  if (practice && !practice.state.summary) redirect('/practice');
  return (
    <>
      <StudentBackdrop />
      <main className="student-card">
        <Link href="/student">Student home</Link>
        <h1>Pick your interests</h1>
        <p className="practice-note">Choose interests to personalise your practice questions.</p>
        <StudentForm action={startPractice} submit="Start practice">
          <InterestOptions interests={interests} />
        </StudentForm>
      </main>
    </>
  );
}
