import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { loadPosts } from '@/lib/posts-store.mjs';
import { loadContent } from '@/lib/content-store.mjs';
import { STATUS_LABEL, KIND_LABEL } from '@/lib/posts.mjs';

export const metadata = { title: 'Writing' };

const ORDER = { submitted: 0, rejected: 1, draft: 2, published: 3 };

export default async function PostsAdmin({ searchParams }) {
  await requireAdmin('content');
  const store = getStore();
  const posts = (await loadPosts(store)).sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.updated_at.localeCompare(a.updated_at));
  const { alchemists } = await loadContent(store);
  const author = (id) => alchemists.find((a) => a.id === id)?.name ?? id;

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: '2.2rem' }}>Knowledge feed</h1>
        {store ? <Link href="/admin/posts/new" className="btn btn--honey">Write a post</Link> : null}
      </div>
      <p className="lede">Articles Alchemists choose to share. Read each one before it is published: nothing here appears on the site until you approve it.</p>
      {searchParams?.deleted ? <p className="admin-flash" role="status">Deleted.</p> : null}
      {searchParams?.e === 'missing' ? <p className="error" role="alert">That post no longer exists.</p> : null}
      {!store ? <p className="demo-note"><strong>Storage is switched off,</strong> so there are no posts.</p> : null}
      {posts.length ? (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th scope="col">Post</th><th scope="col">Author</th><th scope="col">Kind</th><th scope="col">Status</th><th scope="col">Updated</th></tr></thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id}>
                  <th scope="row"><Link href={`/admin/posts/${p.id}`} className="link-arrow">{p.title}</Link></th>
                  <td>{author(p.profile_id)}</td>
                  <td>{KIND_LABEL[p.kind] ?? ''}</td>
                  <td>{p.status === 'submitted' ? <span className="tag tag--honey">{STATUS_LABEL[p.status]}</span> : STATUS_LABEL[p.status]}</td>
                  <td>{new Date(p.updated_at).toLocaleDateString('en-AU')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : store ? <p style={{ color: 'var(--muted)' }}>No posts yet.</p> : null}
    </div>
  );
}
