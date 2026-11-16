import StudentBackdrop from '../student-backdrop';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { startPractice } from '../practice-actions';
import { interests } from '../practice-bank';
import { currentPractice } from '../practice-state';
import StudentForm from '../student-forms';

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
          <fieldset className="interest-options">
            <legend>Choose 1 to 3 interests</legend>
            {interests.map(({ id, label }) => (
              <label key={id}>
                <input type="checkbox" name="interest" value={id} />
                {label}
              </label>
            ))}
          </fieldset>
        </StudentForm>
      </main>
    </>
  );
}
