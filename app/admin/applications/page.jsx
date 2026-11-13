import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { listApplications, STATUS_LABEL } from '@/lib/applications.mjs';

export const metadata = { title: 'Applications' };

export default async function ApplicationsPage({ searchParams }) {
  await requireAdmin();
  const store = getStore();
  const apps = store ? await listApplications(store) : [];

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <h1 style={{ fontSize: '2.2rem' }}>Alchemist applications</h1>
      {searchParams?.deleted ? <p className="admin-flash" role="status">Application deleted permanently.</p> : null}
      {searchParams?.e === 'missing' ? <p className="error" role="alert">That application no longer exists.</p> : null}
      {!store ? (
        <p className="demo-note"><strong>Storage is switched off,</strong> so the public form is in preview mode and nothing is received. See <Link href="/admin" className="link-arrow">Overview</Link>.</p>
      ) : apps.length === 0 ? (
        <div className="empty"><h3>No applications yet</h3><p>When someone applies through <Link href="/become-an-alchemist" className="link-arrow">Become an Alchemist</Link>, they appear here for a person to review.</p></div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th scope="col">Name</th><th scope="col">Practices</th><th scope="col">Where</th><th scope="col">Received</th><th scope="col">Status</th></tr></thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.id}>
                  <th scope="row"><Link href={`/admin/applications/${a.id}`} className="link-arrow">{a.data.name}</Link></th>
                  <td>{a.data.modalities}</td>
                  <td>{a.data.location}</td>
                  <td>{new Date(a.created_at).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                  <td><span className={`status status--${a.status}`}>{STATUS_LABEL[a.status]}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
