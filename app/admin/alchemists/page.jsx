import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { loadContent } from '@/lib/content-store.mjs';

export const metadata = { title: 'Alchemists' };

export default async function AlchemistsAdminPage({ searchParams }) {
  await requireAdmin();
  const store = getStore();
  const { alchemists, edited } = await loadContent(store);

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '2.2rem' }}>Alchemists</h1>
        {store ? <Link href="/admin/alchemists/new" className="btn btn--honey">New Alchemist</Link> : null}
      </div>
      {searchParams?.reset ? <p className="admin-flash" role="status">Done.</p> : null}
      {searchParams?.e === 'missing' ? <p className="error" role="alert">That profile no longer exists.</p> : null}
      {!store ? <p className="demo-note"><strong>Storage is switched off,</strong> so profiles can be read but not edited. See <Link href="/admin" className="link-arrow">Overview</Link>.</p> : null}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th scope="col">Name</th><th scope="col">Kind</th><th scope="col">Public?</th><th scope="col">Verification</th><th scope="col">Changes</th></tr></thead>
          <tbody>
            {alchemists.map((a) => (
              <tr key={a.id}>
                <th scope="row"><Link href={`/admin/alchemists/${a.id}`} className="link-arrow">{a.name}</Link><br /><small style={{ fontWeight: 400, color: 'var(--muted)' }}>{a.offering_name || a.title}</small></th>
                <td>{a.demo ? 'Fictional example' : a.verification_status === 'founder' ? 'Founder' : 'Alchemist'}</td>
                <td><span className={`status status--${a.publication_status === 'published' ? 'approved' : 'in_review'}`}>{a.publication_status === 'published' ? 'Published' : 'Draft'}</span></td>
                <td>{a.verification_status}</td>
                <td>{edited.alchemists.has(a.id) ? 'Edited here' : 'Built-in'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
