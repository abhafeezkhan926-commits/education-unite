'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

const sections = [
  ['/admin', 'Dashboard', 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z'],
  ['/admin/codes', 'Generate Class Code', 'M9 6l-6 6 6 6m6-12 6 6-6 6'],
  ['/admin/settings', 'Settings', 'M4 7h16M4 17h16M8 4v6m8 4v6'],
];
const desktopQuery = '(min-width: 56rem)';

function Icon({ path }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d={path} /></svg>;
}

function Navigation({ close }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin panel">
      {sections.map(([href, label, path]) => (
        <Link key={href} href={href} aria-current={pathname === href ? 'page' : undefined} title={label} onClick={close}>
          <Icon path={path} /><span>{label}</span>
        </Link>
      ))}
    </nav>
  );
}

export default function AdminNav({ children }) {
  const [expanded, setExpanded] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawer = useRef(null);

  useEffect(() => {
    const desktop = window.matchMedia(desktopQuery);
    const closeOnDesktop = () => { if (desktop.matches) drawer.current?.close(); };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  function closeDrawer() {
    drawer.current.close();
  }

  return (
    <div className="admin-panel" data-expanded={expanded}>
      <header className="admin-topbar">
        <button className="admin-desktop-toggle" type="button" aria-label="Toggle sidebar" aria-controls="admin-sidebar" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
          <Icon path="M3 5h18v14H3zM9 5v14" />
        </button>
        <button className="admin-mobile-toggle" type="button" aria-label="Open sidebar" aria-controls="admin-drawer" aria-expanded={drawerOpen} onClick={() => { drawer.current.showModal(); setDrawerOpen(true); }}>
          <Icon path="M4 6h16M4 12h16M4 18h16" />
        </button>
        <Link href="/admin">EducationUnite</Link>
      </header>
      <aside id="admin-sidebar" className="admin-sidebar"><Navigation /></aside>
      <dialog id="admin-drawer" ref={drawer} className="admin-drawer" aria-label="Admin navigation" onClose={() => setDrawerOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) closeDrawer(); }}>
        <div className="admin-drawer-content">
          <button type="button" aria-label="Close sidebar" onClick={closeDrawer}><Icon path="m6 6 12 12M18 6 6 18" /></button>
          <Navigation close={closeDrawer} />
        </div>
      </dialog>
      <main className="admin-content">{children}</main>
    </div>
  );
}
