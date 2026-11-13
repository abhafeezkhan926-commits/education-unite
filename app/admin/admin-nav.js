import Link from 'next/link';
import { adminSignOut } from '../admin-actions';

export default function AdminNav() {
  return (
    <nav aria-label="Owner admin">
      <p><Link href="/admin/codes">Class codes</Link> · <Link href="/admin/password-reset">Password reset</Link></p>
      <form action={adminSignOut}>
        <button className="text-button">Sign out</button>
      </form>
    </nav>
  );
}
