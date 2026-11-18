import PracticeSubmitButton from '../practice/submit-button';
import Link from 'next/link';
import Brand from '../brand';
import { cookies } from 'next/headers';
import { checkJoinCode, createStudent, restartJoin } from '../student-actions';
import StudentForm from '../student-forms';
import PasswordField from '../password-field';
import { joinName, readJoinTicket, usernameOptions } from '../student-security';

export default async function Join() {
  const ticket = readJoinTicket((await cookies()).get(joinName)?.value);
  return (
    <main className="student-card">
      <Brand />
      <h1>{ticket ? 'Create your account' : 'Join with a class code'}</h1>
      {ticket ? (
        <>
          <StudentForm action={createStudent} submit="Create account">
            <label>Choose a username
              <select name="username" required defaultValue="">
                <option value="" disabled>Select a username</option>
                {usernameOptions(ticket.nonce).map((name) => <option key={name}>{name}</option>)}
              </select>
            </label>
            <PasswordField label="Create a password" name="password" autoComplete="new-password" required minLength={12} maxLength={128} aria-describedby="password-help" />
            <small id="password-help">Use at least 12 characters.</small>
          </StudentForm>
          <form action={restartJoin}><PracticeSubmitButton className="secondary-button">Use a different code</PracticeSubmitButton></form>
        </>
      ) : (
        <StudentForm action={checkJoinCode} submit="Continue">
          <label>Class code
            <input name="code" autoComplete="off" spellCheck={false} required maxLength={64} />
          </label>
        </StudentForm>
      )}
      <p>Already have an account? <Link href="/login">Sign in</Link></p>
    </main>
  );
}
