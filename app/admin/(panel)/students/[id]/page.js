import Link from 'next/link';
import { notFound } from 'next/navigation';
import { withAdmin } from '../../../../admin-auth';
import { validStudentId } from '../../../../student-profile.mjs';
import GenderField from '../../../../gender-field';
import StudentForm from '../../../../student-forms';
import PasswordField from '../../../../password-field';
import AdminForm from '../../../admin-form';
import { editStudent, deleteStudent } from '../../../student-management-actions';
import { issueStudentReset } from '../../../../admin-actions';

export default async function ManageStudent({ params, searchParams }) {
  const { id } = await params;
  const { action } = await searchParams;
  const student = await withAdmin(async (db) => {
    if (!validStudentId(id)) return null;
    return (await db.query('select id, username, gender from education_unite.students where id = $1', [id])).rows[0];
  });
  if (!student) notFound();
  return <section className="admin-surface">
    <Link href="/admin/students">Back to students</Link>
    <h1>{action === 'delete' ? 'Delete student' : action === 'password' ? 'Reset student password' : 'Edit student'}</h1>
    <p className="managed-username">{student.username}</p>
    {action === 'delete' ? <>
      <p>This permanently deletes this student and their practice data, and signs them out on every device.</p>
      <StudentForm action={deleteStudent} submit="Delete student">
        <input type="hidden" name="id" value={student.id} />
        <label>Type {student.username} to confirm<input name="confirmation" required autoComplete="off" maxLength={64} /></label>
      </StudentForm>
    </> : action === 'password' ? <>
      <p>Issue a one-time password, valid for 15 minutes. Their old password and active sessions will stop working immediately.</p>
      <AdminForm action={issueStudentReset} submit="Issue one-time password" label="One-time password">
        <input type="hidden" name="username" value={student.username} />
        <PasswordField label="One-time password" name="temporary" required minLength={12} maxLength={128} autoComplete="new-password" />
      </AdminForm>
    </> : <StudentForm action={editStudent} submit="Save changes">
      <input type="hidden" name="id" value={student.id} />
      <label>Username<input name="username" required pattern="[a-z0-9]{1,64}" maxLength={64} defaultValue={student.username} autoCapitalize="none" spellCheck={false} /></label>
      <small>Use lowercase letters and numbers. Changing the username signs the student out.</small>
      <GenderField value={student.gender} />
    </StudentForm>}
  </section>;
}
