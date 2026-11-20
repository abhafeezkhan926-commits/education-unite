'use client';

import Link, { useLinkStatus } from 'next/link';

function NavigationStatus() {
  const { pending } = useLinkStatus();
  return pending ? <span className="visually-hidden" role="status" data-admin-navigation-pending="true">Opening page…</span> : null;
}

export default function AdminNavigationLink({ children, ...props }) {
  return <Link {...props}>{children}<NavigationStatus /></Link>;
}
