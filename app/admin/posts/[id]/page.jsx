import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/admin-auth.mjs';
import { getStore } from '@/lib/store/index.mjs';
import { loadContent } from '@/lib/content-store.mjs';
import { postToForm, claimChecks, STATUS_LABEL, KIND_LABEL } from '@/lib/posts.mjs';
import PostBody from '@/components/knowledge/PostBody';
import PostEditor from '@/components/admin/PostEditor';
import { savePostAction, reviewPostAction, deletePostAction } from '../../actions';

export const metadata = { title: 'Post' };

const BLANK = { title: '', kind: '', summary: '', body: '', modality_slugs: [], sources: '', license_ok: false, status: 'draft', profile_id: '' };

export default async function PostAdminPage({ params, searchParams }) {
  await requireAdmin('content');
  const store = getStore();
  if (!store) notFound();
  const isNew = params.id === 'new';
  const post = isNew ? null : await store.get('posts', params.id);
  if (!isNew && !post) notFound();
  const { alchemists, modalities } = await loadContent(store);
  const author = post ? alchemists.find((a) => a.id === post.profile_id) : null;
  const checks = post ? claimChecks(`${post.title}\n${post.summary}\n${post.body}`) : { block: [], warn: [] };
  const authorPublic = author && !author.demo && author.publication_status === 'published' && ['verified', 'founder'].includes(author.verification_status);

  return (
    <div className="stack" style={{ gap: '1.6rem' }}>
      <Link href="/admin/posts" className="link-arrow" style={{ justifySelf: 'start' }}>Knowledge feed</Link>
      <div className="row" style={{ justifyContent: 'space-between', gap: '1rem' }}>
        <h1 style={{ fontSize: '2.2rem' }}>{isNew ? 'Write a post' : post.title}</h1>
        {post ? <span className="tag">{STATUS_LABEL[post.status]}</span> : null}
      </div>
      {searchParams?.saved ? <p className="admin-flash" role="status">Saved.</p> : null}
      {searchParams?.error ? <p className="error" role="alert">{searchParams.error}</p> : null}

      {post ? (
        <section className="admin-card stack" aria-labelledby="review-h">
          <h2 id="review-h" style={{ fontSize: '1.3rem' }}>Review</h2>
          <p style={{ color: 'var(--muted)' }}>By {author?.name ?? 'unknown'} · {KIND_LABEL[post.kind] ?? 'no kind'}{post.license_confirmed_at ? ` · licence confirmed ${new Date(post.license_confirmed_at).toLocaleDateString('en-AU')}` : ' · licence not confirmed yet'}</p>
          {post.status === 'published' && !authorPublic ? <p className="demo-note">This is marked published, but its author&rsquo;s profile is not public, so it is not showing.</p> : null}
          {checks.block.length ? <p className="error" role="alert"><strong>This cannot be published:</strong> it {checks.block.join(' and ')}.</p> : null}
          {checks.warn.length ? <p className="demo-note"><strong>Read carefully:</strong> it {checks.warn.join(' and ')}.</p> : null}
          <div className="note-card stack" style={{ gap: '0.8rem' }}>
            <p><strong>{post.summary}</strong></p>
            <PostBody body={post.body} />
          </div>
          {post.sources?.length ? <ul className="tick-list">{post.sources.map((s) => <li key={s.url}>{s.title}: <code>{s.url}</code></li>)}</ul> : null}
          <div className="row">
            {post.status !== 'published' ? <form action={reviewPostAction}><input type="hidden" name="id" value={post.id} /><input type="hidden" name="intent" value="publish" /><button type="submit" className="btn btn--honey">Publish</button></form> : null}
            {post.status === 'published' ? <form action={reviewPostAction}><input type="hidden" name="id" value={post.id} /><input type="hidden" name="intent" value="unpublish" /><button type="submit" className="btn btn--soft">Take offline</button></form> : null}
            {post.status !== 'published' ? (
              <form action={reviewPostAction} className="row">
                <input type="hidden" name="id" value={post.id} /><input type="hidden" name="intent" value="decline" />
                <label className="sr-only" htmlFor="decline-note">Note to the author</label>
                <div className="field" style={{ margin: 0, minWidth: '18rem' }}><input id="decline-note" name="note" placeholder="A kind note about what to change" maxLength={600} /></div>
                <button type="submit" className="btn btn--soft">Do not approve</button>
              </form>
            ) : null}
          </div>
          {post.status === 'published' ? <Link href={`/knowledge/${post.slug}`} target="_blank" className="link-arrow" style={{ justifySelf: 'start' }}>View on the site</Link> : null}
        </section>
      ) : null}

      <PostEditor mode="team" action={savePostAction} id={post?.id ?? ''} initial={post ? { ...postToForm(post), status: post.status } : BLANK} modalities={modalities.filter((m) => m.publication_status === 'published')} profiles={alchemists.filter((a) => !a.demo)} authorName={author?.name} status={post?.status ?? 'draft'} />

      {post ? (
        <form action={deletePostAction} className="admin-card stack">
          <input type="hidden" name="id" value={post.id} />
          <h2 style={{ fontSize: '1.15rem' }}>Delete this post</h2>
          <label className="check"><input type="checkbox" name="confirm" required /><span>Yes, delete it for good.</span></label>
          <button type="submit" className="btn btn--soft btn--sm" style={{ borderColor: '#9B3B22', color: '#9B3B22', justifySelf: 'start' }}>Delete</button>
        </form>
      ) : null}
    </div>
  );
}
