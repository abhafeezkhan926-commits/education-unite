import PracticeSubmitButton from '../../../practice/submit-button';
import { adminSignOut } from '../../../admin-actions';
import { withAdmin } from '../../../admin-auth';

export default async function Settings() {
  await withAdmin(() => {});
  return (
    <section className="admin-surface">
      <h1>Settings</h1>
      <h2>Admin session</h2>
      <p>Sign out when you’re done managing the school.</p>
      <form action={adminSignOut}><PracticeSubmitButton pendingLabel="Signing out…">Sign out</PracticeSubmitButton></form>
    </section>
  );
}
