import { createClassCode } from '../../admin-actions';
import { withAdmin } from '../../admin-auth';
import AdminForm from '../admin-form';
import AdminNav from '../admin-nav';

export default async function ClassCodes() {
  await withAdmin(() => {});
  return (
    <main className="student-card">
      <AdminNav />
      <h1>Create a class code</h1>
      <p>Share the code with your class. It is valid for seven days.</p>
      <AdminForm action={createClassCode} submit="Create class code" label="Class code" />
    </main>
  );
}
