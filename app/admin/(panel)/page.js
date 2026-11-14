import Link from 'next/link';
import { withAdmin } from '../../admin-auth';

export default async function Dashboard() {
  await withAdmin(() => {});
  return (
    <>
      <section className="admin-surface admin-welcome">
        <h1>Admin dashboard</h1>
        <p>Manage class codes and student access.</p>
      </section>
      <div className="admin-shortcuts">
        <section className="admin-surface">
          <h2>Class codes</h2>
          <p>Create a code students can use to join for the next seven days.</p>
          <Link href="/admin/codes">Generate class code <span aria-hidden="true">→</span></Link>
        </section>
        <section className="admin-surface">
          <h2>Student access</h2>
          <p>Issue a one-time password to help a student sign back in.</p>
          <Link href="/admin/password-reset">Reset student password <span aria-hidden="true">→</span></Link>
        </section>
      </div>
    </>
  );
}
