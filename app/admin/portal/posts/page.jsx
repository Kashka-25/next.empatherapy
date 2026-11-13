import Link from 'next/link';
import { requirePortal } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { loadPosts } from '@/lib/posts-store.mjs';
import { STATUS_LABEL, KIND_LABEL } from '@/lib/posts.mjs';

export const metadata = { title: 'Your writing' };

export default async function PortalPosts({ searchParams }) {
  const me = await requirePortal();
  const store = getStore();
  const posts = (await loadPosts(store)).filter((p) => p.profile_id === me.profile_id).sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <Link href="/admin/portal" className="link-arrow" style={{ justifySelf: 'start' }}>Your space</Link>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '2.2rem' }}>Your writing</h1>
        {store ? <Link href="/admin/portal/posts/new" className="btn btn--honey">Write a post</Link> : null}
      </div>
      <p className="lede">Share what you know in the free, openly licensed knowledge feed, so visitors can learn from you before they reach out. It is entirely your choice. The team reads each post before it appears.</p>
      {searchParams?.deleted ? <p className="admin-flash" role="status">Deleted.</p> : null}
      {!store ? <p className="demo-note"><strong>Storage is switched off,</strong> so posts cannot be saved yet.</p> : null}
      {posts.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th scope="col">Post</th><th scope="col">Kind</th><th scope="col">Status</th><th scope="col">Updated</th></tr></thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <th scope="row"><Link href={`/admin/portal/posts/${p.id}`} className="link-arrow">{p.title}</Link>{p.status === 'rejected' && p.review_note ? <><br /><small style={{ fontWeight: 400, color: 'var(--muted)' }}>{p.review_note}</small></> : null}</th>
                  <td>{KIND_LABEL[p.kind] ?? ''}</td>
                  <td>{STATUS_LABEL[p.status]}{p.status === 'published' ? <> · <Link href={`/knowledge/${p.slug}`} target="_blank" className="link-arrow">View</Link></> : null}</td>
                  <td>{new Date(p.updated_at).toLocaleDateString('en-AU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : store ? <p style={{ color: 'var(--muted)' }}>No posts yet. A short practice guide or the story of how you found your work is a lovely place to begin.</p> : null}
    </div>
  );
}
