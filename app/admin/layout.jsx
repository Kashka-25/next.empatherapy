import Link from 'next/link';
import { isAdmin } from '@/lib/admin-auth.mjs';
import { logout } from './actions';
import { Sprig } from '@/components/art/Botanicals';

export const metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }) {
  const signedIn = await isAdmin();
  return (
    <div className="admin">
      <header className="admin-bar">
        <div className="admin-bar__inner">
          <Link href="/admin" className="wordmark" style={{ fontSize: '1.3rem' }}><Sprig size={22} color="var(--botanical)" />Empatherapy admin</Link>
          {signedIn ? (
            <nav className="admin-nav" aria-label="Admin">
              <Link href="/admin">Overview</Link>
              <Link href="/admin/applications">Applications</Link>
              <Link href="/admin/features">Weekly features</Link>
              <Link href="/" target="_blank">View site</Link>
              <form action={logout}><button type="submit" className="btn btn--soft btn--sm">Sign out</button></form>
            </nav>
          ) : null}
        </div>
      </header>
      <div className="admin-wrap">{children}</div>
    </div>
  );
}
