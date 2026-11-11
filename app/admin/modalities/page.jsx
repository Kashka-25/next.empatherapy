import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { loadContent } from '@/lib/content-store.mjs';

export const metadata = { title: 'Modalities' };

export default async function ModalitiesAdminPage({ searchParams }) {
  await requireAdmin('content');
  const store = getStore();
  const { modalities, alchemists, edited } = await loadContent(store);

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '2.2rem' }}>Modalities</h1>
        {store ? <Link href="/admin/modalities/new" className="btn btn--honey">New modality</Link> : null}
      </div>
      {searchParams?.reset ? <p className="admin-flash" role="status">Done.</p> : null}
      {searchParams?.e === 'missing' ? <p className="error" role="alert">That modality no longer exists.</p> : null}
      {!store ? <p className="demo-note"><strong>Storage is switched off,</strong> so modalities can be read but not edited. See <Link href="/admin" className="link-arrow">Overview</Link>.</p> : null}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th scope="col">Modality</th><th scope="col">Category</th><th scope="col">Public?</th><th scope="col">Listed by</th><th scope="col">Changes</th></tr></thead>
          <tbody>
            {modalities.map((m) => (
              <tr key={m.id}>
                <th scope="row"><Link href={`/admin/modalities/${m.id}`} className="link-arrow">{m.name}</Link></th>
                <td>{m.category}</td>
                <td><span className={`status status--${m.publication_status === 'published' ? 'approved' : 'in_review'}`}>{m.publication_status === 'published' ? 'Published' : 'Draft'}</span></td>
                <td>{alchemists.filter((a) => a.modalities.some((x) => x.slug === m.slug)).length}</td>
                <td>{edited.modalities.has(m.id) ? 'Edited here' : 'Built-in'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
