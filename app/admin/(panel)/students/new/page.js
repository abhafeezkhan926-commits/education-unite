import Link from '../../../navigation-link';
import { withAdmin } from '../../../../admin-auth';
import AdminForm from '../../../admin-form';
import { addStudent } from '../../../student-management-actions';
import GenderField from '../../../../gender-field';
import PasswordField from '../../../../password-field';

export default async function NewStudent() {
  await withAdmin(() => {});
  return <section className="admin-surface">
    <Link href="/admin/students">Back to students</Link>
    <h1>Add student</h1>
    <p>Choose a username and a one-time password, valid for 15 minutes. The student must set their own password before starting practice.</p>
    <AdminForm action={addStudent} submit="Create student" label="One-time password">
      <label>Student username<input name="username" required pattern="[a-z0-9]{1,64}" maxLength={64} autoComplete="off" autoCapitalize="none" spellCheck={false} /></label>
      <small>Use lowercase letters and numbers.</small>
      <PasswordField label="One-time password" name="temporary" required minLength={12} maxLength={128} autoComplete="new-password" />
      <GenderField />
    </AdminForm>
  </section>;
}
