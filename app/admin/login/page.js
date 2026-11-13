import Link from 'next/link';
import { adminSignIn } from '../../admin-actions';
import StudentForm from '../../student-forms';

export default function AdminLogin() {
  return (
    <main className="student-card">
      <Link href="/">EducationUnite</Link>
      <h1>Owner sign in</h1>
      <StudentForm action={adminSignIn} submit="Sign in">
        <label>Email
          <input name="email" type="email" required maxLength={254} autoComplete="username" />
        </label>
        <label>Password
          <input name="password" type="password" required maxLength={128} autoComplete="current-password" />
        </label>
        <label>Authenticator code
          <input name="code" required pattern="[0-9]{6}" maxLength={6} inputMode="numeric" autoComplete="one-time-code" />
        </label>
      </StudentForm>
    </main>
  );
}
