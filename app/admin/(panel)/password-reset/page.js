import { issueStudentReset } from '../../../admin-actions';
import { withAdmin } from '../../../admin-auth';
import AdminForm from '../../admin-form';
import PasswordField from '../../../password-field';

export default async function AdminPasswordReset() {
  await withAdmin(() => {});
  return (
    <section className="admin-surface">
      <h1>Reset a student password</h1>
      <p>This signs the student out of all devices. Share the one-time password privately with the student. It expires in 15 minutes.</p>
      <AdminForm action={issueStudentReset} submit="Issue one-time password" label="One-time password">
        <label>Student username
          <input name="username" required maxLength={64} autoCapitalize="none" spellCheck={false} />
        </label>
        <PasswordField label="One-time password" name="temporary" required minLength={12} maxLength={128} autoComplete="new-password" />
      </AdminForm>
    </section>
  );
}
