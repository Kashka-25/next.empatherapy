import Link from 'next/link';
import { currentAdmin } from '@/lib/admin-auth.mjs';
import { can, ROLE_LABEL } from '@/lib/accounts.mjs';
import { logout } from './actions';
import { TeaMark } from '@/components/art/Botanicals';

export const metadata = { title: 'Admin', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }) {
  const me = await currentAdmin();
  return (
    <div className="admin">
      <header className="admin-bar">
        <div className="admin-bar__inner">
          <Link href={me?.role === 'alchemist' ? '/admin/portal' : '/admin'} className="wordmark" style={{ fontSize: '1.3rem' }}><TeaMark size={30} />{me?.role === 'alchemist' ? 'Empatherapy, your space' : 'Empatherapy admin'}</Link>
          {me ? (
            me.role === 'alchemist' ? (
              <nav className="admin-nav" aria-label="Your space">
                <Link href="/admin/portal">Your space</Link>
                <Link href="/admin/portal/profile">Your profile</Link>
                <Link href="/admin/portal/photos">Photos</Link>
                <Link href="/admin/portal/posts">Writing</Link>
                <Link href="/admin/portal/enquiries">Enquiries</Link>
                <Link href="/admin/portal/summary">What we brought you</Link>
                <Link href="/admin/portal/circle">Referrals</Link>
                <Link href="/admin/account">My account</Link>
                <form action={logout}><button type="submit" className="btn btn--soft btn--sm">Sign out</button></form>
              </nav>
            ) : (
            <nav className="admin-nav" aria-label="Admin">
              <Link href="/admin">Overview</Link>
              {can(me.role, 'applications') ? <Link href="/admin/applications">Applications</Link> : null}
              {can(me.role, 'enquiries') ? <Link href="/admin/enquiries">Enquiries</Link> : null}
              {can(me.role, 'enquiries') ? <Link href="/admin/referrals">Referrals</Link> : null}
              {can(me.role, 'content') ? <Link href="/admin/alchemists">Alchemists</Link> : null}
              {can(me.role, 'content') ? <Link href="/admin/modalities">Modalities</Link> : null}
              {can(me.role, 'content') ? <Link href="/admin/posts">Writing</Link> : null}
              {can(me.role, 'content') ? <Link href="/admin/features">Weekly features</Link> : null}
              {can(me.role, 'accounts') ? <Link href="/admin/accounts">Accounts</Link> : null}
              {can(me.role, 'activity') ? <Link href="/admin/activity">Activity</Link> : null}
              {can(me.role, 'accounts') ? <Link href="/admin/launch">Launch</Link> : null}
              {can(me.role, 'retention') ? <Link href="/admin/retention">Clean-up</Link> : null}
              <Link href="/" target="_blank">View site</Link>
              {me.id !== 'bootstrap' ? <Link href="/admin/account" title={`${me.name} (${ROLE_LABEL[me.role]})`}>My account</Link> : null}
              <form action={logout}><button type="submit" className="btn btn--soft btn--sm">Sign out</button></form>
            </nav>
            )
          ) : null}
        </div>
      </header>
      <div className="admin-wrap">{children}</div>
    </div>
  );
}
