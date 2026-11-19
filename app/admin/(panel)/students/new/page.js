import Link from 'next/link';
import { withAdmin } from '../../../../admin-auth';
import AdminForm from '../../../admin-form';
import { addStudent } from '../../../student-management-actions';
import GenderField from '../../../../gender-field';

export default async function NewStudent() {
  await withAdmin(() => {});
  return <section className="admin-surface">
    <Link href="/admin/students">Back to students</Link>
    <h1>Add student</h1>
    <p>Create a unique username and a one-time password, valid for 15 minutes. Share them privately with the student.</p>
    <AdminForm action={addStudent} submit="Create student" label="One-time password">
      <GenderField />
    </AdminForm>
  </section>;
}
